const express = require('express');
const db = require('../config/db');
const { requireAuth, makeRequireGroupLeader } = require('../middleware/auth');
const { query, PROMPTS } = require('../services/aiService');

const router = express.Router();
const requireGroupLeader = makeRequireGroupLeader(db);

// Helper: trigger onboarding agent asynchronously (fire-and-forget)
function triggerOnboarding(userId, groupId) {
  db.query('SELECT * FROM `groups` WHERE id = ?', [groupId], (err, groupRows) => {
    if (err || !groupRows.length) return;
    const group = groupRows[0];

    db.query('SELECT name FROM users WHERE id = ?', [userId], (err, userRows) => {
      if (err || !userRows.length) return;
      const userName = userRows[0].name;

      db.query(
        'SELECT topic, timing FROM sessions WHERE group_id = ? AND timing > NOW() ORDER BY timing ASC LIMIT 3',
        [groupId],
        (err, sessions) => {
          if (err) sessions = [];
          db.query(
            `SELECT u.name FROM users u
             JOIN group_membership gm ON gm.user_id = u.id
             WHERE gm.group_id = ? AND gm.status = 'accepted' AND u.id != ?
             LIMIT 8`,
            [groupId, userId],
            async (err, members) => {
              if (err) members = [];
              try {
                const prompt = PROMPTS.onboarding({
                  userName,
                  groupName: group.name,
                  groupDescription: group.description,
                  upcomingSessions: sessions || [],
                  activeMembers: members || [],
                });
                const welcomeMessage = await query(prompt);
                const botMsg = `👋 ${welcomeMessage}`;
                db.query(
                  'INSERT INTO messages (group_id, user_id, message, is_bot) VALUES (?, 1, ?, 1)',
                  [groupId, botMsg],
                  () => {}
                );
              } catch (e) {
                // Fallback welcome
                const fallback = `👋 Welcome to "${group.name}", ${userName}! Check the Sessions tab for upcoming study sessions and use @bot for academic help.`;
                db.query(
                  'INSERT INTO messages (group_id, user_id, message, is_bot) VALUES (?, 1, ?, 1)',
                  [groupId, fallback],
                  () => {}
                );
              }
            }
          );
        }
      );
    });
  });
}

// POST /groups — create a group (creator auto-added as accepted member)
router.post('/', requireAuth, (req, res) => {
  const { name, description, creatorId } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Name and creatorId are required.' });
  }
  db.query(
    'INSERT INTO `groups` (name, description, creator_id) VALUES (?, ?, ?)',
    [name, description, creatorId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      const groupId = result.insertId;
      db.query(
        'INSERT INTO group_membership (user_id, group_id, status) VALUES (?, ?, ?)',
        [creatorId, groupId, 'accepted'],
        err => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });
          res.status(201).json({ message: 'Group created successfully!', groupId });
        }
      );
    }
  );
});

// GET /groups — all groups, optional ?search= filter
router.get('/', requireAuth, (req, res) => {
  const search = req.query.search?.trim() || '';
  if (search) {
    const like = `%${search}%`;
    db.query(
      `SELECT * FROM \`groups\` WHERE name LIKE ? OR description LIKE ? ORDER BY name ASC`,
      [like, like],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch groups.' });
        res.json({ groups: results || [] });
      }
    );
  } else {
    db.query('SELECT * FROM `groups` ORDER BY name ASC', (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch groups.' });
      res.json({ groups: results || [] });
    });
  }
});

// GET /groups/user/:userId — groups the user is an accepted member of
// NOTE: must be registered BEFORE /groups/:groupId to avoid route conflict
router.get('/user/:userId', requireAuth, (req, res) => {
  const query = `
    SELECT DISTINCT g.id, g.name, g.description, g.creator_id, g.created_at
    FROM \`groups\` g
    JOIN group_membership gm ON g.id = gm.group_id
    WHERE gm.user_id = ? AND gm.status = 'accepted'
  `;
  db.query(query, [req.params.userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    res.json({ groups: results || [] });
  });
});

// GET /groups/:groupId — single group with accepted members
router.get('/:groupId', requireAuth, (req, res) => {
  const { groupId } = req.params;
  db.query('SELECT * FROM `groups` WHERE id = ?', [groupId], (err, groupResults) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (groupResults.length === 0) return res.status(404).json({ error: 'Group not found.' });
    const group = groupResults[0];
    db.query(
      `SELECT u.id, u.name, u.email, gm.status
       FROM users u
       JOIN group_membership gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status IN ('accepted', 'pending')`,
      [groupId],
      (err, memberResults) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ ...group, members: memberResults });
      }
    );
  });
});

// PUT /groups/:groupId/members/:memberId — accept or reject a join request (leader only)
router.put('/:groupId/members/:memberId', requireAuth, requireGroupLeader, (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'." });
  }
  db.query(
    'UPDATE group_membership SET status = ? WHERE user_id = ? AND group_id = ?',
    [status, req.params.memberId, req.params.groupId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Membership not found.' });

      // Trigger onboarding agent when a member is accepted
      if (status === 'accepted') {
        triggerOnboarding(parseInt(req.params.memberId), parseInt(req.params.groupId));
      }

      res.json({ message: `Membership ${status}.` });
    }
  );
});

// DELETE /groups/:groupId/members/:memberId — remove a member (leader only)
router.delete('/:groupId/members/:memberId', requireAuth, requireGroupLeader, (req, res) => {
  db.query(
    'DELETE FROM group_membership WHERE user_id = ? AND group_id = ?',
    [req.params.memberId, req.params.groupId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Membership not found.' });
      res.json({ message: 'Member removed.' });
    }
  );
});

module.exports = router;
