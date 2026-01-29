#!/bin/bash
# scripts/uat-executor.sh
# UAT Executor: Gherkin scenario extraction and Playwright execution
# Handles flaky test detection with tiebreaker pattern
# Output: uat-report.md in .specflow/execution/{feature}/

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SPECFLOW_DIR=".specflow"

show_usage() {
    echo "Usage: uat-executor.sh <feature-name> [options]"
    echo ""
    echo "Automates Gherkin scenario execution via Playwright."
    echo ""
    echo "Options:"
    echo "  --headed       Run Playwright in headed mode (visible browser)"
    echo "  --flaky-retry  Enable flaky detection (fail->pass->tiebreaker)"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "Input:  .specflow/specs/<feature>/spec.md (contains Gherkin scenarios)"
    echo "Output: .specflow/execution/<feature>/uat-report.md"
    echo ""
    echo "Examples:"
    echo "  uat-executor.sh stripe-payments"
    echo "  uat-executor.sh user-auth --headed"
    echo "  uat-executor.sh checkout --flaky-retry"
}

# Parse arguments
FEATURE=""
HEADED=""
FLAKY_RETRY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED="--headed"
            shift
            ;;
        --flaky-retry)
            FLAKY_RETRY="true"
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_usage
            exit 1
            ;;
        *)
            FEATURE="$1"
            shift
            ;;
    esac
done

# Validate feature name provided
if [[ -z "$FEATURE" ]]; then
    show_usage
    exit 1
fi

SPEC_DIR="${SPECFLOW_DIR}/specs/${FEATURE}"
SPEC_FILE="${SPEC_DIR}/spec.md"
EXEC_DIR="${SPECFLOW_DIR}/execution/${FEATURE}"
REPORT_FILE="${EXEC_DIR}/uat-report.md"
TEST_FILE="${EXEC_DIR}/uat-tests.spec.ts"

# Check spec exists
if [[ ! -f "$SPEC_FILE" ]]; then
    echo -e "${RED}Error: Spec not found at ${SPEC_FILE}${NC}"
    echo "Ensure the feature has a spec before running UAT."
    exit 1
fi

# Create execution directory
mkdir -p "${EXEC_DIR}/screenshots"

echo -e "${CYAN}=== UAT Executor: ${FEATURE} ===${NC}"

# Step 1: Extract Gherkin scenarios
echo -e "${BLUE}[1/3]${NC} Extracting Gherkin scenarios..."
SCENARIO_COUNT=$(grep -c "Scenario:" "$SPEC_FILE" 2>/dev/null || echo "0")
if [[ "$SCENARIO_COUNT" == "0" ]]; then
    echo -e "${RED}Error: No Gherkin scenarios found in ${SPEC_FILE}${NC}"
    exit 1
fi
echo "       Found ${SCENARIO_COUNT} scenarios"

# Step 2: Run Playwright tests
echo -e "${BLUE}[2/3]${NC} Running Playwright tests..."
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Install Node.js first.${NC}"
    exit 1
fi

PLAYWRIGHT_CMD="npx playwright test"
[[ -f "$TEST_FILE" ]] && PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $TEST_FILE"
[[ -n "$HEADED" ]] && PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=list"

# Flaky detection: fail->pass->tiebreaker (3rd run decides)
run_tests() {
    if [[ -z "$FLAKY_RETRY" ]]; then
        $PLAYWRIGHT_CMD 2>/dev/null && return 0 || return 1
    fi
    echo "       Flaky detection: fail->pass->tiebreaker"
    $PLAYWRIGHT_CMD 2>/dev/null && { echo -e "       ${GREEN}PASS${NC}"; return 0; }
    echo -e "       ${YELLOW}Run 1: FAIL - retrying${NC}"
    $PLAYWRIGHT_CMD 2>/dev/null || { echo -e "       ${RED}Run 2: FAIL${NC}"; return 1; }
    echo -e "       ${YELLOW}Run 2: PASS - tiebreaker${NC}"
    $PLAYWRIGHT_CMD 2>/dev/null && { echo -e "       ${YELLOW}FLAKY (bug)${NC}"; return 2; } || return 1
}

TEST_RESULT=0
run_tests || TEST_RESULT=$?

# Step 3: Generate report
echo -e "${BLUE}[3/3]${NC} Generating UAT report..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

case $TEST_RESULT in 0) STATUS="PASS" ;; 1) STATUS="FAIL" ;; 2) STATUS="FLAKY" ;; *) STATUS="UNKNOWN" ;; esac

cat > "$REPORT_FILE" << EOF
# UAT Report: ${FEATURE}

**Generated:** ${TIMESTAMP}
**Spec:** ${SPEC_FILE}
**Scenarios:** ${SCENARIO_COUNT}
**Status:** ${STATUS}

## Results

| Status | Count |
|--------|-------|
| Passed | - |
| Failed | - |
| Flaky  | - |

*Full report populated by UAT Executor agent.*
EOF

echo "       Report: ${REPORT_FILE}"
[[ "$TEST_RESULT" == "0" ]] && echo -e "${GREEN}=== UAT: PASS ===${NC}" && exit 0
[[ "$TEST_RESULT" == "2" ]] && echo -e "${YELLOW}=== UAT: FLAKY ===${NC}" && exit 1
echo -e "${RED}=== UAT: FAIL ===${NC}" && exit 1
