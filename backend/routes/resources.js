/**
 * resources.js — Group resource (file) upload/download/delete
 *
 * POST   /groups/:groupId/resources          — upload a file (accepted members only)
 * GET    /groups/:groupId/resources          — list all resources for a group
 * GET    /groups/:groupId/resources/:id/download — download a file
 * DELETE /groups/:groupId/resources/:id      — delete (uploader or group leader)
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../config/db');
const { requireAuth, makeRequireGroupLeader } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // inherit :groupId from parent
const requireGroupLeader = makeRequireGroupLeader(db);

// ── Ensure uploads directory exists ──────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed. Accepted: PDF, Word, PowerPoint, Excel, images, text.'));
  },
});

// ── Membership check helper ───────────────────────────────────────────────────
function requireMember(req, res, next) {
  const { groupId } = req.params;
  db.query(
    `SELECT id FROM group_membership WHERE group_id = ? AND user_id = ? AND status = 'accepted'`,
    [groupId, req.user.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (rows.length === 0 && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You must be an accepted member to access resources.' });
      }
      next();
    }
  );
}

// ── POST /groups/:groupId/resources ──────────────────────────────────────────
router.post('/', requireAuth, requireMember, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10 MB.' });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { groupId } = req.params;
    const { filename, originalname, mimetype, size } = req.file;

    db.query(
      'INSERT INTO resources (group_id, user_id, filename, original_name, mimetype, size) VALUES (?, ?, ?, ?, ?, ?)',
      [groupId, req.user.userId, filename, originalname, mimetype, size],
      (err, result) => {
        if (err) {
          fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
          return res.status(500).json({ error: 'Internal server error.' });
        }
        res.status(201).json({
          message: 'File uploaded successfully.',
          resource: {
            id: result.insertId,
            groupId: parseInt(groupId),
            filename,
            originalName: originalname,
            mimetype,
            size,
            createdAt: new Date().toISOString(),
          },
        });
      }
    );
  });
});

// ── GET /groups/:groupId/resources ───────────────────────────────────────────
router.get('/', requireAuth, requireMember, (req, res) => {
  const { groupId } = req.params;
  db.query(
    `SELECT r.id, r.filename, r.original_name, r.mimetype, r.size, r.created_at,
            u.name AS uploader_name, u.id AS uploader_id
     FROM resources r
     JOIN users u ON u.id = r.user_id
     WHERE r.group_id = ?
     ORDER BY r.created_at DESC`,
    [groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.json({ resources: rows });
    }
  );
});

// ── GET /groups/:groupId/resources/:id/download ───────────────────────────────
router.get('/:id/download', requireAuth, requireMember, (req, res) => {
  const { groupId, id } = req.params;
  db.query(
    'SELECT * FROM resources WHERE id = ? AND group_id = ?',
    [id, groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (rows.length === 0) return res.status(404).json({ error: 'Resource not found.' });

      const resource = rows[0];
      const filePath = path.join(UPLOADS_DIR, resource.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server.' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${resource.original_name}"`);
      res.setHeader('Content-Type', resource.mimetype);
      res.sendFile(filePath);
    }
  );
});

// ── DELETE /groups/:groupId/resources/:id ────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const { groupId, id } = req.params;

  db.query('SELECT * FROM resources WHERE id = ? AND group_id = ?', [id, groupId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (rows.length === 0) return res.status(404).json({ error: 'Resource not found.' });

    const resource = rows[0];

    // Allow: uploader, group leader, or admin
    const isUploader = resource.user_id === req.user.userId;
    const isAdmin    = req.user.role === 'admin';

    if (isUploader || isAdmin) {
      return doDelete(resource, res);
    }

    // Check if group leader
    db.query('SELECT creator_id FROM `groups` WHERE id = ?', [groupId], (err, groupRows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (groupRows.length === 0) return res.status(404).json({ error: 'Group not found.' });

      if (groupRows[0].creator_id === req.user.userId) {
        return doDelete(resource, res);
      }

      return res.status(403).json({ error: 'Access denied.' });
    });
  });
});

function doDelete(resource, res) {
  db.query('DELETE FROM resources WHERE id = ?', [resource.id], (err) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    // Remove file from disk
    const filePath = path.join(UPLOADS_DIR, resource.filename);
    fs.unlink(filePath, () => {});
    res.json({ message: 'Resource deleted.' });
  });
}

module.exports = router;
