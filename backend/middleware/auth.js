const jwt = require('jsonwebtoken');

const VALID_ROLES = ['admin', 'user'];

/**
 * requireAuth — validates the Bearer JWT and attaches req.user = { userId, email, role }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.role || !VALID_ROLES.includes(payload.role)) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
}

/**
 * requireAdmin — assumes requireAuth already ran; rejects non-admins with 403
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  next();
}

/**
 * makeRequireGroupLeader(db) — factory that returns requireGroupLeader middleware.
 * Permits if req.user.userId === group.creator_id OR req.user.role === 'admin'.
 */
function makeRequireGroupLeader(db) {
  return function requireGroupLeader(req, res, next) {
    const groupId = req.params.groupId;

    db.query('SELECT creator_id FROM `groups` WHERE id = ?', [groupId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error.' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Group not found.' });
      }

      const group = results[0];

      if (Number(req.user.userId) === Number(group.creator_id) || req.user.role === 'admin') {
        return next();
      }

      return res.status(403).json({ error: 'Access denied.' });
    });
  };
}

module.exports = { requireAuth, requireAdmin, makeRequireGroupLeader };
