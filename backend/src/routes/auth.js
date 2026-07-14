const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getPool } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Samo slike su dozvoljene za profilnu sliku.'), false);
    }
  },
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Helper to log audit activity
async function logActivity(userId, action, details) {
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

// POST /register
// Handle single file upload for 'avatar' field
router.post('/register', upload.single('avatar'), validateRegister, async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;
  const pool = getPool();

  try {
    // Check if username or email is already taken
    const [existingUsers] = await pool.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      // If file was uploaded, delete it since registration failed
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      const match = existingUsers.find(u => u.username === username);
      if (match) {
        return res.status(400).json({ message: 'Korisničko ime nije validno' });
      } else {
        return res.status(400).json({ message: 'Email je već zauzet' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Save avatar path relative to root or base64 if needed, we'll store server path relative to frontend/uploads
    let avatarPath = null;
    if (req.file) {
      avatarPath = '/uploads/' + req.file.filename;
    }

    // Insert user (default role: pcelar)
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name, avatar, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'pcelar', 1)`,
      [username, email, hashedPassword, first_name, last_name, avatarPath]
    );

    const newUserId = result.insertId;

    // Log registration
    await logActivity(newUserId, 'REGISTER', `Korisnik registrovan: ${username}`);

    return res.status(201).json({
      message: 'Registracija uspešna.',
      user: {
        id: newUserId,
        username,
        email,
        first_name,
        last_name,
        role: 'pcelar'
      }
    });

  } catch (err) {
    console.error("Registration error:", err);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Greška na serveru pri registraciji.' });
  }
});

// POST /login
router.post('/login', validateLogin, async (req, res) => {
  const { username, password } = req.body;
  const pool = getPool();

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Pogrešno korisničko ime ili lozinka.' });
    }

    const user = users[0];

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ message: 'Vaš nalog je deaktiviran. Kontaktirajte administratora.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Pogrešno korisničko ime ili lozinka.' });
    }

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log login
    await logActivity(user.id, 'LOGIN', `Korisnik se prijavio: ${username}`);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: 'Greška na serveru pri prijavi.' });
  }
});

// POST /logout (🔐 user required)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout in the database audit log as requested
    await logActivity(req.user.id, 'LOGOUT', `Korisnik se odjavio: ${req.user.username}`);
    return res.json({ message: 'Odjava uspešna. Aktivnost zabeležena u logu.' });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: 'Greška na serveru pri odjavi.' });
  }
});

// GET /me (🔐 user required)
router.get('/me', authenticateToken, async (req, res) => {
  const pool = getPool();
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, avatar, role, is_active FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }

    return res.json(users[0]);
  } catch (err) {
    console.error("Error fetching current user info:", err);
    return res.status(500).json({ message: 'Greška na serveru.' });
  }
});

module.exports = router;
