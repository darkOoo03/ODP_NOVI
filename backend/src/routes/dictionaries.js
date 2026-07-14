const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dictionaries/hive-types (🔐 user)
router.get('/hive-types', authenticateToken, async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, name FROM hive_types WHERE is_active = 1 ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching hive types:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju tipova košnica.' });
  }
});

// GET /api/dictionaries/queen-breeds (🔐 user)
router.get('/queen-breeds', authenticateToken, async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, name FROM queen_breeds WHERE is_active = 1 ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching queen breeds:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju rasa matica.' });
  }
});

module.exports = router;
