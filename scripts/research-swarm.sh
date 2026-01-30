#!/bin/bash
# scripts/research-swarm.sh
# Research Swarm orchestration: sets up research phase for spec creation
# Spawns Stack, Pattern, and Pitfall researchers in parallel (via Claude agents)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SPECFLOW_DIR=".specflow"
CONFIG_FILE="$SPECFLOW_DIR/config.json"

usage() {
    echo "Usage: research-swarm.sh <feature-name> [--skip-research]"
    echo ""
    echo "Arguments:"
    echo "  feature-name     Name of the feature to research (required)"
    echo ""
    echo "Options:"
    echo "  --skip-research  Skip research phase entirely"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Examples:"
    echo "  research-swarm.sh user-authentication"
    echo "  research-swarm.sh payment-processing --skip-research"
}

# Parse arguments
FEATURE_NAME=""
SKIP_RESEARCH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-research)
            SKIP_RESEARCH=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            exit 1
            ;;
        *)
            if [ -z "$FEATURE_NAME" ]; then
                FEATURE_NAME="$1"
            else
                echo -e "${RED}Error: Unexpected argument $1${NC}"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate feature name
if [ -z "$FEATURE_NAME" ]; then
    echo -e "${RED}Error: feature-name is required${NC}"
    usage
    exit 1
fi

# Check config for skip_research setting
if [ -f "$CONFIG_FILE" ]; then
    CONFIG_SKIP=$(grep -o '"skip_research"[[:space:]]*:[[:space:]]*true' "$CONFIG_FILE" 2>/dev/null || true)
    if [ -n "$CONFIG_SKIP" ]; then
        SKIP_RESEARCH=true
    fi
fi

# Handle skip research
if [ "$SKIP_RESEARCH" = true ]; then
    echo -e "${YELLOW}=== Research Phase Skipped ===${NC}"
    echo "Feature: $FEATURE_NAME"
    echo ""
    echo "Skipping research (--skip-research flag or config setting)."
    echo "Proceeding directly to spec creation phase."

    # Create feature directory anyway
    mkdir -p "$SPECFLOW_DIR/specs/$FEATURE_NAME"
    mkdir -p "$SPECFLOW_DIR/handoffs"

    # Write skip handoff
    cat > "$SPECFLOW_DIR/handoffs/handoff-to-spec-swarm.md" << EOF
# Handoff: Research -> Spec Swarm

**Feature:** $FEATURE_NAME
**Research:** Skipped
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Research Summary

Research phase was skipped via --skip-research flag or config setting.

## Constraints

None from research (research was skipped).

---

*Ready for spec creation*
EOF

    echo -e "${GREEN}Handoff created: $SPECFLOW_DIR/handoffs/handoff-to-spec-swarm.md${NC}"
    exit 0
fi

# Start research swarm
echo -e "${BLUE}=== Research Swarm ===${NC}"
echo "Feature: $FEATURE_NAME"
echo ""

# Create feature directory
FEATURE_DIR="$SPECFLOW_DIR/specs/$FEATURE_NAME"
mkdir -p "$FEATURE_DIR"
mkdir -p "$SPECFLOW_DIR/handoffs"

echo -e "${GREEN}Created: $FEATURE_DIR${NC}"
echo ""

# Instructions for invoking research orchestrator
echo "=== Next Steps ==="
echo ""
echo "Invoke the Research Orchestrator agent to spawn researchers:"
echo ""
echo "  1. Load agent: @.specflow/agents/research-orchestrator.md"
echo "  2. Provide feature context:"
echo "     Feature: $FEATURE_NAME"
echo "     Directory: $FEATURE_DIR"
echo ""
echo "The orchestrator will spawn three parallel researchers:"
echo "  - Stack Researcher: Technology recommendations"
echo "  - Pattern Researcher: Established patterns to follow"
echo "  - Pitfall Researcher: Common mistakes to avoid"
echo ""
echo "Research output will be written to:"
echo "  - $FEATURE_DIR/research.md (consolidated)"
echo "  - $SPECFLOW_DIR/handoffs/handoff-to-spec-swarm.md (for spec creation)"
echo ""
echo -e "${YELLOW}Waiting for research completion...${NC}"
echo "Type 'done' when research-orchestrator has finished,"
echo "or the watcher will detect the handoff file automatically."
