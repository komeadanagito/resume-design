# @resume-studio/daemon

Local Fastify daemon. Serves the web app's `/api/*` surface and brokers chat to Anthropic.

## Setup

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-sonnet-4-6   # optional
```

If `ANTHROPIC_API_KEY` is not set, `/api/health` reports `byokProviders: 0` and any
`POST /api/conversations/:projectId/messages` run yields an `agent_failed` SSE error.

## Run

```bash
pnpm --filter @resume-studio/daemon dev
```

Listens on `http://127.0.0.1:17456` by default. Override with `OD_RESUME_PORT`.

## Routes (slice 2)

- `GET  /api/health`
- `GET  /api/skills` / `/api/skills/:id`
- `GET  /api/design-systems` / `/api/design-systems/:id`
- `GET  /api/projects` / `POST /api/projects` / `PATCH /api/projects/:id` / `DELETE /api/projects/:id` / `POST /api/projects/:id/duplicate` / `GET /api/projects/:id/state`
- `POST /api/conversations/:projectId/messages`  (queues a run)
- `GET  /api/conversations/:projectId/stream`     (consumes queued run as SSE)
- `POST /api/conversations/:projectId/cancel`

## Storage

JSON files under `RESUME_STUDIO_DATA_DIR` (default `.tmp/resume-studio`):

- `projects.json`
- `conversations/<projectId>.json`
