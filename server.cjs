const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./outpass.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to SQLite database');
});

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS outpass_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT,
  name TEXT,
  date TEXT,
  outTime TEXT,
  inTime TEXT,
  reason TEXT,
  vehicleUsed TEXT,
  vehicleNo TEXT,
  readingOut TEXT,
  readingIn TEXT,
  authority TEXT,
  approved INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  keycode TEXT
)`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Submit Outpass
app.post('/api/submit', (req, res) => {
  const data = req.body;
  if (!data.domain || !data.name || !data.date || !data.reason || !data.authority) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // Generate keycode if not provided
  let keycode = data.key || 'pe' + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 900 + 100);
  db.run(
    `INSERT INTO outpass_requests 
      (domain, name, date, outTime, inTime, reason, vehicleUsed, vehicleNo, readingOut, readingIn, authority, approved, rejected, keycode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [
      data.domain, data.name, data.date, data.outTime, data.inTime, data.reason,
      data.vehicleUsed, data.vehicleNo, data.readingOut, data.readingIn, data.authority, keycode
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json({ success: true, key: keycode });
    }
  );
});

// API: Get all requests (optional filter by authority)
app.get('/api/requests', (req, res) => {
  const { authority } = req.query;
  let sql = 'SELECT * FROM outpass_requests';
  let params = [];
  if (authority && authority !== 'hr') {
    sql += ' WHERE authority = ?';
    params.push(authority);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

// API: Approve/Reject
app.post('/api/approve', (req, res) => {
  const { id, action } = req.body;
  if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: "Invalid request" });
  db.run(
    `UPDATE outpass_requests SET approved = ?, rejected = ? WHERE id = ?`,
    [action === 'approve' ? 1 : 0, action === 'reject' ? 1 : 0, id],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json({ success: true });
    }
  );
});

// API: Get status by code (and optionally name)
app.get('/api/status', (req, res) => {
  const { key, name } = req.query;
  if (!key) return res.status(400).json({ error: "Missing code" });
  let sql = 'SELECT * FROM outpass_requests WHERE keycode = ?';
  let params = [key];
  if (name) {
    sql += ' AND LOWER(name) = ?';
    params.push(name.toLowerCase());
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

// API: Admin login (demo only, not secure)
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  const adminCredentials = {
    hr: "admin123",
    ceo: "admin123",
    sectionhead: "admin123",
    saleshead: "admin123",
    accountshead: "admin123"
  };
  if (adminCredentials[username] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// API: Security login (demo only)
app.post('/api/security-login', (req, res) => {
  const { username, password } = req.body;
  if (username === "security" && password === "security123") {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Serve frontend (put your HTML/CSS/JS in /public)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
