const express    = require("express");
const mysql      = require("mysql2");
const cors       = require("cors");
const bodyParser = require("body-parser");
const bcrypt     = require("bcrypt");
const jwt        = require("jsonwebtoken");

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
  if (err) { console.error("DB connection failed:", err); }
  else     { console.log("MySQL Connected"); seedDemoData(); }
});

// ─── SEED ALL DEMO DATA ───────────────────────────────────────────────────────
async function seedDemoData() {
  const dbp = db.promise();

  try {
    const [existing] = await dbp.query("SELECT COUNT(*) AS c FROM dormitories");
    if (existing[0].c > 0) {
      console.log("Demo data already seeded.");
      return;
    }

    console.log("Seeding demo data...");

    // ── 1. Dormitories ────────────────────────────────────────────────────────
    const [d1] = await dbp.query(
      "INSERT INTO dormitories (name, address, contact_email, contact_phone, max_capacity) VALUES (?,?,?,?,?)",
      ["Sunrise Dormitory", "123 University Ave, Manila", "admin@dms.com", "+63 912 000 1001", 32]
    );
    const dorm1Id = d1.insertId;

    const [d2] = await dbp.query(
      "INSERT INTO dormitories (name, address, contact_email, contact_phone, max_capacity) VALUES (?,?,?,?,?)",
      ["Moonlight Dormitory", "456 College Road, Cebu", "admin2@dms.com", "+63 912 000 2002", 32]
    );
    const dorm2Id = d2.insertId;

    // ── 2. Admin users ────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("admin123", 10);

    const [a1] = await dbp.query(
      "INSERT INTO users (name, email, password_hash, role, dormitory_id) VALUES (?,?,?,?,?)",
      ["Admin User", "admin@dms.com", adminHash, "ADMIN", dorm1Id]
    );
    const admin1Id = a1.insertId;

    const [a2] = await dbp.query(
      "INSERT INTO users (name, email, password_hash, role, dormitory_id) VALUES (?,?,?,?,?)",
      ["Admin User 2", "admin2@dms.com", adminHash, "ADMIN", dorm2Id]
    );
    const admin2Id = a2.insertId;

    await dbp.query(
      "INSERT INTO admin_profiles (user_id, dormitory_id, position, phone) VALUES (?,?,?,?)",
      [admin1Id, dorm1Id, "Dormitory Administrator", "+63 912 000 1001"]
    );
    await dbp.query(
      "INSERT INTO admin_profiles (user_id, dormitory_id, position, phone) VALUES (?,?,?,?)",
      [admin2Id, dorm2Id, "Dormitory Administrator", "+63 912 000 2002"]
    );

    // ── 3. Rooms for dorm 1 (32 rooms, 4 floors × 8) ─────────────────────────
    const roomTypes = ["Single", "Single", "Double", "Double", "Single", "Double", "Suite", "Double"];
    const room1Ids  = [];

    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 8; r++) {
        const roomNum = `${floor}0${r}`;
        const [rRow] = await dbp.query(
          "INSERT INTO rooms (dormitory_id, room_number, floor, type) VALUES (?,?,?,?)",
          [dorm1Id, roomNum, floor, roomTypes[r - 1]]
        );
        room1Ids.push(rRow.insertId);
      }
    }

    // Set rooms 107 (index 6) and 308 (index 23) to maintenance
    await dbp.query("UPDATE rooms SET status = 'maintenance' WHERE room_id = ?", [room1Ids[6]]);
    await dbp.query("UPDATE rooms SET status = 'maintenance' WHERE room_id = ?", [room1Ids[23]]);

    // ── 4. Rooms for dorm 2 (32 rooms) ───────────────────────────────────────
    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 8; r++) {
        const roomNum = `${floor}0${r}`;
        await dbp.query(
          "INSERT INTO rooms (dormitory_id, room_number, floor, type) VALUES (?,?,?,?)",
          [dorm2Id, roomNum, floor, roomTypes[r - 1]]
        );
      }
    }

    // ── 5. Student users ──────────────────────────────────────────────────────
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

    // ── 6. Accept first 3 students → assign rooms 101, 102, 103 ──────────────
    const acceptedRoomIds  = [room1Ids[0], room1Ids[1], room1Ids[2]];
    const acceptedStudents = students.slice(0, 3);

    for (let i = 0; i < acceptedStudents.length; i++) {
      const s      = acceptedStudents[i];
      const roomId = acceptedRoomIds[i];

      await dbp.query("UPDATE rooms SET status = 'occupied', resident_id = ? WHERE room_id = ?", [s.id, roomId]);
      await dbp.query("UPDATE users SET dormitory_id = ? WHERE user_id = ?", [dorm1Id, s.id]);

      await dbp.query(
        "INSERT INTO student_profiles (user_id, dormitory_id, room_id, phone, student_id_number, course, university, application_status) VALUES (?,?,?,?,?,?,?,?)",
        [s.id, dorm1Id, roomId, s.phone, s.sid, s.course, s.uni, "ACCEPTED"]
      );
      await dbp.query(
        "INSERT INTO dorm_applications (user_id, dormitory_id, submission_date, status, assigned_room_id) VALUES (?,?,?,?,?)",
        [s.id, dorm1Id, "2025-12-01", "ACCEPTED", roomId]
      );
      await dbp.query(
        "INSERT INTO contracts (user_id, dormitory_id, room_id, start_date, end_date, status) VALUES (?,?,?,?,?,?)",
        [s.id, dorm1Id, roomId, "2026-01-15", "2026-12-15", "ACTIVE"]
      );
    }

    // Pending students (no dorm/room yet)
    for (const s of students.slice(3)) {
      await dbp.query(
        "INSERT INTO dorm_applications (user_id, submission_date, status) VALUES (?,?,?)",
        [s.id, "2026-01-20", "PENDING"]
      );
    }

    // ── 7. Seed complaints ────────────────────────────────────────────────────
    const complaintsData = [
      { uid: acceptedStudents[0].id, desc: "AC unit in room 101 is not cooling and makes loud noise at night.", status: "SUBMITTED"    },
      { uid: acceptedStudents[1].id, desc: "Water leak detected in the bathroom ceiling of room 102.",          status: "IN_PROGRESS"  },
      { uid: acceptedStudents[2].id, desc: "Main door lock was broken. Reported last week and now fixed.",      status: "RESOLVED"     },
    ];
    for (const c of complaintsData) {
      await dbp.query(
        "INSERT INTO complaints (user_id, dormitory_id, description, status) VALUES (?,?,?,?)",
        [c.uid, dorm1Id, c.desc, c.status]
      );
    }

    // ── 8. Seed payments ──────────────────────────────────────────────────────
    const paymentsData = [
      { uid: acceptedStudents[0].id, month: "Jan", amount: 5000 },
      { uid: acceptedStudents[0].id, month: "Feb", amount: 5000 },
      { uid: acceptedStudents[1].id, month: "Jan", amount: 4500 },
      { uid: acceptedStudents[2].id, month: "Jan", amount: 5500 },
      { uid: acceptedStudents[2].id, month: "Feb", amount: 5500 },
    ];
    for (const p of paymentsData) {
      await dbp.query(
        "INSERT INTO rent_payments (user_id, dormitory_id, month, amount) VALUES (?,?,?,?)",
        [p.uid, dorm1Id, p.month, p.amount]
      );
    }

    console.log("─────────────────────────────────────────────");
    console.log("Demo data seeded successfully!");
    console.log("  Admin:   admin@dms.com   / admin123  → Sunrise Dormitory");
    console.log("  Admin:   admin2@dms.com  / admin123  → Moonlight Dormitory");
    console.log("  Student: student@dms.com / student123 (Room 101, Sunrise)");
    console.log("  + 4 more demo students (juan, ana, pedro, rosa @dms.com / student123)");
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
    req.user = decoded; // { id, role, dormitory_id }
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
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'STUDENT')",
      [name, email, hash],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ message: "Email already registered" });
          return res.status(500).json({ message: "Registration failed" });
        }
        res.json({ message: "Student account created" });
      }
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "email and password are required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err)          return res.status(500).json({ message: "Server error" });
    if (!rows.length) return res.status(401).json({ message: "User not found" });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.user_id, role: user.role, dormitory_id: user.dormitory_id },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role:         user.role,
      userId:       user.user_id,
      name:         user.name,
      email:        user.email,
      dormitory_id: user.dormitory_id,
    });
  });
});


// ─── APPLICATIONS ────────────────────────────────────────────────────────────

// Student submits an application (no dorm assigned yet — admin assigns on acceptance)
app.post("/api/applications", authMiddleware, (req, res) => {
  const { submission_date } = req.body;
  if (!submission_date)
    return res.status(400).json({ message: "submission_date is required" });

  db.query(
    "INSERT INTO dorm_applications (user_id, submission_date) VALUES (?, ?)",
    [req.user.id, submission_date],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to submit application" });
      res.json({ message: "Application submitted" });
    }
  );
});

// ADMIN → pending (all) + accepted/rejected for their dorm
// STUDENT → own applications only
app.get("/api/applications", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT da.*, u.name AS user_name, u.email AS user_email,
             r.room_number AS assigned_room_number
      FROM dorm_applications da
      LEFT JOIN users u ON da.user_id = u.user_id
      LEFT JOIN rooms r ON da.assigned_room_id = r.room_id
      WHERE da.status = 'PENDING' OR da.dormitory_id = ?
      ORDER BY da.created_at DESC`;
    db.query(sql, [req.user.dormitory_id], (err, rows) => {
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

// ADMIN only — accept (requires room_id) or reject an application
app.patch("/api/applications/:id/status", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { status, room_id } = req.body;
  const appId      = req.params.id;
  const dormitory_id = req.user.dormitory_id;

  const allowed = ["PENDING", "ACCEPTED", "REJECTED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  if (status === "ACCEPTED" && !room_id)
    return res.status(400).json({ message: "room_id is required when accepting an application" });

  const dbp = db.promise();
  try {
    await dbp.query("START TRANSACTION");

    const [apps] = await dbp.query(
      "SELECT user_id FROM dorm_applications WHERE application_id = ?", [appId]
    );
    if (!apps.length) {
      await dbp.query("ROLLBACK");
      return res.status(404).json({ message: "Application not found" });
    }
    const userId = apps[0].user_id;

    if (status === "ACCEPTED") {
      // Mark room as occupied (fails if room not vacant or not in this dorm)
      const [roomResult] = await dbp.query(
        "UPDATE rooms SET status = 'occupied', resident_id = ? WHERE room_id = ? AND dormitory_id = ? AND status = 'vacant'",
        [userId, room_id, dormitory_id]
      );
      if (!roomResult.affectedRows) {
        await dbp.query("ROLLBACK");
        return res.status(400).json({ message: "Room is not available or does not belong to your dormitory" });
      }

      // Link student to this dormitory
      await dbp.query("UPDATE users SET dormitory_id = ? WHERE user_id = ?", [dormitory_id, userId]);

      // Upsert student_profiles with room and dorm
      await dbp.query(
        `INSERT INTO student_profiles (user_id, dormitory_id, room_id, application_status)
         VALUES (?, ?, ?, 'ACCEPTED')
         ON DUPLICATE KEY UPDATE dormitory_id = VALUES(dormitory_id),
                                 room_id = VALUES(room_id),
                                 application_status = 'ACCEPTED'`,
        [userId, dormitory_id, room_id]
      );

      // Update application
      await dbp.query(
        "UPDATE dorm_applications SET status = 'ACCEPTED', dormitory_id = ?, assigned_room_id = ? WHERE application_id = ?",
        [dormitory_id, room_id, appId]
      );
    } else {
      // REJECTED or PENDING
      await dbp.query(
        "UPDATE dorm_applications SET status = ?, dormitory_id = ? WHERE application_id = ?",
        [status, dormitory_id, appId]
      );
    }

    await dbp.query("COMMIT");
    res.json({ message: "Application status updated" });
  } catch (err) {
    await dbp.query("ROLLBACK");
    console.error("Accept application error:", err.message);
    res.status(500).json({ message: "Update failed" });
  }
});


// ─── ROOMS (admin only) ───────────────────────────────────────────────────────

// All rooms in the admin's dormitory
app.get("/api/rooms", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const sql = `
    SELECT r.*, u.name AS resident_name
    FROM rooms r
    LEFT JOIN users u ON r.resident_id = u.user_id
    WHERE r.dormitory_id = ?
    ORDER BY r.floor, r.room_number`;
  db.query(sql, [req.user.dormitory_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to load rooms" });
    res.json(rows);
  });
});

// Only vacant rooms (for room assignment on application acceptance)
app.get("/api/rooms/vacant", authMiddleware, requireRole("ADMIN"), (req, res) => {
  db.query(
    "SELECT room_id, room_number, floor, type FROM rooms WHERE dormitory_id = ? AND status = 'vacant' ORDER BY floor, room_number",
    [req.user.dormitory_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load vacant rooms" });
      res.json(rows);
    }
  );
});


// ─── CONTRACTS ───────────────────────────────────────────────────────────────

app.post("/api/contracts", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { user_id, start_date, end_date, status = "ACTIVE" } = req.body;
  if (!user_id || !start_date || !end_date)
    return res.status(400).json({ message: "user_id, start_date and end_date are required" });

  db.query(
    "INSERT INTO contracts (user_id, dormitory_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)",
    [user_id, req.user.dormitory_id, start_date, end_date, status],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ message: "A contract already exists for this student" });
        return res.status(500).json({ message: "Failed to create contract" });
      }
      res.json({ message: "Contract created" });
    }
  );
});

// ADMIN → dorm's contracts | STUDENT → own contract
app.get("/api/contracts", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT c.*, u.name AS user_name, u.email AS user_email,
             r.room_number
      FROM contracts c
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN rooms r ON c.room_id = r.room_id
      WHERE c.dormitory_id = ?
      ORDER BY c.contract_id DESC`;
    db.query(sql, [req.user.dormitory_id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load contracts" });
      res.json(rows);
    });
  } else {
    const sql = `
      SELECT c.*, r.room_number, r.floor, r.type AS room_type
      FROM contracts c
      LEFT JOIN rooms r ON c.room_id = r.room_id
      WHERE c.user_id = ? LIMIT 1`;
    db.query(sql, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load contract" });
      res.json(rows[0] ?? null);
    });
  }
});

app.patch("/api/contracts/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["ACTIVE", "EXTENDED", "TERMINATED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  db.query(
    "UPDATE contracts SET status = ? WHERE contract_id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err)                  return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Contract not found" });
      res.json({ message: "Contract status updated" });
    }
  );
});


// ─── COMPLAINTS ──────────────────────────────────────────────────────────────

app.post("/api/complaints", authMiddleware, (req, res) => {
  const { description } = req.body;
  if (!description)
    return res.status(400).json({ message: "description is required" });

  db.query(
    "INSERT INTO complaints (user_id, dormitory_id, description) VALUES (?, ?, ?)",
    [req.user.id, req.user.dormitory_id ?? null, description],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to submit complaint" });
      res.json({ message: "Complaint submitted" });
    }
  );
});

// ADMIN → dorm's complaints | STUDENT → own complaints
app.get("/api/complaints", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT c.*, u.name AS user_name, u.email AS user_email
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.user_id
      WHERE c.dormitory_id = ?
      ORDER BY c.created_at DESC`;
    db.query(sql, [req.user.dormitory_id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load complaints" });
      res.json(rows);
    });
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
  const allowed = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  db.query(
    "UPDATE complaints SET status = ? WHERE complaint_id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err)                  return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Complaint not found" });
      res.json({ message: "Complaint status updated" });
    }
  );
});


// ─── PAYMENTS ────────────────────────────────────────────────────────────────

app.post("/api/payments", authMiddleware, (req, res) => {
  const { month, amount } = req.body;
  if (!month || !amount)
    return res.status(400).json({ message: "month and amount are required" });

  db.query(
    "INSERT INTO rent_payments (user_id, dormitory_id, month, amount) VALUES (?, ?, ?, ?)",
    [req.user.id, req.user.dormitory_id ?? null, month, amount],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to record payment" });
      res.json({ message: "Payment recorded" });
    }
  );
});

// ADMIN → dorm's payments | STUDENT → own payments
app.get("/api/payments", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT rp.*, u.name AS user_name, u.email AS user_email
      FROM rent_payments rp
      LEFT JOIN users u ON rp.user_id = u.user_id
      WHERE rp.dormitory_id = ?
      ORDER BY rp.created_at DESC`;
    db.query(sql, [req.user.dormitory_id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load payments" });
      res.json(rows);
    });
  } else {
    db.query(
      "SELECT * FROM rent_payments WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load payments" });
        res.json(rows);
      }
    );
  }
});


// ─── REPORTS ─────────────────────────────────────────────────────────────────

app.post("/api/reports", authMiddleware, (req, res) => {
  db.query(
    "INSERT INTO reports (generated_by, dormitory_id, file_path) VALUES (?, ?, ?)",
    [req.user.id, req.user.dormitory_id ?? null, "reports/sample.pdf"],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to generate report" });
      res.json({ message: "Report generated" });
    }
  );
});

// ADMIN → dorm's reports | STUDENT → own reports
app.get("/api/reports", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT r.*, u.name AS generated_by_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.user_id
      WHERE r.dormitory_id = ?
      ORDER BY r.generation_date DESC`;
    db.query(sql, [req.user.dormitory_id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load reports" });
      res.json(rows);
    });
  } else {
    db.query(
      "SELECT * FROM reports WHERE generated_by = ? ORDER BY generation_date DESC",
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load reports" });
        res.json(rows);
      }
    );
  }
});


// ─── ADMIN PROFILE ───────────────────────────────────────────────────────────

app.get("/api/admin/profile", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const sql = `
    SELECT u.user_id, u.name, u.email,
           COALESCE(ap.position, 'Dormitory Administrator') AS position,
           ap.phone,
           d.dormitory_id, d.name AS dormitory_name, d.address,
           d.contact_email, d.contact_phone, d.max_capacity
    FROM users u
    LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id
    LEFT JOIN dormitories d ON ap.dormitory_id = d.dormitory_id
    WHERE u.user_id = ?`;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err)       return res.status(500).json({ message: "Failed to load admin profile" });
    if (!rows.length) return res.status(404).json({ message: "Profile not found" });
    res.json(rows[0]);
  });
});

app.put("/api/admin/profile", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, position, phone, dormitory_name, address, contact_email, contact_phone, max_capacity } = req.body;
  if (!name || !email)
    return res.status(400).json({ message: "name and email are required" });

  const dbp = db.promise();
  try {
    // Update users table
    await dbp.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [name, email, req.user.id]);

    // Update admin_profiles
    await dbp.query(
      "UPDATE admin_profiles SET position = ?, phone = ? WHERE user_id = ?",
      [position ?? "Dormitory Administrator", phone ?? null, req.user.id]
    );

    // Update dormitories
    await dbp.query(
      "UPDATE dormitories SET name = ?, address = ?, contact_email = ?, contact_phone = ?, max_capacity = ? WHERE dormitory_id = ?",
      [dormitory_name, address ?? null, contact_email ?? null, contact_phone ?? null, max_capacity ?? 50, req.user.dormitory_id]
    );

    res.json({ message: "Admin profile updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Email already in use" });
    res.status(500).json({ message: "Failed to update profile" });
  }
});


// ─── ACTIVITY FEED (admin only) ───────────────────────────────────────────────

app.get("/api/activity", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const dormId = req.user.dormitory_id;
  const sql = `
    (SELECT 'application' AS type, da.application_id AS ref_id,
            u.name AS actor, da.status AS detail, da.created_at
     FROM dorm_applications da
     LEFT JOIN users u ON da.user_id = u.user_id
     WHERE da.dormitory_id = ?)
    UNION ALL
    (SELECT 'complaint' AS type, c.complaint_id,
            u.name, c.status, c.created_at
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.user_id
     WHERE c.dormitory_id = ?)
    UNION ALL
    (SELECT 'payment' AS type, rp.payment_id,
            u.name, rp.month, rp.created_at
     FROM rent_payments rp
     LEFT JOIN users u ON rp.user_id = u.user_id
     WHERE rp.dormitory_id = ?)
    ORDER BY created_at DESC
    LIMIT 10`;

  db.query(sql, [dormId, dormId, dormId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to load activity" });
    res.json(rows);
  });
});


// ─── STUDENT PROFILE ─────────────────────────────────────────────────────────

app.get("/api/profile", authMiddleware, requireRole("STUDENT"), (req, res) => {
  const sql = `
    SELECT u.user_id, u.name, u.email, u.role,
           sp.phone, sp.student_id_number, sp.course, sp.university,
           sp.academic_details, sp.application_status,
           d.name AS dormitory_name,
           d.contact_email AS dorm_contact_email,
           d.contact_phone AS dorm_contact_phone,
           r.room_number, r.floor, r.type AS room_type
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
    LEFT JOIN dormitories d ON sp.dormitory_id = d.dormitory_id
    LEFT JOIN rooms r ON sp.room_id = r.room_id
    WHERE u.user_id = ?`;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err)          return res.status(500).json({ message: "Failed to load profile" });
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  });
});

app.put("/api/profile", authMiddleware, requireRole("STUDENT"), async (req, res) => {
  const { name, email, phone, student_id_number, course, university } = req.body;
  if (!name || !email)
    return res.status(400).json({ message: "name and email are required" });

  const dbp = db.promise();
  try {
    await dbp.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [name, email, req.user.id]);

    await dbp.query(
      `INSERT INTO student_profiles (user_id, phone, student_id_number, course, university)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE phone             = VALUES(phone),
                               student_id_number = VALUES(student_id_number),
                               course            = VALUES(course),
                               university        = VALUES(university)`,
      [req.user.id, phone ?? null, student_id_number ?? null, course ?? null, university ?? null]
    );

    res.json({ message: "Profile updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Email already in use" });
    res.status(500).json({ message: "Failed to update profile" });
  }
});


// ─── USERS (admin only) ───────────────────────────────────────────────────────

app.get("/api/users", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const sql = `
    SELECT u.user_id, u.name, u.email, u.role, u.created_at,
           sp.course, sp.university, sp.student_id_number,
           sp.application_status, r.room_number
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
    LEFT JOIN rooms r ON sp.room_id = r.room_id
    WHERE u.role = 'STUDENT' AND u.dormitory_id = ?
    ORDER BY u.created_at DESC`;

  db.query(sql, [req.user.dormitory_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to load users" });
    res.json(rows);
  });
});


// ─── STATS (admin only) ───────────────────────────────────────────────────────

app.get("/api/stats", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const dormId = req.user.dormitory_id;

  const queries = {
    totalRooms:          ["SELECT COUNT(*) AS v FROM rooms WHERE dormitory_id = ?",                                    dormId],
    occupiedRooms:       ["SELECT COUNT(*) AS v FROM rooms WHERE dormitory_id = ? AND status = 'occupied'",            dormId],
    vacantRooms:         ["SELECT COUNT(*) AS v FROM rooms WHERE dormitory_id = ? AND status = 'vacant'",              dormId],
    maintenanceRooms:    ["SELECT COUNT(*) AS v FROM rooms WHERE dormitory_id = ? AND status = 'maintenance'",         dormId],
    totalStudents:       ["SELECT COUNT(*) AS v FROM users WHERE role = 'STUDENT' AND dormitory_id = ?",               dormId],
    pendingApplications: ["SELECT COUNT(*) AS v FROM dorm_applications WHERE status = 'PENDING'",                      null],
    openComplaints:      ["SELECT COUNT(*) AS v FROM complaints WHERE dormitory_id = ? AND status != 'RESOLVED'",      dormId],
    activeContracts:     ["SELECT COUNT(*) AS v FROM contracts WHERE dormitory_id = ? AND status = 'ACTIVE'",          dormId],
    totalPayments:       ["SELECT COUNT(*) AS v FROM rent_payments WHERE dormitory_id = ?",                            dormId],
  };

  const keys    = Object.keys(queries);
  const results = {};
  let   done    = 0;

  keys.forEach((key) => {
    const [sql, param] = queries[key];
    const params = param !== null ? [param] : [];
    db.query(sql, params, (err, rows) => {
      results[key] = err ? 0 : rows[0].v;
      if (++done === keys.length) res.json(results);
    });
  });
});


// ─── SERVER ───────────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => console.log(`DormMS API running on http://localhost:${PORT}`));
