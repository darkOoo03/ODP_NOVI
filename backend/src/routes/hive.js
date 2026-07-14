const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateHive } = require('../middleware/validation');

// GET /api/hive (🔐 user)
// List non-archived hives with active queen and last check score
router.get('/', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const { apiary_name, location, hive_type_id } = req.query;

  try {
    let query = `
      SELECT h.*, ht.name AS hive_type_name,
        q.queen_code AS active_queen_code,
        q.id AS active_queen_id,
        (
          SELECT qc.total_score 
          FROM queen_quality_checks qc
          WHERE qc.assignment_id = qha.id
          ORDER BY qc.check_date DESC, qc.id DESC
          LIMIT 1
        ) AS last_check_score
      FROM hives h
      LEFT JOIN hive_types ht ON h.hive_type_id = ht.id
      LEFT JOIN queen_hive_assignments qha ON h.id = qha.hive_id AND qha.assignment_status = 'aktivna'
      LEFT JOIN queens q ON qha.queen_id = q.id
      WHERE h.owner_id = ? AND h.is_archived = 0
    `;
    const params = [ownerId];

    if (apiary_name) {
      query += ` AND h.apiary_name LIKE ?`;
      params.push(`%${apiary_name}%`);
    }
    if (location) {
      query += ` AND h.location LIKE ?`;
      params.push(`%${location}%`);
    }
    if (hive_type_id) {
      query += ` AND h.hive_type_id = ?`;
      params.push(parseInt(hive_type_id, 10));
    }

    query += ` ORDER BY h.code ASC`;

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching hives list:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju košnica.' });
  }
});

// GET /api/hive/:id (🔐 user)
// Hive details with active queen and historical assignments
router.get('/:id', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const hiveId = req.params.id;

  try {
    // 1. Fetch hive basic details
    const [hives] = await pool.query(
      `SELECT h.*, ht.name AS hive_type_name
       FROM hives h
       LEFT JOIN hive_types ht ON h.hive_type_id = ht.id
       WHERE h.id = ? AND h.owner_id = ? AND h.is_archived = 0`,
      [hiveId, ownerId]
    );

    if (hives.length === 0) {
      return res.status(404).json({ message: 'Košnica nije pronađena.' });
    }

    const hive = hives[0];

    // 2. Fetch active queen if any
    const [activeQueenRows] = await pool.query(
      `SELECT q.id, q.queen_code, qha.id AS assignment_id, qha.assigned_at
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.hive_id = ? AND qha.assignment_status = 'aktivna' AND q.is_archived = 0`,
      [hiveId]
    );

    hive.active_queen = activeQueenRows.length > 0 ? activeQueenRows[0] : null;

    // 3. Fetch queen history in this hive (Assignments history)
    const [assignmentsHistory] = await pool.query(
      `SELECT qha.id AS assignment_id, qha.assigned_at, qha.ended_at, qha.assignment_status, qha.note AS assignment_note,
              q.queen_code, q.id AS queen_id, q.marking_color
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.hive_id = ?
       ORDER BY qha.assigned_at DESC, qha.id DESC`,
      [hiveId]
    );

    hive.assignments_history = assignmentsHistory;

    // 4. Fetch last 5 quality checks for the active assignment (if any)
    if (hive.active_queen) {
      const [checks] = await pool.query(
        `SELECT qc.*, u.username AS checked_by_username
         FROM queen_quality_checks qc
         JOIN users u ON qc.checked_by = u.id
         WHERE qc.assignment_id = ?
         ORDER BY qc.check_date DESC, qc.id DESC
         LIMIT 5`,
        [hive.active_queen.assignment_id]
      );
      hive.active_queen_checks = checks;
    } else {
      hive.active_queen_checks = [];
    }

    return res.json(hive);
  } catch (err) {
    console.error("Error fetching hive details:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju detalja košnice.' });
  }
});

// POST /api/hive (🔐 user)
router.post('/', authenticateToken, validateHive, async (req, res) => {
  const { code, hive_type_id, apiary_name, location, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Check code uniqueness per user (only non-archived hives)
    const [existing] = await pool.query(
      'SELECT id FROM hives WHERE code = ? AND owner_id = ? AND is_archived = 0',
      [code, ownerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Oznaka košnice već postoji' });
    }

    // Check if hive type is active
    const [types] = await pool.query(
      'SELECT id FROM hive_types WHERE id = ? AND is_active = 1',
      [hive_type_id]
    );

    if (types.length === 0) {
      return res.status(400).json({ message: 'Izaberite validan tip košnice' });
    }

    const [result] = await pool.query(
      `INSERT INTO hives (code, hive_type_id, apiary_name, location, note, owner_id, is_archived)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [code, hive_type_id, apiary_name, location, note || null, ownerId]
    );

    return res.status(201).json({
      message: 'Košnica uspešno kreirana.',
      hive_id: result.insertId
    });

  } catch (err) {
    console.error("Error creating hive:", err);
    return res.status(500).json({ message: 'Greška na serveru pri kreiranju košnice.' });
  }
});

// PUT /api/hive/:id (🔐 user)
router.put('/:id', authenticateToken, validateHive, async (req, res) => {
  const hiveId = req.params.id;
  const { code, hive_type_id, apiary_name, location, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Verify ownership and existence
    const [hives] = await pool.query(
      'SELECT id FROM hives WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [hiveId, ownerId]
    );

    if (hives.length === 0) {
      return res.status(404).json({ message: 'Košnica nije pronađena.' });
    }

    // Check code uniqueness (excluding current hive)
    const [existing] = await pool.query(
      'SELECT id FROM hives WHERE code = ? AND owner_id = ? AND id != ? AND is_archived = 0',
      [code, ownerId, hiveId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Oznaka košnice već postoji' });
    }

    // Check if hive type is active
    const [types] = await pool.query(
      'SELECT id FROM hive_types WHERE id = ? AND is_active = 1',
      [hive_type_id]
    );

    if (types.length === 0) {
      return res.status(400).json({ message: 'Izaberite validan tip košnice' });
    }

    await pool.query(
      `UPDATE hives 
       SET code = ?, hive_type_id = ?, apiary_name = ?, location = ?, note = ?
       WHERE id = ? AND owner_id = ?`,
      [code, hive_type_id, apiary_name, location, note || null, hiveId, ownerId]
    );

    return res.json({ message: 'Košnica uspešno izmenjena.' });

  } catch (err) {
    console.error("Error updating hive:", err);
    return res.status(500).json({ message: 'Greška na serveru pri izmeni košnice.' });
  }
});

// DELETE /api/hive/:id (🔐 user logical archive)
router.delete('/:id', authenticateToken, async (req, res) => {
  const hiveId = req.params.id;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Check ownership and existence
    const [hives] = await pool.query(
      'SELECT id FROM hives WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [hiveId, ownerId]
    );

    if (hives.length === 0) {
      return res.status(404).json({ message: 'Košnica nije pronađena.' });
    }

    // Logically archive the hive
    await pool.query(
      'UPDATE hives SET is_archived = 1 WHERE id = ? AND owner_id = ?',
      [hiveId, ownerId]
    );

    // End any active assignments for this hive
    await pool.query(
      `UPDATE queen_hive_assignments 
       SET ended_at = CURRENT_DATE(), assignment_status = 'zavrsena', note = CONCAT(IFNULL(note, ''), ' (Zatvoreno automatski zbog arhiviranja košnice)')
       WHERE hive_id = ? AND assignment_status = 'aktivna'`,
      [hiveId]
    );

    return res.json({ message: 'Košnica uspešno arhivirana.' });

  } catch (err) {
    console.error("Error archiving hive:", err);
    return res.status(500).json({ message: 'Greška na serveru pri arhiviranju košnice.' });
  }
});

module.exports = router;
