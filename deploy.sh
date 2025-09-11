#!/bin/bash
set -e  

PROJECT_DIR=~/FormDee
BRANCH=main
PM2_APP=formdee

# Ubuntu server optimizations
echo "🐧 Ubuntu Server Deployment Script"
echo "=================================="

# Check system info
echo "📊 System Info:"
lsb_release -a 2>/dev/null | grep Description || echo "Ubuntu Server"
free -h | grep Mem
echo ""

# Set Node.js memory limit to prevent heap out of memory errors
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📂 Switching to project directory..."
cd $PROJECT_DIR || { echo "❌ Cannot cd to $PROJECT_DIR"; exit 1; }

echo "🧹 Clearing build caches..."
rm -rf .next
rm -f tsconfig.tsbuildinfo
# Also clear Node.js cache to free up memory
rm -rf node_modules/.cache
# Clear npm cache to avoid deprecated package warnings
npm cache clean --force 2>/dev/null || true

echo "📥 Pulling latest code from Git ($BRANCH)..."
git fetch origin
git reset --hard origin/$BRANCH

echo "📦 Installing dependencies..."
npm ci

echo "🏗 Building production build (with increased memory limit)..."
echo "   Memory limit set to: 4096MB"
npm run build:production

echo "🧹 Optimizing for production runtime..."
npm prune --omit=dev

echo "🔄 Reloading PM2 app: $PM2_APP..."
# Create logs directory if it doesn't exist
mkdir -p logs

# Use ecosystem config for better PM2 management
if [ -f ecosystem.config.js ]; then
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
else
  # Fallback to direct command if ecosystem config doesn't exist
  pm2 reload $PM2_APP || pm2 start npm --name "$PM2_APP" --node-args="--max-old-space-size=2048" -- run start
fi

# Save PM2 process list and enable startup on reboot
pm2 save
pm2 startup || true

echo "✅ Deployment complete!"