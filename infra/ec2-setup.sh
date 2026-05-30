#!/bin/bash
# ─────────────────────────────────────────────────────────────
# FundReady AI — EC2 Bootstrap Script
# Run this ONCE after SSH-ing into a fresh Ubuntu 22.04 EC2
#
# Usage:
#   chmod +x ec2-setup.sh
#   ./ec2-setup.sh
# ─────────────────────────────────────────────────────────────

set -e
echo "🚀 FundReady AI — EC2 Setup Starting..."

# ── 1. System update ──────────────────────────────────────────
echo "📦 Updating system..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Install Docker ─────────────────────────────────────────
echo "🐳 Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER

# ── 3. Install Nginx ──────────────────────────────────────────
echo "🌐 Installing Nginx..."
sudo apt-get install -y nginx

# ── 4. Install Git ────────────────────────────────────────────
echo "📁 Installing Git..."
sudo apt-get install -y git

# ── 5. Clone repo ─────────────────────────────────────────────
echo "📥 Cloning FundReady AI..."
cd /home/ubuntu
# Replace with your actual GitHub repo URL
git clone https://github.com/YOUR_USERNAME/fundready-ai.git
cd fundready-ai

# ── 6. Create .env ────────────────────────────────────────────
echo "⚙️  Creating .env file..."
cp backend/.env.example backend/.env
echo ""
echo "⚠️  IMPORTANT: Edit your .env file now!"
echo "    nano backend/.env"
echo ""
echo "    Set these values:"
echo "    ANTHROPIC_API_KEY=sk-ant-..."
echo "    APIFY_API_TOKEN=apify_api_..."
echo "    BOX_CLIENT_ID=..."
echo "    BOX_CLIENT_SECRET=..."
echo "    BOX_DEVELOPER_TOKEN=..."
echo ""

# ── 7. Copy Nginx config ──────────────────────────────────────
echo "🔧 Configuring Nginx..."
sudo cp infra/nginx.conf /etc/nginx/sites-available/fundready
sudo ln -sf /etc/nginx/sites-available/fundready \
            /etc/nginx/sites-enabled/fundready
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx

# ── 8. Done ───────────────────────────────────────────────────
echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env:     nano backend/.env"
echo "  2. Start app:     docker compose up -d --build"
echo "  3. Check logs:    docker compose logs -f backend"
echo "  4. Visit:         http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
