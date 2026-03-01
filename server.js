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
  else     { console.log("MySQL Connected"); seedUsers(); }
});

// ─── SEED DEMO USERS ────────────────────────────────────────────────────────
async function seedUsers() {
  const users = [
    { name: "Admin",         email: "admin@dms.com",   password: "admin123",   role: "ADMIN"   },
    { name: "Maria Santos",  email: "student@dms.com", password: "student123", role: "STUDENT" },
  ];

  for (const u of users) {
    db.query("SELECT user_id FROM users WHERE email = ?", [u.email], async (err, rows) => {
      if (err || rows.length > 0) return;
      const hash = await bcrypt.hash(u.password, 10);
      db.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [u.name, u.email, hash, u.role],
        (e) => { if (!e) console.log(`Seeded ${u.role}: ${u.email} / ${u.password}`); }
      );
    });
  }
}

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────

// Verifies JWT and attaches decoded payload to req.user
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = decoded; // { id, role }
    next();
  });
}

// Restricts route to specific roles; must be placed after authMiddleware
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
    if (err)           return res.status(500).json({ message: "Server error" });
    if (!rows.length)  return res.status(401).json({ message: "User not found" });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.user_id, role: user.role }, SECRET, { expiresIn: "1d" });

    // Never return password_hash to the client
    res.json({
      token,
      role:   user.role,
      userId: user.user_id,
      name:   user.name,
      email:  user.email,
    });
  });
});


// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

// Any authenticated user can submit an application
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

// ADMIN → all applications (with student name)
// STUDENT → own applications only
app.get("/api/applications", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT da.*, u.name AS user_name, u.email AS user_email
      FROM dorm_applications da
      LEFT JOIN users u ON da.user_id = u.user_id
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

// ADMIN only — update application status (ACCEPTED | REJECTED)
app.patch("/api/applications/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["PENDING", "ACCEPTED", "REJECTED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  db.query(
    "UPDATE dorm_applications SET status = ? WHERE application_id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err)              return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Application not found" });
      res.json({ message: "Application status updated" });
    }
  );
});


// ─── CONTRACTS ────────────────────────────────────────────────────────────────

// ADMIN only — create a contract for a student
app.post("/api/contracts", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { user_id, start_date, end_date, status = "ACTIVE" } = req.body;
  if (!user_id || !start_date || !end_date)
    return res.status(400).json({ message: "user_id, start_date and end_date are required" });

  db.query(
    "INSERT INTO contracts (user_id, start_date, end_date, status) VALUES (?, ?, ?, ?)",
    [user_id, start_date, end_date, status],
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

// ADMIN → all contracts (with student name)
// STUDENT → own contract only
app.get("/api/contracts", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT c.*, u.name AS user_name, u.email AS user_email
      FROM contracts c
      LEFT JOIN users u ON c.user_id = u.user_id
      ORDER BY c.contract_id DESC`;
    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load contracts" });
      res.json(rows);
    });
  } else {
    db.query(
      "SELECT * FROM contracts WHERE user_id = ? LIMIT 1",
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load contract" });
        res.json(rows[0] ?? null);
      }
    );
  }
});

// ADMIN only — update contract status (ACTIVE | EXTENDED | TERMINATED)
app.patch("/api/contracts/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["ACTIVE", "EXTENDED", "TERMINATED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  db.query(
    "UPDATE contracts SET status = ? WHERE contract_id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err)              return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Contract not found" });
      res.json({ message: "Contract status updated" });
    }
  );
});


// ─── COMPLAINTS ───────────────────────────────────────────────────────────────

// Any authenticated user can submit a complaint
app.post("/api/complaints", authMiddleware, (req, res) => {
  const { description } = req.body;
  if (!description)
    return res.status(400).json({ message: "description is required" });

  db.query(
    "INSERT INTO complaints (user_id, description) VALUES (?, ?)",
    [req.user.id, description],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to submit complaint" });
      res.json({ message: "Complaint submitted" });
    }
  );
});

// ADMIN → all complaints (with student name)
// STUDENT → own complaints only
app.get("/api/complaints", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT c.*, u.name AS user_name, u.email AS user_email
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.user_id
      ORDER BY c.created_at DESC`;
    db.query(sql, (err, rows) => {
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

// ADMIN only — update complaint status
app.patch("/api/complaints/:id/status", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const { status } = req.body;
  const allowed = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

  db.query(
    "UPDATE complaints SET status = ? WHERE complaint_id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err)              return res.status(500).json({ message: "Update failed" });
      if (!result.affectedRows) return res.status(404).json({ message: "Complaint not found" });
      res.json({ message: "Complaint status updated" });
    }
  );
});


// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

// Any authenticated user can record/submit a payment
app.post("/api/payments", authMiddleware, (req, res) => {
  const { month, amount } = req.body;
  if (!month || !amount)
    return res.status(400).json({ message: "month and amount are required" });

  db.query(
    "INSERT INTO rent_payments (user_id, month, amount) VALUES (?, ?, ?)",
    [req.user.id, month, amount],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to record payment" });
      res.json({ message: "Payment recorded" });
    }
  );
});

// ADMIN → all payments (with student name)
// STUDENT → own payments only
app.get("/api/payments", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT rp.*, u.name AS user_name, u.email AS user_email
      FROM rent_payments rp
      LEFT JOIN users u ON rp.user_id = u.user_id
      ORDER BY rp.created_at DESC`;
    db.query(sql, (err, rows) => {
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


// ─── REPORTS ──────────────────────────────────────────────────────────────────

// Any authenticated user can generate a report (their own record is created)
app.post("/api/reports", authMiddleware, (req, res) => {
  db.query(
    "INSERT INTO reports (generated_by, file_path) VALUES (?, ?)",
    [req.user.id, "reports/sample.pdf"],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to generate report" });
      res.json({ message: "Report generated" });
    }
  );
});

// ADMIN → all reports (with generator name)
// STUDENT → own reports only
app.get("/api/reports", authMiddleware, (req, res) => {
  if (req.user.role === "ADMIN") {
    const sql = `
      SELECT r.*, u.name AS generated_by_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.user_id
      ORDER BY r.generation_date DESC`;
    db.query(sql, (err, rows) => {
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


// ─── PROFILE (student only) ───────────────────────────────────────────────────

// Returns the logged-in student's profile (users + student_profiles joined)
app.get("/api/profile", authMiddleware, requireRole("STUDENT"), (req, res) => {
  const sql = `
    SELECT u.user_id, u.name, u.email, u.role,
           sp.academic_details, sp.application_status, sp.room_information
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
    WHERE u.user_id = ?`;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err)       return res.status(500).json({ message: "Failed to load profile" });
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  });
});

// Update name, email, and academic_details for the logged-in student
app.put("/api/profile", authMiddleware, requireRole("STUDENT"), (req, res) => {
  const { name, email, academic_details } = req.body;
  if (!name || !email)
    return res.status(400).json({ message: "name and email are required" });

  db.query(
    "UPDATE users SET name = ?, email = ? WHERE user_id = ?",
    [name, email, req.user.id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ message: "Email already in use" });
        return res.status(500).json({ message: "Failed to update profile" });
      }

      // Upsert student_profiles row
      db.query(
        `INSERT INTO student_profiles (user_id, academic_details)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE academic_details = VALUES(academic_details)`,
        [req.user.id, academic_details ?? ""],
        (e) => {
          if (e) return res.status(500).json({ message: "Profile partial update" });
          res.json({ message: "Profile updated" });
        }
      );
    }
  );
});


// ─── USERS (admin only) ───────────────────────────────────────────────────────

// Returns all student accounts with their profile data
app.get("/api/users", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const sql = `
    SELECT u.user_id, u.name, u.email, u.role, u.created_at,
           sp.academic_details, sp.room_information, sp.application_status
    FROM users u
    LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
    WHERE u.role = 'STUDENT'
    ORDER BY u.created_at DESC`;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to load users" });
    res.json(rows);
  });
});


// ─── STATS (admin only) ───────────────────────────────────────────────────────

// Aggregated counts used by the admin dashboard stat cards
app.get("/api/stats", authMiddleware, requireRole("ADMIN"), (req, res) => {
  const queries = {
    totalStudents:       "SELECT COUNT(*) AS v FROM users WHERE role = 'STUDENT'",
    pendingApplications: "SELECT COUNT(*) AS v FROM dorm_applications WHERE status = 'PENDING'",
    openComplaints:      "SELECT COUNT(*) AS v FROM complaints WHERE status != 'RESOLVED'",
    activeContracts:     "SELECT COUNT(*) AS v FROM contracts WHERE status = 'ACTIVE'",
    totalPayments:       "SELECT COUNT(*) AS v FROM rent_payments",
  };

  const keys    = Object.keys(queries);
  const results = {};
  let   done    = 0;

  keys.forEach((key) => {
    db.query(queries[key], (err, rows) => {
      results[key] = err ? 0 : rows[0].v;
      if (++done === keys.length) res.json(results);
    });
  });
});


// ─── SERVER ───────────────────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => console.log(`DormMS API running on http://localhost:${PORT}`));
