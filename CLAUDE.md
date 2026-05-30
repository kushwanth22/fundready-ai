# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

FundReady AI — a full-stack app that takes a startup idea and produces a Box deal room with 6 investor documents. Built for the Cascadia JS Hackathon. The core loop is: user inputs startup details → LangGraph agent scrapes live data via Apify → Claude analyzes + generates 6 docs → uploaded to Box as a deal room folder. The frontend then lets users chat with their docs via a follow-up Claude call.

## Commands

### Backend (FastAPI)
```bash
# From repo root — manual run
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev       # dev server at localhost:5173
npm run build     # production build
npm run preview   # preview production build
```

### Full stack with Docker
```bash
docker compose up --build     # both services, frontend:5173 backend:8000
docker compose logs -f backend
```

### Deploy to EC2
```bash
# Update EC2_HOST and EC2_KEY in infra/deploy.sh first
chmod +x infra/deploy.sh && ./infra/deploy.sh
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in all six keys:

| Key | Source |
|-----|--------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `APIFY_API_TOKEN` | console.apify.com |
| `BOX_CLIENT_ID` | developer.box.com → My Apps → Configuration |
| `BOX_CLIENT_SECRET` | same |
| `BOX_DEVELOPER_TOKEN` | same (expires every 60 min) |
| `BOX_ROOT_FOLDER_ID` | `"0"` for root, or a specific folder ID |

Settings are loaded via `pydantic-settings` in `backend/utils/config.py` — a missing key raises at startup. `extra = 'ignore'` is set so extra keys in `.env` (e.g. `BOX_USER_ID`) don't cause a `ValidationError`.

## Architecture

```
Frontend (React)
  └── App.jsx — 3 phases: input → running → complete
        ├── InputForm      — collects startup details
        ├── AgentProgress  — streams SSE log lines
        ├── DealRoom       — shows Box folder + doc previews
        └── ChatPanel      — sends follow-up questions to /api/chat

Backend (FastAPI)
  ├── POST /api/generate → SSE stream — runs LangGraph agent
  └── POST /api/chat     → single-turn Claude call with docs as context

LangGraph Agent (4 linear nodes, no branching)
  research_node  → run_research() fires 4 Apify scrapers in parallel
  analyze_node   → Claude 3.5 Sonnet returns structured JSON analysis
  generate_node  → 6 sequential Claude calls, one per investor doc
  upload_node    → box_tool creates folder + uploads all 6 .md files
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so the frontend always calls relative `/api/...` paths.

## Key Files

| File | Role |
|------|------|
| `backend/agents/fundready_agent.py` | Entire LangGraph graph — nodes, edges, streaming runner |
| `backend/models/state.py` | `AgentState` Pydantic model shared across all nodes |
| `backend/tools/apify_tool.py` | Apify scraper — Google Search + ProductHunt + funding news |
| `backend/tools/box_tool.py` | Box SDK — folder creation + markdown file uploads |
| `backend/api/main.py` | FastAPI app — SSE streaming endpoint + chat endpoint |
| `frontend/src/App.jsx` | State machine for 3-phase UI; SSE reader |

## LangGraph State Flow

`AgentState` is a Pydantic model (not a TypedDict). All nodes receive and return the full state object. Logs accumulate in `state.log` — the SSE runner diffs `log` length between node outputs to emit incremental messages to the browser.

**LangGraph 0.1.5 chunk format**: `agent.astream()` yields `{node_name: node_state}` dicts where `node_state` is a plain `dict`, not an `AgentState` object. The streaming runner in `fundready_agent.py` handles both dict and object access via a local `get()` helper.

## SSE Buffering

The `complete` event contains all 6 markdown docs (~50-100 KB) and can span multiple TCP read chunks. `App.jsx` uses a `buffer` string to accumulate partial data across `reader.read()` calls before splitting on newlines — without this, the large `complete` event is silently dropped and the UI never transitions to the DealRoom view.

## Box Token Gotcha

`BOX_DEVELOPER_TOKEN` expires after 60 minutes. Refresh it at developer.box.com whenever Box uploads fail with 401 errors. The `.env` may also contain `BOX_USER_ID` — this is ignored by `config.py` (`extra = 'ignore'`) and not used by `box_tool.py`.

## SSE on EC2

Nginx must have `proxy_buffering off` (already in `infra/nginx.conf`) and FastAPI responses include `X-Accel-Buffering: no` for SSE to stream through the proxy.
