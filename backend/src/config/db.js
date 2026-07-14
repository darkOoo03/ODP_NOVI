const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 3306;
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const databaseName = process.env.DB_NAME || 'queen_tracker';

let pool;

async function initializeDatabase() {
  // 1. Establish connection without database to create it if it doesn't exist
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.end();

  // 2. Establish connection pool with database name
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });

  // 3. Read schema.sql and execute
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    // Split by semicolons, but ignore semicolons inside parentheses or strings
    // A simpler and safer way for our schema is splitting by double newline + CREATE TABLE or simple regex since we know the schema format
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const conn = await pool.getConnection();
    try {
      console.log("Initializing database tables...");
      for (const statement of statements) {
        // Execute each query statement
        await conn.query(statement);
      }
      console.log("Database tables initialized successfully.");
    } catch (err) {
      console.error("Error executing schema:", err);
      throw err;
    } finally {
      conn.release();
    }
  }

  // 4. Seed dictionary catalogs if empty
  await seedCatalogs();

  // 5. Seed default admin if empty
  await seedAdmin();
}

async function seedCatalogs() {
  const [types] = await pool.query('SELECT COUNT(*) as count FROM hive_types');
  if (types[0].count === 0) {
    console.log("Seeding default hive types...");
    const defaultTypes = ['Dadan-Blat (DB)', 'Langstrot-Rut (LR)', 'Farar', 'Pološka'];
    for (const type of defaultTypes) {
      await pool.query('INSERT INTO hive_types (name) VALUES (?)', [type]);
    }
  }

  const [breeds] = await pool.query('SELECT COUNT(*) as count FROM queen_breeds');
  if (breeds[0].count === 0) {
    console.log("Seeding default queen breeds...");
    const defaultBreeds = [
      'Kranjska (Apis mellifera carnica)',
      'Italijanska (Apis mellifera ligustica)',
      'Kavkaska (Apis mellifera caucasica)',
      'Buckfast'
    ];
    for (const breed of defaultBreeds) {
      await pool.query('INSERT INTO queen_breeds (name) VALUES (?)', [breed]);
    }
  }
}

async function seedAdmin() {
  const [admins] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
  if (admins[0].count === 0) {
    console.log("Seeding default admin user...");
    const hashedPassword = await bcrypt.hash('Admin12345', 10);
    await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin@queentracker.com', hashedPassword, 'Sistem', 'Administrator', 'admin', 1]
    );
    console.log("Default admin account created. (admin / Admin12345)");
  }
}

module.exports = {
  initializeDatabase,
  getPool: () => {
    if (!pool) throw new Error("Database not initialized. Call initializeDatabase first.");
    return pool;
  }
};
