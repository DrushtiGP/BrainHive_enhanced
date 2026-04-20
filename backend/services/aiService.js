/**
 * aiService.js — Shared LLM abstraction layer for all BrainHive agents.
 *
 * Supports:
 *   - OpenAI (default, set AI_PROVIDER=openai)
 *   - Mock mode for local dev (set AI_PROVIDER=mock or omit AI_API_KEY)
 *
 * All agent prompts live here so they are easy to tune in one place.
 */

const https = require('https');

const PROVIDER = process.env.AI_PROVIDER || 'mock';
const API_KEY  = process.env.AI_API_KEY  || '';
const MODEL    = process.env.AI_MODEL    || 'gpt-4o-mini';
const BASE_URL = process.env.AI_BASE_URL || 'http://localhost:8000/v1';

// ─── Prompt Templates ────────────────────────────────────────────────────────

const PROMPTS = {
  /**
   * Study Buddy Agent
   * Receives: question, groupField, recentMessages (last 10 as context)
   */
  studyBuddy: ({ question, groupField, recentMessages }) => ({
    system: `You are Study Buddy, an expert academic assistant embedded in BrainHive — a peer study platform.
You help students understand concepts clearly and concisely.
The study group focuses on: ${groupField || 'general academics'}.
Keep answers focused, educational, and under 300 words.
Use examples where helpful. If the question is off-topic or inappropriate, politely redirect.`,
    user: `Recent chat context:\n${recentMessages}\n\nStudent question: ${question}`,
  }),

  /**
   * Session Summarizer Agent
   * Receives: sessionTopic, messages (array of {sender_name, message})
   */
  sessionSummarizer: ({ sessionTopic, messages }) => {
    const transcript = messages
      .map(m => `${m.sender_name || 'Member'}: ${m.message}`)
      .join('\n');
    return {
      system: `You are a study session summarizer for BrainHive.
Analyze the chat transcript and produce a structured summary.
Format your response EXACTLY as:

**Topics Covered:**
- [bullet list]

**Key Takeaways:**
- [bullet list]

**Action Items:**
- [bullet list or "None identified"]

**Open Questions:**
- [bullet list or "None identified"]

Be concise. Focus on academic content. Ignore greetings and off-topic chatter.`,
      user: `Session topic: "${sessionTopic}"\n\nChat transcript:\n${transcript}`,
    };
  },

  /**
   * Group Recommendation Agent
   * Receives: userField, userName, groups (array of candidate groups with stats)
   */
  groupRecommendation: ({ userField, userName, groups }) => {
    const groupList = groups
      .map(g => `- ID:${g.id} | "${g.name}" | Field: ${g.field || 'General'} | Members: ${g.member_count} | Description: ${g.description || 'N/A'}`)
      .join('\n');
    return {
      system: `You are a group recommendation engine for BrainHive, a peer study platform.
Your job is to rank and recommend the most relevant study groups for a student.
Return ONLY a JSON array of recommended group IDs in order of relevance, with a short reason for each.
Format: [{"id": 1, "reason": "..."}, ...]
Return at most 5 recommendations. No extra text outside the JSON.`,
      user: `Student name: ${userName}
Student field of study: ${userField || 'Not specified'}

Available groups to consider:
${groupList}

Recommend the most relevant groups for this student.`,
    };
  },

  /**
   * Onboarding Agent
   * Receives: userName, groupName, groupDescription, upcomingSessions, activeMembers
   */
  onboarding: ({ userName, groupName, groupDescription, upcomingSessions, activeMembers }) => {
    const sessionList = upcomingSessions.length
      ? upcomingSessions.map(s => `  • "${s.topic}" on ${new Date(s.timing).toLocaleString()}`).join('\n')
      : '  • No sessions scheduled yet';
    const memberList = activeMembers.slice(0, 5).map(m => m.name).join(', ');
    return {
      system: `You are the BrainHive Onboarding Assistant.
Write a warm, friendly welcome message for a new group member.
Keep it under 150 words. Be encouraging and informative.
Mention the group's purpose, upcoming sessions, and active members.
End with a tip about using @bot for academic help.`,
      user: `New member: ${userName}
Group: "${groupName}"
Description: ${groupDescription || 'A study group'}
Upcoming sessions:\n${sessionList}
Active members: ${memberList || 'None yet'}`,
    };
  },

  /**
   * Platform Health Agent
   * Receives: stats (object with counts and anomaly data)
   */
  platformHealth: ({ stats }) => ({
    system: `You are the BrainHive Platform Health Analyst.
Analyze the platform statistics and identify issues that need admin attention.
Return ONLY a JSON array of alert objects.
Format: [{"type": "...", "severity": "low|medium|high", "message": "...", "count": N}]
Severity guide: high = immediate action needed, medium = monitor, low = informational.
No extra text outside the JSON.`,
    user: `Platform statistics:
- Total users: ${stats.totalUsers}
- Total groups: ${stats.totalGroups}
- Inactive groups (no messages in 30 days): ${stats.inactiveGroups}
- Stale pending requests (>7 days): ${stats.stalePending}
- Groups with no sessions ever: ${stats.sessionlessGroups}
- Failed login attempts in last hour: ${stats.recentFailedLogins}
- New users in last 7 days: ${stats.newUsersWeek}

Identify any platform health issues and generate alerts.`,
  }),
};

// ─── LLM Providers ───────────────────────────────────────────────────────────

/**
 * callOpenAI({ system, user }) → Promise<string>
 * Calls OpenAI-compatible chat completions API.
 */
function callOpenAI({ system, user }) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      return reject(new Error('AI_API_KEY is not set in environment variables.'));
    }

    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content.trim());
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * callHuggingFace({ system, user }) → Promise<string>
 * Calls Hugging Face Inference API (serverless, chat completions endpoint).
 * Works with any HF model that supports the messages API.
 */
function callHuggingFace({ system, user }) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      return reject(new Error('AI_API_KEY is not set in environment variables.'));
    }

    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const options = {
      hostname: 'router.huggingface.co',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error)));
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content.trim());
        } catch (e) {
          reject(new Error('Failed to parse Hugging Face response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * callVLLM({ system, user }) → Promise<string>
 * Calls a local vLLM server (OpenAI-compatible /v1/chat/completions).
 * No API key required — set AI_BASE_URL to your vLLM host.
 */
function callVLLM({ system, user }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature: 1.0,
      max_tokens: 600,
    });

    // Strip trailing slash, then append endpoint
    const baseClean = BASE_URL.replace(/\/+$/, '');
    const fullUrl = baseClean.endsWith('/chat/completions')
      ? baseClean
      : baseClean + '/chat/completions';

    let url;
    try {
      url = new URL(fullUrl);
    } catch {
      return reject(new Error('Invalid AI_BASE_URL: ' + BASE_URL));
    }

    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? require('https') : require('http');
    const port = url.port ? parseInt(url.port) : (isHttps ? 443 : 80);

    console.log(`[vLLM] Connecting to ${url.hostname}:${port}${url.pathname}`);

    const options = {
      hostname: url.hostname,
      port,
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
      },
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`[vLLM] Response status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return reject(new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error)));
          }
          const choice = parsed.choices?.[0]?.message;
          const content = choice?.content || '';
          resolve(content.trim());
        } catch (e) {
          reject(new Error('Failed to parse vLLM response: ' + data.slice(0, 300)));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[vLLM] Connection error details:', err);
      reject(new Error(`vLLM connection failed (${err.code || 'UNKNOWN'}): ${err.message} — Is vLLM running at ${BASE_URL}?`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('vLLM request timed out after 30s'));
    });

    req.write(body);
    req.end();
  });
}


function callMock({ system, user }) {
  // Detect which agent is calling based on system prompt keywords
  if (system.includes('Study Buddy')) {
    return Promise.resolve(
      '**Study Buddy (Mock):** Great question! This is a placeholder response. ' +
      'To get real AI answers, add your OpenAI API key as `AI_API_KEY` in `backend/.env`.'
    );
  }
  if (system.includes('summarizer')) {
    return Promise.resolve(
      '**Topics Covered:**\n- Mock topic 1\n- Mock topic 2\n\n' +
      '**Key Takeaways:**\n- This is a mock summary\n\n' +
      '**Action Items:**\n- Add AI_API_KEY to enable real summaries\n\n' +
      '**Open Questions:**\n- None identified'
    );
  }
  if (system.includes('recommendation')) {
    return Promise.resolve('[]');
  }
  if (system.includes('Onboarding')) {
    const nameMatch = user.match(/New member: (.+)/);
    const groupMatch = user.match(/Group: "(.+)"/);
    const name = nameMatch ? nameMatch[1] : 'there';
    const group = groupMatch ? groupMatch[1] : 'the group';
    return Promise.resolve(
      `Welcome to "${group}", ${name}! 🎉 We're excited to have you here. ` +
      `Check out the Sessions tab for upcoming study sessions and feel free to ask @bot any academic questions. Let's learn together!`
    );
  }
  if (system.includes('Health')) {
    return Promise.resolve(
      '[{"type":"info","severity":"low","message":"Mock mode active — add AI_API_KEY for real analysis.","count":0}]'
    );
  }
  return Promise.resolve('Mock AI response. Set AI_API_KEY in backend/.env for real responses.');
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function query(promptData) {
  if (PROVIDER === 'vllm') {
    return callVLLM(promptData);
  }
  if (PROVIDER === 'huggingface') {
    return callHuggingFace(promptData);
  }
  if (PROVIDER === 'openai' && API_KEY) {
    return callOpenAI(promptData);
  }
  // Fallback to mock if no valid provider/key
  return callMock(promptData);
}

module.exports = { query, PROMPTS };
