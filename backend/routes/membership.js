const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /group-membership — send a join request (prevents duplicates)
router.post('/', requireAuth, (req, res) => {
  const { userId, groupId } = req.body;
  if (!userId || !groupId) {
    return res.status(400).json({ error: 'userId and groupId are required.' });
  }
  // Check for existing membership or pending request
  db.query(
    'SELECT id, status FROM group_membership WHERE user_id = ? AND group_id = ?',
    [userId, groupId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (existing.length > 0) {
        return res.status(409).json({ error: `You already have a ${existing[0].status} membership for this group.` });
      }
      db.query(
        'INSERT INTO group_membership (user_id, group_id, status) VALUES (?, ?, ?)',
        [userId, groupId, 'pending'],
        err => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });
          res.status(201).json({ message: 'Join request sent successfully.' });
        }
      );
    }
  );
});

module.exports = router;
