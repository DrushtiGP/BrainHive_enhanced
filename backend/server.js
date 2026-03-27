const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'brainhive',
});

// Connect to the database
db.connect(err => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');

  // Create necessary tables
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
  db.query(usersTable, err => {
    if (err) throw err;
    console.log('Users table ready');
  });

  const groupsTable = `
    CREATE TABLE IF NOT EXISTS groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      creator_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )`;
  db.query(groupsTable, err => {
    if (err) throw err;
    console.log('Groups table ready');
  });

  const sessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      topic VARCHAR(255) NOT NULL,
      timing DATETIME NOT NULL,
      group_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )`;
  db.query(sessionsTable, err => {
    if (err) throw err;
    console.log('Sessions table ready');
  });

  const messagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`;
  db.query(messagesTable, err => {
    if (err) throw err;
    console.log('Messages table ready');
  });

  const groupMembershipTable = `
    CREATE TABLE IF NOT EXISTS group_membership (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      group_id INT NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )`;
  db.query(groupMembershipTable, err => {
    if (err) throw err;
    console.log('Group membership table ready');
  });
});

// User Registration Endpoint
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.query(query, [name, email, password], err => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: 'User registered successfully!' });
  });
});

// Login Endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0 || results[0].password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = results[0];
    res.status(200).json({
      message: 'Login successful!',
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});

// Group Creation Endpoint
app.post('/groups', (req, res) => {
  const { name, description, creatorId } = req.body;
  const query = 'INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)';
  db.query(query, [name, description, creatorId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    const groupId = result.insertId;
    const membershipQuery = 'INSERT INTO group_membership (user_id, group_id, status) VALUES (?, ?, ?)';
    db.query(membershipQuery, [creatorId, groupId, 'accepted'], err => {
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({ message: 'Group created successfully!', groupId });
    });
  });
});

// Fetch all groups
app.get('/groups', (req, res) => {
  const query = 'SELECT * FROM groups';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch groups' });
    if (results.length === 0) {
      return res.json({ message: 'No groups available' });
    }
    res.json({ groups: results });
  });
});

// Join Group Endpoint
app.post('/group-membership', (req, res) => {
  const { userId, groupId, status } = req.body;
  const query = 'INSERT INTO group_membership (user_id, group_id, status) VALUES (?, ?, ?)';
  db.query(query, [userId, groupId, status], err => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: 'Join request sent successfully.' });
  });
});

// Create Study Session
app.post('/sessions', (req, res) => {
  const { topic, timing, groupId } = req.body;
  const query = 'INSERT INTO sessions (topic, timing, group_id) VALUES (?, ?, ?)';
  db.query(query, [topic, timing, groupId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: 'Session created successfully!', sessionId: result.insertId });
  });
});

// Send Message Endpoint
app.post('/messages', (req, res) => {
  const { groupId, userId, message } = req.body;
  if (!groupId || !userId || !message) {
    return res.status(400).json({ error: 'Group ID, User ID, and Message are required.' });
  }
  const query = 'INSERT INTO messages (group_id, user_id, message) VALUES (?, ?, ?)';
  db.query(query, [groupId, userId, message], err => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: 'Message sent successfully!' });
  });
});

// Get Messages for a Group
app.get('/messages', (req, res) => {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is required.' });
  }
  const query = 'SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC';
  db.query(query, [groupId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ messages: results });
  });
});

// Get Groups for a User
app.get('/groups/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT DISTINCT g.id, g.name, g.description, g.creator_id, g.created_at
    FROM groups g
    JOIN group_membership gm ON g.id = gm.group_id
    WHERE gm.user_id = ? AND gm.status = 'accepted'
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'No groups found for this user.' });
    res.json({ groups: results });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
