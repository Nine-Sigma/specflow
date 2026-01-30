#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# sf-work.sh - Main entry point for starting work
# ============================================================================
# Usage: sf-work.sh [ISSUE] [OPTIONS]
#
# Examples:
#   sf-work.sh #123                    # Work on GitHub issue 123
#   sf-work.sh 123                     # Same as above
#   sf-work.sh "Add logout button"     # Create local work item
#   sf-work.sh                         # Interactive picker
#   sf-work.sh #123 --type=feature     # Override type
#   sf-work.sh #123 --size=complex     # Override size
#   sf-work.sh #123 --no-pm            # Skip PM overhead
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
TRIAGE_DIR="$SPECFLOW_DIR/triage"

# Source dependencies
source "$SCRIPT_DIR/tracker-adapter.sh"
source "$SCRIPT_DIR/classifier.sh"
source "$SCRIPT_DIR/sync-manager.sh"

# ============================================================================
# Argument Parsing
# ============================================================================

INPUT=""
OVERRIDE_TYPE=""
OVERRIDE_SIZE=""
SKIP_PM=false

_parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --type=*)
                OVERRIDE_TYPE="${1#*=}"
                shift
                ;;
            --size=*)
                OVERRIDE_SIZE="${1#*=}"
                shift
                ;;
            --no-pm)
                SKIP_PM=true
                shift
                ;;
            --help|-h)
                _show_help
                exit 0
                ;;
            *)
                # First non-flag argument is the input
                if [ -z "$INPUT" ]; then
                    INPUT="$1"
                fi
                shift
                ;;
        esac
    done
}

_show_help() {
    echo "sf-work.sh - Start work on an issue"
    echo ""
    echo "Usage: sf-work.sh [ISSUE] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  ISSUE               Issue number (#123 or 123), natural language description,"
    echo "                      or omit for interactive picker"
    echo ""
    echo "Options:"
    echo "  --type=TYPE         Override classification type (bug|feature|refactor|chore|docs)"
    echo "  --size=SIZE         Override classification size (quick|standard|complex)"
    echo "  --no-pm             Skip PM overhead for quick tasks"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Examples:"
    echo "  sf-work.sh #123                    # Work on GitHub issue 123"
    echo "  sf-work.sh 123                     # Same as above"
    echo "  sf-work.sh \"Add logout button\"     # Create local work item"
    echo "  sf-work.sh                         # Interactive picker"
    echo "  sf-work.sh #123 --type=feature     # Override type"
    echo "  sf-work.sh #123 --size=complex     # Override size"
    echo "  sf-work.sh #123 --no-pm            # Skip PM overhead"
    echo ""
    echo "Classification Types:"
    echo "  bug       - Testing focus, minimal spec"
    echo "  feature   - Full spec with all pillars"
    echo "  refactor  - Testing + before/after comparison"
    echo "  chore     - Minimal ceremony"
    echo "  docs      - No security/cost pillars"
    echo ""
    echo "Classification Sizes:"
    echo "  quick     - Small change, minimal process"
    echo "  standard  - Normal workflow"
    echo "  complex   - Full process with checkpoints"
}

# ============================================================================
# Issue Resolution
# ============================================================================

_is_issue_number() {
    local input="$1"
    # Match #123 or 123
    [[ "$input" =~ ^#?[0-9]+$ ]]
}

_extract_issue_id() {
    local input="$1"
    # Strip # prefix if present
    echo "${input#\#}"
}

_interactive_picker() {
    echo "Fetching open issues..."
    local issues
    issues=$(tracker_list_issues 2>/dev/null) || {
        echo "Failed to fetch issues. Create new work item?" >&2
        echo "Enter description (or Ctrl+C to cancel): " >&2
        read -r description
        echo "$description"
        return 0
    }

    local count
    count=$(echo "$issues" | jq 'length')

    if [ "$count" -eq 0 ]; then
        echo "No open issues found. Create new work item?" >&2
        echo "Enter description (or Ctrl+C to cancel): " >&2
        read -r description
        echo "$description"
        return 0
    fi

    echo "" >&2
    echo "Open issues:" >&2
    echo "$issues" | jq -r '.[] | "  #\(.number // .id) - \(.title)"' >&2
    echo "" >&2
    echo "Enter issue number or new description: " >&2
    read -r selection
    echo "$selection"
}

# ============================================================================
# Triage File Creation
# ============================================================================

_create_triage_file() {
    local issue_id="$1"
    local title="$2"
    local source="$3"
    local classification="$4"

    mkdir -p "$TRIAGE_DIR"
    local triage_file="$TRIAGE_DIR/${issue_id}.md"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Extract classification values
    local type_val size_val type_conf size_conf pillars reasoning needs_llm
    type_val=$(echo "$classification" | jq -r '.type // "unknown"')
    size_val=$(echo "$classification" | jq -r '.size // "standard"')
    type_conf=$(echo "$classification" | jq -r '.type_confidence // 0')
    size_conf=$(echo "$classification" | jq -r '.size_confidence // 0')
    pillars=$(echo "$classification" | jq -r '.pillars // [] | join(", ")')
    reasoning=$(echo "$classification" | jq -r '.reasoning // ""')
    needs_llm=$(echo "$classification" | jq -r '.needs_llm // false')

    # Determine type source
    local type_source="auto"
    if [ -n "$OVERRIDE_TYPE" ]; then
        type_source="override"
    fi

    local size_source="auto"
    if [ -n "$OVERRIDE_SIZE" ]; then
        size_source="override"
    fi

    # Generate next steps based on type
    local next_steps=""
    case "$type_val" in
        bug)
            next_steps="1. Run \`/sf:bug\` workflow (testing focus)"
            ;;
        feature)
            next_steps="1. Run \`/sf:feature\` workflow (full spec)"
            ;;
        refactor)
            next_steps="1. Run \`/sf:refactor\` workflow (before/after comparison)"
            ;;
        chore)
            next_steps="1. Minimal ceremony - proceed directly"
            ;;
        docs)
            next_steps="1. Documentation workflow - no pillars required"
            ;;
        *)
            next_steps="1. Classification unclear - review with PM agent"
            ;;
    esac

    # Build override note if applicable
    local override_note=""
    if [ -n "$OVERRIDE_TYPE" ] || [ -n "$OVERRIDE_SIZE" ]; then
        override_note="> Override: User specified"
        [ -n "$OVERRIDE_TYPE" ] && override_note="$override_note --type=$OVERRIDE_TYPE"
        [ -n "$OVERRIDE_SIZE" ] && override_note="$override_note --size=$OVERRIDE_SIZE"
        override_note="$override_note

"
    fi

    # Build LLM note if applicable
    local llm_note=""
    if [ "$needs_llm" = "true" ]; then
        llm_note="> Note: Low confidence classification. PM agent should verify.

"
    fi

    # Get sync status
    local last_sync="N/A"
    local checkpoint="starting"
    local conflicts="None"
    local issue_file="$SPECFLOW_DIR/issues/${issue_id}.json"
    if [ -f "$issue_file" ]; then
        last_sync=$(jq -r '.sync.last_sync // "N/A"' "$issue_file")
        checkpoint=$(jq -r '.sync.last_checkpoint // "starting"' "$issue_file")
    fi

    cat > "$triage_file" << EOF
# Triage: #$issue_id

**Issue:** $title
**Source:** $source
**Started:** $timestamp

## Classification

| Dimension | Value | Confidence | Source |
|-----------|-------|------------|--------|
| Type | $type_val | ${type_conf}% | $type_source |
| Size | $size_val | ${size_conf}% | $size_source |

**Pillars:** $pillars

**Reasoning:** $reasoning

$llm_note$override_note## Next Steps

Based on classification:

$next_steps

## Sync Status

- Last sync: $last_sync
- Checkpoint: $checkpoint
- Conflicts: $conflicts
EOF

    echo "$triage_file"
}

# ============================================================================
# Main Flow
# ============================================================================

main() {
    _parse_args "$@"

    # Interactive mode if no input
    if [ -z "$INPUT" ]; then
        INPUT=$(_interactive_picker)
        [ -z "$INPUT" ] && { echo "No input provided. Exiting."; exit 1; }
    fi

    local issue_id=""
    local issue_data=""
    local source=""

    # Determine if input is issue number or natural language
    if _is_issue_number "$INPUT"; then
        # Existing issue flow
        issue_id=$(_extract_issue_id "$INPUT")
        source="$(tracker_type)"

        echo "Starting work on issue #$issue_id..."

        # Sync issue at "starting" checkpoint
        echo "Syncing issue..."
        local sync_result
        sync_result=$(sync_issue "$issue_id" "starting" 2>&1) || true

        # Check for sync issues
        if echo "$sync_result" | jq -e '.conflict == true' >/dev/null 2>&1; then
            echo "Warning: Conflict detected. Review with /sf:sync #$issue_id" >&2
        elif echo "$sync_result" | jq -e '.offline == true' >/dev/null 2>&1; then
            echo "Warning: Working offline. Changes will sync later." >&2
        fi

        # Get issue data
        issue_data=$(tracker_get_issue "$issue_id" 2>/dev/null) || {
            echo "Error: Could not fetch issue #$issue_id" >&2
            exit 1
        }
    else
        # Natural language flow - create local issue
        echo "Creating local work item..."
        source="local"

        issue_data=$(tracker_create_issue "$INPUT" "" "") || {
            echo "Error: Could not create work item" >&2
            exit 1
        }

        issue_id=$(echo "$issue_data" | jq -r '.number // .id')
        echo "Created local issue #$issue_id"
    fi

    # Extract title for logging
    local title
    title=$(echo "$issue_data" | jq -r '.title // ""')

    # Classify issue
    echo "Classifying issue..."
    local classification
    classification=$(classify_issue "$issue_data")

    # Apply overrides if provided
    if [ -n "$OVERRIDE_TYPE" ]; then
        classification=$(echo "$classification" | jq --arg t "$OVERRIDE_TYPE" '.type = $t | .type_confidence = 100')
        echo "Classification overridden by user: type=$OVERRIDE_TYPE"
    fi

    if [ -n "$OVERRIDE_SIZE" ]; then
        classification=$(echo "$classification" | jq --arg s "$OVERRIDE_SIZE" '.size = $s | .size_confidence = 100')
        echo "Classification overridden by user: size=$OVERRIDE_SIZE"
    fi

    # Log classification
    log_classification "$issue_id" "$classification"

    # Check if LLM verification needed
    local needs_llm
    needs_llm=$(echo "$classification" | jq -r '.needs_llm // false')

    if [ "$needs_llm" = "true" ] && [ "$SKIP_PM" = "false" ]; then
        echo ""
        echo "Note: Low confidence classification. PM agent should verify."
        echo "Use --no-pm to skip PM verification."
    fi

    # Create triage file
    local triage_file
    triage_file=$(_create_triage_file "$issue_id" "$title" "$source" "$classification")

    echo ""
    echo "======================================"
    echo "Work Started: Issue #$issue_id"
    echo "======================================"
    echo ""
    echo "Title: $title"
    echo ""
    echo "Classification:"
    echo "  Type: $(echo "$classification" | jq -r '.type') ($(echo "$classification" | jq -r '.type_confidence')% confidence)"
    echo "  Size: $(echo "$classification" | jq -r '.size') ($(echo "$classification" | jq -r '.size_confidence')% confidence)"
    echo ""

    local type_val
    type_val=$(echo "$classification" | jq -r '.type')

    echo "Next Steps:"
    case "$type_val" in
        bug)
            echo "  1. Run /sf:bug workflow (testing focus)"
            ;;
        feature)
            echo "  2. Run /sf:feature workflow (full spec)"
            ;;
        refactor)
            echo "  3. Run /sf:refactor workflow (before/after comparison)"
            ;;
        chore)
            echo "  4. Minimal ceremony - proceed directly"
            ;;
        docs)
            echo "  5. Documentation workflow - no pillars required"
            ;;
        *)
            echo "  6. Classification unclear - review with PM agent"
            ;;
    esac

    echo ""
    echo "Triage file: $triage_file"
    echo "Classification log: $SPECFLOW_DIR/classification.log"
}

# Run main if executed directly
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        main "$@"
    fi
fi
