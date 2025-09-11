#!/bin/bash

# Monitor deployment memory usage
echo "📊 Monitoring Deployment Memory Usage"
echo "====================================="
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to get memory usage
get_memory_info() {
    if command -v free &> /dev/null; then
        # Linux
        free -h | grep "Mem:" | awk '{print "Memory: " $3 " / " $2 " (Used/Total)"}'
        free -h | grep "Swap:" | awk '{print "Swap:   " $3 " / " $2 " (Used/Total)"}'
    elif command -v vm_stat &> /dev/null; then
        # macOS
        vm_stat | grep "Pages free" | awk '{print "Free pages: " $3}'
        vm_stat | grep "Pages active" | awk '{print "Active pages: " $3}'
    else
        echo "Memory monitoring not available on this system"
    fi
}

# Function to get Node.js processes
get_node_processes() {
    echo "Node.js Processes:"
    ps aux | grep -E "node|npm" | grep -v grep | awk '{printf "  PID: %s, CPU: %s%%, MEM: %s%%, CMD: %s\n", $2, $3, $4, $11}'
}

# Monitor loop
while true; do
    clear
    echo "📊 Deployment Memory Monitor - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================"
    echo ""
    
    get_memory_info
    echo ""
    
    get_node_processes
    echo ""
    
    # Check if build is running
    if pgrep -f "next build" > /dev/null; then
        echo "🏗️  BUILD IN PROGRESS..."
    elif pgrep -f "pm2" > /dev/null; then
        echo "✅ Application running with PM2"
    fi
    
    echo ""
    echo "Press Ctrl+C to exit"
    
    sleep 2
done