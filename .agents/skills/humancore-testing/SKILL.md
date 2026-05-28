---
name: humancore-testing
description: Test HumanCore AI features end-to-end including LLM providers, streaming chat, sub-agent spawning, task delegation, and mood detection. Use when verifying Phase 3+ changes.
---

# HumanCore AI Testing

## Quick Start

```bash
cd /home/ubuntu/humancore-ai
bun install
bun run db:push    # May need: echo 'y' | bun run db:push (interactive prompt)
bun run db:seed
bun run dev:server  # API on port 3001
bun run dev:client  # React on port 5173 (separate terminal)
```

## Environment

- **Stack:** Bun + Hono + SQLite + React 19 + Vite
- **API Server:** localhost:3001
- **Client:** localhost:5173
- **Database:** SQLite at `packages/db/data/humancore.db`
- **Demo agents:** Luna (id=1), Atlas (id=2), Sage (id=3)

## Devin Secrets Needed

- `Ollacloud_api` — Ollama Cloud API key (used as Bearer token)
- `ollacloud_url` — Ollama Cloud base URL (${ollacloud_url})
- Alternative: Any OpenAI/Anthropic/Google API key configured via `/api/providers`

## Key API Endpoints (Phase 3+4)

### Streaming Chat
```bash
# SSE streaming (real LLM)
curl -N -X POST http://localhost:3001/api/chat/{sessionId}/stream \
  -H 'Content-Type: application/json' \
  -d '{"content": "your message"}'

# Non-streaming fallback
curl -X POST http://localhost:3001/api/chat/{sessionId}/send \
  -H 'Content-Type: application/json' \
  -d '{"content": "your message"}'

# Check active provider
curl http://localhost:3001/api/chat/provider
```

### Sub-Agent Spawning
```bash
# Spawn sub-agent
curl -X POST http://localhost:3001/api/agents/{id}/spawn \
  -H 'Content-Type: application/json' \
  -d '{"purpose": "task description", "mode": "fork"}'

# List spawns
curl http://localhost:3001/api/agents/{id}/spawns
```

### Task Delegation
```bash
# Delegate with auto-execute
curl -X POST http://localhost:3001/api/delegations \
  -H 'Content-Type: application/json' \
  -d '{"fromAgentId": 1, "toAgentId": 2, "taskDescription": "...", "autoExecute": true}'

# List delegations
curl http://localhost:3001/api/delegations
```

## Testing Tips

- **SSE vs JSON:** When provider is configured, `/stream` returns `text/event-stream`. Without provider, returns JSON with `provider: "mock"`.
- **Mood detection:** Send keywords like "sad", "frustrated" → empathetic; "happy", "excited" → positive; "help", "please" → supportive; "analyze", "explain" → focused.
- **Spawn limits:** MAX_SPAWN_DEPTH=3, MAX_CHILDREN_PER_AGENT=8. Test depth by chaining spawns.
- **Delegation auto-execute:** Uses target agent's personality prompt via `buildSystemPrompt()`. Verify result uses target agent's communication style.
- **Token counting:** Ollama Cloud may return inputTokens/outputTokens as 0 — this is a provider limitation, not a bug.
- **Browser not always available:** VM may not have Chrome installed. Fall back to API testing via curl. Core logic is server-side.
- **db:push interactive:** `bun run db:push` may prompt for confirmation when tables exist. Use `echo 'y' | bun run db:push` to auto-confirm.

## Verification Checklist

1. `GET /api/chat/provider` returns `configured: true` with correct provider/model
2. `POST /api/chat/{sessionId}/stream` returns SSE chunks with `type: "chunk"` and ends with `type: "done"`
3. Mood keywords trigger `moodShift` in done event and persist to agent record
4. Spawn creates new agent + session + supervision link + spawn record
5. Depth 4 spawn returns 400 error
6. Delegation with `autoExecute: true` returns `status: "completed"` with non-empty result
7. Delegation result posted as system message in originating session
