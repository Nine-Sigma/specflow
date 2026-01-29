#!/bin/bash
# scripts/release-swarm.sh
# Release Swarm: Final quality gate before shipping
# Coordinates: UAT executor, security scan, test summaries
# Output: release-gate.md decision (APPROVED/BLOCKED/NEEDS_REVIEW)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SPECFLOW_DIR=".specflow"

show_usage() {
    echo "Usage: release-swarm.sh <feature-name>"
    echo ""
    echo "Final quality gate before shipping. Coordinates:"
    echo "  1. UAT execution (Gherkin -> Playwright)"
    echo "  2. Security scan (pre-commit hooks)"
    echo "  3. Test summary aggregation"
    echo "  4. Release decision"
    echo ""
    echo "Prerequisites: Review Swarm must have approved the spec (approval.md exists)"
    echo ""
    echo "Input:  .specflow/specs/<feature>/approval.md"
    echo "Output: .specflow/execution/<feature>/release-gate.md"
    echo ""
    echo "Examples:"
    echo "  release-swarm.sh stripe-payments"
    echo "  release-swarm.sh user-auth"
}

if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

FEATURE="$1"
SPEC_DIR="${SPECFLOW_DIR}/specs/${FEATURE}"
APPROVAL_FILE="${SPEC_DIR}/approval.md"
EXEC_DIR="${SPECFLOW_DIR}/execution/${FEATURE}"
GATE_FILE="${EXEC_DIR}/release-gate.md"

# Verify Review Swarm completed
if [[ ! -f "$APPROVAL_FILE" ]]; then
    echo -e "${RED}Error: Approval not found at ${APPROVAL_FILE}${NC}"
    echo "Run review-swarm.sh first to get PM approval."
    exit 1
fi

mkdir -p "$EXEC_DIR"
echo -e "${CYAN}=== Release Swarm: ${FEATURE} ===${NC}"

# Track overall status
BLOCKED=0
ISSUES=""

# Step 1: Run UAT executor
echo -e "${BLUE}[1/3]${NC} Running UAT (Gherkin -> Playwright)..."
UAT_STATUS="PASS"
if ./scripts/uat-executor.sh "$FEATURE" --flaky-retry; then
    echo -e "       ${GREEN}UAT: PASS${NC}"
else
    UAT_STATUS="FAIL"
    BLOCKED=1
    ISSUES="${ISSUES}\n- UAT scenarios failed"
    echo -e "       ${RED}UAT: FAIL${NC}"
fi

# Step 2: Security scan
echo -e "${BLUE}[2/3]${NC} Running security scan..."
SEC_STATUS="PASS"
if pre-commit run --all-files > /dev/null 2>&1; then
    echo -e "       ${GREEN}Security: PASS${NC}"
else
    SEC_STATUS="FAIL"
    BLOCKED=1
    ISSUES="${ISSUES}\n- Security scan failed"
    echo -e "       ${RED}Security: FAIL${NC}"
fi

# Step 3: Aggregate test results
echo -e "${BLUE}[3/3]${NC} Aggregating test results..."
INT_STATUS="N/A"
E2E_STATUS="N/A"
[[ -f "${EXEC_DIR}/integration-results.md" ]] && INT_STATUS=$(grep -o "Status:.*" "${EXEC_DIR}/integration-results.md" 2>/dev/null | head -1 || echo "N/A")
[[ -f "${EXEC_DIR}/e2e-results.md" ]] && E2E_STATUS=$(grep -o "Status:.*" "${EXEC_DIR}/e2e-results.md" 2>/dev/null | head -1 || echo "N/A")
echo "       Integration: ${INT_STATUS}"
echo "       E2E: ${E2E_STATUS}"

# Determine release decision
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ "$BLOCKED" == "0" ]]; then
    DECISION="APPROVED_FOR_RELEASE"
    echo -e "\n${GREEN}=== RELEASE DECISION: APPROVED ===${NC}"
else
    DECISION="BLOCKED"
    echo -e "\n${RED}=== RELEASE DECISION: BLOCKED ===${NC}"
    echo -e "Issues:${ISSUES}"
fi

# Generate release gate report
cat > "$GATE_FILE" << EOF
# Release Gate: ${FEATURE}

**Generated:** ${TIMESTAMP}
**Version:** $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

## Quality Verification

| Check | Status | Notes |
|-------|--------|-------|
| UAT Scenarios | ${UAT_STATUS} | See uat-report.md |
| Integration Tests | ${INT_STATUS} | |
| E2E Tests | ${E2E_STATUS} | |
| Security Scan | ${SEC_STATUS} | pre-commit hooks |

## Release Decision

**Status:** ${DECISION}

**Blocking Issues:**
$(echo -e "${ISSUES:-none}")

---

*Release gate complete.*
EOF

echo -e "\nReport: ${GATE_FILE}"
[[ "$BLOCKED" == "1" ]] && exit 1
exit 0
