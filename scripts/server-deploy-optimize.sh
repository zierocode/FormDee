#!/bin/bash

# Production Server Deployment Optimization Script
# This script helps optimize the server before running deploy.sh

echo "🚀 Production Server Deployment Optimization"
echo "==========================================="

# Check available memory
echo "📊 System Memory Status:"
free -h 2>/dev/null || vm_stat 2>/dev/null || echo "Memory check not available"
echo ""

# Clear system caches (if running as root/sudo)
if [ "$EUID" -eq 0 ]; then 
    echo "🧹 Clearing system caches..."
    sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "Cache clear not available"
fi

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Clear yarn cache if yarn is used
if command -v yarn &> /dev/null; then
    echo "🧹 Clearing yarn cache..."
    yarn cache clean
fi

# Set swap if needed (requires root)
if [ "$EUID" -eq 0 ]; then 
    SWAP_SIZE=$(swapon --show 2>/dev/null | tail -n 1 | awk '{print $3}')
    if [ -z "$SWAP_SIZE" ] || [ "$SWAP_SIZE" = "0" ]; then
        echo "⚠️  No swap detected. Creating swap file..."
        fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1G count=4
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
        echo "✅ 4GB swap file created"
    else
        echo "✅ Swap already configured: $SWAP_SIZE"
    fi
fi

# Set system limits for Node.js
echo "⚙️  Setting system limits..."
ulimit -n 4096  # Increase file descriptor limit
ulimit -s 16384 # Increase stack size

# Export optimized Node.js settings
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
export NODE_ENV=production

echo ""
echo "✅ Server optimization complete!"
echo "📝 Recommended: Run the deployment as follows:"
echo "   cd ~/FormDee && ./deploy.sh"
echo ""
echo "💡 Tips for low-memory servers:"
echo "   - Ensure at least 2GB RAM + 2GB swap"
echo "   - Stop unnecessary services before build"
echo "   - Consider using --production flag for npm ci"
echo "   - Monitor with: watch -n 1 free -h"