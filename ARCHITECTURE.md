# FundReady AI — Architecture

## Overview

FundReady AI is a full-stack agentic app. A user submits a startup idea; a 4-node LangGraph agent scrapes live market data, analyzes it with Claude, generates 6 investor documents, and uploads them to Box as a deal room folder. The browser streams live progress via SSE and renders the final deal room with a chat interface.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    EC2 t2.micro (AWS)                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Nginx :80                          │   │
│  │  GET /          → frontend/dist (React SPA)     │   │
│  │  POST /api/*    → FastAPI :8000 (SSE stream)    │   │
│  │  GET /health    → FastAPI :8000                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         FastAPI Backend (Docker)                │   │
│  │                                                 │   │
│  │  POST /api/generate                             │   │
│  │    └── LangGraph Agent (4 nodes)                │   │
│  │          ├── research_node  ──→ Apify API       │   │
│  │          ├── analyze_node   ──→ Anthropic API   │   │
│  │          ├── generate_node  ──→ Anthropic API   │   │
│  │          └── upload_node    ──→ Box API         │   │
│  │                                                 │   │
│  │  POST /api/chat ──→ Anthropic API               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           ▲                          ▲
           │ SSE stream               │ HTTPS
           │                          │
    ┌──────┴──────┐           ┌───────┴──────┐
    │   Browser   │           │  External    │
    │  React SPA  │           │  APIs        │
    │             │           │  Apify       │
    │  3 phases:  │           │  Anthropic   │
    │  input      │           │  Box         │
    │  running    │           └──────────────┘
    │  complete   │
    └─────────────┘
```

---

## LangGraph Agent — 4-Node Pipeline

```
StartupInput
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  Node 1: research_node                                 │
│  Fires 4 Apify scrapers in parallel:                   │
│    • Google Search (competitors)                       │
│    • ProductHunt (similar products)                    │
│    • TechCrunch / news (market trends)                 │
│    • Crunchbase-style (funding rounds)                 │
│  Output: ResearchData (competitors, news, funding)     │
└────────────────────┬───────────────────────────────────┘
                     │  2-4 min
                     ▼
┌────────────────────────────────────────────────────────┐
│  Node 2: analyze_node                                  │
│  Claude Sonnet 4.6 call with research summary          │
│  Returns structured JSON:                              │
│    market_size, top_competitors, market_gaps,          │
│    ICP, positioning_angle, fundraising_narrative       │
└────────────────────┬───────────────────────────────────┘
                     │  ~10s
                     ▼
┌────────────────────────────────────────────────────────┐
│  Node 3: generate_node                                 │
│  6 sequential Claude calls, one per document:          │
│    01_market_research.md                               │
│    02_competitor_analysis.md                           │
│    03_tam_sam_som.md                                   │
│    04_icp_profile.md                                   │
│    05_one_pager.md                                     │
│    06_investor_email_templates.md                      │
└────────────────────┬───────────────────────────────────┘
                     │  ~60s
                     ▼
┌────────────────────────────────────────────────────────┐
│  Node 4: upload_node                                   │
│  Box SDK creates deal room folder + uploads 6 files    │
│  Returns: folder_id, folder_url, file list             │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
              BoxDealRoom + GeneratedDocs
              (emitted as SSE "complete" event)
```

---

## Frontend State Machine

```
phase = 'input'
    │  user submits form
    ▼
phase = 'running'
    │  SSE reader streams log lines → AgentProgress component
    │  buffer accumulates across TCP chunks (large complete event)
    ▼
phase = 'complete'
    │  SSE 'complete' event received
    ▼
DealRoom + ChatPanel rendered
    │  ChatPanel sends POST /api/chat with docs as context
    ▼
Claude responds in real time
```

---

## SSE Streaming

```
FastAPI StreamingResponse (text/event-stream)
  │
  │  data: {"type": "log", "message": "🔍 Scraping..."}
  │  data: {"type": "log", "message": "✅ Research complete"}
  │  ...
  │  data: {"type": "complete", "deal_room": {...}, "docs": {...}}  ← ~50-100KB
  │
  ▼
Browser ReadableStream reader
  • Buffers across TCP chunks (complete event can span multiple reads)
  • Splits on \n, parses each data: line
  • Dispatches to React state
```

> **Key**: the `complete` event is large (~50-100KB with 6 markdown docs). The SSE reader in `App.jsx` uses a `buffer` string to accumulate partial chunks before parsing — without this, the event is silently dropped.

---

## Key Technical Decisions

### LangGraph state as Pydantic model
`AgentState` is a Pydantic `BaseModel` (not a TypedDict). All 4 nodes receive and return the full state. Logs accumulate in `state.log` — the SSE runner diffs log length between node outputs to emit only new messages.

### LangGraph 0.1.5 dict chunks
`agent.astream()` yields `{node_name: node_state}` where `node_state` is a plain `dict`, not an `AgentState` object. The streaming runner uses a local getter that handles both dict and object access.

### Box developer token auth
`boxsdk`'s `OAuth2` class, when it receives a 401, calls `_refresh()` which POSTs `grant_type=refresh_token` with `refresh_token=None` → Box returns 400. `DeveloperTokenAuth` subclasses `OAuth2` and overrides `_refresh` to return the current token from settings instead of hitting the token endpoint.

### Nginx serves both frontend and API
No CORS issues, no mixed-content (HTTPS Amplify → HTTP API) — everything at `http://EC2_IP/`. Nginx serves `frontend/dist/` at `/` and proxies `/api/*` to FastAPI at `:8000`. SSE requires `proxy_buffering off` and 300s timeouts.

### Docker PYTHONPATH
Dockerfile uses `context: ./backend` so `COPY . .` places files at `/app/` directly. Fix: `COPY . ./backend/` + `ENV PYTHONPATH=/app` + `CMD uvicorn backend.api.main:app`. The `docker-compose.yml` volume is `./backend:/app/backend` to match.

---

## Local Dev vs Production

| | Local Dev | EC2 Production |
|---|---|---|
| Frontend | Vite dev server `:5173` | Nginx static build from `frontend/dist/` |
| API proxy | Vite proxies `/api/` → `:8000` | Nginx proxies `/api/` → `:8000` |
| Backend | uvicorn `--reload` directly | Docker container via `docker compose` |
| `.env` reload | Automatic on restart | `sudo docker compose up -d --force-recreate backend` |
| Frontend build | Not needed | `sudo docker run node:20-alpine npm run build` + `chmod -R o+rX` |

---

## File Map

| File | Role |
|------|------|
| `backend/agents/fundready_agent.py` | LangGraph graph + SSE streaming runner |
| `backend/models/state.py` | `AgentState` Pydantic model shared across nodes |
| `backend/tools/apify_tool.py` | Apify scraper — 4 actors in parallel |
| `backend/tools/box_tool.py` | Box SDK — `DeveloperTokenAuth` + folder/file upload |
| `backend/api/main.py` | FastAPI — SSE endpoint + chat endpoint |
| `backend/utils/config.py` | pydantic-settings — loads `.env`, `extra='ignore'` |
| `frontend/src/App.jsx` | 3-phase state machine + SSE reader with buffer |
| `frontend/src/components/AgentProgress.jsx` | Live log stream UI |
| `frontend/src/components/DealRoom.jsx` | Box folder link + doc previews |
| `frontend/src/components/ChatPanel.jsx` | Follow-up chat against generated docs |
| `infra/nginx.conf` | Serves frontend static files + proxies `/api/` |
| `infra/ec2-setup.sh` | One-time EC2 bootstrap (Docker, Nginx, Git, clone) |
| `infra/deploy.sh` | Redeploy from local: pull + build frontend + docker compose up |
