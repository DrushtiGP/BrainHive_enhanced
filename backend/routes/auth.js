const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password, university, fieldOfStudy, yearOfStudy } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (email === process.env.ADMIN_EMAIL) {
    return res.status(400).json({ error: 'This email is not available.' });
  }
  if (yearOfStudy && (isNaN(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 10)) {
    return res.status(400).json({ error: 'Year of study must be between 1 and 10.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password, role, university, field_of_study, year_of_study) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hash, 'user', university || null, fieldOfStudy || null, yearOfStudy || null],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
          return res.status(500).json({ error: 'Internal server error.' });
        }
        const token = jwt.sign(
          { userId: result.insertId, email, role: 'user' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.status(201).json({
          token,
          user: { id: result.insertId, name, email, role: 'user', university: university || null, fieldOfStudy: fieldOfStudy || null, yearOfStudy: yearOfStudy || null },
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Hardcoded admin check
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { userId: 0, email: process.env.ADMIN_EMAIL, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.status(200).json({
      token,
      user: { id: 0, name: 'Admin', email: process.env.ADMIN_EMAIL, role: 'admin' },
    });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = results[0];
    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.status(200).json({
        token,
        user: {
          id: user.id, name: user.name, email: user.email, role: 'user',
          university: user.university, fieldOfStudy: user.field_of_study, yearOfStudy: user.year_of_study,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// GET /profile — get current user's profile
router.get('/profile', requireAuth, (req, res) => {
  db.query(
    'SELECT id, name, email, university, field_of_study, year_of_study, created_at FROM users WHERE id = ?',
    [req.user.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
      const u = results[0];
      res.json({ user: { id: u.id, name: u.name, email: u.email, university: u.university, fieldOfStudy: u.field_of_study, yearOfStudy: u.year_of_study, createdAt: u.created_at } });
    }
  );
});

// PUT /profile — update name, university, field of study, year, and/or password
router.put('/profile', requireAuth, async (req, res) => {
  const { name, university, fieldOfStudy, yearOfStudy, currentPassword, newPassword } = req.body;

  if (yearOfStudy && (isNaN(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 10)) {
    return res.status(400).json({ error: 'Year of study must be between 1 and 10.' });
  }

  db.query('SELECT * FROM users WHERE id = ?', [req.user.userId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = results[0];

    let newHash = user.password;

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      newHash = await bcrypt.hash(newPassword, 10);
    }

    db.query(
      'UPDATE users SET name = ?, university = ?, field_of_study = ?, year_of_study = ?, password = ? WHERE id = ?',
      [name || user.name, university ?? user.university, fieldOfStudy ?? user.field_of_study, yearOfStudy ?? user.year_of_study, newHash, req.user.userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ message: 'Profile updated successfully.' });
      }
    );
  });
});

module.exports = router;
