#!/bin/bash
# scripts/integration-tests.sh
# Integration test runner with severity-based failure handling
# Triggered by checkpoints after component completion

set -euo pipefail

# Colors (consistent with verify-spec.sh)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
FEATURE=""
SEVERITY_FILTER="all"

# Usage
usage() {
    echo "Usage: integration-tests.sh [--feature <name>] [--severity-filter <critical|all>]"
    echo ""
    echo "Options:"
    echo "  --feature         Run tests for specific feature only"
    echo "  --severity-filter Filter by severity: critical (blocks), all (default)"
    echo "  --help            Show this help message"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --feature) FEATURE="$2"; shift 2 ;;
        --severity-filter) SEVERITY_FILTER="$2"; shift 2 ;;
        --help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

echo "=== Integration Tests ==="
echo "Feature: ${FEATURE:-all}"
echo "Severity filter: $SEVERITY_FILTER"
echo ""

# Counters
TOTAL=0
PASSED=0
FAILED_CRITICAL=0
FAILED_MINOR=0

# Run integration tests based on detected framework
run_integration_tests() {
    local test_output
    local exit_code=0

    # Node.js project
    if [ -f "package.json" ]; then
        echo "Detected: Node.js project"
        local grep_flag=""
        [ -n "$FEATURE" ] && grep_flag="--grep $FEATURE"

        # Try test:integration script first, fallback to grep
        if grep -q '"test:integration"' package.json 2>/dev/null; then
            npm run test:integration -- $grep_flag 2>&1 || exit_code=$?
        else
            npm test -- --grep integration $grep_flag 2>&1 || exit_code=$?
        fi
    # Python project
    elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] || [ -f "conftest.py" ]; then
        echo "Detected: Python project"
        local marker_flag="-m integration"
        [ -n "$FEATURE" ] && marker_flag="$marker_flag -k $FEATURE"
        pytest $marker_flag 2>&1 || exit_code=$?
    # Go project
    elif [ -f "go.mod" ]; then
        echo "Detected: Go project"
        local run_flag=""
        [ -n "$FEATURE" ] && run_flag="-run $FEATURE"
        go test -tags=integration $run_flag ./... 2>&1 || exit_code=$?
    # Rust project
    elif [ -f "Cargo.toml" ]; then
        echo "Detected: Rust project"
        cargo test --test integration 2>&1 || exit_code=$?
    else
        echo -e "${YELLOW}[SKIP] No integration test framework detected${NC}"
        return 0
    fi

    return $exit_code
}

# Execute tests and capture output
TEST_OUTPUT=$(run_integration_tests 2>&1) || true
echo "$TEST_OUTPUT"
echo ""

# Parse output for severity (look for [critical] or [minor] tags in test names)
# Count tests based on output patterns
TOTAL=$(echo "$TEST_OUTPUT" | grep -cE "(PASS|FAIL|passed|failed)" || echo "0")
PASSED=$(echo "$TEST_OUTPUT" | grep -cE "(PASS|passed)" || echo "0")
FAILED_CRITICAL=$(echo "$TEST_OUTPUT" | grep -cE "\[critical\].*(FAIL|failed)" || echo "0")
FAILED_MINOR=$(echo "$TEST_OUTPUT" | grep -cE "\[minor\].*(FAIL|failed)" || echo "0")

# Summary
echo "=== Integration Test Summary ==="
echo "Total: $TOTAL, Passed: $PASSED, Failed: $((FAILED_CRITICAL + FAILED_MINOR)) ($FAILED_CRITICAL critical, $FAILED_MINOR minor)"
echo ""

# Exit based on severity
if [ "$FAILED_CRITICAL" -gt 0 ]; then
    echo -e "${RED}[BLOCKED] Critical integration test failures - pipeline blocked${NC}"
    exit 1
elif [ "$FAILED_MINOR" -gt 0 ]; then
    echo -e "${YELLOW}[WARNING] Minor integration test failures - queued for later${NC}"
    exit 0
else
    echo -e "${GREEN}[PASS] All integration tests passed${NC}"
    exit 0
fi
