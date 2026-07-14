const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard/summary (🔐 user)
// Beekeeper dashboard overview stats and recent checks
router.get('/summary', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;

  try {
    // 1. Total hives count
    const [hivesCountRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM hives WHERE owner_id = ? AND is_archived = 0',
      [ownerId]
    );
    const totalHives = hivesCountRows[0].count;

    // 2. Total queens count
    const [queensCountRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM queens WHERE owner_id = ? AND is_archived = 0',
      [ownerId]
    );
    const totalQueens = queensCountRows[0].count;

    // 3. Hives without active queen
    const [hivesWithoutQueenRows] = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM hives h 
       WHERE h.owner_id = ? AND h.is_archived = 0 
         AND h.id NOT IN (
           SELECT hive_id 
           FROM queen_hive_assignments 
           WHERE assignment_status = 'aktivna'
         )`,
      [ownerId]
    );
    const hivesWithoutQueen = hivesWithoutQueenRows[0].count;

    // 4. Last 5 quality checks
    const [lastChecks] = await pool.query(
      `SELECT qc.*, q.queen_code, h.code AS hive_code
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN queens q ON qha.queen_id = q.id
       JOIN hives h ON qha.hive_id = h.id
       WHERE q.owner_id = ?
       ORDER BY qc.check_date DESC, qc.id DESC
       LIMIT 5`,
      [ownerId]
    );

    // 5. Total average score
    const [overallAvgRows] = await pool.query(
      `SELECT AVG(qc.total_score) AS average
       FROM queen_quality_checks qc
       JOIN queen_hive_assignments qha ON qc.assignment_id = qha.id
       JOIN queens q ON qha.queen_id = q.id
       WHERE q.owner_id = ?`,
      [ownerId]
    );
    const overallAverage = overallAvgRows[0].average ? parseFloat(overallAvgRows[0].average).toFixed(2) : null;

    return res.json({
      total_hives: totalHives,
      total_queens: totalQueens,
      hives_without_queen: hivesWithoutQueen,
      overall_average: overallAverage,
      recent_checks: lastChecks
    });

  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju rezimea.' });
  }
});

// GET /api/dashboard/warnings (🔐 user)
// Fetch hives and queens that require attention
router.get('/warnings', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;
  const currentYear = new Date().getFullYear();

  try {
    const warnings = [];

    // 1. Queens older than 2 years
    const [oldQueens] = await pool.query(
      `SELECT id, queen_code, birth_year, (? - birth_year) AS age
       FROM queens
       WHERE owner_id = ? AND status = 'aktivna' AND is_archived = 0 AND (? - birth_year) > 2`,
      [currentYear, ownerId, currentYear]
    );
    for (const q of oldQueens) {
      warnings.push({
        type: 'OLD_QUEEN',
        target_id: q.id,
        title: `Stara matica: ${q.queen_code}`,
        description: `Matica je stara ${q.age} godine (godina izleganja: ${q.birth_year}). Starije matice zahtevaju praćenje ili zamenu.`,
        severity: 'warning'
      });
    }

    // 2. Queens with average rating below 3.0
    const [lowScoreQueens] = await pool.query(
      `SELECT q.id, q.queen_code, AVG(qc.total_score) AS avg_score
       FROM queens q
       JOIN queen_hive_assignments qha ON q.id = qha.queen_id
       JOIN queen_quality_checks qc ON qha.id = qc.assignment_id
       WHERE q.owner_id = ? AND q.is_archived = 0 AND q.status = 'aktivna'
       GROUP BY q.id
       HAVING avg_score < 3.0`,
      [ownerId]
    );
    for (const q of lowScoreQueens) {
      warnings.push({
        type: 'LOW_SCORE_QUEEN',
        target_id: q.id,
        title: `Nizak kvalitet matice: ${q.queen_code}`,
        description: `Prosečna ocena matice iznosi ${parseFloat(q.avg_score).toFixed(2)}, što je ispod preporučenog minimuma 3.0.`,
        severity: 'danger'
      });
    }

    // 3. Hives without active queen
    const [hivesWithoutQueen] = await pool.query(
      `SELECT id, code, apiary_name, location 
       FROM hives h 
       WHERE h.owner_id = ? AND h.is_archived = 0 
         AND h.id NOT IN (
           SELECT hive_id 
           FROM queen_hive_assignments 
           WHERE assignment_status = 'aktivna'
         )
       ORDER BY h.code ASC`,
      [ownerId]
    );
    for (const h of hivesWithoutQueen) {
      warnings.push({
        type: 'HIVE_WITHOUT_QUEEN',
        target_id: h.id,
        title: `Košnica bez matice: ${h.code}`,
        description: `Košnica ${h.code} na pčelinjaku "${h.apiary_name}" nema aktivnu dodeljenu maticu. Potrebno je dodeliti maticu.`,
        severity: 'info'
      });
    }

    // 4. Active queens without any checks in the last 30 days
    const [uncheckedQueens] = await pool.query(
      `SELECT q.id, q.queen_code, h.code AS hive_code,
              (
                SELECT MAX(qc.check_date)
                FROM queen_quality_checks qc
                WHERE qc.assignment_id = qha.id
              ) AS last_check_date
       FROM queens q
       JOIN queen_hive_assignments qha ON q.id = qha.queen_id AND qha.assignment_status = 'aktivna'
       JOIN hives h ON qha.hive_id = h.id AND h.is_archived = 0
       WHERE q.owner_id = ? AND q.is_archived = 0 AND q.status = 'aktivna'
       HAVING last_check_date IS NULL OR last_check_date < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
      [ownerId]
    );
    for (const q of uncheckedQueens) {
      const desc = q.last_check_date 
        ? `Poslednja kontrola kvaliteta izvršena je ${new Date(q.last_check_date).toLocaleDateString('sr-RS')}. Preporučuje se pregled svakih 30 dana.`
        : `Za ovu maticu još uvek nije uneta nijedna kontrola kvaliteta.`;
      warnings.push({
        type: 'UNCHECKED_QUEEN',
        target_id: q.id,
        title: `Potreban pregled: ${q.queen_code}`,
        description: desc,
        severity: 'warning'
      });
    }

    return res.json(warnings);

  } catch (err) {
    console.error("Error fetching dashboard warnings:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju upozorenja.' });
  }
});

// GET /api/dashboard/quality-ranking (🔐 user)
// Ranking of beekeeper's queens by average score
router.get('/quality-ranking', authenticateToken, async (req, res) => {
  const pool = getPool();
  const ownerId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT q.id, q.queen_code, q.marking_color, q.birth_year, qb.name AS breed_name,
              AVG(qc.total_score) AS avg_score,
              COUNT(qc.id) AS checks_count
       FROM queens q
       LEFT JOIN queen_breeds qb ON q.breed_id = qb.id
       JOIN queen_hive_assignments qha ON q.id = qha.queen_id
       JOIN queen_quality_checks qc ON qha.id = qc.assignment_id
       WHERE q.owner_id = ? AND q.is_archived = 0
       GROUP BY q.id
       ORDER BY avg_score DESC, checks_count DESC`,
      [ownerId]
    );

    // Format average scores to 2 decimal places
    const formatted = rows.map(r => ({
      ...r,
      avg_score: parseFloat(r.avg_score).toFixed(2)
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Error fetching queen quality ranking:", err);
    return res.status(500).json({ message: 'Greška na serveru pri dobavljanju rang liste.' });
  }
});

module.exports = router;
