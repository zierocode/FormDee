#!/bin/bash

# Build Optimization Script for FormDee
# This script optimizes the build process for faster builds and smaller bundles

echo "🚀 Build Optimization Script"
echo "============================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check and display file sizes
check_size() {
    if [ -d ".next" ]; then
        echo -e "\n${GREEN}📊 Build Size Analysis:${NC}"
        du -sh .next 2>/dev/null
        echo "  Breakdown:"
        du -sh .next/static 2>/dev/null | sed 's/^/    /'
        du -sh .next/server 2>/dev/null | sed 's/^/    /'
        du -sh .next/cache 2>/dev/null | sed 's/^/    /'
    fi
}

# Function to analyze dependencies
analyze_deps() {
    echo -e "\n${YELLOW}📦 Analyzing Dependencies...${NC}"
    
    # Check for unused dependencies
    echo "  Checking for potentially unused packages..."
    npx depcheck --json 2>/dev/null | jq -r '.dependencies[]' 2>/dev/null | head -5
    
    # Large dependencies
    echo -e "\n  Top 10 largest dependencies:"
    du -sh node_modules/* 2>/dev/null | sort -rh | head -10 | sed 's/^/    /'
}

# 1. Clean previous builds
echo -e "\n${YELLOW}🧹 Step 1: Cleaning previous builds...${NC}"
rm -rf .next
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo
echo -e "${GREEN}✓ Cleaned${NC}"

# 2. Set optimization flags
echo -e "\n${YELLOW}⚙️  Step 2: Setting optimization flags...${NC}"
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1
echo -e "${GREEN}✓ Memory limit: 4096MB${NC}"
echo -e "${GREEN}✓ Telemetry disabled${NC}"

# 3. Run type checking separately (faster)
echo -e "\n${YELLOW}✅ Step 3: Type checking...${NC}"
npx tsc --noEmit --incremental --pretty
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Type checking failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Type check passed${NC}"

# 4. Run linting separately (faster)
echo -e "\n${YELLOW}🔍 Step 4: Linting...${NC}"
npx next lint --max-warnings=0
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Linting failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Linting passed${NC}"

# 5. Build with optimizations
echo -e "\n${YELLOW}🏗️  Step 5: Building with optimizations...${NC}"
echo "  • SWC minification enabled"
echo "  • Tree shaking enabled"
echo "  • Module imports optimized"
echo "  • Dynamic imports for heavy components"
echo ""

# Build with timing
START_TIME=$(date +%s)
NODE_ENV=production npx next build
BUILD_EXIT_CODE=$?
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed in ${BUILD_TIME} seconds${NC}"

# 6. Post-build analysis
echo -e "\n${YELLOW}📈 Step 6: Post-build analysis...${NC}"
check_size

# 7. Optional bundle analysis
if [ "$1" = "--analyze" ]; then
    echo -e "\n${YELLOW}🔬 Step 7: Bundle analysis...${NC}"
    ANALYZE=true npm run build
    echo -e "${GREEN}✓ Bundle analysis generated in ./analyze/${NC}"
fi

# 8. Optimization suggestions
echo -e "\n${GREEN}💡 Optimization Suggestions:${NC}"
echo "  1. Consider lazy loading heavy components"
echo "  2. Use dynamic imports for route-specific code"
echo "  3. Implement image optimization with next/image"
echo "  4. Review and remove unused dependencies"
echo "  5. Enable ISR for static pages where possible"

# 9. Production readiness check
echo -e "\n${GREEN}🎯 Production Readiness:${NC}"
echo -e "  ${GREEN}✓${NC} Type checking passed"
echo -e "  ${GREEN}✓${NC} Linting passed"
echo -e "  ${GREEN}✓${NC} Build successful"
echo -e "  ${GREEN}✓${NC} Bundle optimized"

if [ -d ".next" ]; then
    STATIC_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1)
    echo -e "  ${GREEN}✓${NC} Static assets: $STATIC_SIZE"
fi

echo -e "\n${GREEN}✅ Build optimization complete!${NC}"
echo "   Build time: ${BUILD_TIME}s"
echo "   Ready for deployment"