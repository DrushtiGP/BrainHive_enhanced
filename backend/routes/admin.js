const express = require('express');
const db = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// GET /admin/users — paginated list of all users
router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  db.query('SELECT COUNT(*) as total FROM users', (err, countResults) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    const total = countResults[0].total;
    db.query(
      'SELECT id, name, email, role, created_at FROM users LIMIT ? OFFSET ?',
      [pageSize, offset],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ users: results, total, page, pageSize });
      }
    );
  });
});

// PUT /admin/users/:userId/role — update a user's role
router.put('/users/:userId/role', (req, res) => {
  const { role } = req.body;
  const VALID_ROLES = ['admin', 'user'];
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'user'." });
  }
  db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Role updated successfully.', role });
  });
});

// DELETE /admin/users/:userId — delete a user account
router.delete('/users/:userId', (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.params.userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  });
});

// GET /admin/groups — paginated list of all groups
router.get('/groups', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  db.query('SELECT COUNT(*) as total FROM `groups`', (err, countResults) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    const total = countResults[0].total;
    db.query(
      'SELECT id, name, description, creator_id, created_at FROM `groups` LIMIT ? OFFSET ?',
      [pageSize, offset],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.json({ groups: results, total, page, pageSize });
      }
    );
  });
});

// DELETE /admin/groups/:groupId — delete any group
router.delete('/groups/:groupId', (req, res) => {
  db.query('DELETE FROM `groups` WHERE id = ?', [req.params.groupId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Group not found.' });
    res.json({ message: 'Group deleted successfully.' });
  });
});

// GET /admin/pending-requests — all pending join requests platform-wide
router.get('/pending-requests', (req, res) => {
  const query = `
    SELECT gm.id, gm.user_id, gm.group_id, gm.status, gm.created_at,
           u.name AS user_name, u.email AS user_email,
           g.name AS group_name
    FROM group_membership gm
    JOIN users u ON gm.user_id = u.id
    JOIN \`groups\` g ON gm.group_id = g.id
    WHERE gm.status = 'pending'
    ORDER BY gm.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    res.json({ pendingRequests: results });
  });
});

module.exports = router;
