require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // For development, allow any origin. In production, restrict as needed.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve profile avatars from upload directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dictionaries', require('./routes/dictionaries'));
app.use('/api/hive', require('./routes/hive'));
app.use('/api/queens', require('./routes/queens'));
app.use('/api/queen-hive-assignments', require('./routes/assignments'));
app.use('/api/queen-quality-checks', require('./routes/qualityChecks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Queen Tracker API is running.' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandle error in application:", err);
  return res.status(err.status || 500).json({
    message: err.message || 'Interna greška na serveru.'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`  Queen Tracker Server running on port ${PORT} `);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error("Failed to start server because database initialization failed:", err);
    process.exit(1);
  }
}

startServer();
