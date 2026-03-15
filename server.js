const express     = require("express");
const mysql       = require("mysql2");
const cors        = require("cors");
const bodyParser  = require("body-parser");
const bcrypt      = require("bcrypt");
const jwt         = require("jsonwebtoken");
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "SUPER_SECRET_KEY";

const db = mysql.createConnection({
  host:     "localhost",
  user:     "root",
  password: "",
  database: "dorm_management",
});

db.connect((err) => {
  if (err) { console.error("DB connection failed:", err); return; }
  console.log("MySQL Connected");
  runMigrations().then(() => seedDemoData());
});


// ─── FILE UPLOAD SETUP ────────────────────────────────────────────────────────

const uploadsDir   = path.join(__dirname, "uploads", "applications");
const receiptsDir  = path.join(__dirname, "uploads", "receipts");
const reportsDir   = path.join(__dirname, "uploads", "reports");
const contractsDir = path.join(__dirname, "uploads", "contracts");

[uploadsDir, receiptsDir, reportsDir, contractsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

function makeStorage(dest) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename:    (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  if (/\.(pdf|jpg|jpeg|png)$/i.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error("Only PDF, JPG, and PNG files are allowed"));
};

const upload        = multer({ storage: makeStorage(uploadsDir),   limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
const receiptUpload = multer({ storage: makeStorage(receiptsDir),  limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
const signedUpload  = multer({ storage: makeStorage(contractsDir), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });


// ─── MIGRATIONS ───────────────────────────────────────────────────────────────

async function runMigrations() {
  const dbp = db.promise();
  const migrations = [
    `ALTER TABLE reports ADD COLUMN status ENUM('PENDING','COMPLETED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE reports ADD COLUMN progress_id INT DEFAULT NULL`,
    `ALTER TABLE rent_payments ADD COLUMN verification_status ENUM('PENDING_VERIFICATION','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION'`,
    `ALTER TABLE contracts ADD COLUMN monthly_rent DECIMAL(10,2) DEFAULT NULL`,
    `ALTER TABLE contracts ADD COLUMN due_day TINYINT DEFAULT 15`,
    `ALTER TABLE contracts ADD COLUMN generated_doc_file_id INT DEFAULT NULL`,
    `ALTER TABLE dorm_applications ADD COLUMN application_type ENUM('NEW','EXTENSION') NOT NULL DEFAULT 'NEW'`,
    `ALTER TABLE contracts ADD COLUMN termination_reason TEXT DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS termination_requests (
       request_id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       contract_id INT NOT NULL,
       reason TEXT NOT NULL,
       requested_end_date DATE NOT NULL,
       status ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(user_id),
       FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)
     )`,
    `ALTER TABLE dorm_applications ADD COLUMN remarks TEXT DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS notifications (
       notification_id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       type ENUM('application','contract','payment','complaint') NOT NULL,
       message TEXT NOT NULL,
       tab VARCHAR(30) NOT NULL,
       is_read TINYINT(1) DEFAULT 0,
       reference_id VARCHAR(100) DEFAULT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
     )`,
    `ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(100) DEFAULT NULL`,
    `ALTER TABLE notifications ADD UNIQUE KEY uniq_user_ref (user_id, reference_id)`,
    `ALTER TABLE dormitories ADD COLUMN notifications_enabled TINYINT(1) NOT NULL DEFAULT 1`,
    `ALTER TABLE dormitories ADD COLUMN payment_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1`,
    `ALTER TABLE dormitories ADD COLUMN maintenance_alerts_enabled TINYINT(1) NOT NULL DEFAULT 1`,
    `ALTER TABLE reports ADD COLUMN report_source ENUM('ADMIN','STUDENT') NOT NULL DEFAULT 'STUDENT'`,
  ];
  for (const sql of migrations) {
    try {
      await dbp.query(sql);
    } catch (err) {
      // ER_DUP_FIELDNAME = column already exists, ER_DUP_KEYNAME = index already exists → safe to ignore
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME')
        console.error('Migration error:', err.message);
    }
  }
  console.log("Migrations checked.");
}


// ─── SEED ALL DEMO DATA ───────────────────────────────────────────────────────

async function seedDemoData() {
  const dbp = db.promise();
  try {
    const [existing] = await dbp.query("SELECT COUNT(*) AS c FROM dormitories");
    if (existing[0].c > 0) { console.log("Demo data already seeded."); return; }

    console.log("Seeding demo data...");

    const [d1] = await dbp.query(
      "INSERT INTO dormitories (name, address, contact_email, contact_phone, max_capacity) VALUES (?,?,?,?,?)",
      ["Sunrise Dormitory", "123 University Ave, Manila", "admin@dms.com", "+63 912 000 1001", 32]
    );
    const dorm1Id = d1.insertId;

    const adminHash = await bcrypt.hash("admin123", 10);
    const [a1] = await dbp.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
      ["Admin User", "admin@dms.com", adminHash, "ADMIN"]
    );
    await dbp.query(
      "INSERT INTO admin_profiles (user_id, dormitory_id, position, phone) VALUES (?,?,?,?)",
      [a1.insertId, dorm1Id, "Dormitory Administrator", "+63 912 000 1001"]
    );

    const roomTypes = ["Single","Single","Double","Double","Single","Double","Suite","Double"];
    const room1Ids  = [];
    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 8; r++) {
        const [rRow] = await dbp.query(
          "INSERT INTO rooms (room_number, floor, type) VALUES (?,?,?)",
          [`${floor}0${r}`, floor, roomTypes[r - 1]]
        );
        room1Ids.push(rRow.insertId);
      }
    }
    await dbp.query("UPDATE rooms SET status = 'maintenance' WHERE room_id = ?", [room1Ids[6]]);
    await dbp.query("UPDATE rooms SET status = 'maintenance' WHERE room_id = ?", [room1Ids[23]]);

    const studentHash = await bcrypt.hash("student123", 10);
    const studentData = [
      { name: "Maria Santos",   email: "student@dms.com", phone: "+63 912 345 6789", sid: "2024-10001", course: "BS Computer Science",       uni: "University of Manila" },
      { name: "Juan dela Cruz", email: "juan@dms.com",    phone: "+63 912 345 6790", sid: "2024-10002", course: "BS Information Technology", uni: "University of Manila" },
      { name: "Ana Liza",       email: "ana@dms.com",     phone: "+63 912 345 6791", sid: "2024-10003", course: "BS Nursing",                uni: "University of Manila" },
      { name: "Pedro Reyes",    email: "pedro@dms.com",   phone: "+63 912 345 6792", sid: "2024-10004", course: "BS Engineering",            uni: "University of Manila" },
      { name: "Rosa Aquino",    email: "rosa@dms.com",    phone: "+63 912 345 6793", sid: "2024-10005", course: "BS Architecture",           uni: "University of Manila" },
    ];

    const students = [];
    for (const s of studentData) {
      const [sRow] = await dbp.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
        [s.name, s.email, studentHash, "STUDENT"]
      );
      students.push({ id: sRow.insertId, ...s });
    }

    const acceptedRoomIds  = [room1Ids[0], room1Ids[1], room1Ids[2]];
    const acceptedStudents = students.slice(0, 3);

    for (let i = 0; i < acceptedStudents.length; i++) {
      const s = acceptedStudents[i]; const roomId = acceptedRoomIds[i];
      await dbp.query("UPDATE rooms SET status = 'occupied', resident_id = ? WHERE room_id = ?", [s.id, roomId]);
      await dbp.query(
        "INSERT INTO student_profiles (user_id, room_id, phone, student_id_number, course, university, application_status) VALUES (?,?,?,?,?,?,?)",
        [s.id, roomId, s.phone, s.sid, s.course, s.uni, "ACCEPTED"]
      );
      await dbp.query(
        "INSERT INTO dorm_applications (user_id, submission_date, status, assigned_room_id) VALUES (?,?,?,?)",
        [s.id, "2025-12-01", "ACCEPTED", roomId]
      );
      await dbp.query(
        "INSERT INTO contracts (user_id, room_id, start_date, end_date, status) VALUES (?,?,?,?,?)",
        [s.id, roomId, "2026-01-15", "2026-12-15", "ACTIVE"]
      );
    }

    for (const s of students.slice(3)) {
      await dbp.query(
        "INSERT INTO dorm_applications (user_id, submission_date, status) VALUES (?,?,?)",
        [s.id, "2026-01-20", "PENDING"]
      );
    }

    const complaintsData = [
      { uid: acceptedStudents[0].id, desc: "AC unit in room 101 is not cooling and makes loud noise at night.", status: "SUBMITTED"   },
      { uid: acceptedStudents[1].id, desc: "Water leak detected in the bathroom ceiling of room 102.",          status: "IN_PROGRESS" },
      { uid: acceptedStudents[2].id, desc: "Main door lock was broken. Reported last week and now fixed.",      status: "RESOLVED"    },
    ];
    for (const c of complaintsData) {
      await dbp.query("INSERT INTO complaints (user_id, description, status) VALUES (?,?,?)", [c.uid, c.desc, c.status]);
    }

    const paymentsData = [
      { uid: acceptedStudents[0].id, month: "Jan", amount: 5000, vs: "VERIFIED"              },
      { uid: acceptedStudents[0].id, month: "Feb", amount: 5000, vs: "VERIFIED"              },
      { uid: acceptedStudents[1].id, month: "Jan", amount: 4500, vs: "PENDING_VERIFICATION"  },
      { uid: acceptedStudents[2].id, month: "Jan", amount: 5500, vs: "VERIFIED"              },
      { uid: acceptedStudents[2].id, month: "Feb", amount: 5500, vs: "REJECTED"              },
    ];
    for (const p of paymentsData) {
      await dbp.query(
        "INSERT INTO rent_payments (user_id, month, amount, verification_status) VALUES (?,?,?,?)",
        [p.uid, p.month, p.amount, p.vs]
      );
    }

    console.log("─────────────────────────────────────────────");
    console.log("Demo data seeded!");
    console.log("  Admin:   admin@dms.com  / admin123");
    console.log("  Student: student@dms.com / student123 (Room 101)");
    console.log("─────────────────────────────────────────────");
  } catch (err) {
    console.error("Seed failed:", err.message);
  }
}


// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token provided" });
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: `Forbidden: requires role ${roles.join(" or ")}` });
    next();
  };
}


// ─── NOTIFICATIONS INFRASTRUCTURE ────────────────────────────────────────────

// userId (number) → Set of active SSE response objects
const sseClients = new Map();

// referenceId: optional dedup key — uses INSERT IGNORE so duplicate refs are silently skipped
async function pushNotification(userId, type, message, tab, referenceId = null) {
  const dbp = db.promise();
  try {
    const sql = referenceId
      ? "INSERT IGNORE INTO notifications (user_id, type, message, tab, reference_id) VALUES (?,?,?,?,?)"
      : "INSERT INTO notifications (user_id, type, message, tab) VALUES (?,?,?,?)";
    const params = referenceId
      ? [userId, type, message, tab, referenceId]
      : [userId, type, message, tab];
    const [result] = await dbp.query(sql, params);
    if (!result.insertId) return; // INSERT IGNORE skipped (duplicate reference_id)
    const notif = {
      notification_id: result.insertId,
      user_id: userId, type, message, tab,
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    const clients = sseClients.get(Number(userId));
    if (clients && clients.size > 0) {
      const payload = `data: ${JSON.stringify({ type: "notification", notification: notif })}\n\n`;
      for (const res of clients) { try { res.write(payload); } catch {} }
    }
  } catch (err) { console.error("pushNotification error:", err.message); }
}

// Helper: get all admin user_ids (for dormitory-wide alerts)
async function getAllAdminUserIds() {
  const dbp = db.promise();
  const [rows] = await dbp.query("SELECT user_id FROM admin_profiles").catch(() => [[]]);
  return rows.map(r => r.user_id);
}

// Helper: push a notification to a student only if notifications_enabled for their dormitory
async function pushStudentNotification(userId, dormitoryId, type, message, tab) {
  const dbp = db.promise();
  try {
    const [[dorm]] = await dbp.query(
      "SELECT notifications_enabled FROM dormitories WHERE dormitory_id = ?", [dormitoryId]);
    if (!dorm?.notifications_enabled) return;
    await pushNotification(userId, type, message, tab);
  } catch (err) { console.error("pushStudentNotification error:", err.message); }
}

// Delete notifications for users whose contract has expired — runs daily
async function cleanupExpiredNotifications() {
  const dbp = db.promise();
  await dbp.query(
    `DELETE n FROM notifications n
     WHERE EXISTS (
       SELECT 1 FROM contracts c
       WHERE c.user_id = n.user_id AND c.end_date < CURDATE()
     )`
  ).catch(err => console.error("Notification cleanup error:", err.message));
}
cleanupExpiredNotifications();
setInterval(cleanupExpiredNotifications, 24 * 60 * 60 * 1000);

// Trigger 4: notify admins when a payment has been pending verification for 5+ days
async function checkUnverifiedPayments() {
  const dbp = db.promise();
  try {
    const [payments] = await dbp.query(`
      SELECT rp.payment_id, rp.user_id, rp.month, rp.amount, u.name AS student_name
      FROM rent_payments rp
      JOIN users u ON u.user_id = rp.user_id
      WHERE rp.verification_status = 'PENDING_VERIFICATION'
        AND DATEDIFF(NOW(), rp.created_at) >= 5
    `);
    // Only notify admins whose dormitory has payment reminders enabled
    const [adminRows] = await dbp.query(`
      SELECT ap.user_id FROM admin_profiles ap
      JOIN dormitories d ON d.dormitory_id = ap.dormitory_id
      WHERE d.payment_reminders_enabled = 1
    `);
    const adminIds = adminRows.map(r => r.user_id);
    for (const p of payments) {
      for (const adminId of adminIds) {
        const refId = `unverified_payment_${p.payment_id}_admin_${adminId}`;
        await pushNotification(adminId, "payment",
          `${p.student_name}'s payment of €${p.amount} for ${p.month} has been pending verification for 5+ days.`,
          "payments", refId);
      }
    }
  } catch (err) { console.error("checkUnverifiedPayments error:", err.message); }
}

// Trigger 5: notify admins when a student hasn't paid rent after the monthly due date
async function checkUnpaidRent() {
  const dbp = db.promise();
  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear  = now.getFullYear();
  const monthKey     = `${currentYear}_${String(now.getMonth() + 1).padStart(2, "0")}`;
  try {
    const [students] = await dbp.query(`
      SELECT c.user_id, c.due_day, u.name AS student_name
      FROM contracts c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.status = 'ACTIVE'
        AND DAY(CURDATE()) > c.due_day
        AND NOT EXISTS (
          SELECT 1 FROM rent_payments rp
          WHERE rp.user_id = c.user_id
            AND rp.month = ?
            AND YEAR(rp.created_at) = ?
        )
    `, [currentMonth, currentYear]);
    // Only notify admins whose dormitory has payment reminders enabled
    const [adminRows] = await dbp.query(`
      SELECT ap.user_id FROM admin_profiles ap
      JOIN dormitories d ON d.dormitory_id = ap.dormitory_id
      WHERE d.payment_reminders_enabled = 1
    `);
    const adminIds = adminRows.map(r => r.user_id);
    for (const s of students) {
      for (const adminId of adminIds) {
        const refId = `unpaid_rent_${s.user_id}_${monthKey}_admin_${adminId}`;
        await pushNotification(adminId, "payment",
          `${s.student_name} has not paid rent for ${currentMonth}. Due date (day ${s.due_day}) has passed.`,
          "payments", refId);
      }
    }
  } catch (err) { console.error("checkUnpaidRent error:", err.message); }
}

// Run scheduled checks after a short delay (let DB settle first), then every 12h / 24h
setTimeout(() => {
  checkUnverifiedPayments();
  checkUnpaidRent();
}, 60 * 1000); // 1 min after boot
setInterval(checkUnverifiedPayments, 12 * 60 * 60 * 1000);
setInterval(checkUnpaidRent,         24 * 60 * 60 * 1000);

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { name, email, password, phone, student_id_number, course, university } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "name, email and password are required" });
  const dbp = db.promise();
  try {
    const hash = await bcrypt.hash(password, 10);
    await dbp.query("START TRANSACTION");
    const [result] = await dbp.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,'STUDENT')",
      [name, email, hash]
    );
    const userId = result.insertId;
    await dbp.query(
      "INSERT INTO student_profiles (user_id, phone, student_id_number, course, university) VALUES (?,?,?,?,?)",
      [userId, phone ?? null, student_id_number ?? null, course ?? null, university ?? null]
    );
    await dbp.query("COMMIT");
    res.json({ message: "Student account created" });
  } catch (err) {
    await dbp.query("ROLLBACK").catch(() => {});
    if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already registered" });
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err)          return res.status(500).json({ message: "Server error" });
    if (!rows.length) return res.status(401).json({ message: "User not found" });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user.user_id, role: user.role }, SECRET, { expiresIn: "1d" });
    res.json({ token, role: user.role, userId: user.user_id, name: user.name, email: user.email });
  });
});


// ─── NOTIFICATION ENDPOINTS ──────────────────────────────────────────────────

// SSE stream — token via ?token= because EventSource can't set custom headers
app.get("/api/notifications/stream", (req, res) => {
  let decoded;
  try { decoded = jwt.verify(req.query.token, SECRET); }
  catch { return res.status(401).end(); }
  const userId = Number(decoded.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);

  const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) { clients.delete(res); if (clients.size === 0) sseClients.delete(userId); }
  });
});

app.get("/api/notifications", authMiddleware, (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load notifications" });
      res.json(rows);
    }
  );
});

// NOTE: read-all MUST be registered before :id/read to avoid route conflict
app.patch("/api/notifications/read-all", authMiddleware, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed" });
      res.json({ message: "All marked as read" });
    }
  );
});

app.patch("/api/notifications/:id/read", authMiddleware, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed" });
      res.json({ message: "Marked as read" });
    }
  );
});

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

app.post("/api/applications", authMiddleware, (req, res) => {
  const { submission_date, application_type = "NEW" } = req.body;
  if (!submission_date) return res.status(400).json({ message: "submission_date is required" });
  if (!["NEW","EXTENSION"].includes(application_type))
    return res.status(400).json({ message: "application_type must be NEW or EXTENSION" });
  db.query(
    "INSERT INTO dorm_applications (user_id, submission_date, application_type) VALUES (?,?,?)",
    [req.user.id, submission_date, application_type],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to submit application" });
      res.json({ message: "Application submitted", applicationId: result.insertId });
      const label = application_type === "EXTENSION" ? "extension" : "room";
      pushStudentNotification(req.user.id, req.user.dormitory_id, "application",
        `Your ${label} application has been submitted and is pending review.`, "apply");
      // Notify all admins
      getAllAdminUserIds().then(adminIds => {
        const appType = application_type === "EXTENSION" ? "Extension" : "New";
        adminIds.forEach(adminId =>
          pushNotification(adminId, "application",
            `${appType} application received from a student.`, "residents")
        );
      });
    }
  );
});

app.get("/api/applications", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `SELECT da.*, u.name AS user_name, u.email AS user_email, r.room_number AS assigned_room_number
                 FROM dorm_applications da
                 LEFT JOIN users u ON da.user_id = u.user_id
                 LEFT JOIN rooms r ON da.assigned_room_id = r.room_id
                 ORDER BY da.created_at DESC`;
    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load applications" });
      res.json(rows);
    });
  } else {
    db.query(
      "SELECT * FROM dorm_applications WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load applications" });
        res.json(rows);
      }
    );
  }
});

app.patch("/api/applications/:id/status", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { status, room_id, start_date, end_date, monthly_rent, due_day, remarks } = req.body;
  const appId = req.params.id;
  const allowed = ["PENDING","ACCEPTED","REJECTED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  if (status === "ACCEPTED") {
    if (!room_id)      return res.status(400).json({ message: "room_id is required when accepting" });
    if (!start_date)   return res.status(400).json({ message: "start_date is required when accepting" });
    if (!end_date)     return res.status(400).json({ message: "end_date is required when accepting" });
    if (!monthly_rent) return res.status(400).json({ message: "monthly_rent is required when accepting" });
    if (!due_day)      return res.status(400).json({ message: "due_day is required when accepting" });
  }
  const dbp = db.promise();
  try {
    await dbp.query("START TRANSACTION");
    const [apps] = await dbp.query("SELECT user_id FROM dorm_applications WHERE application_id = ?", [appId]);
    if (!apps.length) { await dbp.query("ROLLBACK"); return res.status(404).json({ message: "Application not found" }); }
    const userId = apps[0].user_id;

    if (status === "ACCEPTED") {
      const [roomResult] = await dbp.query(
        "UPDATE rooms SET status = 'occupied', resident_id = ? WHERE room_id = ? AND status = 'vacant'",
        [userId, room_id]
      );
      if (!roomResult.affectedRows) { await dbp.query("ROLLBACK"); return res.status(400).json({ message: "Room is not available" }); }

      await dbp.query(
        `INSERT INTO student_profiles (user_id, room_id, application_status) VALUES (?,?,'ACCEPTED')
         ON DUPLICATE KEY UPDATE room_id = VALUES(room_id), application_status = 'ACCEPTED'`,
        [userId, room_id]
      );
      await dbp.query("UPDATE dorm_applications SET status = 'ACCEPTED', assigned_room_id = ? WHERE application_id = ?", [room_id, appId]);

      // Create the contract record
      const [contractResult] = await dbp.query(
        `INSERT INTO contracts (user_id, room_id, start_date, end_date, status, monthly_rent, due_day)
         VALUES (?,?,?,?,'ACTIVE',?,?)
         ON DUPLICATE KEY UPDATE room_id=VALUES(room_id), start_date=VALUES(start_date),
           end_date=VALUES(end_date), monthly_rent=VALUES(monthly_rent), due_day=VALUES(due_day), status='ACTIVE'`,
        [userId, room_id, start_date, end_date, monthly_rent, due_day]
      );
      const contractId = contractResult.insertId || contractResult.affectedRows;

      // Fetch info needed for PDF
      const [[student]] = await dbp.query(
        `SELECT u.name, sp.student_id_number, sp.course, sp.university
         FROM users u LEFT JOIN student_profiles sp ON u.user_id = sp.user_id WHERE u.user_id = ?`, [userId]);
      const [[room]] = await dbp.query(
        `SELECT r.room_number, r.floor, r.type, d.name AS dorm_name, d.address
         FROM rooms r LEFT JOIN admin_profiles ap ON ap.dormitory_id = r.room_id
         JOIN dormitories d ON d.dormitory_id = (SELECT dormitory_id FROM admin_profiles WHERE user_id = ? LIMIT 1)
         WHERE r.room_id = ?`, [req.user.id, room_id]);

      // Get the actual contract_id (handle ON DUPLICATE KEY case)
      const [[ctr]] = await dbp.query("SELECT contract_id FROM contracts WHERE user_id = ?", [userId]);
      const realContractId = ctr.contract_id;

      await dbp.query("COMMIT");
      pushStudentNotification(userId, req.user.dormitory_id, "application",
        `Your application has been accepted! Room ${room.room_number} has been assigned to you.`, "apply");

      // Generate PDF after commit (non-blocking to response)
      try {
        const fileName = await generateContractPdf(realContractId, {
          studentName:  student.name,
          studentId:    student.student_id_number,
          course:       student.course,
          university:   student.university,
          dormName:     room.dorm_name,
          address:      room.address,
          roomNumber:   room.room_number,
          floor:        room.floor,
          roomType:     room.type,
          startDate:    start_date,
          endDate:      end_date,
          monthlyRent:  monthly_rent,
          dueDay:       due_day,
        });
        const [fmResult] = await dbp.query(
          "INSERT INTO file_metadata (file_path, file_type) VALUES (?, 'application/pdf')", [fileName]);
        await dbp.query("UPDATE contracts SET generated_doc_file_id = ? WHERE contract_id = ?", [fmResult.insertId, realContractId]);
      } catch (pdfErr) {
        console.error("Contract PDF generation failed:", pdfErr.message);
      }

    } else {
      await dbp.query("UPDATE dorm_applications SET status = ?, remarks = ? WHERE application_id = ?", [status, remarks || null, appId]);
      await dbp.query("COMMIT");
      if (status === "REJECTED") {
        pushStudentNotification(userId, req.user.dormitory_id, "application",
          "Your application has been rejected. Please check the Apply section for details.", "apply");
      }
    }

    res.json({ message: "Application status updated" });
  } catch (err) {
    await dbp.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});


// ─── APPLICATION FILES ────────────────────────────────────────────────────────

app.post("/api/applications/:id/files", authMiddleware, upload.array("files", 10), async (req, res) => {
  const appId = parseInt(req.params.id, 10);
  const dbp   = db.promise();
  try {
    const [apps] = await dbp.query("SELECT user_id FROM dorm_applications WHERE application_id = ?", [appId]);
    if (!apps.length) return res.status(404).json({ message: "Application not found" });
    if (req.user.role !== "ADMIN" && apps[0].user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
    for (const file of req.files) {
      const [meta] = await dbp.query("INSERT INTO file_metadata (file_path, file_type) VALUES (?,?)", [file.filename, file.mimetype]);
      await dbp.query("INSERT INTO application_files (application_id, file_id) VALUES (?,?)", [appId, meta.insertId]);
    }
    res.json({ message: "Files uploaded", count: req.files.length });
  } catch (err) {
    res.status(500).json({ message: err.message ?? "Upload failed" });
  }
});

app.get("/api/applications/:id/files", authMiddleware, async (req, res) => {
  const appId = parseInt(req.params.id, 10);
  const dbp   = db.promise();
  try {
    const [apps] = await dbp.query("SELECT user_id FROM dorm_applications WHERE application_id = ?", [appId]);
    if (!apps.length) return res.status(404).json({ message: "Application not found" });
    if (req.user.role !== "ADMIN" && apps[0].user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    const [files] = await dbp.query(
      `SELECT fm.file_id, fm.file_path AS stored_name, fm.file_type, fm.upload_date, af.application_id
       FROM application_files af JOIN file_metadata fm ON af.file_id = fm.file_id
       WHERE af.application_id = ? ORDER BY fm.upload_date DESC`,
      [appId]
    );
    res.json(files);
  } catch { res.status(500).json({ message: "Failed to load files" }); }
});

app.get("/api/my-files", authMiddleware, requireRole("STUDENT"), (req, res) => {
  db.query(
    `SELECT fm.file_id, fm.file_path AS stored_name, fm.file_type, fm.upload_date, af.application_id, da.status AS application_status
     FROM file_metadata fm
     JOIN application_files af ON fm.file_id = af.file_id
     JOIN dorm_applications da  ON af.application_id = da.application_id
     WHERE da.user_id = ? ORDER BY fm.upload_date DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load files" });
      res.json(rows);
    }
  );
});

app.get("/api/files/:fileId/download", authMiddleware, async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      `SELECT fm.file_path AS stored_name, da.user_id
       FROM file_metadata fm
       JOIN application_files af ON fm.file_id = af.file_id
       JOIN dorm_applications da  ON af.application_id = da.application_id
       WHERE fm.file_id = ?`,
      [req.params.fileId]
    );
    if (!rows.length) return res.status(404).json({ message: "File not found" });
    if (req.user.role !== "ADMIN" && rows[0].user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    const filePath = path.join(uploadsDir, rows[0].stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on disk" });
    res.download(filePath, rows[0].stored_name);
  } catch { res.status(500).json({ message: "Download failed" }); }
});


// ─── ROOMS (admin only) ───────────────────────────────────────────────────────

app.get("/api/rooms", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    `SELECT r.*, u.name AS resident_name FROM rooms r LEFT JOIN users u ON r.resident_id = u.user_id ORDER BY r.floor, r.room_number`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load rooms" });
      res.json(rows);
    }
  );
});

app.get("/api/rooms/vacant", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    "SELECT room_id, room_number, floor, type FROM rooms WHERE status = 'vacant' ORDER BY floor, room_number",
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load vacant rooms" });
      res.json(rows);
    }
  );
});


// ─── CONTRACTS ───────────────────────────────────────────────────────────────

app.post("/api/contracts", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { user_id, start_date, end_date, status = "ACTIVE" } = req.body;
  if (!user_id || !start_date || !end_date) return res.status(400).json({ message: "user_id, start_date and end_date are required" });
  db.query(
    "INSERT INTO contracts (user_id, start_date, end_date, status) VALUES (?,?,?,?)",
    [user_id, start_date, end_date, status],
    (err) => {
      if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "A contract already exists for this student" });
      if (err) return res.status(500).json({ message: "Failed to create contract" });
      res.json({ message: "Contract created" });
    }
  );
});

app.get("/api/contracts", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    db.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email, r.room_number
       FROM contracts c LEFT JOIN users u ON c.user_id = u.user_id LEFT JOIN rooms r ON c.room_id = r.room_id
       ORDER BY c.contract_id DESC`,
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load contracts" });
        res.json(rows);
      }
    );
  } else {
    db.query(
      `SELECT c.*, r.room_number, r.floor, r.type AS room_type,
              gf.file_path AS generated_doc_path,
              sf.file_path AS signed_doc_path
       FROM contracts c
       LEFT JOIN rooms r ON c.room_id = r.room_id
       LEFT JOIN file_metadata gf ON c.generated_doc_file_id = gf.file_id
       LEFT JOIN file_metadata sf ON c.signed_document_file_id = sf.file_id
       WHERE c.user_id = ? LIMIT 1`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load contract" });
        res.json(rows[0] ?? null);
      }
    );
  }
});

// Download generated contract PDF (student)
app.get("/api/contracts/download", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[contract]] = await dbp.query(
      `SELECT c.signed_document_file_id, c.generated_doc_file_id,
              gf.file_path AS gen_path, sf.file_path AS signed_path
       FROM contracts c
       LEFT JOIN file_metadata gf ON c.generated_doc_file_id = gf.file_id
       LEFT JOIN file_metadata sf ON c.signed_document_file_id = sf.file_id
       WHERE c.user_id = ? LIMIT 1`, [req.user.id]
    );
    if (!contract) return res.status(404).json({ message: "No contract found" });

    // Serve signed version if exists, otherwise generated
    const fileName = contract.signed_path ?? contract.gen_path;
    if (!fileName) return res.status(404).json({ message: "Contract PDF not yet generated" });

    const filePath = path.join(contractsDir, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Contract file not found on server" });
    res.download(filePath, `contract-${req.user.id}.pdf`);
  } catch { res.status(500).json({ message: "Download failed" }); }
});

// Upload signed contract (student) — one-time only
app.post("/api/contracts/sign", authMiddleware, requireRole("STUDENT"), signedUpload.single("signed_contract"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "signed_contract file is required" });
  const dbp = db.promise();
  try {
    const [[contract]] = await dbp.query(
      "SELECT contract_id, signed_document_file_id FROM contracts WHERE user_id = ?", [req.user.id]);
    if (!contract) return res.status(404).json({ message: "No contract found for this student" });
    if (contract.signed_document_file_id) {
      // Remove the freshly-uploaded temp file before rejecting
      fs.unlink(path.join(contractsDir, req.file.filename), () => {});
      return res.status(409).json({ message: "Signed contract has already been uploaded. Contact the admin if you need to replace it." });
    }
    const [fmResult] = await dbp.query(
      "INSERT INTO file_metadata (file_path, file_type) VALUES (?, 'application/pdf')", [req.file.filename]);
    await dbp.query(
      "UPDATE contracts SET signed_document_file_id = ? WHERE contract_id = ?",
      [fmResult.insertId, contract.contract_id]
    );
    res.json({ message: "Signed contract uploaded successfully" });
  } catch { res.status(500).json({ message: "Upload failed" }); }
});

app.patch("/api/contracts/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["ACTIVE","EXTENDED","TERMINATED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  db.query("UPDATE contracts SET status = ? WHERE contract_id = ?", [status, req.params.id], (err, result) => {
    if (err)                  return res.status(500).json({ message: "Update failed" });
    if (!result.affectedRows) return res.status(404).json({ message: "Contract not found" });
    res.json({ message: "Contract status updated" });
  });
});


// ─── COMPLAINTS ──────────────────────────────────────────────────────────────

app.post("/api/complaints", authMiddleware, (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ message: "description is required" });
  db.query("INSERT INTO complaints (user_id, description) VALUES (?,?)", [req.user.id, description], (err) => {
    if (err) return res.status(500).json({ message: "Failed to submit complaint" });
    res.json({ message: "Complaint submitted" });
    // Notify all admins if maintenance alerts are enabled
    const dormId = req.user.dormitory_id;
    db.promise().query(
      "SELECT maintenance_alerts_enabled FROM dormitories WHERE dormitory_id = ?", [dormId]
    ).then(([[dorm]]) => {
      if (!dorm?.maintenance_alerts_enabled) return;
      getAllAdminUserIds().then(adminIds =>
        adminIds.forEach(adminId =>
          pushNotification(adminId, "complaint",
            "A new complaint has been submitted by a student.", "requests")
        )
      );
    }).catch(() => {});
  });
});

app.get("/api/complaints", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    db.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email FROM complaints c
       LEFT JOIN users u ON c.user_id = u.user_id ORDER BY c.created_at DESC`,
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load complaints" });
        res.json(rows);
      }
    );
  } else {
    db.query(
      "SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load complaints" });
        res.json(rows);
      }
    );
  }
});

app.patch("/api/complaints/:id/status", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { status } = req.body;
  const allowed = ["SUBMITTED","IN_PROGRESS","RESOLVED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  const dbp = db.promise();
  try {
    const [[complaint]] = await dbp.query(
      "SELECT user_id, complaint_id FROM complaints WHERE complaint_id = ?", [req.params.id]);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    const [result] = await dbp.query(
      "UPDATE complaints SET status = ? WHERE complaint_id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Complaint not found" });
    res.json({ message: "Complaint status updated" });
    if (status === "IN_PROGRESS") {
      pushStudentNotification(complaint.user_id, req.user.dormitory_id, "complaint",
        `Your complaint #${complaint.complaint_id} is now being investigated.`, "complaints");
    } else if (status === "RESOLVED") {
      pushStudentNotification(complaint.user_id, req.user.dormitory_id, "complaint",
        `Your complaint #${complaint.complaint_id} has been resolved.`, "complaints");
    }
  } catch { res.status(500).json({ message: "Update failed" }); }
});


// ─── PAYMENTS ────────────────────────────────────────────────────────────────

// Student submits payment with mandatory receipt upload
app.post("/api/payments", authMiddleware, requireRole("STUDENT"), receiptUpload.single("receipt"), async (req, res) => {
  const { month, amount } = req.body;
  if (!month || !amount) return res.status(400).json({ message: "month and amount are required" });
  if (!req.file)         return res.status(400).json({ message: "Receipt file is required" });

  const dbp = db.promise();
  try {
    const [meta] = await dbp.query(
      "INSERT INTO file_metadata (file_path, file_type) VALUES (?,?)",
      [req.file.filename, req.file.mimetype]
    );
    await dbp.query(
      "INSERT INTO rent_payments (user_id, month, amount, receipt_file_id, verification_status) VALUES (?,?,?,?,'PENDING_VERIFICATION')",
      [req.user.id, month, amount, meta.insertId]
    );
    res.json({ message: "Payment submitted for verification" });
  } catch (err) {
    res.status(500).json({ message: "Failed to record payment" });
  }
});

// GET all payments — includes receipt info and verification_status
app.get("/api/payments", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT rp.*, u.name AS user_name, u.email AS user_email,
             fm.file_path AS receipt_path, fm.file_type AS receipt_type
      FROM rent_payments rp
      LEFT JOIN users u ON rp.user_id = u.user_id
      LEFT JOIN file_metadata fm ON rp.receipt_file_id = fm.file_id
      ORDER BY rp.created_at DESC`;
    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load payments" });
      res.json(rows);
    });
  } else {
    db.query(
      `SELECT rp.*, fm.file_path AS receipt_path
       FROM rent_payments rp
       LEFT JOIN file_metadata fm ON rp.receipt_file_id = fm.file_id
       WHERE rp.user_id = ? ORDER BY rp.created_at DESC`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load payments" });
        res.json(rows);
      }
    );
  }
});

// Admin verifies a payment
app.patch("/api/payments/:id/verify", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[payment]] = await dbp.query(
      "SELECT user_id, month FROM rent_payments WHERE payment_id = ?", [req.params.id]);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    const [result] = await dbp.query(
      "UPDATE rent_payments SET verification_status = 'VERIFIED' WHERE payment_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment verified" });
    pushStudentNotification(payment.user_id, req.user.dormitory_id, "payment",
      `Your payment for ${payment.month} has been verified successfully.`, "payments");
  } catch { res.status(500).json({ message: "Update failed" }); }
});

// Admin rejects a payment
app.patch("/api/payments/:id/reject", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[payment]] = await dbp.query(
      "SELECT user_id, month FROM rent_payments WHERE payment_id = ?", [req.params.id]);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    const [result] = await dbp.query(
      "UPDATE rent_payments SET verification_status = 'REJECTED' WHERE payment_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment rejected" });
    pushStudentNotification(payment.user_id, req.user.dormitory_id, "payment",
      `Your payment for ${payment.month} was rejected. Please resubmit with a valid receipt.`, "payments");
  } catch { res.status(500).json({ message: "Update failed" }); }
});

// Admin downloads a payment receipt
app.get("/api/payments/:id/receipt", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      `SELECT fm.file_path FROM rent_payments rp
       JOIN file_metadata fm ON rp.receipt_file_id = fm.file_id
       WHERE rp.payment_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Receipt not found" });
    const filePath = path.join(receiptsDir, rows[0].file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on disk" });
    res.download(filePath, rows[0].file_path);
  } catch { res.status(500).json({ message: "Download failed" }); }
});


// Payment summary for a specific month (admin only)
app.get("/api/payments/summary", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ message: "month and year are required" });
  const dbp = db.promise();
  try {
    const [payments] = await dbp.query(
      `SELECT rp.payment_id, rp.user_id, rp.month, rp.amount, rp.verification_status,
              rp.created_at, u.name AS user_name
       FROM rent_payments rp
       JOIN users u ON u.user_id = rp.user_id
       WHERE rp.month = ? AND YEAR(rp.created_at) = ?
       ORDER BY rp.created_at DESC`,
      [month, year]
    );
    const verified  = payments.filter(p => p.verification_status === 'VERIFIED');
    const pending   = payments.filter(p => p.verification_status === 'PENDING_VERIFICATION');
    const rejected  = payments.filter(p => p.verification_status === 'REJECTED');
    res.json({
      month, year: Number(year),
      totalVerified:  verified.reduce((s, p) => s + Number(p.amount), 0),
      totalPending:   pending.reduce((s, p) => s + Number(p.amount), 0),
      totalRejected:  rejected.reduce((s, p) => s + Number(p.amount), 0),
      verifiedCount:  verified.length,
      pendingCount:   pending.length,
      rejectedCount:  rejected.length,
      payments,
    });
  } catch (err) { res.status(500).json({ message: "Failed to load summary" }); }
});

// Admin room status change (maintenance → vacant)
app.patch("/api/rooms/:id/status", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[room]] = await dbp.query("SELECT status FROM rooms WHERE room_id = ?", [req.params.id]);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.status !== 'maintenance') return res.status(400).json({ message: "Only maintenance rooms can be cleared" });
    await dbp.query("UPDATE rooms SET status = 'vacant' WHERE room_id = ?", [req.params.id]);
    res.json({ message: "Room marked as vacant" });
  } catch { res.status(500).json({ message: "Failed to update room status" }); }
});


// ─── REPORTS ─────────────────────────────────────────────────────────────────

// Async PDF generation with progress tracking
app.post("/api/reports", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [progRow] = await dbp.query(
      "INSERT INTO progress (user_id, task_name, percentage, status) VALUES (?,?,0,?)",
      [req.user.id, "report_generation", "Starting…"]
    );
    const progressId = progRow.insertId;

    const [repRow] = await dbp.query(
      "INSERT INTO reports (generated_by, status, progress_id) VALUES (?,?,?)",
      [req.user.id, "PENDING", progressId]
    );
    const reportId = repRow.insertId;

    res.json({ message: "Report generation started", reportId, progressId });

    // Run PDF generation asynchronously after response is sent
    setImmediate(() => generatePdfReport(dbp, req.user.id, reportId, progressId));
  } catch (err) {
    res.status(500).json({ message: "Failed to start report generation" });
  }
});

// Poll progress of a report
app.get("/api/reports/:id/progress", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      `SELECT r.status AS reportStatus, r.file_path, p.percentage, p.status AS stage
       FROM reports r
       LEFT JOIN progress p ON r.progress_id = p.progress_id
       WHERE r.report_id = ? AND r.generated_by = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Report not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ message: "Failed to get progress" }); }
});

// Download a completed report PDF
app.get("/api/reports/:id/download", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      "SELECT file_path, status FROM reports WHERE report_id = ? AND generated_by = ?",
      [req.params.id, req.user.id]
    );
    if (!rows.length)                   return res.status(404).json({ message: "Report not found" });
    if (rows[0].status !== "COMPLETED") return res.status(400).json({ message: "Report not ready" });
    const filePath = path.join(reportsDir, rows[0].file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on disk" });
    res.download(filePath, rows[0].file_path);
  } catch { res.status(500).json({ message: "Download failed" }); }
});

// Cancel a pending report
app.delete("/api/reports/:id", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    await dbp.query(
      "UPDATE reports SET status = 'CANCELLED' WHERE report_id = ? AND generated_by = ? AND status = 'PENDING'",
      [req.params.id, req.user.id]
    );
    await dbp.query(
      `UPDATE progress p JOIN reports r ON r.progress_id = p.progress_id
       SET p.status = 'cancelled', p.percentage = 0 WHERE r.report_id = ?`,
      [req.params.id]
    );
    res.json({ message: "Cancelled" });
  } catch { res.status(500).json({ message: "Cancel failed" }); }
});

// Admin: list admin-generated reports only
app.get("/api/reports", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    `SELECT r.*, u.name AS generated_by_name FROM reports r
     LEFT JOIN users u ON r.generated_by = u.user_id
     WHERE r.report_source = 'ADMIN'
     ORDER BY r.generation_date DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load reports" });
      res.json(rows);
    }
  );
});

// Admin: generate dormitory PDF report (with embedded chart images from frontend)
app.post("/api/admin/reports", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { stats, chartImages } = req.body;
  const dbp = db.promise();
  try {
    const [[dorm]] = await dbp.query(
      "SELECT name, address FROM dormitories WHERE dormitory_id = ?", [req.user.dormitory_id]);
    const dormName = dorm?.name ?? 'Dormitory';
    const dormAddr = dorm?.address ?? '';

    const fileName = `admin_report_${req.user.id}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);

      const blue = '#1a3a5c', accent = '#3b82f6';
      const pageW = doc.page.width;
      const contentW = pageW - 100;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // ── Cover header ──
      doc.rect(0, 0, pageW, 90).fill(blue);
      doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
         .text(dormName, 50, 22, { align: 'center', width: contentW });
      doc.fontSize(10).font('Helvetica').fillColor('#aaccee')
         .text(dormAddr, 50, 48, { align: 'center', width: contentW });
      doc.fillColor('#fff').fontSize(8)
         .text(`Full Dormitory Report · ${dateStr}`, 50, 66, { align: 'center', width: contentW });

      let y = 108;

      // Helper: section title
      const sectionTitle = (title, icon) => {
        doc.rect(50, y, contentW, 24).fill(accent);
        doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
           .text(title, 60, y + 6, { width: contentW - 20 });
        y += 32;
        doc.fillColor('#000').font('Helvetica').fontSize(9);
      };

      // Helper: stat row
      const statRow = (label, value) => {
        doc.font('Helvetica-Bold').fillColor('#333').text(label + ':', 60, y, { continued: true, width: 200 });
        doc.font('Helvetica').fillColor('#000').text('  ' + value);
        y += 16;
      };

      // Helper: embed chart image (base64 PNG from Chart.js canvas)
      const embedChart = (b64, label) => {
        if (!b64) return;
        try {
          const buf = Buffer.from(b64.replace(/^data:image\/png;base64,/, ''), 'base64');
          const imgW = 220, imgH = 130;
          const x = (pageW - imgW) / 2;
          if (y + imgH + 20 > doc.page.height - 50) { doc.addPage(); y = 50; }
          doc.image(buf, x, y, { width: imgW, height: imgH });
          y += imgH + 8;
          doc.fontSize(7).fillColor('#666').font('Helvetica')
             .text(label, 0, y, { align: 'center', width: pageW });
          y += 16;
        } catch {}
      };

      // ── 1. Occupancy ──
      sectionTitle('1. Occupancy');
      statRow('Total Rooms', stats?.totalRooms ?? '—');
      statRow('Occupied', stats?.occupiedRooms ?? '—');
      statRow('Vacant', stats?.vacantRooms ?? '—');
      statRow('Under Maintenance', stats?.maintenanceRooms ?? '—');
      statRow('Occupancy Rate', stats?.totalRooms ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) + '%' : '—');
      y += 6;
      embedChart(chartImages?.occupancy, 'Figure 1 — Room Status Distribution');

      // ── 2. Finances ──
      if (y + 80 > doc.page.height - 50) { doc.addPage(); y = 50; }
      sectionTitle('2. Finances');
      statRow('Active Contracts', stats?.activeContracts ?? '—');
      statRow('Total Payments Recorded', stats?.totalPayments ?? '—');
      statRow('Pending Applications', stats?.pendingApplications ?? '—');
      y += 6;
      embedChart(chartImages?.finances, 'Figure 2 — Payment Verification Status');

      // ── 3. Maintenance ──
      if (y + 80 > doc.page.height - 50) { doc.addPage(); y = 50; }
      sectionTitle('3. Maintenance & Complaints');
      statRow('Total Students', stats?.totalStudents ?? '—');
      statRow('Open Complaints', stats?.openComplaints ?? '—');
      y += 6;
      embedChart(chartImages?.maintenance, 'Figure 3 — Complaint Status Breakdown');

      // ── Footer ──
      doc.fontSize(7).fillColor('#999').font('Helvetica')
         .text(`Generated by DormMS · ${dateStr}`, 50, doc.page.height - 35, { align: 'center', width: contentW });

      doc.end();
    });

    const [repRow] = await dbp.query(
      "INSERT INTO reports (generated_by, status, file_path, report_source) VALUES (?,?,?,?)",
      [req.user.id, 'COMPLETED', fileName, 'ADMIN']
    );
    res.json({ message: "Report generated", reportId: repRow.insertId, fileName });
  } catch (err) {
    console.error("Admin report error:", err.message);
    res.status(500).json({ message: "Failed to generate report" });
  }
});


// ─── CONTRACT PDF GENERATION ──────────────────────────────────────────────────

function getOrdinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function generateContractPdf(contractId, d) {
  return new Promise((resolve, reject) => {
    const fileName = `contract_${contractId}_${Date.now()}.pdf`;
    const filePath = path.join(contractsDir, fileName);
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const blue = '#1a3a5c', accent = '#3b82f6', gray = '#555555', dark = '#1a1a2e';

    // ── Header ──
    doc.rect(0, 0, 595, 100).fill(blue);
    doc.fontSize(20).fillColor('#ffffff').text(d.dormName || 'Dormitory', 60, 28, { align: 'center' });
    doc.fontSize(10).fillColor('#bbccdd').text(d.address || '', 60, 54, { align: 'center' });
    doc.fontSize(13).fillColor('#ffffff').text('DORMITORY LEASE CONTRACT', 60, 72, { align: 'center' });

    doc.fillColor(dark).moveDown(1);
    const startY = 115;
    doc.y = startY;

    doc.fontSize(9).fillColor(gray)
      .text(`Contract Reference: CTR-${String(contractId).padStart(3,'0')}`, { align: 'right' });
    doc.moveDown(0.5);

    // ── Section helper ──
    const section = (title) => {
      doc.moveDown(0.6);
      doc.fontSize(11).fillColor(blue).text(title);
      doc.moveTo(60, doc.y + 2).lineTo(535, doc.y + 2).strokeColor(accent).lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(dark);
    };

    const row = (label, value) => {
      doc.fontSize(10);
      doc.fillColor(gray).text(label + ':', { continued: true, width: 160 });
      doc.fillColor(dark).text('  ' + (value || '—'));
    };

    // ── Student Info ──
    section('STUDENT INFORMATION');
    row('Full Name',    d.studentName);
    row('Student ID',  d.studentId);
    row('Course',      d.course);
    row('University',  d.university);

    // ── Room Details ──
    section('ROOM DETAILS');
    row('Room Number', d.roomNumber);
    row('Floor',       d.floor);
    row('Room Type',   d.roomType);

    // ── Contract Terms ──
    section('CONTRACT TERMS');
    row('Start Date',     new Date(d.startDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
    row('End Date',       new Date(d.endDate).toLocaleDateString('en-US',   { year:'numeric', month:'long', day:'numeric' }));
    row('Monthly Rent',   `€${Number(d.monthlyRent).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    row('Payment Due',    `${getOrdinal(Number(d.dueDay))} of each month`);

    // ── T&C ──
    section('TERMS AND CONDITIONS');
    const terms = [
      '1. The tenant shall pay the monthly rent on or before the due date specified above.',
      '2. Late payments are subject to a 5% penalty per week of delay.',
      '3. The tenant shall maintain the assigned room in a clean and orderly condition.',
      '4. Smoking, alcohol, and illegal substances are strictly prohibited on the premises.',
      '5. Visitors must register at reception and must leave by 10:00 PM.',
      '6. The tenant is responsible for any damage to dormitory property.',
      '7. One month written notice is required before vacating.',
      '8. Management may terminate this contract upon violation of any of the above terms.',
    ];
    doc.fontSize(9).fillColor(dark).list(terms, { lineGap: 3, bulletRadius: 2 });

    // ── Signatures ──
    section('SIGNATURES');
    doc.moveDown(0.5);
    const sigY = doc.y;

    doc.fontSize(10).fillColor(dark);
    doc.text('Student Signature:', 60,  sigY);
    doc.text('Administrator Signature:', 310, sigY);

    doc.moveTo(60,  sigY + 45).lineTo(250, sigY + 45).strokeColor('#999').lineWidth(0.5).stroke();
    doc.moveTo(310, sigY + 45).lineTo(500, sigY + 45).strokeColor('#999').lineWidth(0.5).stroke();

    doc.fontSize(9).fillColor(gray);
    doc.text(d.studentName, 60,  sigY + 48);
    doc.text('Authorized Signatory',   310, sigY + 48);
    doc.text('Date: _______________',  60,  sigY + 60);
    doc.text('Date: _______________',  310, sigY + 60);

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error',  reject);
  });
}

// ─── PDF GENERATION (async) ───────────────────────────────────────────────────

async function generatePdfReport(dbp, userId, reportId, progressId) {
  const updateProgress = (pct, stage) =>
    dbp.query("UPDATE progress SET percentage = ?, status = ? WHERE progress_id = ?", [pct, stage, progressId]);

  try {
    // Stage 1 — fetch profile
    await updateProgress(20, "Fetching student profile…");
    const [users] = await dbp.query(
      `SELECT u.name, u.email, sp.student_id_number, sp.course, sp.university
       FROM users u LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
       WHERE u.user_id = ?`,
      [userId]
    );
    const student = users[0] ?? {};

    // Stage 2 — fetch payments
    await updateProgress(50, "Loading payment history…");
    const [payments] = await dbp.query(
      `SELECT rp.payment_id, rp.month, rp.amount, rp.verification_status, rp.created_at
       FROM rent_payments rp WHERE rp.user_id = ? ORDER BY rp.created_at DESC`,
      [userId]
    );

    // Check if cancelled before heavy work
    const [repCheck] = await dbp.query("SELECT status FROM reports WHERE report_id = ?", [reportId]);
    if (repCheck[0]?.status === "CANCELLED") return;

    // Stage 3 — build PDF
    await updateProgress(80, "Building PDF…");

    const fileName = `report_${userId}_${reportId}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ── Header ─────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill("#1a3a5c");
      doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
         .text("Rent Payment History Report", 50, 25, { align: "center" });
      doc.fillColor("#000000").fontSize(10).font("Helvetica");

      let y = 100;

      // ── Student info ───────────────────────────────────────────────
      doc.fontSize(11).font("Helvetica-Bold").text("Student Information", 50, y);
      y += 18;
      doc.fontSize(9).font("Helvetica");

      const info = [
        ["Name",       student.name             ?? "N/A"],
        ["Email",      student.email            ?? "N/A"],
        ["Student ID", student.student_id_number ?? "N/A"],
        ["Course",     student.course           ?? "N/A"],
        ["University", student.university        ?? "N/A"],
        ["Generated",  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
      ];
      info.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").text(`${label}:`, 50, y, { continued: true, width: 120 });
        doc.font("Helvetica").text(` ${value}`, { width: 400 });
        y += 16;
      });

      y += 10;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#cccccc").lineWidth(1).stroke();
      y += 15;

      // ── Table header ───────────────────────────────────────────────
      const cols = { id: 50, month: 110, amount: 180, status: 280, date: 420 };

      doc.rect(50, y, doc.page.width - 100, 20).fill("#1a3a5c");
      doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold");
      doc.text("Payment ID", cols.id,     y + 5, { width: 55,  lineBreak: false });
      doc.text("Month",      cols.month,  y + 5, { width: 60,  lineBreak: false });
      doc.text("Amount (€)", cols.amount, y + 5, { width: 90,  lineBreak: false });
      doc.text("Status",     cols.status, y + 5, { width: 130, lineBreak: false });
      doc.text("Date",       cols.date,   y + 5, { width: 120, lineBreak: false });
      doc.fillColor("#000000");
      y += 22;

      // ── Payment rows ───────────────────────────────────────────────
      let total = 0;
      const statusColors = { VERIFIED: "#16a34a", REJECTED: "#dc2626", PENDING_VERIFICATION: "#d97706" };

      payments.forEach((p, idx) => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
        if (idx % 2 === 0) doc.rect(50, y, doc.page.width - 100, 18).fill("#f8fafc");
        const amt = parseFloat(p.amount);
        total += amt;
        doc.fillColor("#000000").font("Helvetica").fontSize(8.5);
        doc.text(`#${p.payment_id}`,                         cols.id,     y + 4, { width: 55,  lineBreak: false });
        doc.text(p.month,                                    cols.month,  y + 4, { width: 60,  lineBreak: false });
        doc.text(`€${amt.toFixed(2)}`,                       cols.amount, y + 4, { width: 90,  lineBreak: false });
        doc.fillColor(statusColors[p.verification_status] ?? "#555555");
        doc.text(p.verification_status ?? "N/A",             cols.status, y + 4, { width: 130, lineBreak: false });
        doc.fillColor("#000000");
        doc.text(new Date(p.created_at).toLocaleDateString(), cols.date,  y + 4, { width: 120, lineBreak: false });
        y += 18;
      });

      // ── Total row ──────────────────────────────────────────────────
      y += 5;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#cccccc").stroke();
      y += 8;
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a3a5c")
         .text(`Total Payments: ${payments.length}`, 50, y, { continued: true })
         .text(`Total Amount: €${total.toFixed(2)}`, { align: "right" });

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Stage 4 — save
    await dbp.query(
      "UPDATE reports SET status = 'COMPLETED', file_path = ? WHERE report_id = ?",
      [fileName, reportId]
    );
    await updateProgress(100, "completed");

  } catch (err) {
    console.error("PDF generation failed:", err.message);
    await dbp.query("UPDATE reports SET status = 'FAILED' WHERE report_id = ?", [reportId]).catch(() => {});
    await dbp.query("UPDATE progress SET status = 'failed' WHERE progress_id = ?", [progressId]).catch(() => {});
  }
}


// ─── ADMIN PROFILE ───────────────────────────────────────────────────────────

app.get("/api/admin/profile", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    `SELECT u.user_id, u.name, u.email, COALESCE(ap.position,'Dormitory Administrator') AS position,
            ap.phone, d.dormitory_id, d.name AS dormitory_name, d.address,
            d.contact_email, d.contact_phone, d.max_capacity
     FROM users u
     LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id
     LEFT JOIN dormitories d    ON ap.dormitory_id = d.dormitory_id
     WHERE u.user_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err)           return res.status(500).json({ message: "Failed to load admin profile" });
      if (!rows.length)  return res.status(404).json({ message: "Profile not found" });
      res.json(rows[0]);
    }
  );
});

app.put("/api/admin/profile", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, position, phone, dormitory_name, address, contact_email, contact_phone, max_capacity } = req.body;
  if (!name || !email) return res.status(400).json({ message: "name and email are required" });
  const dbp = db.promise();
  try {
    await dbp.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [name, email, req.user.id]);
    await dbp.query("UPDATE admin_profiles SET position = ?, phone = ? WHERE user_id = ?", [position ?? "Dormitory Administrator", phone ?? null, req.user.id]);
    const newCapacity = max_capacity ?? 50;
    await dbp.query(
      `UPDATE dormitories SET name = ?, address = ?, contact_email = ?, contact_phone = ?, max_capacity = ?
       WHERE dormitory_id = (SELECT dormitory_id FROM admin_profiles WHERE user_id = ?)`,
      [dormitory_name, address ?? null, contact_email ?? null, contact_phone ?? null, newCapacity, req.user.id]
    );

    // Sync room count to max_capacity
    const [[{ currentCount }]] = await dbp.query("SELECT COUNT(*) AS currentCount FROM rooms");
    if (newCapacity > currentCount) {
      const toCreate = newCapacity - currentCount;
      for (let i = 1; i <= toCreate; i++) {
        const num = currentCount + i;
        const floor = Math.ceil(num / 10);
        const roomNum = `${floor}${String(num % 10 === 0 ? 10 : num % 10).padStart(2, '0')}`;
        await dbp.query(
          "INSERT INTO rooms (room_number, floor, type, status) VALUES (?,?,?,?)",
          [roomNum, floor, 'Single', 'vacant']
        );
      }
    } else if (newCapacity < currentCount) {
      const toRemove = currentCount - newCapacity;
      await dbp.query(
        "DELETE FROM rooms WHERE status = 'vacant' ORDER BY room_id DESC LIMIT ?",
        [toRemove]
      );
    }

    res.json({ message: "Admin profile updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already in use" });
    res.status(500).json({ message: "Failed to update profile" });
  }
});


// ─── ACTIVITY FEED (admin only) ───────────────────────────────────────────────

app.get("/api/activity", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const sql = `
    (SELECT 'application' AS type, da.application_id AS ref_id, u.name AS actor, da.status AS detail, da.created_at
     FROM dorm_applications da LEFT JOIN users u ON da.user_id = u.user_id)
    UNION ALL
    (SELECT 'complaint', c.complaint_id, u.name, c.status, c.created_at
     FROM complaints c LEFT JOIN users u ON c.user_id = u.user_id)
    UNION ALL
    (SELECT 'payment', rp.payment_id, u.name, rp.month, rp.created_at
     FROM rent_payments rp LEFT JOIN users u ON rp.user_id = u.user_id)
    ORDER BY created_at DESC LIMIT 10`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to load activity" });
    res.json(rows);
  });
});


// ─── DORMITORY SETTINGS ──────────────────────────────────────────────────────

app.get("/api/dormitory-settings", authMiddleware, async (req, res) => {
  const dbp = db.promise();
  try {
    const [[settings]] = await dbp.query(
      "SELECT notifications_enabled, payment_reminders_enabled, maintenance_alerts_enabled FROM dormitories WHERE dormitory_id = ?",
      [req.user.dormitory_id]
    );
    res.json(settings ?? { notifications_enabled: 1, payment_reminders_enabled: 1, maintenance_alerts_enabled: 1 });
  } catch (err) { res.status(500).json({ message: "Failed to load settings" }); }
});

app.put("/api/dormitory-settings", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { notifications_enabled, payment_reminders_enabled, maintenance_alerts_enabled } = req.body;
  const dbp = db.promise();
  try {
    await dbp.query(
      "UPDATE dormitories SET notifications_enabled = ?, payment_reminders_enabled = ?, maintenance_alerts_enabled = ? WHERE dormitory_id = ?",
      [notifications_enabled ? 1 : 0, payment_reminders_enabled ? 1 : 0, maintenance_alerts_enabled ? 1 : 0, req.user.dormitory_id]
    );
    res.json({ message: "Settings saved" });
  } catch (err) { res.status(500).json({ message: "Failed to save settings" }); }
});


// ─── STUDENT PROFILE ─────────────────────────────────────────────────────────

app.get("/api/profile", authMiddleware, requireRole("STUDENT"), (req, res) => {
  db.query(
    `SELECT u.user_id, u.name, u.email, u.role,
            sp.phone, sp.student_id_number, sp.course, sp.university,
            sp.academic_details, sp.application_status,
            d.name AS dormitory_name, d.contact_email AS dorm_contact_email, d.contact_phone AS dorm_contact_phone,
            r.room_number, r.floor, r.type AS room_type
     FROM users u
     LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
     LEFT JOIN dormitories d ON d.dormitory_id = 1
     LEFT JOIN rooms r ON sp.room_id = r.room_id
     WHERE u.user_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err)          return res.status(500).json({ message: "Failed to load profile" });
      if (!rows.length) return res.status(404).json({ message: "User not found" });
      res.json(rows[0]);
    }
  );
});

app.put("/api/profile", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const { name, email, phone, student_id_number, course, university } = req.body;
  if (!name || !email) return res.status(400).json({ message: "name and email are required" });
  const dbp = db.promise();
  try {
    await dbp.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [name, email, req.user.id]);
    await dbp.query(
      `INSERT INTO student_profiles (user_id, phone, student_id_number, course, university) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE phone = VALUES(phone), student_id_number = VALUES(student_id_number),
                               course = VALUES(course), university = VALUES(university)`,
      [req.user.id, phone ?? null, student_id_number ?? null, course ?? null, university ?? null]
    );
    res.json({ message: "Profile updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already in use" });
    res.status(500).json({ message: "Failed to update profile" });
  }
});


// ─── USERS (admin only) ───────────────────────────────────────────────────────

app.get("/api/users", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    `SELECT u.user_id, u.name, u.email, u.role, u.created_at, sp.course, sp.university,
            sp.student_id_number, sp.application_status, r.room_number
     FROM users u LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
     LEFT JOIN rooms r ON sp.room_id = r.room_id WHERE u.role = 'STUDENT' ORDER BY u.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load users" });
      res.json(rows);
    }
  );
});


// ─── OVERDUE PAYMENTS (student) ───────────────────────────────────────────────

app.get("/api/payments/overdue", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  try {
    const [[contract]] = await dbp.query(
      "SELECT start_date, monthly_rent, due_day FROM contracts WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1",
      [req.user.id]
    );
    if (!contract || !contract.start_date) return res.json({ overdueMonths: [], totalOverdue: 0 });

    const [verified] = await dbp.query(
      "SELECT month FROM rent_payments WHERE user_id = ? AND verification_status = 'VERIFIED'",
      [req.user.id]
    );
    const paidMonths = new Set(verified.map(p => p.month)); // e.g. Set { 'Jan', 'Mar' }

    const now     = new Date();
    const dueDay  = Number(contract.due_day) || 15;
    // Last month that is fully past-due: if today >= dueDay then current month counts, else last month
    const lastDue = now.getDate() >= dueDay
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const start   = new Date(contract.start_date);
    const cursor  = new Date(start.getFullYear(), start.getMonth(), 1);
    const overdue = [];

    while (cursor <= lastDue) {
      const monthStr = MONTHS[cursor.getMonth()];
      if (!paidMonths.has(monthStr)) {
        overdue.push(`${monthStr} ${cursor.getFullYear()}`);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({
      overdueMonths: overdue,
      totalOverdue:  overdue.length * Number(contract.monthly_rent),
      monthlyRent:   Number(contract.monthly_rent),
    });
  } catch { res.status(500).json({ message: "Failed to check overdue payments" }); }
});


// ─── TERMINATION REQUESTS ─────────────────────────────────────────────────────

// Student submits a termination request
app.post("/api/termination-requests", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const { reason, requested_end_date } = req.body;
  if (!reason || !requested_end_date)
    return res.status(400).json({ message: "reason and requested_end_date are required" });
  const dbp = db.promise();
  try {
    const [[contract]] = await dbp.query(
      "SELECT contract_id FROM contracts WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1", [req.user.id]);
    if (!contract) return res.status(404).json({ message: "No active contract found" });
    // Check no pending request already exists
    const [[existing]] = await dbp.query(
      "SELECT request_id FROM termination_requests WHERE user_id = ? AND status = 'PENDING'", [req.user.id]);
    if (existing) return res.status(409).json({ message: "You already have a pending termination request" });
    const [result] = await dbp.query(
      "INSERT INTO termination_requests (user_id, contract_id, reason, requested_end_date) VALUES (?,?,?,?)",
      [req.user.id, contract.contract_id, reason, requested_end_date]);
    res.json({ message: "Termination request submitted", requestId: result.insertId });
    // Notify all admins
    getAllAdminUserIds().then(adminIds =>
      adminIds.forEach(adminId =>
        pushNotification(adminId, "contract",
          "A student has submitted a termination request.", "residents")
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit termination request" });
  }
});

// Student checks own termination request
app.get("/api/termination-requests/mine", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[request]] = await dbp.query(
      "SELECT * FROM termination_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [req.user.id]);
    res.json(request ?? null);
  } catch { res.status(500).json({ message: "Failed to load termination request" }); }
});

// Admin gets all termination requests
app.get("/api/termination-requests", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      `SELECT tr.*, u.name AS user_name, u.email AS user_email, r.room_number
       FROM termination_requests tr
       LEFT JOIN users u ON tr.user_id = u.user_id
       LEFT JOIN contracts c ON tr.contract_id = c.contract_id
       LEFT JOIN rooms r ON c.room_id = r.room_id
       ORDER BY tr.created_at DESC`);
    res.json(rows);
  } catch { res.status(500).json({ message: "Failed to load termination requests" }); }
});

// Admin accepts a termination request → sets end_date = today + 1 month, status = TERMINATED
app.patch("/api/termination-requests/:id/accept", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[request]] = await dbp.query(
      "SELECT * FROM termination_requests WHERE request_id = ?", [req.params.id]);
    if (!request) return res.status(404).json({ message: "Request not found" });
    const minEnd = new Date();
    minEnd.setMonth(minEnd.getMonth() + 1);
    const requested = new Date(request.requested_end_date);
    const endDateStr = (requested > minEnd ? requested : minEnd).toISOString().slice(0, 10);
    await dbp.query("START TRANSACTION");
    await dbp.query(
      "UPDATE contracts SET status = 'TERMINATED', end_date = ? WHERE contract_id = ?",
      [endDateStr, request.contract_id]);
    await dbp.query(
      "UPDATE termination_requests SET status = 'ACCEPTED' WHERE request_id = ?", [req.params.id]);
    // Free up the room
    await dbp.query(
      "UPDATE rooms SET status = 'vacant', resident_id = NULL WHERE resident_id = ?", [request.user_id]);
    await dbp.query("COMMIT");
    res.json({ message: "Termination request accepted", end_date: endDateStr });
    pushStudentNotification(request.user_id, req.user.dormitory_id, "contract",
      `Your contract termination request has been accepted. Your contract will end on ${endDateStr}.`, "contract");
  } catch (err) {
    await dbp.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ message: "Failed to accept termination request" });
  }
});

// Admin rejects a termination request
app.patch("/api/termination-requests/:id/reject", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [[request]] = await dbp.query(
      "SELECT user_id FROM termination_requests WHERE request_id = ?", [req.params.id]);
    if (!request) return res.status(404).json({ message: "Request not found" });
    const [result] = await dbp.query(
      "UPDATE termination_requests SET status = 'REJECTED' WHERE request_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Request not found" });
    res.json({ message: "Termination request rejected" });
    pushStudentNotification(request.user_id, req.user.dormitory_id, "contract",
      "Your contract termination request has been declined.", "contract");
  } catch { res.status(500).json({ message: "Failed to reject termination request" }); }
});

// Admin get students with active contracts (for admin-terminate dialog)
app.get("/api/contracts/active-students", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  try {
    const [rows] = await dbp.query(
      `SELECT c.contract_id, c.user_id, c.room_id, c.start_date, c.end_date, c.monthly_rent,
              u.name AS user_name, u.email AS user_email, r.room_number
       FROM contracts c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN rooms r ON c.room_id = r.room_id
       WHERE c.status = 'ACTIVE'
       ORDER BY u.name ASC`);
    res.json(rows);
  } catch { res.status(500).json({ message: "Failed to load active contracts" }); }
});

// Admin initiates contract termination directly
app.post("/api/contracts/admin-terminate", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { contract_id, reason, requested_end_date } = req.body;
  if (!contract_id || !reason || !requested_end_date)
    return res.status(400).json({ message: "contract_id, reason and requested_end_date are required" });
  const dbp = db.promise();
  try {
    const [[contract]] = await dbp.query(
      "SELECT * FROM contracts WHERE contract_id = ? AND status = 'ACTIVE'", [contract_id]);
    if (!contract) return res.status(404).json({ message: "Active contract not found" });
    const minEnd = new Date();
    minEnd.setMonth(minEnd.getMonth() + 1);
    const requested = new Date(requested_end_date);
    const endDateStr = (requested > minEnd ? requested : minEnd).toISOString().slice(0, 10);
    await dbp.query("START TRANSACTION");
    await dbp.query(
      "UPDATE contracts SET status = 'TERMINATED', end_date = ?, termination_reason = ? WHERE contract_id = ?",
      [endDateStr, reason, contract_id]);
    await dbp.query(
      "UPDATE rooms SET status = 'vacant', resident_id = NULL WHERE resident_id = ?", [contract.user_id]);
    await dbp.query("COMMIT");
    res.json({ message: "Contract terminated", end_date: endDateStr });
  } catch (err) {
    await dbp.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ message: "Failed to terminate contract" });
  }
});


// ─── STATS (admin only) ───────────────────────────────────────────────────────

app.get("/api/stats", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const dbp = db.promise();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now          = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const lastMonth    = MONTHS[(now.getMonth() + 11) % 12];
  try {
    const [
      [totalRoomsR], [occupiedR], [vacantR], [maintenanceR], [studentsR],
      [pendingAppsR], [openComplR], [activeCtrsR], [totalPaysR],
      [paidThisMonthR], [outstandingR], [overdueCountR],
    ] = await Promise.all([
      dbp.query("SELECT COUNT(*) AS v FROM rooms"),
      dbp.query("SELECT COUNT(*) AS v FROM rooms WHERE status = 'occupied'"),
      dbp.query("SELECT COUNT(*) AS v FROM rooms WHERE status = 'vacant'"),
      dbp.query("SELECT COUNT(*) AS v FROM rooms WHERE status = 'maintenance'"),
      dbp.query("SELECT COUNT(*) AS v FROM users WHERE role = 'STUDENT'"),
      dbp.query("SELECT COUNT(*) AS v FROM dorm_applications WHERE status = 'PENDING'"),
      dbp.query("SELECT COUNT(*) AS v FROM complaints WHERE status != 'RESOLVED'"),
      dbp.query("SELECT COUNT(*) AS v FROM contracts WHERE status = 'ACTIVE'"),
      dbp.query("SELECT COUNT(*) AS v FROM rent_payments"),
      dbp.query("SELECT COALESCE(SUM(amount),0) AS v FROM rent_payments WHERE month = ? AND verification_status = 'VERIFIED'", [currentMonth]),
      dbp.query("SELECT COALESCE(SUM(amount),0) AS v FROM rent_payments WHERE verification_status = 'PENDING_VERIFICATION'"),
      dbp.query(
        `SELECT COUNT(DISTINCT c.user_id) AS v FROM contracts c WHERE c.status = 'ACTIVE'
         AND c.user_id NOT IN (
           SELECT user_id FROM rent_payments WHERE month = ? AND verification_status = 'VERIFIED'
         )`, [lastMonth]
      ),
    ]);

    const activeContracts = activeCtrsR[0].v;
    const overdueResidentCount = overdueCountR[0].v;
    const collectionRate = activeContracts > 0
      ? Math.round((activeContracts - overdueResidentCount) / activeContracts * 100) : 0;

    res.json({
      totalRooms:          totalRoomsR[0].v,
      occupiedRooms:       occupiedR[0].v,
      vacantRooms:         vacantR[0].v,
      maintenanceRooms:    maintenanceR[0].v,
      totalStudents:       studentsR[0].v,
      pendingApplications: pendingAppsR[0].v,
      openComplaints:      openComplR[0].v,
      activeContracts,
      totalPayments:       totalPaysR[0].v,
      paidThisMonth:       Number(paidThisMonthR[0].v),
      totalOutstanding:    Number(outstandingR[0].v),
      overdueResidentCount,
      collectionRate,
      currentMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});


// ─── SERVER ───────────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => console.log(`DormMS API running on http://localhost:${PORT}`));
