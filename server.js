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

const uploadsDir  = path.join(__dirname, "uploads", "applications");
const receiptsDir = path.join(__dirname, "uploads", "receipts");
const reportsDir  = path.join(__dirname, "uploads", "reports");

[uploadsDir, receiptsDir, reportsDir].forEach(d => {
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

const upload        = multer({ storage: makeStorage(uploadsDir),  limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
const receiptUpload = multer({ storage: makeStorage(receiptsDir), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });


// ─── MIGRATIONS ───────────────────────────────────────────────────────────────

async function runMigrations() {
  const dbp = db.promise();
  const migrations = [
    `ALTER TABLE reports ADD COLUMN status ENUM('PENDING','COMPLETED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE reports ADD COLUMN progress_id INT DEFAULT NULL`,
    `ALTER TABLE rent_payments ADD COLUMN verification_status ENUM('PENDING_VERIFICATION','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION'`,
  ];
  for (const sql of migrations) {
    try {
      await dbp.query(sql);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error('Migration error:', err.message);
      // ER_DUP_FIELDNAME = column already exists → safe to ignore
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


// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "name, email and password are required" });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,'STUDENT')",
      [name, email, hash],
      (err) => {
        if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already registered" });
        if (err) return res.status(500).json({ message: "Registration failed" });
        res.json({ message: "Student account created" });
      }
    );
  } catch { res.status(500).json({ message: "Server error" }); }
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


// ─── APPLICATIONS ────────────────────────────────────────────────────────────

app.post("/api/applications", authMiddleware, (req, res) => {
  const { submission_date } = req.body;
  if (!submission_date) return res.status(400).json({ message: "submission_date is required" });
  db.query(
    "INSERT INTO dorm_applications (user_id, submission_date) VALUES (?,?)",
    [req.user.id, submission_date],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to submit application" });
      res.json({ message: "Application submitted", applicationId: result.insertId });
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
  const { status, room_id } = req.body;
  const appId = req.params.id;
  const allowed = ["PENDING","ACCEPTED","REJECTED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  if (status === "ACCEPTED" && !room_id) return res.status(400).json({ message: "room_id is required when accepting" });
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
    } else {
      await dbp.query("UPDATE dorm_applications SET status = ? WHERE application_id = ?", [status, appId]);
    }
    await dbp.query("COMMIT");
    res.json({ message: "Application status updated" });
  } catch (err) {
    await dbp.query("ROLLBACK");
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
      `SELECT c.*, r.room_number, r.floor, r.type AS room_type FROM contracts c
       LEFT JOIN rooms r ON c.room_id = r.room_id WHERE c.user_id = ? LIMIT 1`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load contract" });
        res.json(rows[0] ?? null);
      }
    );
  }
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

app.patch("/api/complaints/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["SUBMITTED","IN_PROGRESS","RESOLVED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  db.query("UPDATE complaints SET status = ? WHERE complaint_id = ?", [status, req.params.id], (err, result) => {
    if (err)                  return res.status(500).json({ message: "Update failed" });
    if (!result.affectedRows) return res.status(404).json({ message: "Complaint not found" });
    res.json({ message: "Complaint status updated" });
  });
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
app.patch("/api/payments/:id/verify", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    "UPDATE rent_payments SET verification_status = 'VERIFIED' WHERE payment_id = ?",
    [req.params.id],
    (err, result) => {
      if (err)                  return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Payment not found" });
      res.json({ message: "Payment verified" });
    }
  );
});

// Admin rejects a payment
app.patch("/api/payments/:id/reject", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    "UPDATE rent_payments SET verification_status = 'REJECTED' WHERE payment_id = ?",
    [req.params.id],
    (err, result) => {
      if (err)                  return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Payment not found" });
      res.json({ message: "Payment rejected" });
    }
  );
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

// Admin: list all reports
app.get("/api/reports", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    `SELECT r.*, u.name AS generated_by_name FROM reports r
     LEFT JOIN users u ON r.generated_by = u.user_id ORDER BY r.generation_date DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load reports" });
      res.json(rows);
    }
  );
});


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
    await dbp.query(
      `UPDATE dormitories SET name = ?, address = ?, contact_email = ?, contact_phone = ?, max_capacity = ?
       WHERE dormitory_id = (SELECT dormitory_id FROM admin_profiles WHERE user_id = ?)`,
      [dormitory_name, address ?? null, contact_email ?? null, contact_phone ?? null, max_capacity ?? 50, req.user.id]
    );
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


// ─── STATS (admin only) ───────────────────────────────────────────────────────

app.get("/api/stats", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const queries = {
    totalRooms:          "SELECT COUNT(*) AS v FROM rooms",
    occupiedRooms:       "SELECT COUNT(*) AS v FROM rooms WHERE status = 'occupied'",
    vacantRooms:         "SELECT COUNT(*) AS v FROM rooms WHERE status = 'vacant'",
    maintenanceRooms:    "SELECT COUNT(*) AS v FROM rooms WHERE status = 'maintenance'",
    totalStudents:       "SELECT COUNT(*) AS v FROM users WHERE role = 'STUDENT'",
    pendingApplications: "SELECT COUNT(*) AS v FROM dorm_applications WHERE status = 'PENDING'",
    openComplaints:      "SELECT COUNT(*) AS v FROM complaints WHERE status != 'RESOLVED'",
    activeContracts:     "SELECT COUNT(*) AS v FROM contracts WHERE status = 'ACTIVE'",
    totalPayments:       "SELECT COUNT(*) AS v FROM rent_payments",
  };
  const keys = Object.keys(queries); const results = {}; let done = 0;
  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      results[key] = err ? 0 : rows[0].v;
      if (++done === keys.length) res.json(results);
    });
  });
});


// ─── SERVER ───────────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => console.log(`DormMS API running on http://localhost:${PORT}`));
