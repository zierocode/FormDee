#!/bin/bash

# 🚀 FormDee Quick Production Deploy
# Simple and reliable deployment script

set -e

echo "🚀 FormDee Quick Deployment"
echo "=========================="

# Clear caches first
echo "🧹 Clearing build caches..."
rm -rf .next
rm -f tsconfig.tsbuildinfo

# Run production build
echo "🔨 Building for production..."
npm run build:production

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Ready to deploy! Choose your method:"
    echo "1. Start local production server: npm start"
    echo "2. Deploy to Vercel: vercel --prod" 
    echo "3. Docker build: docker build -t formdee ."
    echo ""
    echo "🌟 Your FormDee app is ready for production!"
else
    echo "❌ Build failed!"
    exit 1
fi