const mysql = require('mysql');

const DB_NAME = process.env.DB_NAME || 'brainhive';

// Step 1: connect without a database to create it if needed
const bootstrap = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
});

// The real connection used by all routes — exported immediately so require() works
const db = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
});

bootstrap.connect(err => {
  if (err) { console.error('MySQL bootstrap error:', err); process.exit(1); }

  bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``, err => {
    bootstrap.end(); // done with bootstrap connection
    if (err) { console.error('Failed to create database:', err); process.exit(1); }

    console.log(`Database "${DB_NAME}" ready`);

    // Now connect the real db connection
    db.connect(err => {
      if (err) { console.error('Database connection error:', err); process.exit(1); }
      console.log(`Connected to "${DB_NAME}"`);
      createTables();
    });
  });
});

function createTables() {
  const tables = [
    {
      name: 'users',
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        field_of_study VARCHAR(100) DEFAULT NULL,
        field_of_study_custom VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: 'groups',
      sql: `CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        creator_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )`,
    },
    {
      name: 'sessions',
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        timing DATETIME NOT NULL,
        group_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id)
      )`,
    },
    {
      name: 'messages',
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
    },
    {
      name: 'group_membership',
      sql: `CREATE TABLE IF NOT EXISTS group_membership (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        group_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id)
      )`,
    },
  ];

  const runNext = (i) => {
    if (i >= tables.length) {
      runColumnMigrations();
      return;
    }
    const { name, sql } = tables[i];
    db.query(sql, err => {
      if (err) throw err;
      console.log(`  ✓ ${name} table ready`);
      runNext(i + 1);
    });
  };

  runNext(0);
}

// Safely add columns that may not exist in older installs
function runColumnMigrations() {
  const migrations = [
    { column: 'role',                  sql: "ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'" },
    { column: 'field_of_study',        sql: "ALTER TABLE users ADD COLUMN field_of_study VARCHAR(100) DEFAULT NULL" },
    { column: 'field_of_study_custom', sql: "ALTER TABLE users ADD COLUMN field_of_study_custom VARCHAR(100) DEFAULT NULL" },
  ];

  db.query("SHOW COLUMNS FROM users", (err, columns) => {
    if (err) { console.error('Migration check failed:', err); return; }
    const existing = columns.map(c => c.Field);
    migrations.forEach(({ column, sql }) => {
      if (!existing.includes(column)) {
        db.query(sql, err => {
          if (err) console.error(`Failed to add column ${column}:`, err);
          else console.log(`  ✓ users.${column} column added`);
        });
      }
    });
  });
}

module.exports = db;
