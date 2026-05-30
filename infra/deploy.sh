#!/bin/bash
# ─────────────────────────────────────────────────────────────
# FundReady AI — Deploy Script
# Run this from your LOCAL machine to redeploy to EC2
#
# Usage:
#   chmod +x infra/deploy.sh
#   ./infra/deploy.sh
#
# Prerequisites:
#   - EC2_HOST and EC2_KEY set below
#   - ec2-setup.sh already run on EC2
# ─────────────────────────────────────────────────────────────

set -e

# ── Config — update these ─────────────────────────────────────
EC2_HOST="ubuntu@3.85.104.239"
EC2_KEY="~/.ssh/fundready-key.pem"
REMOTE_DIR="/home/ubuntu/fundready-ai"
# ─────────────────────────────────────────────────────────────

echo "🚀 Deploying FundReady AI to EC2..."
echo "   Host: $EC2_HOST"

# ── Push latest code ──────────────────────────────────────────
echo "📤 Pushing latest code..."
ssh -i "$EC2_KEY" "$EC2_HOST" "
  cd $REMOTE_DIR
  git pull origin main
"

# ── Rebuild and restart Docker ────────────────────────────────
echo "🐳 Rebuilding Docker containers..."
ssh -i "$EC2_KEY" "$EC2_HOST" "
  cd $REMOTE_DIR
  docker compose down
  docker compose up -d --build
  docker compose logs --tail=20 backend
"

# ── Reload Nginx ──────────────────────────────────────────────
echo "🔄 Reloading Nginx..."
ssh -i "$EC2_KEY" "$EC2_HOST" "sudo systemctl reload nginx"

echo ""
echo "✅ Deploy complete!"
echo "   Backend: http://$(ssh -i $EC2_KEY $EC2_HOST 'curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo YOUR_EC2_IP')/health"
