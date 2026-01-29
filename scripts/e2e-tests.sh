#!/bin/bash
# scripts/e2e-tests.sh
# E2E test runner using Playwright with severity-based failure handling
# Triggered by checkpoints after feature completion

set -euo pipefail

# Colors (consistent with other scripts)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
FEATURE=""
HEADED=false
TRACE=false

# Usage
usage() {
    echo "Usage: e2e-tests.sh [--feature <name>] [--headed] [--trace]"
    echo ""
    echo "Options:"
    echo "  --feature   Run tests for specific feature only (grep pattern)"
    echo "  --headed    Run in headed mode (visible browser)"
    echo "  --trace     Capture trace on failure"
    echo "  --help      Show this help message"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --feature) FEATURE="$2"; shift 2 ;;
        --headed) HEADED=true; shift ;;
        --trace) TRACE=true; shift ;;
        --help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

echo "=== E2E Tests (Playwright) ==="
echo "Feature: ${FEATURE:-all}"
echo "Headed: $HEADED"
echo "Trace: $TRACE"
echo ""

# Check for Playwright config
if [ ! -f "playwright.config.ts" ] && [ ! -f "playwright.config.js" ]; then
    echo -e "${YELLOW}[SKIP] No Playwright config found (playwright.config.ts/js)${NC}"
    echo "Install Playwright: npm init playwright@latest"
    exit 0
fi

# Build command
CMD="npx playwright test"
[ -n "$FEATURE" ] && CMD="$CMD --grep \"$FEATURE\""
[ "$HEADED" = true ] && CMD="$CMD --headed"
[ "$TRACE" = true ] && CMD="$CMD --trace on"

# Create output directory for failure artifacts
OUTPUT_DIR=".specflow/execution/${FEATURE:-e2e}"
mkdir -p "$OUTPUT_DIR"

# Counters
FAILED_CRITICAL=0
FAILED_MINOR=0

# Run tests
echo "Running: $CMD"
echo ""
TEST_OUTPUT=$(eval "$CMD" 2>&1) || true
echo "$TEST_OUTPUT"
echo ""

# Parse output for severity tags
FAILED_CRITICAL=$(echo "$TEST_OUTPUT" | grep -cE "\[critical\].*(failed|FAIL)" || echo "0")
FAILED_MINOR=$(echo "$TEST_OUTPUT" | grep -cE "\[minor\].*(failed|FAIL)" || echo "0")

# Extract test counts from Playwright output
TOTAL=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ (passed|failed|skipped)" | head -1 | grep -oE "^[0-9]+" || echo "0")
PASSED=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ passed" | grep -oE "^[0-9]+" || echo "0")
FAILED=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ failed" | grep -oE "^[0-9]+" || echo "0")

# Summary
echo "=== E2E Test Summary ==="
echo "Total: $TOTAL, Passed: $PASSED, Failed: $FAILED ($FAILED_CRITICAL critical, $FAILED_MINOR minor)"
echo "Output: $OUTPUT_DIR/"
echo ""

# Copy artifacts on failure
if [ "$FAILED" -gt 0 ]; then
    # Playwright stores screenshots in test-results by default
    if [ -d "test-results" ]; then
        cp -r test-results/* "$OUTPUT_DIR/" 2>/dev/null || true
        echo "Failure artifacts saved to: $OUTPUT_DIR/"
    fi
fi

# Exit based on severity
if [ "$FAILED_CRITICAL" -gt 0 ]; then
    echo -e "${RED}[BLOCKED] Critical E2E test failures - pipeline blocked${NC}"
    exit 1
elif [ "$FAILED_MINOR" -gt 0 ] || [ "$FAILED" -gt 0 ]; then
    echo -e "${YELLOW}[WARNING] E2E test failures detected - review artifacts${NC}"
    exit 0
else
    echo -e "${GREEN}[PASS] All E2E tests passed${NC}"
    exit 0
fi
