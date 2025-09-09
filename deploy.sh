#!/bin/bash
set -e  

PROJECT_DIR=~/FormDee
BRANCH=main
PM2_APP=formdee

echo "📂 Switching to project directory..."
cd $PROJECT_DIR || { echo "❌ Cannot cd to $PROJECT_DIR"; exit 1; }

echo "🧹 Clearing build caches..."
rm -rf .next
rm -f tsconfig.tsbuildinfo

echo "📥 Pulling latest code from Git ($BRANCH)..."
git fetch origin
git reset --hard origin/$BRANCH

echo "📦 Installing dependencies..."
npm ci

echo "🏗 Building production build..."
npm run build:production

echo "🧹 Optimizing for production runtime..."
npm prune --production

echo "🔄 Reloading PM2 app: $PM2_APP..."
pm2 reload $PM2_APP || pm2 start npm --name "$PM2_APP" -- run start

echo "✅ Deployment complete!"