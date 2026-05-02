/**
 * flashcards.js — Group flashcard CRUD + AI generation
 *
 * GET    /groups/:groupId/flashcards          — list all cards
 * POST   /groups/:groupId/flashcards          — create a card manually
 * POST   /groups/:groupId/flashcards/generate — AI-generate cards from a topic
 * DELETE /groups/:groupId/flashcards/:id      — delete a card (creator or leader)
 */

const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../services/aiService');

const router = express.Router({ mergeParams: true });

// Membership check
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

// GET /groups/:groupId/flashcards
router.get('/', requireAuth, requireMember, (req, res) => {
  db.query(
    `SELECT f.id, f.front, f.back, f.created_at, u.name AS creator_name, f.user_id AS creator_id
     FROM flashcards f
     JOIN users u ON u.id = f.user_id
     WHERE f.group_id = ?
     ORDER BY f.created_at DESC`,
    [req.params.groupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.json({ flashcards: rows });
    }
  );
});

// POST /groups/:groupId/flashcards — manual create
router.post('/', requireAuth, requireMember, (req, res) => {
  const { front, back } = req.body;
  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ error: 'Both front and back are required.' });
  }
  if (front.length > 500 || back.length > 1000) {
    return res.status(400).json({ error: 'Front max 500 chars, back max 1000 chars.' });
  }
  db.query(
    'INSERT INTO flashcards (group_id, user_id, front, back) VALUES (?, ?, ?, ?)',
    [req.params.groupId, req.user.userId, front.trim(), back.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      res.status(201).json({
        flashcard: { id: result.insertId, front: front.trim(), back: back.trim(), creator_id: req.user.userId },
      });
    }
  );
});

// POST /groups/:groupId/flashcards/generate — AI generation
router.post('/generate', requireAuth, requireMember, async (req, res) => {
  const { topic, count = 6 } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required.' });

  const safeCount = Math.min(Math.max(parseInt(count) || 6, 3), 10);

  const prompt = {
    system: `You are a flashcard generator for BrainHive, a peer study platform.
Generate exactly ${safeCount} high-quality study flashcards on the given topic.
Return ONLY a valid JSON array. No extra text, no markdown, no code fences.
Format: [{"front": "question or term", "back": "answer or definition"}, ...]
Keep fronts concise (under 100 chars). Backs should be clear and educational (under 300 chars).`,
    user: `Generate ${safeCount} flashcards on the topic: "${topic.trim()}"`,
  };

  try {
    const raw = await query(prompt);

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let cards;
    try {
      cards = JSON.parse(cleaned);
      if (!Array.isArray(cards)) throw new Error('Not an array');
    } catch {
      return res.status(502).json({ error: 'AI returned an unexpected format. Try again.' });
    }

    // Insert all generated cards
    const values = cards
      .filter(c => c.front && c.back)
      .map(c => [req.params.groupId, req.user.userId, c.front.slice(0, 500), c.back.slice(0, 1000)]);

    if (values.length === 0) return res.status(502).json({ error: 'AI returned no valid cards.' });

    db.query(
      'INSERT INTO flashcards (group_id, user_id, front, back) VALUES ?',
      [values],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });
        res.status(201).json({ message: `${values.length} flashcards generated.`, count: values.length });
      }
    );
  } catch (err) {
    console.error('Flashcard AI error:', err.message);
    res.status(502).json({ error: 'AI service unavailable. Please try again.' });
  }
});

// DELETE /groups/:groupId/flashcards/:id
router.delete('/:id', requireAuth, (req, res) => {
  const { groupId, id } = req.params;
  db.query('SELECT * FROM flashcards WHERE id = ? AND group_id = ?', [id, groupId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (rows.length === 0) return res.status(404).json({ error: 'Flashcard not found.' });

    const card = rows[0];
    const isCreator = card.user_id === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (isCreator || isAdmin) return doDelete(id, res);

    db.query('SELECT creator_id FROM `groups` WHERE id = ?', [groupId], (err, gRows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (gRows.length && gRows[0].creator_id === req.user.userId) return doDelete(id, res);
      res.status(403).json({ error: 'Access denied.' });
    });
  });
});

function doDelete(id, res) {
  db.query('DELETE FROM flashcards WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    res.json({ message: 'Flashcard deleted.' });
  });
}

module.exports = router;
