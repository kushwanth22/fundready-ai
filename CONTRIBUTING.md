# Contributing to FundReady AI

Thanks for your interest in contributing! This doc covers how to get set up locally, what to know before touching the agent internals, and how to submit a PR.

---

## 1. Getting set up

Full local setup (Docker, `.env`, all required API keys, and the `BOX_DEVELOPER_TOKEN` 60-minute expiry gotcha) is already documented in the **[README — "Option A: Run Locally"](README.md#option-a--run-locally-recommended-for-dev)** section. Follow that rather than a copy here, so there's a single source of truth that stays up to date.

Quick pointers:
- You'll need API keys for **Anthropic**, **Apify**, and **Box** — see the README's "API Keys You Need" table.
- `backend/.env.example` → copy to `backend/.env` and fill in the values.
- Backend: `uvicorn api.main:app --reload --port 8000` (from `backend/`)
- Frontend: `npm install && npm run dev` (from `frontend/`)

## 2. Understand the architecture before touching the agent

If your change touches the **LangGraph agent**, the **SSE streaming** between backend and frontend, or the **Box integration**, read **[ARCHITECTURE.md](ARCHITECTURE.md)** first. It documents non-obvious behavior you're likely to trip over otherwise, including:

- Why `DeveloperTokenAuth` overrides Box's OAuth2 `_refresh()` (without this, expired-token handling breaks in a confusing way).
- The SSE reader's chunk-buffering requirement in `App.jsx` — the `complete` event is 50–100KB and can span multiple TCP reads; drop the buffering and it silently disappears.
- How `agent.astream()` yields plain dict chunks (not `AgentState` objects) and why the streaming runner has to handle both.

Skipping this is the fastest way to reintroduce a bug that was already fixed once.

## 3. Testing your changes (there's no CI yet)

Being upfront: this repo currently has **no `.github/` workflows, no CI pipeline, and no automated test suite** (no `pytest` in `backend/requirements.txt`, no `test`/`lint` script in `frontend/package.json`). Until that changes, please verify manually before opening a PR:

- [ ] Backend boots and `GET /health` returns `{"status":"ok"}`
- [ ] Frontend builds cleanly: `cd frontend && npm run build`
- [ ] Smoke test the full flow: submit a startup idea through the UI and confirm the SSE log stream runs through to a completed deal room (or, if your change is backend-only, hit `POST /api/generate` directly and confirm the stream completes)
- [ ] If you changed Box or Apify integration code, note in your PR description that you tested against live API keys (or explain why you couldn't)

**Adding test coverage (pytest for the backend, or a frontend test runner) is very welcome** — if you want to take this on, open an issue first so it can be scoped, since it'll touch shared tooling.

## 4. Submitting a pull request

This is a new convention going forward (there isn't prior branch/PR history to follow, since changes so far have been direct pushes) — nothing fancy, just keep it consistent:

**Branch naming:**
- `fix/short-description` — bug fixes
- `feat/short-description` — new features
- `docs/short-description` — documentation only
- `chore/short-description` — tooling, deps, cleanup

**PR description should include:**
- **What** changed
- **Why** (link the issue, e.g. `Closes #5`)
- **How you tested it** (see the manual checklist above)

**Commits:** clear, present-tense messages (e.g. `Fix Box token refresh on 401`) — squash-friendly is fine, no strict format enforced.

Keep PRs focused on one thing where possible — easier to review, easier to revert if something breaks.

---

## Looking ahead

A couple of things came up while writing this doc that are intentionally **not** included here, and are better suited to their own issues instead of being bundled in:

- A `PULL_REQUEST_TEMPLATE.md` to make the "what/why/how tested" structure above automatic.
- A minimal CI workflow (even just `npm run build` + a Python import/lint check) to catch broken builds before merge.

If you'd like to pick either of those up, feel free to open an issue to discuss scope first.
