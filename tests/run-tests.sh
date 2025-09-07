#!/bin/bash

# Form Submission Test Runner Script
# This script ensures the dev server is running and executes the tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Form Submission Test Runner"
echo "=============================="

# Check if dev server is running
check_server() {
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304"; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup background processes
cleanup() {
    if [ ! -z "$DEV_SERVER_PID" ]; then
        echo -e "\n${YELLOW}Stopping dev server (PID: $DEV_SERVER_PID)...${NC}"
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
    fi
}

# Set up trap to ensure cleanup on exit
trap cleanup EXIT

DEV_SERVER_PID=""

# Check if server is already running
if check_server; then
    echo -e "${GREEN}✓ Dev server is already running${NC}"
else
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    echo "Waiting for server to be ready..."
    for i in {1..30}; do
        if check_server; then
            echo -e "${GREEN}✓ Dev server is ready${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ Failed to start dev server${NC}"
            exit 1
        fi
    done
fi

echo ""
echo "Running tests..."
echo "=============================="

# Run the tests
node tests/form-submission.test.js

TEST_EXIT_CODE=$?

# Generate HTML report if tests completed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed. Check the results above.${NC}"
fi

echo ""
echo "Test reports are available in:"
echo "  - tests/results/ (JSON format)"
echo "  - tests/screenshots/ (if any failures)"

exit $TEST_EXIT_CODE