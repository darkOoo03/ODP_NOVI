const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateQualityCheck } = require('../middleware/validation');

// Helper to calculate total score and recommendation
function calculateScoresAndRecommendation(body) {
  const isQueenSeen = body.is_queen_seen === true || body.is_queen_seen === 'true' || body.is_queen_seen === 1 || body.is_queen_seen === '1';
  
  if (!isQueenSeen) {
    return {
      totalScore: 0.00,
      recommendation: 'dodati_novu'
    };
  }

  const brood = parseInt(body.brood_score, 10);
  const laying = parseInt(body.laying_score, 10);
  const temp = parseInt(body.temperament_score, 10);
  const prod = parseInt(body.productivity_score, 10);
  const health = parseInt(body.health_score, 10);

  const avg = (brood + laying + temp + prod + health) / 5.0;
  const totalScore = parseFloat(avg.toFixed(2));

  let rec = 'zadrzati';
  if (totalScore >= 4.0) {
    rec = 'zadrzati';
  } else if (totalScore >= 3.0) {
    rec = 'pratiti';
  } else if (totalScore >= 2.0) {
    rec = 'zameniti';
  } else {
    rec = 'hitno_zameniti';
  }

  return {
    totalScore,
    recommendation: rec
  };
}

// GET /api/queen-quality-checks (🔐 user)
// List quality checks with filters, ordered newest first
router.get('/', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const { assignment_id, checked_by, date_from, date_to, recommendation } = req.query;

  try {
    let query = `
      SELECT qc.*, q.queen_code, h.code AS hive_code, u.username AS checked_by_username
      FROM queen_quality_checks qc
      JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
      JOIN queens q ON qha.queen_id = q.id
      JOIN hives h ON qha.hive_id = h.id
      JOIN users u ON qc.checked_by = u.id
      WHERE q.owner_id = ? AND h.owner_id = ?
    `;
    const params = [ownerId, ownerId];

    if (assignment_id) {
      query += ` AND qc.assignment_id = ?`;
      params.push(parseInt(assignment_id, 10));
    }
    if (checked_by) {
      query += ` AND qc.checked_by = ?`;
      params.push(parseInt(checked_by, 10));
    }
    if (date_from) {
      query += ` AND qc.check_date >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND qc.check_date <= ?`;
      params.push(date_to);
    }
    if (recommendation) {
      query += ` AND qc.recommendation = ?`;
      params.push(recommendation);
    }

    query += ` ORDER BY qc.check_date DESC, qc.id DESC`;

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching quality checks:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju kontrola kvaliteta.' });
  }
});

// GET /api/queen-quality-checks/:id (🔐 user)
router.get('/:id', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const checkId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT qc.*, q.queen_code, q.id AS queen_id, h.code AS hive_code, h.id AS hive_id, u.username AS checked_by_username
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN queens q ON qha.queen_id = q.id
       JOIN hives h ON qha.hive_id = h.id
       JOIN users u ON qc.checked_by = u.id
       WHERE qc.id = ? AND q.owner_id = ? AND h.owner_id = ?`,
      [checkId, ownerId, ownerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Kontrola kvaliteta nije pronađena.' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching check details:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju detalja kontrole.' });
  }
});

// GET /api/queen-quality-checks/assignment/:assignmentId (🔐 user)
// Get all quality checks for a specific assignment
router.get('/assignment/:assignmentId', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const assignmentId = req.params.assignmentId;

  try {
    // Verify assignment belongs to user
    const [assignments] = await pool.query(
      `SELECT qha.id 
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.id = ? AND q.owner_id = ?`,
      [assignmentId, ownerId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: 'Dodela nije pronađena.' });
    }

    const [rows] = await pool.query(
      `SELECT qc.*, u.username AS checked_by_username
       FROM queen_quality_checks qc
       JOIN users u ON qc.checked_by = u.id
       WHERE qc.assignment_id = ?
       ORDER BY qc.check_date DESC, qc.id DESC`,
      [assignmentId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error fetching assignment checks:", err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// POST /api/queen-quality-checks (🔐 user)
// Create check for active assignment. Performs auto-recommendation & total score calculations.
router.post('/', authenticateToken, validateQualityCheck, async (req, res) => {
  const { assignment_id, check_date, is_queen_seen, are_eggs_seen, brood_score, laying_score, temperament_score, productivity_score, health_score, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // 1. Verify that assignment exists and belongs to this user
    const [assignments] = await pool.query(
      `SELECT qha.id, qha.assignment_status 
       FROM queen_hive_assignments qha
       JOIN queens q ON qha.queen_id = q.id
       WHERE qha.id = ? AND q.owner_id = ?`,
      [assignment_id, ownerId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: 'Dodela za kontrolu nije validna' });
    }

    // 2. Perform score & recommendation calculation
    const { totalScore, recommendation } = calculateScoresAndRecommendation(req.body);

    const isQueenSeenVal = is_queen_seen === true || is_queen_seen === 'true' || is_queen_seen === 1 || is_queen_seen === '1' ? 1 : 0;
    const areEggsSeenVal = are_eggs_seen === true || are_eggs_seen === 'true' || are_eggs_seen === 1 || are_eggs_seen === '1' ? 1 : 0;

    // 3. Save to database
    const [result] = await pool.query(
      `INSERT INTO queen_quality_checks 
       (assignment_id, check_date, is_queen_seen, are_eggs_seen, brood_score, laying_score, temperament_score, productivity_score, health_score, total_score, recommendation, note, checked_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment_id, 
        check_date, 
        isQueenSeenVal, 
        areEggsSeenVal, 
        brood_score, 
        laying_score, 
        temperament_score, 
        productivity_score, 
        health_score, 
        totalScore, 
        recommendation, 
        note || null, 
        ownerId
      ]
    );

    return res.status(201).json({
      message: 'Kontrola kvaliteta uspešno kreirana.',
      check_id: result.insertId,
      total_score: totalScore,
      recommendation
    });

  } catch (err) {
    console.error("Error creating quality check:", err);
    return res.status(500).json({ message: 'Greška na serveru pri kreiranju kontrole kvaliteta.' });
  }
});

// PUT /api/queen-quality-checks/:id (🔐 user)
// Edit a quality check. Recalculates average & recommendation.
router.put('/:id', authenticateToken, validateQualityCheck, async (req, res) => {
  const checkId = req.params.id;
  const { assignment_id, check_date, is_queen_seen, are_eggs_seen, brood_score, laying_score, temperament_score, productivity_score, health_score, note } = req.body;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // 1. Verify check ownership and existence
    const [checks] = await pool.query(
      `SELECT qc.id 
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN queens q ON qha.queen_id = q.id
       WHERE qc.id = ? AND q.owner_id = ?`,
      [checkId, ownerId]
    );

    if (checks.length === 0) {
      return res.status(404).json({ message: 'Kontrola kvaliteta nije pronađena ili nemate dozvolu.' });
    }

    // 2. Perform score & recommendation calculation
    const { totalScore, recommendation } = calculateScoresAndRecommendation(req.body);

    const isQueenSeenVal = is_queen_seen === true || is_queen_seen === 'true' || is_queen_seen === 1 || is_queen_seen === '1' ? 1 : 0;
    const areEggsSeenVal = are_eggs_seen === true || are_eggs_seen === 'true' || are_eggs_seen === 1 || are_eggs_seen === '1' ? 1 : 0;

    // 3. Update database
    await pool.query(
      `UPDATE queen_quality_checks 
       SET assignment_id = ?, check_date = ?, is_queen_seen = ?, are_eggs_seen = ?, brood_score = ?, laying_score = ?, 
           temperament_score = ?, productivity_score = ?, health_score = ?, total_score = ?, recommendation = ?, note = ?
       WHERE id = ?`,
      [
        assignment_id, 
        check_date, 
        isQueenSeenVal, 
        areEggsSeenVal, 
        brood_score, 
        laying_score, 
        temperament_score, 
        productivity_score, 
        health_score, 
        totalScore, 
        recommendation, 
        note || null, 
        checkId
      ]
    );

    return res.json({
      message: 'Kontrola kvaliteta uspešno izmenjena.',
      total_score: totalScore,
      recommendation
    });

  } catch (err) {
    console.error("Error updating quality check:", err);
    return res.status(500).json({ message: 'Greška na serveru pri izmeni kontrole kvaliteta.' });
  }
});

// DELETE /api/queen-quality-checks/:id (🔐 user)
router.delete('/:id', authenticateToken, async (req, res) => {
  const checkId = req.params.id;
  const ownerId = req.user.id;
  const pool = getPool();

  try {
    // Verify check ownership and existence
    const [checks] = await pool.query(
      `SELECT qc.id 
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN queens q ON qha.queen_id = q.id
       WHERE qc.id = ? AND q.owner_id = ?`,
      [checkId, ownerId]
    );

    if (checks.length === 0) {
      return res.status(404).json({ message: 'Kontrola kvaliteta nije pronađena.' });
    }

    await pool.query('DELETE FROM queen_quality_checks WHERE id = ?', [checkId]);

    return res.json({ message: 'Kontrola kvaliteta uspešno obrisana.' });

  } catch (err) {
    console.error("Error deleting quality check:", err);
    return res.status(500).json({ message: 'Greška na serveru pri brisanju kontrole kvaliteta.' });
  }
});

module.exports = router;
