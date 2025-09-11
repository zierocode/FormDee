#!/bin/bash

# FormDee Project Cleanup Script
# This script helps clean up and optimize the project

echo "🧹 FormDee Project Cleanup Tool"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track space saved
INITIAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)

# Function to confirm action
confirm() {
    read -p "$1 [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Function to safe delete
safe_delete() {
    if [ -e "$1" ]; then
        SIZE=$(du -sh "$1" 2>/dev/null | cut -f1)
        rm -rf "$1"
        echo -e "  ${GREEN}✓${NC} Removed $1 (freed $SIZE)"
    fi
}

echo -e "\n${YELLOW}1. Cleaning Test Artifacts${NC}"
echo "   Found:"
[ -d "test-results" ] && echo "   - test-results ($(du -sh test-results 2>/dev/null | cut -f1))"
[ -d "playwright-report" ] && echo "   - playwright-report ($(du -sh playwright-report 2>/dev/null | cut -f1))"
[ -f "debug-no-settings-button.png" ] && echo "   - debug screenshots"

if confirm "   Remove test artifacts?"; then
    safe_delete "test-results"
    safe_delete "playwright-report"
    safe_delete "debug-*.png"
    safe_delete "playwright/.cache"
    safe_delete "test-*.json"
    safe_delete "test-*.html"
fi

echo -e "\n${YELLOW}2. Cleaning Build Artifacts${NC}"
echo "   Found:"
[ -d ".next" ] && echo "   - .next build cache ($(du -sh .next 2>/dev/null | cut -f1))"
[ -f "tsconfig.tsbuildinfo" ] && echo "   - tsconfig.tsbuildinfo ($(du -sh tsconfig.tsbuildinfo 2>/dev/null | cut -f1))"

if confirm "   Remove build artifacts?"; then
    safe_delete ".next"
    safe_delete "tsconfig.tsbuildinfo"
    safe_delete "out"
    safe_delete "dist"
fi

echo -e "\n${YELLOW}3. Cleaning Log Files${NC}"
echo "   Searching for log files..."
find . -name "*.log" -type f 2>/dev/null | grep -v node_modules | head -10

if confirm "   Remove log files?"; then
    find . -name "*.log" -type f -not -path "./node_modules/*" -delete
    safe_delete "logs"
    echo -e "  ${GREEN}✓${NC} Removed log files"
fi

echo -e "\n${YELLOW}4. Cleaning Node Modules Cache${NC}"
[ -d "node_modules/.cache" ] && echo "   - node_modules/.cache ($(du -sh node_modules/.cache 2>/dev/null | cut -f1))"

if confirm "   Clear node_modules cache?"; then
    safe_delete "node_modules/.cache"
fi

echo -e "\n${YELLOW}5. Removing Unused Dependencies${NC}"
echo "   Analyzing dependencies..."
UNUSED_DEPS=$(npx depcheck --json 2>/dev/null | jq -r '.dependencies[]' 2>/dev/null)

if [ -n "$UNUSED_DEPS" ]; then
    echo "   Potentially unused dependencies:"
    echo "$UNUSED_DEPS" | sed 's/^/   - /'
    
    if confirm "   Review and remove unused dependencies?"; then
        echo -e "\n  ${BLUE}These appear unused but verify before removing:${NC}"
        echo "  - @aws-sdk/s3-request-presigner (used for R2 presigned URLs)"
        echo "  - @googleapis/drive (used for Google Drive integration)"
        echo "  - @tanstack/react-table (check if used in responses table)"
        echo "  - lucide-react (icon library - check usage)"
        echo "  - react-hot-toast (notifications - verify usage)"
        echo "  - react-intersection-observer (check if used)"
        echo -e "\n  ${YELLOW}To remove: npm uninstall <package-name>${NC}"
    fi
else
    echo -e "  ${GREEN}✓${NC} No obviously unused dependencies found"
fi

echo -e "\n${YELLOW}6. Optimizing Images${NC}"
echo "   Checking public directory..."
IMAGE_COUNT=$(find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
echo "   Found $IMAGE_COUNT images in public/"

if [ $IMAGE_COUNT -gt 0 ] && confirm "   Optimize images with Next.js image component?"; then
    echo -e "  ${BLUE}Recommendation:${NC}"
    echo "  - Convert large PNGs to WebP format"
    echo "  - Use next/image component for automatic optimization"
    echo "  - Consider using image CDN for user uploads"
fi

echo -e "\n${YELLOW}7. Cleaning Package Lock${NC}"
if confirm "   Refresh package-lock.json (requires reinstall)?"; then
    safe_delete "package-lock.json"
    safe_delete "node_modules"
    echo -e "  ${YELLOW}Running npm install...${NC}"
    npm install
    echo -e "  ${GREEN}✓${NC} Refreshed dependencies"
fi

echo -e "\n${YELLOW}8. Git Cleanup${NC}"
GIT_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
echo "   Git repository size: $GIT_SIZE"

if confirm "   Run git garbage collection?"; then
    git gc --aggressive --prune=now
    git repack -a -d --depth=250 --window=250
    NEW_GIT_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
    echo -e "  ${GREEN}✓${NC} Git optimized (was $GIT_SIZE, now $NEW_GIT_SIZE)"
fi

echo -e "\n${YELLOW}9. Docker Cleanup (if applicable)${NC}"
if command -v docker &> /dev/null; then
    if confirm "   Clean Docker artifacts?"; then
        docker system prune -f
        echo -e "  ${GREEN}✓${NC} Docker cleaned"
    fi
fi

echo -e "\n${YELLOW}10. Create .gitignore entries${NC}"
echo "   Adding cleanup entries to .gitignore..."
cat >> .gitignore << 'EOF'

# Test artifacts
test-results/
playwright-report/
playwright/.cache
test-*.json
test-*.html
debug-*.png
*.log

# Build artifacts
.next/
out/
dist/
tsconfig.tsbuildinfo

# IDE
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage
coverage/
.nyc_output/
EOF

echo -e "  ${GREEN}✓${NC} Updated .gitignore"

# Final summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Cleanup Complete!${NC}"
FINAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
echo "   Initial size: $INITIAL_SIZE"
echo "   Final size:   $FINAL_SIZE"

echo -e "\n${BLUE}Additional Optimization Tips:${NC}"
echo "1. Use dynamic imports for heavy components:"
echo "   const HeavyComponent = dynamic(() => import('./HeavyComponent'))"
echo ""
echo "2. Implement code splitting for routes:"
echo "   Split large route components into smaller chunks"
echo ""
echo "3. Consider removing unused features:"
echo "   - Review if all integrations are needed"
echo "   - Remove demo/example code"
echo ""
echo "4. Optimize bundle size:"
echo "   npm run build:analyze"
echo ""
echo "5. Use production builds for deployment:"
echo "   NODE_ENV=production npm run build"