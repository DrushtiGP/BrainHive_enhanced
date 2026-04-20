# BrainHive AI Agents — Integration Report

## Overview

This report identifies where AI agents can be integrated into the BrainHive study group platform to enhance learning, group management, discovery, and administration. Each agent is mapped to the existing codebase components it would interact with.

---

## 1. Study Buddy Agent

### What it does
An in-chat AI assistant that responds when a member types `@bot <question>` in the group chat. It answers subject-specific questions, explains concepts, and provides examples relevant to the group's field of study.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | `backend/routes/messages.js` | Intercept messages starting with `@bot`, forward to AI service, post response as a bot message |
| Backend | `backend/routes/` | New `bot.js` route — handles AI query, returns response |
| Frontend | `frontend/src/components/GroupHomePage.jsx` | Render bot messages with a distinct style in the chat window |
| Database | New `bot_messages` table or flag on `messages` table | `is_bot BOOLEAN DEFAULT FALSE` column to distinguish bot replies |

### Trigger
User sends a message starting with `@bot` in any group chat.

### AI Integration Point
`POST /bot/ask` — receives `{ question, groupField, chatHistory }`, calls an LLM API (e.g., OpenAI, AWS Bedrock), returns `{ answer }`.

### Example Flow
```
User: @bot explain dynamic programming
Bot:  Dynamic programming is a technique that solves complex problems by
      breaking them into overlapping subproblems and storing results to
      avoid redundant computation...
```

---

## 2. Session Summarizer Agent

### What it does
After a study session ends (or manually triggered by the group leader), an agent reads the group's recent chat history and generates a structured summary — key topics discussed, action items, and questions left unanswered — and pins it to the Sessions tab.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | `backend/routes/sessions.js` | Add `POST /sessions/:sessionId/summarize` endpoint |
| Backend | `backend/routes/messages.js` | Expose `GET /messages?groupId=X&limit=200` for summary context |
| Frontend | `frontend/src/components/GroupHomePage.jsx` | Add "Summarize Session" button in Sessions tab (leader only, via `RoleGuard`) |
| Frontend | `frontend/src/store/messagesSlice.js` | Add `summarizeSession` async thunk |
| Database | `sessions` table | Add `summary TEXT NULL` column to store generated summaries |

### Trigger
Group leader clicks "Summarize Session" button on a completed session, or automatically triggered when a session's `timing` passes.

### AI Integration Point
`POST /sessions/:sessionId/summarize` — fetches last N messages for the group, sends to LLM with a summarization prompt, stores result in `sessions.summary`.

### Example Output
```
Session Summary — "Algorithms Review" (March 28, 2026)
Topics Covered: Binary search, merge sort, time complexity analysis
Action Items: Complete LeetCode problems 1–5 before next session
Open Questions: How does quicksort perform on nearly-sorted arrays?
```

---

## 3. Group Recommendation Agent

### What it does
Analyzes a user's `field_of_study`, joined groups, and activity level, then surfaces relevant groups they haven't joined yet on the `/home` dashboard.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | New `backend/routes/recommendations.js` | `GET /recommendations/:userId` — returns ranked list of suggested groups |
| Frontend | `frontend/src/components/Dashboard.jsx` | Add "Recommended Groups" section below user's groups |
| Frontend | `frontend/src/store/groupsSlice.js` | Add `fetchRecommendations` async thunk |
| Database | `users` table | Uses existing `field_of_study` column as matching signal |

### Trigger
Fires on `/home` load for authenticated users. Results are cached per user for a configurable TTL (e.g., 1 hour).

### Matching Logic
```
score(group) =
  field_match(user.field_of_study, group.field_of_study) * 0.5 +
  member_count_signal(group.member_count)               * 0.3 +
  activity_signal(group.last_message_at)                * 0.2
```

For a more advanced version, this scoring can be delegated to an LLM or embedding-based similarity model.

### Example Output (on Dashboard)
```
Recommended for you:
- "Advanced Algorithms Study Group"  — matches your CS field, 12 active members
- "Data Structures Deep Dive"        — high activity, 3 mutual connections
```

---

## 4. Onboarding Agent

### What it does
When a user's join request is accepted, an agent automatically sends them a welcome message in the group chat with group context — description, upcoming sessions, and a list of active members.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | `backend/routes/groups.js` | After `PUT /groups/:groupId/members/:memberId` sets status to `accepted`, trigger onboarding message |
| Backend | `backend/routes/messages.js` | Reuse message insert logic to post bot welcome message |
| Frontend | `frontend/src/components/GroupHomePage.jsx` | No change needed — bot message renders in existing chat |

### Trigger
Membership status changes to `accepted` via the group leader's accept action.

### Example Output
```
Welcome to "Web Dev Study Group", Alice!
Here's what you need to know:
- Next session: "React Hooks Deep Dive" on April 2, 2026 at 6:00 PM
- 8 active members including Bob (leader), Carol, Dave
- Feel free to ask @bot any questions about the topics we cover
```

---

## 5. Platform Health Agent (Admin)

### What it does
A scheduled background agent that surfaces anomalies to the Admin Dashboard — inactive groups, stale pending requests, unusual login failure spikes, and groups with no sessions scheduled.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | New `backend/jobs/healthCheck.js` | Scheduled job (cron) that runs queries and writes results to a `platform_alerts` table |
| Backend | New `backend/routes/admin.js` | Add `GET /admin/health` endpoint returning current alerts |
| Frontend | `frontend/src/pages/AdminDashboard.jsx` | Add "Platform Health" tab showing alerts with severity levels |
| Database | New `platform_alerts` table | `id, type, message, severity, created_at, resolved` |

### Trigger
Runs on a schedule (e.g., every hour via `node-cron`). Admin can also trigger manually from the dashboard.

### Alert Types

| Alert | Condition |
|-------|-----------|
| Inactive group | No messages in the last 30 days |
| Stale pending request | Join request pending for more than 7 days |
| Login spike | More than 20 failed logins in 15 minutes |
| Sessionless group | Group exists for 14+ days with no sessions |

---

## 6. Scheduling Assistant Agent

### What it does
Members describe their availability in natural language (e.g., "I'm free weekday evenings after 6pm"), the agent parses responses, finds the optimal overlap, and suggests a session time to the group leader.

### Where it fits in the codebase

| Layer | File | Change |
|-------|------|--------|
| Backend | New `backend/routes/scheduling.js` | `POST /groups/:groupId/schedule` — collects availability, calls LLM to find overlap |
| Frontend | `frontend/src/components/GroupHomePage.jsx` | Add availability input in Sessions tab for members |
| Database | New `availability` table | `id, user_id, group_id, availability_text, parsed_slots JSON` |

### Trigger
Leader initiates a "Find best time" poll in the Sessions tab. Members submit availability. Agent processes and returns top 3 suggested slots.

---

## Implementation Priority

| Priority | Agent | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Study Buddy | Medium | High — core use case |
| 2 | Session Summarizer | Medium | High — direct learning value |
| 3 | Group Recommendation | Low | High — solves discovery gap |
| 4 | Onboarding Agent | Low | Medium — improves retention |
| 5 | Platform Health | Medium | Medium — admin quality of life |
| 6 | Scheduling Assistant | High | Medium — complex NLP parsing |

---

## Shared Infrastructure Required

All agents above share a common need for an AI service abstraction layer:

```
backend/services/aiService.js
  - query(prompt, context)  → string
  - embed(text)             → float[]
  - summarize(messages)     → string
```

This service wraps whichever LLM provider is chosen (OpenAI, AWS Bedrock, Ollama for local dev) and keeps provider-specific code out of route handlers. The API key is stored in `.env` as `AI_API_KEY`.

---

## Notes

- All bot-generated messages should be stored with `is_bot = true` to allow filtering in the UI
- Agent responses should be non-blocking — use async processing so the user's original action completes immediately
- Rate limiting should be applied to AI endpoints to control costs (`express-rate-limit` is already installed)
- For local development, a mock AI service can return canned responses without hitting a real API
