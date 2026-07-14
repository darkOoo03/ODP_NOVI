const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateQueen } = require('../middleware/validation');

// GET /api/queens (🔐 user)
// List non-archived queens with active hive, breed, average rating, and last recommendation
router.get('/', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const { status, breed_id, marking_color, birth_year, current_hive_id } = req.query;

  try {
    let query = `
      SELECT q.*, qb.name AS breed_name,
        h.id AS current_hive_id,
        h.code AS current_hive_code,
        (
          SELECT AVG(qc.total_score)
          FROM queen_quality_checks qc
          JOIN queen_hive_assignments qha2 ON qc.assignment_id = qha2.id
          WHERE qha2.queen_id = q.id
        ) AS average_score,
        (
          SELECT qc.recommendation
          FROM queen_quality_checks qc
          JOIN queen_hive_assignments qha2 ON qc.assignment_id = qha2.id
          WHERE qha2.queen_id = q.id
          ORDER BY qc.check_date DESC, qc.id DESC
          LIMIT 1
        ) AS last_recommendation
      FROM queens q
      LEFT JOIN queen_breeds qb ON q.breed_id = qb.id
      LEFT JOIN queen_hive_assignments qha ON q.id = qha.queen_id AND qha.assignment_status = 'aktivna'
      LEFT JOIN hives h ON qha.hive_id = h.id AND h.is_archived = 0
      WHERE q.owner_id = ? AND q.is_archived = 0
    `;
    const params = [ownerId];

    if (status) {
      query += ` AND q.status = ?`;
      params.push(status);
    }
    if (breed_id) {
      query += ` AND q.breed_id = ?`;
      params.push(parseInt(breed_id, 10));
    }
    if (marking_color) {
      query += ` AND q.marking_color = ?`;
      params.push(marking_color);
    }
    if (birth_year) {
      query += ` AND q.birth_year = ?`;
      params.push(parseInt(birth_year, 10));
    }
    if (current_hive_id) {
      query += ` AND h.id = ?`;
      params.push(parseInt(current_hive_id, 10));
    }

    query += ` ORDER BY q.queen_code ASC`;

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching queens list:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju matica.' });
  }
});

// GET /api/queens/:id (🔐 user)
// Queen details, age, average score, current hive, historical assignments, and quality checks trend
router.get('/:id', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const queenId = req.params.id;

  try {
    // 1. Fetch queen basic details
    const [queens] = await pool.query(
      `SELECT q.*, qb.name AS breed_name
       FROM queens q
       LEFT JOIN queen_breeds qb ON q.breed_id = qb.id
       WHERE q.id = ? AND q.owner_id = ? AND q.is_archived = 0`,
      [queenId, ownerId]
    );

    if (queens.length === 0) {
      return res.status(404).json({ message: 'Matica nije pronađena.' });
    }

    const queen = queens[0];
    const currentYear = new Date().getFullYear();
    queen.age_years = currentYear - queen.birth_year;

    // 2. Fetch current hive if active
    const [activeHiveRows] = await pool.query(
      `SELECT h.id, h.code, h.apiary_name, h.location, qha.id AS assignment_id, qha.assigned_at
       FROM queen_hive_assignments qha
       JOIN hives h ON qha.hive_id = h.id
       WHERE qha.queen_id = ? AND qha.assignment_status = 'aktivna' AND h.is_archived = 0`,
      [queenId]
    );

    queen.current_hive = activeHiveRows.length > 0 ? activeHiveRows[0] : null;

    // 3. Fetch average score
    const [scoreRows] = await pool.query(
      `SELECT AVG(qc.total_score) AS average_score
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       WHERE qha.queen_id = ?`,
      [queenId]
    );
    queen.average_score = scoreRows[0].average_score ? parseFloat(scoreRows[0].average_score).toFixed(2) : null;

    // 4. Fetch assignments history (hives this queen has lived in)
    const [hivesHistory] = await pool.query(
      `SELECT qha.id AS assignment_id, qha.assigned_at, qha.ended_at, qha.assignment_status, qha.note AS assignment_note,
              h.code AS hive_code, h.id AS hive_id, h.apiary_name
       FROM queen_hive_assignments qha
       JOIN hives h ON qha.hive_id = h.id
       WHERE qha.queen_id = ?
       ORDER BY qha.assigned_at DESC, qha.id DESC`,
      [queenId]
    );
    queen.assignments_history = hivesHistory;

    // 5. Fetch quality checks history (to render the trend chart)
    const [qualityChecks] = await pool.query(
      `SELECT qc.*, h.code AS hive_code, u.username AS checked_by_username
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN hives h ON qha.hive_id = h.id
       JOIN users u ON qc.checked_by = u.id
       WHERE qha.queen_id = ?
       ORDER BY qc.check_date DESC, qc.id DESC`,
      [queenId]
    );
    queen.quality_checks_history = qualityChecks;

    // 6. Calculate last recommendation
    queen.last_recommendation = qualityChecks.length > 0 ? qualityChecks[0].recommendation : null;

    return res.json(queen);
  } catch (err) {
    console.error("Error fetching queen details:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju detalja matice.' });
  }
});

// POST /api/queens (🔐 user)
router.post('/', authenticateToken, validateQueen, async (req, res) => {
  const { queen_code, breed_id, birth_year, marking_color, origin, status, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Check queen_code uniqueness per user (only non-archived queens)
    const [existing] = await pool.query(
      'SELECT id FROM queens WHERE queen_code = ? AND owner_id = ? AND is_archived = 0',
      [queen_code, ownerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Oznaka matice već postoji' });
    }

    // Verify breed is active
    const [breeds] = await pool.query(
      'SELECT id FROM queen_breeds WHERE id = ? AND is_active = 1',
      [breed_id]
    );

    if (breeds.length === 0) {
      return res.status(400).json({ message: 'Izaberite validnu rasu matice' });
    }

    // Auto calculate marking color if needed, but validation will enforce whatever color they send (proposed color is recommended in frontend anyway)
    // Save
    const [result] = await pool.query(
      `INSERT INTO queens (queen_code, breed_id, birth_year, marking_color, origin, status, note, owner_id, is_archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [queen_code, breed_id, birth_year, marking_color, origin, status, note || null, ownerId]
    );

    return res.status(201).json({
      message: 'Matica uspešno kreirana.',
      queen_id: result.insertId
    });

  } catch (err) {
    console.error("Error creating queen:", err);
    return res.status(500).json({ message: 'Greška na serveru pri kreiranju matice.' });
  }
});

// PUT /api/queens/:id (🔐 user)
router.put('/:id', authenticateToken, validateQueen, async (req, res) => {
  const queenId = req.params.id;
  const { queen_code, breed_id, birth_year, marking_color, origin, status, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Verify ownership and existence
    const [queens] = await pool.query(
      'SELECT id FROM queens WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [queenId, ownerId]
    );

    if (queens.length === 0) {
      return res.status(404).json({ message: 'Matica nije pronađena.' });
    }

    // Check code uniqueness (excluding current queen)
    const [existing] = await pool.query(
      'SELECT id FROM queens WHERE queen_code = ? AND owner_id = ? AND id != ? AND is_archived = 0',
      [queen_code, ownerId, queenId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Oznaka matice već postoji' });
    }

    // Verify breed is active
    const [breeds] = await pool.query(
      'SELECT id FROM queen_breeds WHERE id = ? AND is_active = 1',
      [breed_id]
    );

    if (breeds.length === 0) {
      return res.status(400).json({ message: 'Izaberite validnu rasu matice' });
    }

    await pool.query(
      `UPDATE queens 
       SET queen_code = ?, breed_id = ?, birth_year = ?, marking_color = ?, origin = ?, status = ?, note = ?
       WHERE id = ? AND owner_id = ?`,
      [queen_code, breed_id, birth_year, marking_color, origin, status, note || null, queenId, ownerId]
    );

    return res.json({ message: 'Matica uspešno izmenjena.' });

  } catch (err) {
    console.error("Error updating queen:", err);
    return res.status(500).json({ message: 'Greška na serveru pri izmeni matice.' });
  }
});

// DELETE /api/queens/:id (🔐 user logical archive)
router.delete('/:id', authenticateToken, async (req, res) => {
  const queenId = req.params.id;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Check ownership and existence
    const [queens] = await pool.query(
      'SELECT id FROM queens WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [queenId, ownerId]
    );

    if (queens.length === 0) {
      return res.status(404).json({ message: 'Matica nije pronađena.' });
    }

    // Logically archive the queen
    await pool.query(
      'UPDATE queens SET is_archived = 1 WHERE id = ? AND owner_id = ?',
      [queenId, ownerId]
    );

    // End any active assignments for this queen
    await pool.query(
      `UPDATE queen_hive_assignments 
       SET ended_at = CURRENT_DATE(), assignment_status = 'zavrsena', note = CONCAT(IFNULL(note, ''), ' (Zatvoreno automatski zbog arhiviranja matice)')
       WHERE queen_id = ? AND assignment_status = 'aktivna'`,
      [queenId]
    );

    return res.json({ message: 'Matica uspešno arhivirana.' });

  } catch (err) {
    console.error("Error archiving queen:", err);
    return res.status(500).json({ message: 'Greška na serveru pri arhiviranju matice.' });
  }
});

module.exports = router;
