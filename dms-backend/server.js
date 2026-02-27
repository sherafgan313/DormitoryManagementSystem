const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "SUPER_SECRET_KEY";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "dorm_management",
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("MySQL Connected");
  }
});


// ================= AUTH =================

app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const sql =
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, hash, role], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User registered" });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length === 0)
        return res.status(401).json({ message: "User not found" });

      const user = results[0];

      const match = await bcrypt.compare(password, user.password_hash);

      if (!match)
        return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.user_id, role: user.role },
        SECRET,
        { expiresIn: "1d" }
      );

      res.json({ token, user });
    }
  );
});


// Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}


// ================= APPLICATION =================

app.post("/api/applications", authMiddleware, (req, res) => {
  const { submission_date } = req.body;

  const sql =
    "INSERT INTO dorm_applications (user_id, submission_date) VALUES (?, ?)";

  db.query(sql, [req.user.id, submission_date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Application submitted" });
  });
});

app.get("/api/applications", authMiddleware, (req, res) => {
  db.query("SELECT * FROM dorm_applications", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


// ================= CONTRACT =================

app.post("/api/contracts", authMiddleware, (req, res) => {
  const { user_id, start_date, end_date, status } = req.body;

  const sql =
    "INSERT INTO contracts (user_id, start_date, end_date, status) VALUES (?, ?, ?, ?)";

  db.query(sql, [user_id, start_date, end_date, status], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Contract created" });
  });
});


// ================= COMPLAINT =================

app.post("/api/complaints", authMiddleware, (req, res) => {
  const { description } = req.body;

  const sql =
    "INSERT INTO complaints (user_id, description) VALUES (?, ?)";

  db.query(sql, [req.user.id, description], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Complaint submitted" });
  });
});

app.get("/api/complaints", authMiddleware, (req, res) => {
  db.query("SELECT * FROM complaints", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


// ================= RENT PAYMENT =================

app.post("/api/payments", authMiddleware, (req, res) => {
  const { month, amount } = req.body;

  const sql =
    "INSERT INTO rent_payments (user_id, month, amount) VALUES (?, ?, ?)";

  db.query(sql, [req.user.id, month, amount], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Payment recorded" });
  });
});


// ================= REPORT =================

app.post("/api/reports", authMiddleware, (req, res) => {
  const sql =
    "INSERT INTO reports (generated_by, file_path) VALUES (?, ?)";

  db.query(sql, [req.user.id, "report/path/sample.pdf"], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Report created" });
  });
});


// ================= SERVER =================

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

