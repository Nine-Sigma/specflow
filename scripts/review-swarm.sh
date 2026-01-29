#!/bin/bash
# scripts/review-swarm.sh
# Review Swarm: BOSS validation + domain reviews + PM gating
# Coordinates: Criteria Reviewer, Jordan (security), Taylor (cost), QA
# Output: approval.md and handoff-to-execution.md

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
    echo "Usage: review-swarm.sh <feature-name>"
    echo ""
    echo "Orchestrates the Review Swarm for a feature spec:"
    echo "  1. Criteria Reviewer - BOSS validation"
    echo "  2. Jordan - Security review"
    echo "  3. Taylor - Cost review"
    echo "  4. QA - Test coverage review"
    echo "  5. PM - Gate decision"
    echo ""
    echo "Input:  .specflow/specs/<feature>/spec.md"
    echo "Output: .specflow/specs/<feature>/approval.md"
    echo ""
    echo "Examples:"
    echo "  review-swarm.sh stripe-payments"
    echo "  review-swarm.sh user-auth"
}

# Check arguments
if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

FEATURE="$1"
SPEC_DIR="${SPECFLOW_DIR}/specs/${FEATURE}"
SPEC_FILE="${SPEC_DIR}/spec.md"
APPROVAL_FILE="${SPEC_DIR}/approval.md"
HANDOFF_DIR="${SPECFLOW_DIR}/handoffs"

# Verify spec exists
if [[ ! -f "$SPEC_FILE" ]]; then
    echo -e "${RED}Error: Spec not found at ${SPEC_FILE}${NC}"
    echo "Run spec creation first, then submit for review."
    exit 1
fi

echo -e "${CYAN}=== Review Swarm for: ${FEATURE} ===${NC}"
echo ""

# Step 1: Criteria Reviewer (BOSS validation)
echo -e "${BLUE}[1/5]${NC} Criteria Reviewer: BOSS validation..."
echo "       Validating: Binary, Observable, Specific, Testable"
echo "       Agent: @criteria-reviewer"
echo -e "       ${YELLOW}[PENDING]${NC} Awaiting agent invocation via Claude"
echo ""

# Step 2: Security Review (Jordan)
echo -e "${BLUE}[2/5]${NC} Security Review (Jordan)..."
echo "       Reviewing: STRIDE threat model, trust boundaries"
echo "       Agent: /cloud-security"
echo -e "       ${YELLOW}[PENDING]${NC} Awaiting agent invocation via Claude"
echo ""

# Step 3: Cost Review (Taylor)
echo -e "${BLUE}[3/5]${NC} Cost Review (Taylor)..."
echo "       Reviewing: Estimates, assumptions, scale projections"
echo "       Agent: /cloud-cost"
echo -e "       ${YELLOW}[PENDING]${NC} Awaiting agent invocation via Claude"
echo ""

# Step 4: QA Review
echo -e "${BLUE}[4/5]${NC} QA Review..."
echo "       Reviewing: Gherkin scenarios, edge cases, test readiness"
echo "       Minimum: 2 happy, 2 error, 1 edge, 1 security = 6 scenarios"
echo -e "       ${YELLOW}[PENDING]${NC} Awaiting agent invocation via Claude"
echo ""

# Step 5: PM Gate
echo -e "${BLUE}[5/5]${NC} PM Gate..."
echo "       Decision: APPROVED | NEEDS_REVISION | ESCALATE_TO_USER"
echo -e "       ${YELLOW}[PENDING]${NC} Awaiting consolidation and decision"
echo ""

echo -e "${CYAN}--- Agent Coordination Note ---${NC}"
echo "This script coordinates the review flow. Actual agent invocation"
echo "happens through Claude when running in interactive mode."
echo ""
echo "After all agents complete their reviews:"
echo "  - Results written to: ${APPROVAL_FILE}"
echo "  - If APPROVED: handoff written to ${HANDOFF_DIR}/"
echo "  - If NEEDS_REVISION: spec returned to author"
echo "  - If ESCALATE_TO_USER: automation pauses for input"
echo ""

# Check if approval already exists (review already done)
if [[ -f "$APPROVAL_FILE" ]]; then
    echo -e "${YELLOW}Note: Previous approval found at ${APPROVAL_FILE}${NC}"
    echo "To re-review, delete the existing approval file first."
fi

echo -e "${GREEN}Review swarm initialized for: ${FEATURE}${NC}"
echo "Invoke agents in Claude to complete the review."
