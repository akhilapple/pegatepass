require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Important for Render or Heroku-like services
  }
});

pool.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database');

    // Ensure the table exists
    return pool.query(`
      CREATE TABLE IF NOT EXISTS outpass_requests (
        id SERIAL PRIMARY KEY,
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
      );
    `);
  })
  .then(() => console.log('✅ Table checked or created'))
  .catch(err => console.error('❌ PostgreSQL setup error:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ TEST DATABASE ENDPOINT
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ time: result.rows[0].now });
  } catch (err) {
    console.error('❌ DB Test Error:', err);
    res.status(500).json({ error: 'Database query failed', details: err.message });
  }
});

// API: Submit Outpass
app.post('/api/submit', async (req, res) => {
  const data = req.body;
  if (!data.domain || !data.name || !data.date || !data.reason || !data.authority) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const keycode = data.key || 'pe' + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 900 + 100);

  const insertQuery = `
    INSERT INTO outpass_requests
      (domain, name, date, outTime, inTime, reason, vehicleUsed, vehicleNo, readingOut, readingIn, authority, approved, rejected, keycode)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0, $12)
    RETURNING id;
  `;

  try {
    await pool.query(insertQuery, [
      data.domain, data.name, data.date, data.outTime || null, data.inTime || null, data.reason,
      data.vehicleUsed || null, data.vehicleNo || null, data.readingOut || null, data.readingIn || null, data.authority, keycode
    ]);
    res.json({ success: true, key: keycode });
  } catch (err) {
    console.error('❌ Insert error:', err);
    res.status(500).json({ error: "DB error" });
  }
});

// API: Get all requests
app.get('/api/requests', async (req, res) => {
  const { authority } = req.query;
  let sql = 'SELECT * FROM outpass_requests';
  const params = [];

  if (authority && authority !== 'hr') {
    sql += ' WHERE authority = $1';
    params.push(authority);
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Select error:', err);
    res.status(500).json({ error: "DB error" });
  }
});

// API: Approve/Reject outpass
app.post('/api/approve', async (req, res) => {
  const { id, action } = req.body;
  if (!id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    await pool.query(
      'UPDATE outpass_requests SET approved = $1, rejected = $2 WHERE id = $3',
      [action === 'approve' ? 1 : 0, action === 'reject' ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({ error: "DB error" });
  }
});

// API: Get status by keycode
app.get('/api/status', async (req, res) => {
  const { key, name } = req.query;
  if (!key) return res.status(400).json({ error: "Missing code" });

  let sql = 'SELECT * FROM outpass_requests WHERE keycode = $1';
  const params = [key];

  if (name) {
    sql += ' AND LOWER(name) = LOWER($2)';
    params.push(name);
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Status error:', err);
    res.status(500).json({ error: "DB error" });
  }
});

// API: Admin login (insecure demo)
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

// API: Security login (insecure demo)
app.post('/api/security-login', (req, res) => {
  const { username, password } = req.body;
  if (username === "security" && password === "security123") {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Serve frontend
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
