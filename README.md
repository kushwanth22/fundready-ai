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
| Frontend | React + Vite (localhost:5173) | AWS Amplify |
| Backend | FastAPI + uvicorn (localhost:8000) | EC2 t2.micro + Docker + Nginx |
| Agent | LangGraph + Claude Sonnet 4.6 | Same (+ optional Bedrock) |
| Scraping | Apify API | Apify API |
| Storage | Box SDK | Box SDK |
| Container | docker-compose | Docker on EC2 |

---

## Folder Structure

```
fundready-ai/
├── backend/
│   ├── agents/
│   │   └── fundready_agent.py     ← LangGraph 4-node agent
│   ├── tools/
│   │   ├── apify_tool.py          ← Apify web scraper
│   │   └── box_tool.py            ← Box deal room uploader
│   ├── api/
│   │   └── main.py                ← FastAPI + SSE endpoints
│   ├── models/
│   │   └── state.py               ← Pydantic AgentState
│   ├── utils/
│   │   └── config.py              ← .env loader
│   ├── Dockerfile                 ← Docker container for EC2
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InputForm.jsx      ← Startup idea form
│   │   │   ├── AgentProgress.jsx  ← Live log stream UI
│   │   │   ├── DealRoom.jsx       ← Box folder + doc preview
│   │   │   └── ChatPanel.jsx      ← Follow-up chat
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── amplify.yml                ← AWS Amplify build config
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── infra/
│   ├── ec2-setup.sh               ← Run once on fresh EC2
│   ├── nginx.conf                 ← Nginx reverse proxy
│   └── deploy.sh                  ← Redeploy from local machine
│
├── docker-compose.yml             ← Local full-stack testing
├── scripts/
│   └── setup.sh                   ← Local dev setup helper
└── README.md
```

---

## API Keys You Need

| Service | Where to get | Free tier |
|---------|-------------|-----------|
| Anthropic | console.anthropic.com | $5 free credits |
| Apify | console.apify.com | $5/month free |
| Box | developer.box.com → My Apps → Developer Token | Free |

---

## Option A — Run Locally

### 1. Clone and setup
```bash
git clone https://github.com/YOUR_USERNAME/fundready-ai.git
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
BOX_DEVELOPER_TOKEN=your_box_developer_token
BOX_ROOT_FOLDER_ID=0
```

### 3a. Run with Docker (recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

### 3b. Run manually (two terminals)
```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Option B — Deploy to AWS (Free Tier)

### Prerequisites
- AWS account with $100 credits (from hackathon)
- GitHub repo with this code pushed
- Your `.pem` key file from EC2

### Step 1 — Launch EC2 (earns $20 AWS credit)

1. Go to **AWS Console → EC2 → Launch Instance**
2. Settings:
   - Name: `fundready-backend`
   - AMI: **Ubuntu Server 22.04 LTS**
   - Instance type: **t2.micro** (free tier)
   - Key pair: Create new → download `.pem` file
   - Security group — add these inbound rules:
     - Port 22 (SSH) — My IP
     - Port 80 (HTTP) — Anywhere
     - Port 8000 (Custom) — Anywhere
   - Storage: 20 GB gp2
3. Click **Launch Instance**
4. Note your **Public IPv4 address**

### Step 2 — SSH into EC2 and run setup
```bash
# Make key secure
chmod 400 ~/.ssh/your-key.pem

# SSH in
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP

# Upload setup script (run from your LOCAL machine first)
scp -i ~/.ssh/your-key.pem infra/ec2-setup.sh ubuntu@YOUR_EC2_IP:~

# Back in EC2 — run setup (installs Docker, Nginx, Git)
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### Step 3 — Configure and start
```bash
# In EC2 — edit your .env with real API keys
nano /home/ubuntu/fundready-ai/backend/.env

# Start the app
cd /home/ubuntu/fundready-ai
docker compose up -d --build

# Verify it's running
docker compose logs -f backend
curl http://localhost:8000/health
```

### Step 4 — Deploy frontend to AWS Amplify

1. Go to **AWS Console → AWS Amplify → New App → Host Web App**
2. Connect **GitHub** → select `fundready-ai` repo → branch `main`
3. Amplify auto-detects `amplify.yml` — confirm and deploy
4. Under **Environment variables**, add:
   ```
   VITE_API_URL = http://YOUR_EC2_IP
   ```
5. Click **Save and deploy**
6. Your app is live at `https://xxxx.amplifyapp.com`

### Step 5 — Enable AWS Bedrock (earns $20 credit)
1. Go to **AWS Console → Amazon Bedrock → Model access**
2. Request access to **Claude 3.5 Sonnet**
3. In `backend/.env`, add:
   ```
   USE_BEDROCK=true
   AWS_REGION=us-east-1
   ```

### Step 6 — Set AWS Budget (earns $20 credit, 2 min)
1. Go to **AWS Console → Billing → Budgets → Create budget**
2. Choose **Zero spend budget**
3. Add your email for alerts
4. Done — you've now earned $60 of the $100 available credits

### Redeploy after code changes
```bash
# Update EC2_HOST and EC2_KEY in infra/deploy.sh first, then:
chmod +x infra/deploy.sh
./infra/deploy.sh
```

---

## Architecture

```
User (browser)
     │
     ▼
AWS Amplify (React UI)
     │  POST /api/generate  (SSE stream)
     ▼
EC2 t2.micro
  └── Nginx :80
        └── FastAPI :8000
              └── LangGraph Agent
                    ├── Node 1: research_node  → Apify scrape
                    ├── Node 2: analyze_node   → Claude analyze
                    ├── Node 3: generate_node  → Claude write docs
                    └── Node 4: upload_node    → Box deal room
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

**Backend won't start**
```bash
docker compose logs backend
# Check .env has all required keys
```

**Apify scraping returns empty**
```bash
# Verify token at console.apify.com
# Check free tier quota (5 USD/month)
```

**Box upload fails**
```bash
# Developer tokens expire after 60 min
# Get a fresh one at developer.box.com → your app → Configuration
```

**SSE not streaming on EC2**
```bash
# Verify nginx.conf has proxy_buffering off
sudo nginx -t
sudo systemctl reload nginx
```

---

## Demo Script (5-7 minutes total — Apify research takes 2-4 min)

1. Open the app URL
2. Type: **"AI document automation for legal teams"**
3. Show the live log streaming as agent runs
4. Show the Box deal room folder opening
5. Click through the 6 generated documents
6. Ask chat: *"What investors should I pitch first?"*
7. Show the Box folder URL (shareable with investors)

---

## Built With ❤️ at Cascadia JS Hackathon

- **Apify** — live web scraping
- **Box** — secure deal room storage
- **AWS** — EC2 + Amplify + Bedrock
- **LangGraph** — agentic orchestration
- **Anthropic Claude** — AI reasoning
