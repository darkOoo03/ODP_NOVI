const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'queen_tracker_secret_key_123';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Token nije prosleđen. Pristup odbijen.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check in database if user is active
    const pool = getPool();
    const [users] = await pool.query('SELECT id, username, role, is_active FROM users WHERE id = ?', [decoded.user_id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Korisnik ne postoji.' });
    }
    
    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Vaš nalog je deaktiviran. Kontaktirajte administratora.' });
    }
    
    // Attach user to request object
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(403).json({ message: 'Nevažeći token.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Korisnik nije autentifikovan.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nemate dozvolu za ovu akciju.' });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  adminOnly,
  JWT_SECRET
};
