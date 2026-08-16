# FundReady AI 🚀

> Turn a napkin idea into an investor-ready deal room in under 5 minutes.
> Built for Cascadia JS Hackathon — powered by Apify + Box + AWS.

---

## What it does

1. You type your startup idea
2. **Apify** scrapes live competitors, funding news, ProductHunt data
3. **Claude AI** (LangGraph agent) analyzes and writes 6 investor documents
4. **Box** saves everything as an organized deal room folder
5. Chat with your documents to refine and iterate

**Output deal room:**
```
Box /FundReady-{startup}/
  ├── 01_market_research.md
  ├── 02_competitor_analysis.md
  ├── 03_tam_sam_som.md
  ├── 04_icp_profile.md
  ├── 05_one_pager.md
  └── 06_investor_email_templates.md
```

---

## Tech Stack

| Layer | Local | AWS |
|-------|-------|-----|
| Frontend | React + Vite (localhost:5173) | EC2 + Nginx (static build) |
| Backend | FastAPI + uvicorn (localhost:8000) | EC2 t2.micro + Docker + Nginx |
| Agent | LangGraph + Claude Sonnet 4.6 | Same |
| Scraping | Apify API | Apify API |
| Storage | Box SDK | Box SDK |

---

## Folder Structure

```
fundready-ai/
├── backend/
│   ├── agents/fundready_agent.py     ← LangGraph 4-node agent
│   ├── tools/
│   │   ├── apify_tool.py             ← Apify web scraper
│   │   └── box_tool.py               ← Box deal room uploader
│   ├── api/main.py                   ← FastAPI + SSE endpoints
│   ├── models/state.py               ← Pydantic AgentState
│   ├── utils/config.py               ← .env loader
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InputForm.jsx         ← Startup idea form
│   │   │   ├── AgentProgress.jsx     ← Live log stream UI
│   │   │   ├── DealRoom.jsx          ← Box folder + doc preview
│   │   │   └── ChatPanel.jsx         ← Follow-up chat
│   │   └── App.jsx
│   ├── amplify.yml
│   └── package.json
│
├── infra/
│   ├── ec2-setup.sh                  ← Run once on fresh EC2
│   ├── nginx.conf                    ← Nginx: serves frontend + proxies /api/
│   └── deploy.sh                     ← Redeploy from local machine
│
├── amplify.yml                       ← Root-level Amplify monorepo config
└── docker-compose.yml
```

---

## API Keys You Need

| Service | Where to get | Notes |
|---------|-------------|-------|
| Anthropic | console.anthropic.com | `ANTHROPIC_MODEL=claude-sonnet-4-6` |
| Apify | console.apify.com | $5/month free tier |
| Box | developer.box.com → My Apps → Configuration | Developer Token expires every 60 min — see below |

### ⚠️ BOX_DEVELOPER_TOKEN expiry

Box developer tokens expire after **60 minutes**. When you see a `401` error from Box:

1. Go to **developer.box.com → your app → Configuration → Developer Token → Generate**
2. Copy the new token
3. **Local dev**: update `backend/.env`, restart the backend
4. **EC2**: SSH in, edit `.env`, then run:
   ```bash
   sudo docker compose up -d --force-recreate backend
   ```
   > `docker compose restart` does NOT reload `.env` — you must use `--force-recreate`

---

## Option A — Run Locally (recommended for dev)

### 1. Clone
```bash
git clone https://github.com/kushwanth22/fundready-ai.git
cd fundready-ai
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
APIFY_API_TOKEN=apify_api_...
BOX_CLIENT_ID=your_box_client_id
BOX_CLIENT_SECRET=your_box_client_secret
BOX_DEVELOPER_TOKEN=your_box_developer_token   # expires every 60 min
BOX_ROOT_FOLDER_ID=0
```

### 3. Run (two terminals)
```bash
# Terminal 1 — Backend (from repo root)
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

> Vite proxies `/api/*` to `http://localhost:8000` — no CORS config needed.

---

## Option B — Deploy to AWS EC2

### Prerequisites
- EC2 instance launched (Ubuntu 22.04, t2.micro, ports 22/80/8000 open)
- `.pem` key downloaded
- Code pushed to GitHub

### Step 1 — Bootstrap EC2 (run once)
```bash
chmod 400 ~/.ssh/fundready-key.pem
scp -i ~/.ssh/fundready-key.pem infra/ec2-setup.sh ubuntu@YOUR_EC2_IP:~
ssh -i ~/.ssh/fundready-key.pem ubuntu@YOUR_EC2_IP
chmod +x ec2-setup.sh && ./ec2-setup.sh
```

After setup, **log out and SSH back in** so the docker group takes effect.

### Step 2 — Configure .env on EC2
```bash
nano /home/ubuntu/fundready-ai/backend/.env
# Paste all 7 keys, save with Ctrl+O → Enter → Ctrl+X
```

### Step 3 — Build frontend + start containers
```bash
cd ~/fundready-ai

# Build React frontend (uses Docker node image — ~2 min first time)
cd frontend
sudo docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c 'npm install && npm run build'
cd ..

# Fix permissions so nginx can read the build
sudo chmod -R o+rX frontend/dist
sudo chmod o+x /home/ubuntu

# Apply nginx config
sudo cp infra/nginx.conf /etc/nginx/sites-available/fundready
sudo nginx -t && sudo systemctl reload nginx

# Start backend
sudo docker compose up -d --build
```

### Step 4 — Verify
```bash
curl http://localhost:8000/health    # {"status":"ok"}
curl http://YOUR_EC2_IP/health       # {"status":"ok"} through Nginx
```

Open **http://YOUR_EC2_IP/** — full app loads, form → logs → deal room.

### Redeploy after code changes
```bash
# From your LOCAL machine (infra/deploy.sh already configured):
./infra/deploy.sh
```

### Refresh Box token on EC2
```bash
ssh -i ~/.ssh/fundready-key.pem ubuntu@YOUR_EC2_IP
nano /home/ubuntu/fundready-ai/backend/.env   # update BOX_DEVELOPER_TOKEN
cd ~/fundready-ai
sudo docker compose up -d --force-recreate backend   # must use --force-recreate, not restart
```

---

## Architecture

```
User (browser)
     │
     ▼
EC2 t2.micro — Nginx :80
  ├── /          → frontend/dist (React static build)
  ├── /api/*     → FastAPI :8000 (SSE stream)
  └── /health    → FastAPI :8000
        └── LangGraph Agent (4 nodes)
              ├── research_node  → Apify scrape (2-4 min)
              ├── analyze_node   → Claude analyze
              ├── generate_node  → Claude write 6 docs
              └── upload_node    → Box deal room
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/generate` | Start agent, returns SSE stream |
| POST | `/api/chat` | Chat against generated docs |

### POST /api/generate
```json
{
  "name": "DataFlow AI",
  "description": "AI-powered document automation for legal teams",
  "stage": "pre-seed",
  "industry": "Legal Tech",
  "target_market": "Mid-market law firms"
}
```

SSE stream response:
```
data: {"type": "log", "message": "🔍 Scraping live data with Apify..."}
data: {"type": "log", "message": "✅ Research complete — 8 competitors found"}
data: {"type": "complete", "deal_room": {...}, "docs": {...}}
```

---

## Troubleshooting

**Box upload fails with 401**
```
Developer token expired (60 min limit).
Get fresh token at developer.box.com → app → Configuration → Generate.
On EC2: sudo docker compose up -d --force-recreate backend
```

**EC2 frontend shows 500**
```bash
# nginx can't read files built by sudo docker run
sudo chmod -R o+rX frontend/dist
sudo chmod o+x /home/ubuntu
sudo systemctl reload nginx
```

**Backend won't start on EC2**
```bash
sudo docker compose logs backend
# Check /home/ubuntu/fundready-ai/backend/.env has all 7 keys
```

**Apify scraping returns empty**
```
Verify token at console.apify.com — check free tier quota ($5/month)
```

**SSE not streaming through Nginx**
```bash
# nginx.conf must have proxy_buffering off (already set)
sudo nginx -t && sudo systemctl reload nginx
```

---

## Demo Script (5-7 min — Apify research takes 2-4 min)

1. Open **http://YOUR_EC2_IP/**
2. Type: **"AI document automation for legal teams"**
3. Show live log streaming: Research → Analyze → Generate → Upload
4. Show Box deal room folder with 6 documents
5. Click through each document
6. Ask chat: *"What investors should I pitch first?"*
7. Show shareable Box folder URL

> **Before the demo**: refresh your BOX_DEVELOPER_TOKEN — it expires after 60 min.

---

## Built With ❤️ at Cascadia JS Hackathon

- **Apify** — live web scraping
- **Box** — secure deal room storage
- **AWS** — EC2 + Nginx
- **LangGraph** — agentic orchestration
- **Anthropic Claude Sonnet 4.6** — AI reasoning
