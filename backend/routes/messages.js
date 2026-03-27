const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /messages — send a message (accepted members only, max 2000 chars)
router.post('/', requireAuth, (req, res) => {
  const { groupId, userId, message } = req.body;
  if (!groupId || !userId || !message) {
    return res.status(400).json({ error: 'groupId, userId, and message are required.' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message cannot exceed 2000 characters.' });
  }
  db.query(
    "SELECT id FROM group_membership WHERE user_id = ? AND group_id = ? AND status = 'accepted'",
    [userId, groupId],
    (err, memberCheck) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (memberCheck.length === 0) return res.status(403).json({ error: 'Access denied.' });
      db.query(
        'INSERT INTO messages (group_id, user_id, message) VALUES (?, ?, ?)',
        [groupId, userId, message],
        err => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });
          res.status(201).json({ message: 'Message sent successfully!' });
        }
      );
    }
  );
});

// GET /messages?groupId=X — fetch messages with sender name
router.get('/', requireAuth, (req, res) => {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ error: 'groupId query param is required.' });
  }
  db.query(
    `SELECT m.id, m.group_id, m.user_id, m.message, m.created_at, u.name AS sender_name
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.group_id = ?
     ORDER BY m.created_at ASC`,
    [groupId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.json({ messages: results });
    }
  );
});

module.exports = router;
