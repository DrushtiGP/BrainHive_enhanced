# BrainHive AI Agents — Setup & Usage Guide

## Overview

BrainHive integrates 5 AI agents powered by an LLM backend. All agents share a single
`aiService.js` abstraction layer, making it easy to swap providers without touching agent logic.

---

## Quick Start

### 1. Configure the AI provider in `backend/.env`

```env
# Choose one: openai | huggingface | vllm | mock
AI_PROVIDER=huggingface
AI_API_KEY=hf_your_key_here
AI_MODEL=meta-llama/Llama-3.1-8B-Instruct:cerebras
AI_BASE_URL=http://localhost:8000/v1   # only used for vllm provider
```

### 2. Start the backend

```bash
cd backend
npm install
node server.js
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Provider Options

| Provider | `AI_PROVIDER` | Requires | Notes |
|----------|--------------|----------|-------|
| Hugging Face | `huggingface` | `AI_API_KEY=hf_...` | Free tier, model must include provider suffix e.g. `:cerebras` |
| OpenAI | `openai` | `AI_API_KEY=sk-...` | Paid, reliable, default model `gpt-4o-mini` |
| Local vLLM | `vllm` | vLLM server running | No API key needed, set `AI_BASE_URL` |
| Mock | `mock` | Nothing | Returns placeholder responses, good for UI testing |

### Recommended working models per provider

**Hugging Face** (append provider suffix):
```
meta-llama/Llama-3.1-8B-Instruct:cerebras
meta-llama/Llama-3.1-8B-Instruct:novita
Qwen/Qwen2.5-7B-Instruct:novita
Qwen/Qwen2.5-7B-Instruct:nebius
```

**OpenAI:**
```
gpt-4o-mini
gpt-4o
gpt-3.5-turbo
```

**vLLM (local):**
```
mistralai/Leanstral-2603
```
Start vLLM in WSL2:
```bash
vllm serve mistralai/Leanstral-2603 \
  --max-model-len 200000 \
  --tensor-parallel-size 4 \
  --attention-backend FLASH_ATTN_MLA \
  --tool-call-parser mistral \
  --enable-auto-tool-choice \
  --reasoning-parser mistral
```

---

## The 5 AI Agents

---

### 1. 🤖 Study Buddy Agent

**What it does:** Answers academic questions typed in the group chat using `@bot`.

**How to use:**
1. Open any group → **Chat** tab
2. Type `@bot <your question>` and send
3. The bot replies inline with a styled message

**Example:**
```
@bot explain the difference between BFS and DFS
@bot what is dynamic programming?
@bot give me an example of a binary search tree
```

**API endpoint:** `POST /agents/study-buddy`
```json
{
  "groupId": 1,
  "userId": 2,
  "question": "explain recursion"
}
```

**LLM Prompt context includes:**
- Group's field of study
- Last 10 chat messages for context

---

### 2. 📄 Session Summarizer Agent

**What it does:** Generates a structured summary of a study session based on recent chat messages.

**How to use (Group Leader):**
1. Open a group → **Sessions** tab
2. Click **📝 Summarize** on any session
3. The AI summary appears below the session card

**How to use (Member):**
1. Open a group → **Sessions** tab
2. Click **📄 View Summary** to read a previously generated summary

**Summary format:**
```
**Topics Covered:**
- ...

**Key Takeaways:**
- ...

**Action Items:**
- ...

**Open Questions:**
- ...
```

**API endpoint:** `POST /agents/summarize/:sessionId`

**Note:** Summary quality reflects chat quality. A richer discussion produces a richer summary.

---

### 3. 🔍 Group Recommendation Agent

**What it does:** Suggests relevant study groups based on the user's field of study and group activity.

**How to use:**
1. Go to the **Dashboard** (`/home`)
2. Scroll to **🔍 Recommended for You**
3. Click **↻ Refresh** to re-run recommendations

**To improve recommendations:**
- Fill in your field of study in your profile (`/profile`)
- The AI matches your field against group descriptions and member counts

**API endpoint:** `GET /agents/recommendations?userId=X`

**Response:**
```json
{
  "recommendations": [
    {
      "id": 3,
      "name": "Advanced Algorithms",
      "reason": "Matches your Computer Science field",
      "member_count": 12
    }
  ]
}
```

---

### 4. 👋 Onboarding Agent

**What it does:** Automatically sends a personalised welcome message in the group chat when a new member is accepted.

**How to trigger:**
1. As a group leader, go to a group → **Members** tab
2. Click **Accept** on a pending join request
3. A welcome bot message automatically appears in the group chat

**The welcome message includes:**
- Group name and description
- Upcoming sessions (next 3)
- Active member names
- Tip about using `@bot`

**API endpoint:** `POST /agents/onboard`
```json
{
  "userId": 5,
  "groupId": 2
}
```

**Note:** Triggered automatically on membership acceptance. No manual action needed beyond accepting the request.

---

### 5. 🛠️ Platform Health Agent (Admin only)

**What it does:** Analyses platform statistics and generates AI-powered alerts for admins.

**How to use:**
1. Log in as an **admin** account
2. Go to **Admin Dashboard**
3. Click the **🛠️ Platform Health** tab
4. View the stats grid and AI-generated alerts

**Alert severity levels:**

| Severity | Meaning |
|----------|---------|
| 🔴 High | Immediate action needed |
| 🟡 Medium | Monitor closely |
| 🔵 Low | Informational |

**Monitored metrics:**
- Inactive groups (no messages in 30 days)
- Stale pending join requests (>7 days old)
- Groups with no sessions ever scheduled
- New user signups in the last 7 days
- Failed login attempts in the last hour

**API endpoint:** `GET /agents/health` (admin token required)

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Study Buddy (Mock)` response | `AI_PROVIDER=mock` or no API key | Set correct provider and key in `.env`, restart backend |
| `model_not_supported` | HF model name missing provider suffix | Add `:cerebras` or `:novita` suffix to model name |
| `vLLM connection error` | vLLM server not running | Start vLLM server or switch to `huggingface` provider |
| `502 Bad Gateway` | vLLM running but model name wrong | Run `curl http://localhost:8000/v1/models` to get exact model name |
| `AI service unavailable` | Network or API key issue | Check backend console for detailed error, verify API key is valid |
| Empty summary | No chat messages in the group | Have a discussion in the chat first, then summarize |
| No recommendations | User has no field of study set | Update profile with field of study |

---

## Architecture

```
frontend (React)
    │
    ▼
backend/routes/agents.js        ← All 5 agent endpoints
    │
    ▼
backend/services/aiService.js   ← LLM provider abstraction
    │
    ├── callOpenAI()            ← OpenAI API
    ├── callHuggingFace()       ← HF Inference Router
    ├── callVLLM()              ← Local vLLM server
    └── callMock()              ← Dev placeholder
```

All prompts are defined in `aiService.js` under `PROMPTS` — edit them there to tune agent behaviour.

---

## Environment Variables Reference

```env
# Required
JWT_SECRET=your_jwt_secret

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=brainhive
PORT=3001

# AI (pick one provider)
AI_PROVIDER=huggingface          # openai | huggingface | vllm | mock
AI_API_KEY=hf_...                # your API key (not needed for vllm/mock)
AI_MODEL=meta-llama/Llama-3.1-8B-Instruct:cerebras
AI_BASE_URL=http://localhost:8000/v1   # vllm only
```
