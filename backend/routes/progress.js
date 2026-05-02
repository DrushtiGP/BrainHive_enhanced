/**
 * progress.js — Group Progress Tracker
 *
 * Topics are managed by the group leader (shared syllabus).
 * Members rate their understanding of each topic.
 *
 * GET    /groups/:groupId/progress/topics          — list all topics for the group
 * POST   /groups/:groupId/progress/topics          — leader adds a topic
 * DELETE /groups/:groupId/progress/topics/:topicId — leader removes a topic
 *
 * GET    /groups/:groupId/progress/ratings         — get ratings (leader=all, member=own)
 * PUT    /groups/:groupId/progress/ratings         — upsert own rating for a topic
 *
 * GET    /groups/:groupId/progress/overview        — leader: full heatmap grid
 */

const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const VALID_STATUSES = ['understood', 'reviewing', 'struggling'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireMember(req, res, next) {
  db.query(
    `SELECT id FROM group_membership WHERE group_id = ? AND user_id = ? AND status = 'accepted'`,
    [req.params.groupId, req.user.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (rows.length === 0 && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
      }
      next();
    }
  );
}

function requireLeader(req, res, next) {
  if (req.user.role === 'admin') return next();
  db.query(
    'SELECT creator_id FROM `groups` WHERE id = ?',
    [req.params.groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (!rows.length) return res.status(404).json({ error: 'Group not found.' });
      if (Number(rows[0].creator_id) !== Number(req.user.userId)) {
        return res.status(403).json({ error: 'Only the group leader can manage topics.' });
      }
      next();
    }
  );
}

// ── TOPICS ────────────────────────────────────────────────────────────────────

// GET /groups/:groupId/progress/topics
router.get('/topics', requireAuth, requireMember, (req, res) => {
  db.query(
    'SELECT id, name, created_at FROM group_topics WHERE group_id = ? ORDER BY created_at ASC',
    [req.params.groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.json({ topics: rows });
    }
  );
});

// POST /groups/:groupId/progress/topics
router.post('/topics', requireAuth, requireLeader, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Topic name is required.' });
  if (name.trim().length > 200) return res.status(400).json({ error: 'Topic name max 200 chars.' });

  db.query(
    'INSERT INTO group_topics (group_id, name) VALUES (?, ?)',
    [req.params.groupId, name.trim()],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Topic already exists.' });
        return res.status(500).json({ error: 'Internal server error.' });
      }
      res.status(201).json({ topic: { id: result.insertId, name: name.trim() } });
    }
  );
});

// DELETE /groups/:groupId/progress/topics/:topicId
router.delete('/topics/:topicId', requireAuth, requireLeader, (req, res) => {
  db.query(
    'DELETE FROM group_topics WHERE id = ? AND group_id = ?',
    [req.params.topicId, req.params.groupId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Topic not found.' });
      res.json({ message: 'Topic deleted.' });
    }
  );
});

// ── RATINGS ───────────────────────────────────────────────────────────────────

// GET /groups/:groupId/progress/ratings
// Leader gets all members' ratings; member gets only their own
router.get('/ratings', requireAuth, requireMember, (req, res) => {
  db.query(
    'SELECT creator_id FROM `groups` WHERE id = ?',
    [req.params.groupId],
    (err, groupRows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      const isLeader = groupRows.length && (
        Number(groupRows[0].creator_id) === Number(req.user.userId) || req.user.role === 'admin'
      );

      const query = isLeader
        ? `SELECT r.id, r.topic_id, r.user_id, r.status, r.updated_at, u.name AS user_name
           FROM topic_ratings r
           JOIN users u ON u.id = r.user_id
           WHERE r.group_id = ?
           ORDER BY r.topic_id, u.name`
        : `SELECT r.id, r.topic_id, r.user_id, r.status, r.updated_at
           FROM topic_ratings r
           WHERE r.group_id = ? AND r.user_id = ?
           ORDER BY r.topic_id`;

      const params = isLeader ? [req.params.groupId] : [req.params.groupId, req.user.userId];

      db.query(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ ratings: rows, isLeader });
      });
    }
  );
});

// PUT /groups/:groupId/progress/ratings
// Upsert own rating for a topic
router.put('/ratings', requireAuth, requireMember, (req, res) => {
  const { topicId, status } = req.body;
  if (!topicId) return res.status(400).json({ error: 'topicId is required.' });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  // Verify topic belongs to this group
  db.query(
    'SELECT id FROM group_topics WHERE id = ? AND group_id = ?',
    [topicId, req.params.groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (!rows.length) return res.status(404).json({ error: 'Topic not found in this group.' });

      db.query(
        `INSERT INTO topic_ratings (group_id, topic_id, user_id, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
        [req.params.groupId, topicId, req.user.userId, status],
        (err) => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });
          res.json({ message: 'Rating saved.', topicId, status });
        }
      );
    }
  );
});

// GET /groups/:groupId/progress/overview — leader only, full heatmap
router.get('/overview', requireAuth, requireLeader, (req, res) => {
  const groupId = req.params.groupId;

  // Fetch topics, members, and all ratings in parallel
  db.query(
    'SELECT id, name FROM group_topics WHERE group_id = ? ORDER BY created_at ASC',
    [groupId],
    (err, topics) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });

      db.query(
        `SELECT u.id, u.name FROM users u
         JOIN group_membership gm ON gm.user_id = u.id
         WHERE gm.group_id = ? AND gm.status = 'accepted'
         ORDER BY u.name`,
        [groupId],
        (err, members) => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });

          db.query(
            'SELECT topic_id, user_id, status FROM topic_ratings WHERE group_id = ?',
            [groupId],
            (err, ratings) => {
              if (err) return res.status(500).json({ error: 'Internal server error.' });

              // Build lookup map: ratingMap[topicId][userId] = status
              const ratingMap = {};
              ratings.forEach(r => {
                if (!ratingMap[r.topic_id]) ratingMap[r.topic_id] = {};
                ratingMap[r.topic_id][r.user_id] = r.status;
              });

              res.json({ topics, members, ratingMap });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
