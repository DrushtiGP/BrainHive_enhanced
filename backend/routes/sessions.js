const express = require('express');
const db = require('../config/db');
const { requireAuth, makeRequireGroupLeader } = require('../middleware/auth');

const router = express.Router();
const requireGroupLeader = makeRequireGroupLeader(db);

// POST /sessions — create a study session (group leader only)
// groupId comes from body, so we copy it to req.params before requireGroupLeader runs
router.post('/', requireAuth, (req, res, next) => {
  req.params.groupId = req.body.groupId;
  next();
}, requireGroupLeader, (req, res) => {
  const { topic, timing, groupId } = req.body;
  if (!topic || !timing || !groupId) {
    return res.status(400).json({ error: 'topic, timing, and groupId are required.' });
  }
  db.query(
    'INSERT INTO sessions (topic, timing, group_id) VALUES (?, ?, ?)',
    [topic, timing, groupId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.status(201).json({ message: 'Session created successfully!', sessionId: result.insertId });
    }
  );
});

// GET /sessions?groupId=X — list sessions for a group
router.get('/', requireAuth, (req, res) => {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ error: 'groupId query param is required.' });
  }
  db.query(
    'SELECT * FROM sessions WHERE group_id = ? ORDER BY timing ASC',
    [groupId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.json({ sessions: results });
    }
  );
});

// DELETE /sessions/:sessionId — delete a session (group leader or admin only)
router.delete('/:sessionId', requireAuth, (req, res) => {
  const { sessionId } = req.params;
  // Fetch the session to get its group_id for leader check
  db.query('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (results.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = results[0];

    // Allow if admin, otherwise check group leadership
    if (req.user.role === 'admin') {
      return db.query('DELETE FROM sessions WHERE id = ?', [sessionId], (err) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ message: 'Session deleted.' });
      });
    }

    db.query('SELECT creator_id FROM `groups` WHERE id = ?', [session.group_id], (err, groupResults) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (groupResults.length === 0) return res.status(404).json({ error: 'Group not found.' });
      if (req.user.userId !== groupResults[0].creator_id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      db.query('DELETE FROM sessions WHERE id = ?', [sessionId], (err) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ message: 'Session deleted.' });
      });
    });
  });
});

module.exports = router;
