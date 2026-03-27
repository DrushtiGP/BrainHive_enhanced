const mysql = require('mysql');

const DB_NAME = process.env.DB_NAME || 'brainhive';

// Connect without specifying a database first so we can create it if needed
const db = mysql.createConnection({
  host:              process.env.DB_HOST     || 'localhost',
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  multipleStatements: true,
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }

  // Create the database if it doesn't exist, then switch to it
  db.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`; USE \`${DB_NAME}\`;`,
    err => {
      if (err) {
        console.error('Failed to initialise database:', err);
        process.exit(1);
      }
      console.log(`Database "${DB_NAME}" ready`);
      createTables();
    }
  );
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
        university VARCHAR(150) DEFAULT NULL,
        field_of_study VARCHAR(100) DEFAULT NULL,
        year_of_study TINYINT DEFAULT NULL,
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

  // Run sequentially to respect foreign key order
  const runNext = (i) => {
    if (i >= tables.length) return;
    const { name, sql } = tables[i];
    db.query(sql, err => {
      if (err) throw err;
      console.log(`  ✓ ${name} table ready`);
      runNext(i + 1);
    });
  };

  runNext(0);
}

module.exports = db;
