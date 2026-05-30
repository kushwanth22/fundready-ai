#!/bin/bash
# FundReady AI — Quick Start

echo "🚀 Setting up FundReady AI..."

# Backend
echo "\n📦 Installing Python dependencies..."
cd backend
pip install -r requirements.txt

echo "\n⚙️  Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env — fill in your API keys before running!"
fi

# Frontend
echo "\n📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "\n✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your API keys"
echo "  2. Terminal 1: cd backend && uvicorn api.main:app --reload"
echo "  3. Terminal 2: cd frontend && npm run dev"
echo "  4. Open http://localhost:5173"
