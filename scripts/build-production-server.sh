#!/bin/bash

# Production build script with memory optimization for servers
# This script helps build the application on servers with limited memory

echo "🚀 Starting production build with optimized memory settings..."

# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous builds
echo "🧹 Cleaning previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
fi

# Run linting
echo "🔍 Running ESLint checks..."
npm run lint

# Run type checking
echo "✅ Running TypeScript type checks..."
npm run typecheck

# Build the application
echo "🏗️ Building Next.js application..."
npm run build

# Verify build success
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📊 Build information:"
    ls -lh .next/
    echo ""
    echo "🎯 You can now start the production server with:"
    echo "   npm start"
    echo "   or"
    echo "   NODE_ENV=production npm start"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi