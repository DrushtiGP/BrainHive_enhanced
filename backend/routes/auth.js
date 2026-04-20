const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Comprehensive field of study options
const VALID_FIELDS = [
  'computer_science', 'software_engineering', 'information_technology', 'data_science',
  'artificial_intelligence', 'cybersecurity', 'electrical_engineering', 'mechanical_engineering',
  'civil_engineering', 'chemical_engineering', 'aerospace_engineering', 'biomedical_engineering',
  'medicine', 'nursing', 'pharmacy', 'dentistry', 'public_health', 'veterinary',
  'law', 'political_science', 'international_relations',
  'business_administration', 'finance', 'accounting', 'economics', 'marketing', 'entrepreneurship',
  'mathematics', 'statistics', 'physics', 'chemistry', 'biology', 'environmental_science',
  'psychology', 'sociology', 'anthropology', 'philosophy',
  'architecture', 'urban_planning', 'interior_design',
  'graphic_design', 'fine_arts', 'music', 'film_media', 'journalism', 'communications',
  'education', 'linguistics', 'history', 'literature', 'theology',
  'agriculture', 'food_science', 'sports_science', 'social_work',
  'other',
];

// Email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password: min 8 chars, at least one letter and one number
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password, fieldOfStudy, fieldOfStudyCustom } = req.body;

  // Required field checks
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required.' });
  if (!password) return res.status(400).json({ error: 'Password is required.' });

  // Name length
  if (name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
  }

  // Email format
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Admin email block
  if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
    return res.status(400).json({ error: 'This email is not available.' });
  }

  // Password strength
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and contain at least one letter and one number.' });
  }

  // Field of study validation
  if (fieldOfStudy && !VALID_FIELDS.includes(fieldOfStudy)) {
    return res.status(400).json({ error: 'Invalid field of study.' });
  }
  if (fieldOfStudy === 'other' && fieldOfStudyCustom && fieldOfStudyCustom.trim().length > 100) {
    return res.status(400).json({ error: 'Custom field of study must be under 100 characters.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const finalField = fieldOfStudy || null;
    const finalCustom = (fieldOfStudy === 'other' && fieldOfStudyCustom?.trim()) ? fieldOfStudyCustom.trim() : null;

    db.query(
      'INSERT INTO users (name, email, password, role, field_of_study, field_of_study_custom) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase(), hash, 'user', finalField, finalCustom],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
          return res.status(500).json({ error: 'Internal server error.' });
        }
        const token = jwt.sign(
          { userId: result.insertId, email: email.toLowerCase(), role: 'user' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.status(201).json({
          token,
          user: { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role: 'user', fieldOfStudy: finalField, fieldOfStudyCustom: finalCustom },
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
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  // Hardcoded admin check
  if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && password === process.env.ADMIN_PASSWORD) {
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

  db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, results) => {
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
        user: { id: user.id, name: user.name, email: user.email, role: 'user', fieldOfStudy: user.field_of_study, fieldOfStudyCustom: user.field_of_study_custom },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// GET /profile
router.get('/profile', requireAuth, (req, res) => {
  db.query(
    'SELECT id, name, email, field_of_study, field_of_study_custom, created_at FROM users WHERE id = ?',
    [req.user.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
      const u = results[0];
      res.json({ user: { id: u.id, name: u.name, email: u.email, fieldOfStudy: u.field_of_study, fieldOfStudyCustom: u.field_of_study_custom, createdAt: u.created_at } });
    }
  );
});

// PUT /profile
router.put('/profile', requireAuth, async (req, res) => {
  const { name, fieldOfStudy, fieldOfStudyCustom, currentPassword, newPassword } = req.body;

  if (name && (name.trim().length < 2 || name.trim().length > 100)) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
  }
  if (fieldOfStudy && !VALID_FIELDS.includes(fieldOfStudy)) {
    return res.status(400).json({ error: 'Invalid field of study.' });
  }

  db.query('SELECT * FROM users WHERE id = ?', [req.user.userId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = results[0];

    let newHash = user.password;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({ error: 'New password must be at least 8 characters and contain at least one letter and one number.' });
      }
      newHash = await bcrypt.hash(newPassword, 10);
    }

    const finalField = fieldOfStudy ?? user.field_of_study;
    const finalCustom = (finalField === 'other' && fieldOfStudyCustom?.trim()) ? fieldOfStudyCustom.trim() : (finalField !== 'other' ? null : user.field_of_study_custom);

    db.query(
      'UPDATE users SET name = ?, field_of_study = ?, field_of_study_custom = ?, password = ? WHERE id = ?',
      [name?.trim() || user.name, finalField, finalCustom, newHash, req.user.userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ message: 'Profile updated successfully.' });
      }
    );
  });
});

module.exports = router;
