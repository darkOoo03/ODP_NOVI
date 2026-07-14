const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateAssignment } = require('../middleware/validation');

// GET /api/queen-hive-assignments (🔐 user)
// List assignments for the user with filters
router.get('/', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const { queen_id, hive_id, assignment_status } = req.query;

  try {
    let query = `
      SELECT qha.*, q.queen_code, q.marking_color, h.code AS hive_code, h.apiary_name
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       JOIN hives h ON qha.hive_id = h.id
       WHERE q.owner_id = ? AND h.owner_id = ?
    `;
    const params = [ownerId, ownerId];

    if (queen_id) {
      query += ` AND qha.queen_id = ?`;
      params.push(parseInt(queen_id, 10));
    }
    if (hive_id) {
      query += ` AND qha.hive_id = ?`;
      params.push(parseInt(hive_id, 10));
    }
    if (assignment_status) {
      query += ` AND qha.assignment_status = ?`;
      params.push(assignment_status);
    }

    query += ` ORDER BY qha.assigned_at DESC, qha.id DESC`;

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching assignments:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju dodela.' });
  }
});

// GET /api/queen-hive-assignments/queen/:queenId (🔐 user)
// List all hives this queen has ever been assigned to
router.get('/queen/:queenId', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const queenId = req.params.queenId;

  try {
    // Verify user owns the queen
    const [queens] = await pool.query('SELECT id FROM queens WHERE id = ? AND owner_id = ?', [queenId, ownerId]);
    if (queens.length === 0) {
      return res.status(404).json({ message: 'Matica nije pronađena.' });
    }

    const [rows] = await pool.query(
      `SELECT qha.*, h.code AS hive_code, h.apiary_name, h.location
       FROM queen_hive_assignments qha
       JOIN hives h ON qha.hive_id = h.id
       WHERE qha.queen_id = ?
       ORDER BY qha.assigned_at DESC, qha.id DESC`,
      [queenId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching queen assignments history:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju istorije matice.' });
  }
});

// GET /api/queen-hive-assignments/hive/:hiveId (🔐 user)
// List all queens ever assigned to this hive
router.get('/hive/:hiveId', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const hiveId = req.params.hiveId;

  try {
    // Verify user owns the hive
    const [hives] = await pool.query('SELECT id FROM hives WHERE id = ? AND owner_id = ?', [hiveId, ownerId]);
    if (hives.length === 0) {
      return res.status(404).json({ message: 'Košnica nije pronađena.' });
    }

    const [rows] = await pool.query(
      `SELECT qha.*, q.queen_code, q.marking_color, q.birth_year, q.origin
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.hive_id = ?
       ORDER BY qha.assigned_at DESC, qha.id DESC`,
      [hiveId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching hive assignments history:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju istorije košnice.' });
  }
});

// POST /api/queen-hive-assignments (🔐 user)
// Create assignment. Ensures queen and hive belong to user. Close previous assignments if active.
router.post('/', authenticateToken, validateAssignment, async (req, res) => {
  const { queen_id, hive_id, assigned_at, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // 1. Verify queen ownership and status
    const [queens] = await pool.query(
      'SELECT id, status, queen_code FROM queens WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [queen_id, ownerId]
    );
    if (queens.length === 0) {
      return res.status(404).json({ message: 'Matica nije pronađena.' });
    }
    const queen = queens[0];
    if (queen.status !== 'aktivna') {
      return res.status(400).json({ message: `Matica ${queen.queen_code} nije aktivna (status: ${queen.status}).` });
    }

    // 2. Verify hive ownership
    const [hives] = await pool.query(
      'SELECT id, code FROM hives WHERE id = ? AND owner_id = ? AND is_archived = 0',
      [hive_id, ownerId]
    );
    if (hives.length === 0) {
      return res.status(404).json({ message: 'Košnica nije pronađena.' });
    }
    const hive = hives[0];

    // Begin transaction to ensure assignment consistency
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Close previous active assignment of this queen if exists
      const [prevQueenAssign] = await connection.query(
        'SELECT id FROM queen_hive_assignments WHERE queen_id = ? AND assignment_status = "aktivna"',
        [queen_id]
      );
      if (prevQueenAssign.length > 0) {
        await connection.query(
          `UPDATE queen_hive_assignments 
           SET ended_at = ?, assignment_status = "zavrsena"
           WHERE queen_id = ? AND assignment_status = "aktivna"`,
          [assigned_at, queen_id]
        );
      }

      // Close previous active assignment of this hive if exists
      const [prevHiveAssign] = await connection.query(
        'SELECT id FROM queen_hive_assignments WHERE hive_id = ? AND assignment_status = "aktivna"',
        [hive_id]
      );
      if (prevHiveAssign.length > 0) {
        await connection.query(
          `UPDATE queen_hive_assignments 
           SET ended_at = ?, assignment_status = "zavrsena"
           WHERE hive_id = ? AND assignment_status = "aktivna"`,
          [assigned_at, hive_id]
        );
      }

      // Insert new active assignment
      const [insertResult] = await connection.query(
        `INSERT INTO queen_hive_assignments (queen_id, hive_id, assigned_at, ended_at, assignment_status, note)
         VALUES (?, ?, ?, NULL, 'aktivna', ?)`,
        [queen_id, hive_id, assigned_at, note || null]
      );

      await connection.commit();

      return res.status(201).json({
        message: 'Matica uspešno dodeljena košnici.',
        assignment_id: insertResult.insertId
      });

    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error("Error creating assignment:", err);
    return res.status(500).json({ message: 'Greška na serveru pri kreiranju dodele.' });
  }
});

// PUT /api/queen-hive-assignments/:id/end (🔐 user)
// Manually end an assignment
router.put('/:id/end', authenticateToken, async (req, res) => {
  const assignmentId = req.params.id;
  const ownerId = req.user.id;
  const { ended_at, note } = req.body;
  const pool = getPool();

  const endDate = ended_at || new Date().toISOString().split('T')[0];

  try {
    // Verify ownership of the assignment
    const [assignments] = await pool.query(
      `SELECT qha.id, qha.assigned_at, qha.assignment_status 
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.id = ? AND q.owner_id = ?`,
      [assignmentId, ownerId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: 'Dodela nije pronađena.' });
    }

    const assignment = assignments[0];
    if (assignment.assignment_status === 'zavrsena') {
      return res.status(400).json({ message: 'Dodela je već zatvorena.' });
    }

    if (new Date(endDate) < new Date(assignment.assigned_at)) {
      return res.status(400).json({ message: 'Datumi dodele nisu validni (datum završetka mora biti posle datuma dodele).' });
    }

    await pool.query(
      `UPDATE queen_hive_assignments 
       SET ended_at = ?, assignment_status = 'zavrsena', note = IFNULL(?, note)
       WHERE id = ?`,
      [endDate, note || null, assignmentId]
    );

    return res.json({ message: 'Dodela uspešno zatvorena.' });

  } catch (err) {
    console.error("Error ending assignment:", err);
    return res.status(500).json({ message: 'Greška na serveru pri zatvaranju dodele.' });
  }
});

module.exports = router;
