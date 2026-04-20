/**
 * agents.js — All 5 BrainHive AI agent endpoints
 *
 * POST /agents/study-buddy          — Study Buddy (in-chat @bot)
 * POST /agents/summarize/:sessionId — Session Summarizer
 * GET  /agents/recommendations      — Group Recommendation
 * POST /agents/onboard              — Onboarding Agent (called internally)
 * GET  /agents/health               — Platform Health (admin only)
 */

const express = require('express');
const db = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query, PROMPTS } = require('../services/aiService');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limit AI endpoints to control costs
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 20,
  message: { error: 'Too many AI requests. Please slow down.' },
  skip: () => process.env.NODE_ENV !== 'production',
});

// ─── 1. Study Buddy Agent ────────────────────────────────────────────────────
// POST /agents/study-buddy
// Body: { groupId, userId, question }
// Intercepts @bot messages, calls LLM, stores bot reply in messages table.

router.post('/study-buddy', requireAuth, aiLimiter, (req, res) => {
  const { groupId, userId, question } = req.body;
  if (!groupId || !userId || !question) {
    return res.status(400).json({ error: 'groupId, userId, and question are required.' });
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question cannot exceed 1000 characters.' });
  }

  // Fetch group field + recent messages for context
  const groupQuery = `
    SELECT g.name, g.description,
           u.field_of_study
    FROM \`groups\` g
    JOIN group_membership gm ON gm.group_id = g.id AND gm.user_id = ? AND gm.status = 'accepted'
    JOIN users u ON u.id = ?
    WHERE g.id = ?
  `;

  db.query(groupQuery, [userId, userId, groupId], (err, groupRows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (groupRows.length === 0) return res.status(403).json({ error: 'Access denied.' });

    const groupField = groupRows[0].field_of_study || groupRows[0].description || 'General';

    // Fetch last 10 messages for context
    db.query(
      `SELECT u.name AS sender_name, m.message
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ? AND m.is_bot = 0
       ORDER BY m.created_at DESC LIMIT 10`,
      [groupId],
      async (err, recentRows) => {
        if (err) return res.status(500).json({ error: 'Internal server error.' });

        const recentMessages = recentRows
          .reverse()
          .map(r => `${r.sender_name}: ${r.message}`)
          .join('\n') || 'No recent messages.';

        try {
          const prompt = PROMPTS.studyBuddy({ question, groupField, recentMessages });
          const answer = await query(prompt);

          // Store bot reply in messages table
          const botMessage = `🤖 Study Buddy: ${answer}`;
          db.query(
            'INSERT INTO messages (group_id, user_id, message, is_bot) VALUES (?, 1, ?, 1)',
            [groupId, botMessage],
            (err) => {
              if (err) console.error('Failed to store bot message:', err);
            }
          );

          res.json({ answer, botMessage });
        } catch (aiErr) {
          console.error('Study Buddy AI error:', aiErr.message);
          res.status(502).json({ error: 'AI service unavailable. Please try again.' });
        }
      }
    );
  });
});

// ─── 2. Session Summarizer Agent ─────────────────────────────────────────────
// POST /agents/summarize/:sessionId
// Fetches session messages, generates summary, stores in sessions.summary

router.post('/summarize/:sessionId', requireAuth, aiLimiter, (req, res) => {
  const { sessionId } = req.params;

  // Fetch session + verify requester is group leader or admin
  db.query('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, sessionRows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (sessionRows.length === 0) return res.status(404).json({ error: 'Session not found.' });

    const session = sessionRows[0];

    // Check leader or admin
    if (req.user.role !== 'admin') {
      db.query(
        'SELECT creator_id FROM `groups` WHERE id = ?',
        [session.group_id],
        async (err, groupRows) => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });
          if (groupRows.length === 0) return res.status(404).json({ error: 'Group not found.' });
          if (req.user.userId !== groupRows[0].creator_id) {
            return res.status(403).json({ error: 'Only the group leader can summarize sessions.' });
          }
          await doSummarize(session, res);
        }
      );
    } else {
      doSummarize(session, res);
    }
  });
});

async function doSummarize(session, res) {
  // Fetch up to 200 messages for the group around the session time
  db.query(
    `SELECT u.name AS sender_name, m.message, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.group_id = ? AND m.is_bot = 0
     ORDER BY m.created_at DESC LIMIT 200`,
    [session.group_id],
    async (err, messages) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (messages.length === 0) {
        return res.status(400).json({ error: 'No messages found to summarize.' });
      }

      try {
        const prompt = PROMPTS.sessionSummarizer({
          sessionTopic: session.topic,
          messages: messages.reverse(),
        });
        const summary = await query(prompt);

        // Store summary in sessions table
        db.query(
          'UPDATE sessions SET summary = ? WHERE id = ?',
          [summary, session.id],
          (err) => {
            if (err) console.error('Failed to store summary:', err);
          }
        );

        res.json({ summary, sessionId: session.id, topic: session.topic });
      } catch (aiErr) {
        console.error('Session Summarizer AI error:', aiErr.message);
        res.status(502).json({ error: 'AI service unavailable. Please try again.' });
      }
    }
  );
}

// GET /agents/summarize/:sessionId — fetch stored summary
router.get('/summarize/:sessionId', requireAuth, (req, res) => {
  db.query('SELECT id, topic, summary FROM sessions WHERE id = ?', [req.params.sessionId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    res.json({ sessionId: rows[0].id, topic: rows[0].topic, summary: rows[0].summary || null });
  });
});

// ─── 3. Group Recommendation Agent ───────────────────────────────────────────
// GET /agents/recommendations?userId=X
// Returns ranked list of groups the user hasn't joined

router.get('/recommendations', requireAuth, aiLimiter, (req, res) => {
  const userId = req.query.userId || req.user.userId;

  // Get user profile
  db.query('SELECT name, field_of_study FROM users WHERE id = ?', [userId], (err, userRows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userRows[0];

    // Get groups user hasn't joined + member counts
    const candidateQuery = `
      SELECT g.id, g.name, g.description,
             COUNT(gm.id) AS member_count
      FROM \`groups\` g
      LEFT JOIN group_membership gm ON gm.group_id = g.id AND gm.status = 'accepted'
      WHERE g.id NOT IN (
        SELECT group_id FROM group_membership
        WHERE user_id = ? AND status IN ('accepted', 'pending')
      )
      GROUP BY g.id
      ORDER BY member_count DESC
      LIMIT 20
    `;

    db.query(candidateQuery, [userId], async (err, groups) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (groups.length === 0) return res.json({ recommendations: [] });

      try {
        const prompt = PROMPTS.groupRecommendation({
          userField: user.field_of_study,
          userName: user.name,
          groups,
        });
        const raw = await query(prompt);

        // Parse JSON response from LLM
        let ranked = [];
        try {
          ranked = JSON.parse(raw);
        } catch {
          // Fallback: return top groups by member count if LLM response isn't valid JSON
          ranked = groups.slice(0, 5).map(g => ({ id: g.id, reason: 'Popular group in your area' }));
        }

        // Enrich with full group data
        const groupMap = Object.fromEntries(groups.map(g => [g.id, g]));
        const recommendations = ranked
          .filter(r => groupMap[r.id])
          .map(r => ({ ...groupMap[r.id], reason: r.reason }));

        res.json({ recommendations });
      } catch (aiErr) {
        console.error('Recommendation AI error:', aiErr.message);
        // Graceful fallback — return top groups without AI ranking
        res.json({
          recommendations: groups.slice(0, 5).map(g => ({
            ...g,
            reason: 'Suggested based on platform activity',
          })),
        });
      }
    });
  });
});

// ─── 4. Onboarding Agent ─────────────────────────────────────────────────────
// POST /agents/onboard
// Body: { userId, groupId }
// Called automatically when membership is accepted (also callable directly)

router.post('/onboard', requireAuth, (req, res) => {
  const { userId, groupId } = req.body;
  if (!userId || !groupId) {
    return res.status(400).json({ error: 'userId and groupId are required.' });
  }

  // Fetch group details, upcoming sessions, and active members
  const groupQuery = `SELECT * FROM \`groups\` WHERE id = ?`;
  db.query(groupQuery, [groupId], (err, groupRows) => {
    if (err) return res.status(500).json({ error: 'Internal server error.' });
    if (groupRows.length === 0) return res.status(404).json({ error: 'Group not found.' });

    const group = groupRows[0];

    // Fetch new member name
    db.query('SELECT name FROM users WHERE id = ?', [userId], (err, userRows) => {
      if (err) return res.status(500).json({ error: 'Internal server error.' });
      if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });

      const userName = userRows[0].name;

      // Fetch upcoming sessions
      db.query(
        'SELECT topic, timing FROM sessions WHERE group_id = ? AND timing > NOW() ORDER BY timing ASC LIMIT 3',
        [groupId],
        (err, sessions) => {
          if (err) return res.status(500).json({ error: 'Internal server error.' });

          // Fetch active members
          db.query(
            `SELECT u.name FROM users u
             JOIN group_membership gm ON gm.user_id = u.id
             WHERE gm.group_id = ? AND gm.status = 'accepted' AND u.id != ?
             LIMIT 8`,
            [groupId, userId],
            async (err, members) => {
              if (err) return res.status(500).json({ error: 'Internal server error.' });

              try {
                const prompt = PROMPTS.onboarding({
                  userName,
                  groupName: group.name,
                  groupDescription: group.description,
                  upcomingSessions: sessions,
                  activeMembers: members,
                });
                const welcomeMessage = await query(prompt);

                // Post welcome message as bot in group chat
                const botMsg = `👋 ${welcomeMessage}`;
                db.query(
                  'INSERT INTO messages (group_id, user_id, message, is_bot) VALUES (?, 1, ?, 1)',
                  [groupId, botMsg],
                  (err) => {
                    if (err) console.error('Failed to post onboarding message:', err);
                  }
                );

                res.json({ message: 'Onboarding message sent.', welcomeMessage: botMsg });
              } catch (aiErr) {
                console.error('Onboarding AI error:', aiErr.message);
                // Post a fallback welcome even if AI fails
                const fallback = `👋 Welcome to "${group.name}", ${userName}! We're glad to have you. Check the Sessions tab for upcoming study sessions and use @bot for academic help.`;
                db.query(
                  'INSERT INTO messages (group_id, user_id, message, is_bot) VALUES (?, 1, ?, 1)',
                  [groupId, fallback],
                  () => {}
                );
                res.json({ message: 'Onboarding message sent (fallback).', welcomeMessage: fallback });
              }
            }
          );
        }
      );
    });
  });
});

// ─── 5. Platform Health Agent ─────────────────────────────────────────────────
// GET /agents/health — admin only
// Runs platform diagnostics and returns AI-analyzed alerts

router.get('/health', requireAuth, requireAdmin, aiLimiter, (req, res) => {
  const statsQueries = {
    totalUsers:          'SELECT COUNT(*) AS n FROM users',
    totalGroups:         'SELECT COUNT(*) AS n FROM `groups`',
    inactiveGroups:      `SELECT COUNT(DISTINCT g.id) AS n FROM \`groups\` g
                          WHERE g.id NOT IN (
                            SELECT DISTINCT group_id FROM messages
                            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                          )`,
    stalePending:        `SELECT COUNT(*) AS n FROM group_membership
                          WHERE status = 'pending'
                          AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    sessionlessGroups:   `SELECT COUNT(*) AS n FROM \`groups\` g
                          WHERE g.created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
                          AND g.id NOT IN (SELECT DISTINCT group_id FROM sessions)`,
    recentFailedLogins:  `SELECT COUNT(*) AS n FROM login_attempts
                          WHERE success = 0
                          AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    newUsersWeek:        `SELECT COUNT(*) AS n FROM users
                          WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
  };

  const stats = {};
  const keys = Object.keys(statsQueries);
  let completed = 0;

  keys.forEach(key => {
    db.query(statsQueries[key], (err, rows) => {
      // login_attempts table may not exist — default to 0
      stats[key] = err ? 0 : (rows[0]?.n || 0);
      completed++;

      if (completed === keys.length) {
        // All queries done — call AI for analysis
        query(PROMPTS.platformHealth({ stats }))
          .then(raw => {
            let alerts = [];
            try {
              alerts = JSON.parse(raw);
            } catch {
              alerts = [{ type: 'parse_error', severity: 'low', message: 'Could not parse AI response.', count: 0 }];
            }

            // Also include raw stats for the dashboard
            res.json({ stats, alerts });
          })
          .catch(aiErr => {
            console.error('Platform Health AI error:', aiErr.message);
            // Return stats even if AI fails
            res.json({
              stats,
              alerts: [{ type: 'ai_unavailable', severity: 'low', message: 'AI analysis unavailable. Raw stats provided.', count: 0 }],
            });
          });
      }
    });
  });
});

module.exports = router;
