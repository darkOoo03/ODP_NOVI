const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken, adminOnly } = require('../middleware/auth');

// Apply admin protection to all routes in this file
router.use(authenticateToken);
router.use(adminOnly);

// ----------------------------------------------------
// USER MANAGEMENT
// ----------------------------------------------------

// GET /api/admin/users
// List all users with statistics
router.get('/users', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.avatar,
             (SELECT COUNT(*) FROM hives h WHERE h.owner_id = u.id AND h.is_archived = 0) AS hives_count,
             (SELECT COUNT(*) FROM queens q WHERE q.owner_id = u.id AND q.is_archived = 0) AS queens_count,
             (
               SELECT COUNT(*) 
               FROM queen_quality_checks qc 
               JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id 
               JOIN queens q ON qha.queen_id = q.id 
               WHERE q.owner_id = u.id AND q.is_archived = 0
             ) AS checks_count
      FROM users u
      ORDER BY u.id ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error("Admin user list error:", err);
    return res.status(500).json({ message: 'Greška pri preuzimanju liste korisnika.' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, is_active, created_at, avatar FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("Admin user detail error:", err);
    return res.status(500).json({ message: 'Greška pri preuzimanju detalja korisnika.' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  const { role } = req.body;

  if (!role || !['pcelar', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Uloga nije validna.' });
  }

  try {
    // Prevent locking out last admin (just a safety check)
    if (role === 'pcelar') {
      const [admins] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1');
      const [userToModify] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      
      if (userToModify.length > 0 && userToModify[0].role === 'admin' && admins[0].count <= 1) {
        return res.status(400).json({ message: 'Ne možete promeniti ulogu jedinom aktivnom administratoru.' });
      }
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    
    // Log audit activity
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, "ADMIN_CHANGE_ROLE", ?)',
      [req.user.id, `Promenjena uloga korisniku ID ${userId} u ${role}`]
    );

    return res.json({ message: 'Uloga uspešno izmenjena.' });
  } catch (err) {
    console.error("Admin change role error:", err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  const { is_active } = req.body;

  if (is_active === undefined || ![0, 1, true, false].includes(is_active)) {
    return res.status(400).json({ message: 'Status nije validan.' });
  }

  const activeVal = (is_active === 1 || is_active === true) ? 1 : 0;

  try {
    // Prevent deactivating own account
    if (parseInt(userId, 10) === req.user.id && activeVal === 0) {
      return res.status(400).json({ message: 'Ne možete sami sebe deaktivirati.' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, userId]);

    // Log audit activity
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, "ADMIN_CHANGE_STATUS", ?)',
      [req.user.id, `Promenjen status korisnika ID ${userId} u ${activeVal === 1 ? 'aktivan' : 'deaktiviran'}`]
    );

    return res.json({ message: 'Status korisnika uspešno izmenjen.' });
  } catch (err) {
    console.error("Admin change status error:", err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// ----------------------------------------------------
// DICTIONARY MANAGEMENT
// ----------------------------------------------------

// Hive Types
router.get('/dictionaries/hive-types', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM hive_types ORDER BY id ASC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška pri dobavljanju tipova košnica.' });
  }
});

router.post('/dictionaries/hive-types', async (req, res) => {
  const { name } = req.body;
  const pool = getPool();
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Naziv tipa košnice mora imati najmanje 2 karaktera.' });
  }
  try {
    await pool.query('INSERT INTO hive_types (name, is_active) VALUES (?, 1)', [name.trim()]);
    return res.status(201).json({ message: 'Tip košnice uspešno kreiran.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.put('/dictionaries/hive-types/:id', async (req, res) => {
  const { name, is_active } = req.body;
  const { id } = req.params;
  const pool = getPool();
  
  if (name && name.trim().length < 2) {
    return res.status(400).json({ message: 'Naziv tipa košnice mora imati najmanje 2 karaktera.' });
  }
  
  try {
    let query = 'UPDATE hive_types SET ';
    const params = [];
    if (name) {
      query += 'name = ?, ';
      params.push(name.trim());
    }
    if (is_active !== undefined) {
      query += 'is_active = ?, ';
      params.push(is_active ? 1 : 0);
    }
    // Remove last comma
    query = query.slice(0, -2) + ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    return res.json({ message: 'Tip košnice uspešno izmenjen.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.delete('/dictionaries/hive-types/:id', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    // Logically deactivate instead of deleting physically
    await pool.query('UPDATE hive_types SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ message: 'Tip košnice uspešno deaktiviran.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Queen Breeds
router.get('/dictionaries/queen-breeds', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM queen_breeds ORDER BY id ASC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška pri dobavljanju rasa matica.' });
  }
});

router.post('/dictionaries/queen-breeds', async (req, res) => {
  const { name } = req.body;
  const pool = getPool();
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Naziv rase matice mora imati najmanje 2 karaktera.' });
  }
  try {
    await pool.query('INSERT INTO queen_breeds (name, is_active) VALUES (?, 1)', [name.trim()]);
    return res.status(201).json({ message: 'Rasa matice uspešno kreirana.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.put('/dictionaries/queen-breeds/:id', async (req, res) => {
  const { name, is_active } = req.body;
  const { id } = req.params;
  const pool = getPool();

  if (name && name.trim().length < 2) {
    return res.status(400).json({ message: 'Naziv rase matice mora imati najmanje 2 karaktera.' });
  }

  try {
    let query = 'UPDATE queen_breeds SET ';
    const params = [];
    if (name) {
      query += 'name = ?, ';
      params.push(name.trim());
    }
    if (is_active !== undefined) {
      query += 'is_active = ?, ';
      params.push(is_active ? 1 : 0);
    }
    query = query.slice(0, -2) + ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    return res.json({ message: 'Rasa matice uspešno izmenjena.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.delete('/dictionaries/queen-breeds/:id', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    await pool.query('UPDATE queen_breeds SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ message: 'Rasa matice uspešno deaktivirana.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// ----------------------------------------------------
// SYSTEM STATISTICS
// ----------------------------------------------------
router.get('/statistics', async (req, res) => {
  const pool = getPool();
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [hives] = await pool.query('SELECT COUNT(*) as count FROM hives WHERE is_archived = 0');
    const [queens] = await pool.query('SELECT COUNT(*) as count FROM queens WHERE is_archived = 0');
    const [checks] = await pool.query('SELECT COUNT(*) as count FROM queen_quality_checks');

    return res.json({
      users_count: users[0].count,
      hives_count: hives[0].count,
      queens_count: queens[0].count,
      checks_count: checks[0].count
    });
  } catch (err) {
    console.error("System statistics error:", err);
    return res.status(500).json({ message: 'Greška pri dobavljanju statistike sistema.' });
  }
});

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(`
      SELECT al.*, u.username 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    return res.json(rows);
  } catch (err) {
    console.error("Audit logs retrieval error:", err);
    return res.status(500).json({ message: 'Greška pri dobavljanju logova aktivnosti.' });
  }
});

module.exports = router;
