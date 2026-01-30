#!/usr/bin/env bash
set -euo pipefail

# Drift Detector - Detect implementation drift from acceptance criteria
# Usage: scripts/drift-detector.sh <command> [args]
#
# This script can be sourced by other scripts to use its functions directly:
#   source scripts/drift-detector.sh
#
# Commands:
#   detect <feature> <checkpoint>     - Run drift detection
#   parse <feature>                   - Parse spec into acceptance criteria JSON
#   show <feature> <checkpoint>       - Show drift report
#   list-handoffs [agent]             - List pending handoffs (dev|pm|all)
#   apply-pm-decision <feature>       - Apply PM decision from handoff
#   help                              - Show this help message

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
SPECS_DIR="$SPECFLOW_DIR/specs"
EXECUTION_DIR="$SPECFLOW_DIR/execution"
HANDOFFS_DIR="$SPECFLOW_DIR/handoffs"
TEMPLATES_DIR="$SPECFLOW_DIR/templates"
TICKETS_DIR="$SPECFLOW_DIR/tickets"

# Source parallel-coordinator for state functions
source "$SCRIPT_DIR/parallel-coordinator.sh"

# Source sync-manager for ticket updates
source "$SCRIPT_DIR/sync-manager.sh"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_drift_log() {
    local level="$1"
    shift
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [drift] [$level] $*"
}

_ensure_drift_dir() {
    local feature="$1"
    mkdir -p "$EXECUTION_DIR/${feature}/drift-reports"
    mkdir -p "$HANDOFFS_DIR"
}

_get_criteria_file() {
    local feature="$1"
    echo "$SPECS_DIR/${feature}/acceptance-criteria.json"
}

_get_drift_report_file() {
    local feature="$1"
    local checkpoint="$2"
    echo "$EXECUTION_DIR/${feature}/drift-reports/${checkpoint}.json"
}

_determine_criterion_type() {
    # Determine criterion type based on keywords in text
    # Arguments: criterion_text
    # Returns: functional | security | performance

    local text="$1"
    local text_lower
    text_lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    # Security keywords
    if echo "$text_lower" | grep -qE "auth|secur|encrypt|permission|access|token|credential|inject|xss|csrf|validate|sanitize"; then
        echo "security"
        return 0
    fi

    # Performance keywords
    if echo "$text_lower" | grep -qE "performance|latency|throughput|response time|load|scale|cache|optimize|fast|slow|timeout"; then
        echo "performance"
        return 0
    fi

    # Default to functional
    echo "functional"
}

_suggest_location() {
    # Suggest file location based on criterion type
    # Arguments: criterion_type, feature
    # Returns: suggested path

    local criterion_type="$1"
    local feature="$2"

    case "$criterion_type" in
        security)
            echo "src/auth/ or src/middleware/"
            ;;
        performance)
            echo "src/services/ or src/utils/"
            ;;
        *)
            echo "src/${feature}/"
            ;;
    esac
}

# =============================================================================
# Core Functions
# =============================================================================

parse_acceptance_criteria() {
    # Parse acceptance criteria from spec markdown
    # Arguments: spec_file
    # Returns: JSON array of criteria
    # Side effect: Saves to .specflow/specs/${feature}/acceptance-criteria.json

    local spec_file="$1"

    if [ -z "$spec_file" ]; then
        echo '{"error": "Spec file required"}' >&2
        return 1
    fi

    if [ ! -f "$spec_file" ]; then
        echo '{"error": "Spec file not found", "file": "'"$spec_file"'"}' >&2
        return 1
    fi

    _drift_log "INFO" "Parsing acceptance criteria from: $spec_file"

    local criteria="[]"
    local in_criteria_section=false
    local criterion_count=0

    while IFS= read -r line || [ -n "$line" ]; do
        # Check for Acceptance Criteria or BOSS Criteria section header
        if echo "$line" | grep -qiE "^#+\s*(acceptance criteria|boss criteria)"; then
            in_criteria_section=true
            continue
        fi

        # Exit section on next header
        if [ "$in_criteria_section" = true ] && echo "$line" | grep -qE "^#+\s"; then
            in_criteria_section=false
            continue
        fi

        # Parse criteria lines in section
        if [ "$in_criteria_section" = true ]; then
            # Match formats:
            # - [ ] AC-XXX: Description
            # - AC-XXX: Description
            # - [x] AC-XXX: Description (completed)

            local criterion_id criterion_text

            # Try checkbox format first: - [ ] AC-XXX: or - [x] AC-XXX:
            if echo "$line" | grep -qE "^\s*-\s*\[.\]\s*AC-[0-9]+:"; then
                criterion_id=$(echo "$line" | sed -E 's/.*\s*(AC-[0-9]+):.*/\1/')
                criterion_text=$(echo "$line" | sed -E 's/.*AC-[0-9]+:\s*//')
            # Try plain format: - AC-XXX:
            elif echo "$line" | grep -qE "^\s*-\s*AC-[0-9]+:"; then
                criterion_id=$(echo "$line" | sed -E 's/.*\s*(AC-[0-9]+):.*/\1/')
                criterion_text=$(echo "$line" | sed -E 's/.*AC-[0-9]+:\s*//')
            else
                continue
            fi

            # Skip if we didn't extract valid criterion
            if [ -z "$criterion_id" ] || [ "$criterion_id" = "$line" ]; then
                continue
            fi

            # Determine type
            local criterion_type
            criterion_type=$(_determine_criterion_type "$criterion_text")

            criterion_count=$((criterion_count + 1))

            # Add to criteria array
            criteria=$(echo "$criteria" | jq \
                --arg id "$criterion_id" \
                --arg text "$criterion_text" \
                --arg type "$criterion_type" \
                '. + [{
                    "id": $id,
                    "text": $text,
                    "type": $type,
                    "markers": []
                }]')
        fi
    done < "$spec_file"

    _drift_log "INFO" "Found $criterion_count acceptance criteria"

    # Build output structure
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Extract feature name from spec path
    local feature_name
    feature_name=$(dirname "$spec_file" | xargs basename)

    local output
    output=$(jq -n \
        --arg feature "$feature_name" \
        --arg spec_file "$spec_file" \
        --arg parsed_at "$timestamp" \
        --argjson criteria "$criteria" \
        '{
            feature: $feature,
            spec_file: $spec_file,
            parsed_at: $parsed_at,
            criteria: $criteria
        }')

    # Save to criteria file
    local criteria_file
    criteria_file=$(_get_criteria_file "$feature_name")
    mkdir -p "$(dirname "$criteria_file")"
    echo "$output" > "$criteria_file"

    _drift_log "INFO" "Saved criteria to: $criteria_file"

    echo "$output"
}

classify_drift() {
    # Classify drift status for a single criterion
    # Arguments: criterion_id, feature
    # Returns: aligned | missing | exceeds_spec | contradicts

    local criterion_id="$1"
    local feature="$2"

    if [ -z "$criterion_id" ] || [ -z "$feature" ]; then
        echo "missing"
        return 0
    fi

    local marker_pattern="// CRITERIA: $criterion_id"
    local test_marker_pattern="// CRITERIA: $criterion_id"

    # Search for implementation marker in source files
    local impl_found=false
    local test_found=false

    # Check for implementation marker (search in src/, lib/, app/ directories)
    if grep -rq "$marker_pattern" src/ lib/ app/ 2>/dev/null; then
        impl_found=true
    fi

    # Check for test marker (search in test directories)
    if grep -rq "$test_marker_pattern" tests/ __tests__/ test/ spec/ 2>/dev/null; then
        test_found=true
    fi

    # Also check for criterion ID in test file names
    local safe_id
    safe_id=$(echo "$criterion_id" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
    if find tests/ __tests__/ test/ spec/ -name "*${safe_id}*" 2>/dev/null | grep -q .; then
        test_found=true
    fi

    # Classify based on findings
    if [ "$impl_found" = true ] && [ "$test_found" = true ]; then
        echo "aligned"
    elif [ "$impl_found" = true ] && [ "$test_found" = false ]; then
        # Implementation exists but no tests - could be exceeds_spec or missing tests
        echo "aligned"  # Consider aligned if implemented, tests can come later
    elif [ "$impl_found" = false ] && [ "$test_found" = true ]; then
        # Tests exist but no implementation marker - missing
        echo "missing"
    else
        # Neither found - missing
        echo "missing"
    fi
}

detect_drift() {
    # Detect drift between implementation and acceptance criteria
    # Arguments: feature, checkpoint
    # Returns: JSON drift report

    local feature="$1"
    local checkpoint="$2"

    if [ -z "$feature" ] || [ -z "$checkpoint" ]; then
        echo '{"error": "Feature and checkpoint required"}' >&2
        return 1
    fi

    _drift_log "INFO" "Detecting drift for feature: $feature at checkpoint: $checkpoint"

    _ensure_drift_dir "$feature"

    # Load or parse acceptance criteria
    local criteria_file
    criteria_file=$(_get_criteria_file "$feature")

    if [ ! -f "$criteria_file" ]; then
        # Try to parse from spec
        local spec_file="$SPECS_DIR/${feature}/spec.md"
        if [ -f "$spec_file" ]; then
            _drift_log "INFO" "Parsing criteria from spec"
            parse_acceptance_criteria "$spec_file" >/dev/null
        else
            _drift_log "WARN" "No spec file found: $spec_file"
            echo '{"error": "No spec file found", "feature": "'"$feature"'"}'
            return 1
        fi
    fi

    if [ ! -f "$criteria_file" ]; then
        _drift_log "ERROR" "Could not load or generate criteria file"
        echo '{"error": "Could not load criteria", "feature": "'"$feature"'"}'
        return 1
    fi

    local criteria_data
    criteria_data=$(cat "$criteria_file")

    local criteria
    criteria=$(echo "$criteria_data" | jq '.criteria')

    local criteria_count
    criteria_count=$(echo "$criteria" | jq 'length')

    _drift_log "INFO" "Checking $criteria_count criteria"

    # Initialize counters
    local aligned=0
    local missing=0
    local exceeds_spec=0
    local contradicts=0

    local criteria_results="[]"

    # Check each criterion
    for i in $(seq 0 $((criteria_count - 1))); do
        local criterion_id criterion_text criterion_type
        criterion_id=$(echo "$criteria" | jq -r ".[$i].id")
        criterion_text=$(echo "$criteria" | jq -r ".[$i].text")
        criterion_type=$(echo "$criteria" | jq -r ".[$i].type")

        # Classify drift
        local status
        status=$(classify_drift "$criterion_id" "$feature")

        # Update counters
        case "$status" in
            aligned) aligned=$((aligned + 1)) ;;
            missing) missing=$((missing + 1)) ;;
            exceeds_spec) exceeds_spec=$((exceeds_spec + 1)) ;;
            contradicts) contradicts=$((contradicts + 1)) ;;
        esac

        # Add to results
        criteria_results=$(echo "$criteria_results" | jq \
            --arg id "$criterion_id" \
            --arg text "$criterion_text" \
            --arg type "$criterion_type" \
            --arg status "$status" \
            '. + [{
                "id": $id,
                "text": $text,
                "type": $type,
                "status": $status
            }]')
    done

    # Check for exceeds_spec (implementations without criteria)
    # Search for CRITERIA markers that don't match any known criterion
    local all_markers
    all_markers=$(grep -roh "// CRITERIA: [A-Z0-9-]*" src/ lib/ app/ 2>/dev/null | sort -u || echo "")

    while IFS= read -r marker; do
        [ -z "$marker" ] && continue
        local marker_id
        marker_id=$(echo "$marker" | sed 's/.*CRITERIA: //')

        # Check if this marker is in our criteria
        if ! echo "$criteria" | jq -e --arg id "$marker_id" '.[] | select(.id == $id)' >/dev/null 2>&1; then
            exceeds_spec=$((exceeds_spec + 1))
            criteria_results=$(echo "$criteria_results" | jq \
                --arg id "$marker_id" \
                '. + [{
                    "id": $id,
                    "text": "Implementation found without matching criterion",
                    "type": "unknown",
                    "status": "exceeds_spec"
                }]')
        fi
    done <<< "$all_markers"

    # Build drift report
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local has_invalid_drift=false
    local has_valid_drift=false

    if [ "$missing" -gt 0 ] || [ "$contradicts" -gt 0 ]; then
        has_invalid_drift=true
    fi

    if [ "$exceeds_spec" -gt 0 ]; then
        has_valid_drift=true
    fi

    local drift_report
    drift_report=$(jq -n \
        --arg feature "$feature" \
        --arg checkpoint "$checkpoint" \
        --arg timestamp "$timestamp" \
        --argjson criteria "$criteria_results" \
        --argjson has_invalid_drift "$has_invalid_drift" \
        --argjson has_valid_drift "$has_valid_drift" \
        --argjson aligned "$aligned" \
        --argjson missing "$missing" \
        --argjson exceeds_spec "$exceeds_spec" \
        --argjson contradicts "$contradicts" \
        '{
            feature: $feature,
            checkpoint: $checkpoint,
            timestamp: $timestamp,
            criteria: $criteria,
            has_invalid_drift: $has_invalid_drift,
            has_valid_drift: $has_valid_drift,
            summary: {
                aligned: $aligned,
                missing: $missing,
                exceeds_spec: $exceeds_spec,
                contradicts: $contradicts
            },
            ticket_updated: false
        }')

    # Save drift report
    local report_file
    report_file=$(_get_drift_report_file "$feature" "$checkpoint")
    echo "$drift_report" > "$report_file"

    _drift_log "INFO" "Drift report saved: $report_file"
    _drift_log "INFO" "Summary: aligned=$aligned, missing=$missing, exceeds_spec=$exceeds_spec, contradicts=$contradicts"

    echo "$drift_report"
}

# =============================================================================
# Drift Response Handlers
# =============================================================================

handle_invalid_drift() {
    # Handle invalid drift (missing criteria) by generating guidance
    # Arguments: feature, drift_report_json
    # Returns: Path to guidance file

    local feature="$1"
    local drift_report="$2"

    if [ -z "$feature" ] || [ -z "$drift_report" ]; then
        echo '{"error": "Feature and drift report required"}' >&2
        return 1
    fi

    _drift_log "INFO" "Handling invalid drift for feature: $feature"

    _ensure_drift_dir "$feature"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local checkpoint
    checkpoint=$(echo "$drift_report" | jq -r '.checkpoint')

    # Extract missing criteria
    local missing_criteria
    missing_criteria=$(echo "$drift_report" | jq '[.criteria[] | select(.status == "missing" or .status == "contradicts")]')

    local missing_count
    missing_count=$(echo "$missing_criteria" | jq 'length')

    _drift_log "INFO" "Found $missing_count missing/contradicting criteria"

    # Build guidance table
    local guidance_table=""

    for i in $(seq 0 $((missing_count - 1))); do
        local crit_id crit_text crit_type suggested_loc
        crit_id=$(echo "$missing_criteria" | jq -r ".[$i].id")
        crit_text=$(echo "$missing_criteria" | jq -r ".[$i].text")
        crit_type=$(echo "$missing_criteria" | jq -r ".[$i].type")
        suggested_loc=$(_suggest_location "$crit_type" "$feature")

        guidance_table+="| $crit_id | $crit_text | $suggested_loc |
"
    done

    # Write guidance handoff
    local handoff_file="$HANDOFFS_DIR/dev-guidance-${feature}.md"

    cat > "$handoff_file" << EOF
# Dev Guidance: ${feature}

**Generated:** ${timestamp}
**Checkpoint:** ${checkpoint}
**Status:** REQUIRES_ACTION

## Missing Criteria

| Criterion ID | Description | Suggested Location |
|--------------|-------------|-------------------|
${guidance_table}
## Instructions

1. Review each missing criterion above
2. Implement in suggested location with \`// CRITERIA: AC-XXX\` marker
3. Add corresponding test with same marker
4. Re-run drift detection: \`scripts/drift-detector.sh detect ${feature} ${checkpoint}\`

## Handoff Consumed By

- Dev agent checks \`.specflow/handoffs/dev-guidance-*.md\` before resuming work
- specflow-watcher.sh can notify on new handoff files
- CLI: \`scripts/sf-sync.sh list-handoffs dev\`
EOF

    _drift_log "INFO" "Dev guidance written to: $handoff_file"

    # Update ticket with notification
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Drift detected at checkpoint $checkpoint: $missing_count missing criteria. Dev guidance generated at $handoff_file"
            sync_ticket_comments "$epic_number" "$mapping_file" 2>/dev/null || true
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
            _drift_log "INFO" "Ticket #$epic_number updated with drift notification"
        fi
    fi

    echo "$handoff_file"
}

escalate_improvement_to_pm() {
    # Escalate valid drift (improvements) to PM for review
    # Arguments: feature, checkpoint, drift_report_json
    # Returns: Path to PM handoff file

    local feature="$1"
    local checkpoint="$2"
    local drift_report="$3"

    if [ -z "$feature" ] || [ -z "$checkpoint" ] || [ -z "$drift_report" ]; then
        echo '{"error": "Feature, checkpoint, and drift report required"}' >&2
        return 1
    fi

    _drift_log "INFO" "Escalating improvements to PM for feature: $feature"

    _ensure_drift_dir "$feature"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Extract exceeds_spec criteria
    local improvements
    improvements=$(echo "$drift_report" | jq '[.criteria[] | select(.status == "exceeds_spec")]')

    local improvement_count
    improvement_count=$(echo "$improvements" | jq 'length')

    _drift_log "INFO" "Found $improvement_count improvements beyond spec"

    # Build improvements table
    local improvements_table=""

    for i in $(seq 0 $((improvement_count - 1))); do
        local imp_id imp_text
        imp_id=$(echo "$improvements" | jq -r ".[$i].id")
        imp_text=$(echo "$improvements" | jq -r ".[$i].text")

        improvements_table+="| $imp_id | $imp_text | Discovered during implementation |
"
    done

    # Write PM handoff
    local handoff_file="$HANDOFFS_DIR/pm-improvement-${feature}.md"

    cat > "$handoff_file" << EOF
# PM Review: Improvement Detected - ${feature}

**Generated:** ${timestamp}
**Checkpoint:** ${checkpoint}
**Status:** PENDING_PM_REVIEW

## Improvements Beyond Spec

| Finding | Description | Rationale |
|---------|-------------|-----------|
${improvements_table}
## Recommendation

- [ ] Update spec to include improvement
- [ ] Reject improvement (revert required)
- [ ] Defer decision (continue with current)

## PM Decision (fill in)

**Decision:** ___
**Reasoning:** ___

## Handoff Consumption

This handoff is consumed by:
- specflow-watcher.sh (Phase 5) monitors \`.specflow/handoffs/pm-*.md\`
- Manual: \`scripts/sf-sync.sh list-handoffs pm\`
- After PM fills decision, run: \`scripts/drift-detector.sh apply-pm-decision ${feature}\`
EOF

    _drift_log "INFO" "PM handoff written to: $handoff_file"

    # Update ticket with notification
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Improvements detected at checkpoint $checkpoint: $improvement_count implementations beyond spec. PM review required at $handoff_file"
            sync_ticket_comments "$epic_number" "$mapping_file" 2>/dev/null || true
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
            _drift_log "INFO" "Ticket #$epic_number updated with PM escalation"
        fi
    fi

    echo "$handoff_file"
}

escalate_drift_to_pm() {
    # Escalate unresolvable drift to PM
    # Arguments: feature, checkpoint, drift_report_json
    # Returns: Path to PM handoff file

    local feature="$1"
    local checkpoint="$2"
    local drift_report="$3"

    if [ -z "$feature" ] || [ -z "$checkpoint" ] || [ -z "$drift_report" ]; then
        echo '{"error": "Feature, checkpoint, and drift report required"}' >&2
        return 1
    fi

    _drift_log "INFO" "Escalating unresolvable drift to PM for feature: $feature"

    _ensure_drift_dir "$feature"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Get summary from drift report
    local summary
    summary=$(echo "$drift_report" | jq '.summary')

    local aligned missing exceeds_spec contradicts
    aligned=$(echo "$summary" | jq '.aligned')
    missing=$(echo "$summary" | jq '.missing')
    exceeds_spec=$(echo "$summary" | jq '.exceeds_spec')
    contradicts=$(echo "$summary" | jq '.contradicts')

    # Write PM drift handoff
    local handoff_file="$HANDOFFS_DIR/pm-drift-${feature}.md"

    cat > "$handoff_file" << EOF
# PM Review: Unresolvable Drift - ${feature}

**Generated:** ${timestamp}
**Checkpoint:** ${checkpoint}
**Status:** REQUIRES_PM_DECISION

## Drift Summary

| Status | Count |
|--------|-------|
| Aligned | ${aligned} |
| Missing | ${missing} |
| Exceeds Spec | ${exceeds_spec} |
| Contradicts | ${contradicts} |

## Issue

This drift could not be automatically resolved. Manual PM intervention required.

## Criteria Details

\`\`\`json
$(echo "$drift_report" | jq '.criteria')
\`\`\`

## Recommended Actions

1. Review the criteria details above
2. Determine root cause (spec unclear? implementation wrong?)
3. Update spec or request implementation changes

## PM Decision (fill in)

**Decision:** ___
**Action Required:** ___
**Assigned To:** ___

## Handoff Consumption

This handoff is consumed by:
- specflow-watcher.sh (Phase 5) monitors \`.specflow/handoffs/pm-*.md\`
- Manual: \`scripts/sf-sync.sh list-handoffs pm\`
EOF

    _drift_log "INFO" "PM drift handoff written to: $handoff_file"

    # Update ticket with notification
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Unresolvable drift detected at checkpoint $checkpoint. PM intervention required. See: $handoff_file"
            sync_ticket_comments "$epic_number" "$mapping_file" 2>/dev/null || true
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
            _drift_log "INFO" "Ticket #$epic_number updated with unresolvable drift notification"
        fi
    fi

    echo "$handoff_file"
}

apply_pm_decision() {
    # Apply PM decision from handoff file
    # Arguments: feature
    # Returns: JSON with result

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature required"}' >&2
        return 1
    fi

    _drift_log "INFO" "Applying PM decision for feature: $feature"

    # Check for improvement handoff first
    local handoff_file="$HANDOFFS_DIR/pm-improvement-${feature}.md"

    if [ ! -f "$handoff_file" ]; then
        # Try drift handoff
        handoff_file="$HANDOFFS_DIR/pm-drift-${feature}.md"
    fi

    if [ ! -f "$handoff_file" ]; then
        echo '{"error": "No PM handoff found for feature", "feature": "'"$feature"'"}'
        return 1
    fi

    # Read decision from handoff
    local decision
    decision=$(grep -A1 "^\*\*Decision:\*\*" "$handoff_file" | tail -1 | sed 's/^[[:space:]]*//')

    if [ -z "$decision" ] || [ "$decision" = "___" ]; then
        echo '{"error": "PM decision not filled in", "handoff": "'"$handoff_file"'"}'
        return 1
    fi

    _drift_log "INFO" "Found decision: $decision"

    # Mark handoff as consumed
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local consumed_file="${handoff_file%.md}.consumed.md"
    mv "$handoff_file" "$consumed_file"

    echo "" >> "$consumed_file"
    echo "---" >> "$consumed_file"
    echo "**Consumed:** ${timestamp}" >> "$consumed_file"
    echo "**Applied by:** drift-detector.sh" >> "$consumed_file"

    _drift_log "INFO" "Handoff marked as consumed: $consumed_file"

    echo '{"applied": true, "feature": "'"$feature"'", "decision": "'"$decision"'", "consumed_file": "'"$consumed_file"'"}'
}

list_handoffs() {
    # List pending handoffs
    # Arguments: [agent] - dev | pm | all (default: all)
    # Returns: JSON array of handoff files

    local agent="${1:-all}"

    _ensure_drift_dir "default"

    local handoffs="[]"

    case "$agent" in
        dev)
            while IFS= read -r file; do
                [ -z "$file" ] && continue
                local feature
                feature=$(basename "$file" | sed 's/dev-guidance-//' | sed 's/\.md$//')
                handoffs=$(echo "$handoffs" | jq --arg f "$file" --arg feature "$feature" \
                    '. + [{"file": $f, "feature": $feature, "type": "dev-guidance"}]')
            done < <(find "$HANDOFFS_DIR" -maxdepth 1 -name "dev-guidance-*.md" 2>/dev/null || true)
            ;;
        pm)
            while IFS= read -r file; do
                [ -z "$file" ] && continue
                local feature handoff_type
                if [[ "$file" == *"pm-improvement"* ]]; then
                    feature=$(basename "$file" | sed 's/pm-improvement-//' | sed 's/\.md$//')
                    handoff_type="pm-improvement"
                else
                    feature=$(basename "$file" | sed 's/pm-drift-//' | sed 's/\.md$//')
                    handoff_type="pm-drift"
                fi
                handoffs=$(echo "$handoffs" | jq --arg f "$file" --arg feature "$feature" --arg type "$handoff_type" \
                    '. + [{"file": $f, "feature": $feature, "type": $type}]')
            done < <(find "$HANDOFFS_DIR" -maxdepth 1 -name "pm-*.md" ! -name "*.consumed.md" 2>/dev/null || true)
            ;;
        all|*)
            # Get both
            local dev_handoffs pm_handoffs
            dev_handoffs=$(list_handoffs "dev")
            pm_handoffs=$(list_handoffs "pm")
            handoffs=$(echo "$dev_handoffs" "$pm_handoffs" | jq -s 'add')
            ;;
    esac

    echo "$handoffs"
}

# =============================================================================
# CLI Commands
# =============================================================================

_cmd_detect() {
    local feature="$1"
    local checkpoint="$2"

    if [ -z "$feature" ] || [ -z "$checkpoint" ]; then
        echo "Error: Feature and checkpoint required" >&2
        echo "Usage: drift-detector.sh detect <feature> <checkpoint>" >&2
        return 1
    fi

    echo "=== Drift Detection: $feature at $checkpoint ==="
    echo ""

    local drift_report
    drift_report=$(detect_drift "$feature" "$checkpoint")

    # Display summary
    echo "Summary:"
    echo "$drift_report" | jq '.summary'
    echo ""

    # Check for drift and handle
    local has_invalid has_valid
    has_invalid=$(echo "$drift_report" | jq -r '.has_invalid_drift')
    has_valid=$(echo "$drift_report" | jq -r '.has_valid_drift')

    local status="CLEAN"

    if [ "$has_invalid" = "true" ]; then
        echo "Invalid drift detected - generating guidance..."
        local guidance
        guidance=$(handle_invalid_drift "$feature" "$drift_report")
        echo "Guidance written to: $guidance"
        status="HAS_INVALID_DRIFT"
    fi

    if [ "$has_valid" = "true" ]; then
        echo "Valid drift (improvements) detected - escalating to PM..."
        local handoff
        handoff=$(escalate_improvement_to_pm "$feature" "$checkpoint" "$drift_report")
        echo "PM handoff written to: $handoff"
        if [ "$status" = "HAS_INVALID_DRIFT" ]; then
            status="BOTH"
        else
            status="HAS_VALID_DRIFT"
        fi
    fi

    echo ""
    echo "Status: $status"
    echo ""

    # Return full report
    echo "$drift_report"
}

_cmd_parse() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: drift-detector.sh parse <feature>" >&2
        return 1
    fi

    local spec_file="$SPECS_DIR/${feature}/spec.md"

    echo "Parsing acceptance criteria from: $spec_file"
    echo ""

    local result
    result=$(parse_acceptance_criteria "$spec_file")

    echo "$result" | jq '.'
}

_cmd_show() {
    local feature="$1"
    local checkpoint="$2"

    if [ -z "$feature" ] || [ -z "$checkpoint" ]; then
        echo "Error: Feature and checkpoint required" >&2
        echo "Usage: drift-detector.sh show <feature> <checkpoint>" >&2
        return 1
    fi

    local report_file
    report_file=$(_get_drift_report_file "$feature" "$checkpoint")

    if [ ! -f "$report_file" ]; then
        echo "No drift report found: $report_file"
        return 1
    fi

    echo "=== Drift Report: $feature at $checkpoint ==="
    echo ""
    cat "$report_file" | jq '.'
}

_cmd_list_handoffs() {
    local agent="${1:-all}"

    echo "=== Pending Handoffs ($agent) ==="
    echo ""

    local handoffs
    handoffs=$(list_handoffs "$agent")

    local count
    count=$(echo "$handoffs" | jq 'length')

    if [ "$count" -eq 0 ]; then
        echo "No pending handoffs."
    else
        echo "$handoffs" | jq -r '.[] | "[\(.type)] \(.feature): \(.file)"'
    fi
}

_cmd_apply_pm_decision() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: drift-detector.sh apply-pm-decision <feature>" >&2
        return 1
    fi

    echo "Applying PM decision for: $feature"
    echo ""

    local result
    result=$(apply_pm_decision "$feature")

    echo "$result" | jq '.'
}

_show_help() {
    cat << 'EOF'
Drift Detector - Detect implementation drift from acceptance criteria

USAGE:
    drift-detector.sh <command> [arguments]

COMMANDS:
    detect <feature> <checkpoint>
        Run drift detection for a feature at a checkpoint
        - Parses acceptance criteria from spec (if not cached)
        - Checks for // CRITERIA: AC-XXX markers in source
        - Checks for corresponding tests
        - Generates drift report
        - Handles invalid drift (guidance) and valid drift (PM escalation)

    parse <feature>
        Parse spec into acceptance criteria JSON
        - Extracts from Acceptance Criteria / BOSS Criteria section
        - Saves to .specflow/specs/{feature}/acceptance-criteria.json

    show <feature> <checkpoint>
        Show existing drift report
        - Displays report from .specflow/execution/{feature}/drift-reports/

    list-handoffs [agent]
        List pending handoffs
        - agent: dev | pm | all (default: all)
        - Shows uncompleted handoff files

    apply-pm-decision <feature>
        Apply PM decision from handoff
        - Reads decision from pm-improvement or pm-drift handoff
        - Marks handoff as consumed

    help
        Show this help message

FUNCTIONS (when sourced):
    parse_acceptance_criteria(spec_file)
        Parse criteria from spec markdown

    detect_drift(feature, checkpoint)
        Run drift detection

    classify_drift(criterion_id, feature)
        Classify single criterion status

    handle_invalid_drift(feature, drift_report)
        Generate dev guidance for missing criteria

    escalate_improvement_to_pm(feature, checkpoint, drift_report)
        Create PM handoff for improvements

    escalate_drift_to_pm(feature, checkpoint, drift_report)
        Create PM handoff for unresolvable drift

    apply_pm_decision(feature)
        Apply and consume PM decision

    list_handoffs([agent])
        List pending handoffs

DRIFT CLASSIFICATIONS:
    aligned       - Implementation and tests exist with matching criteria
    missing       - Criterion not implemented (invalid drift)
    exceeds_spec  - Implementation exists without criterion (valid drift)
    contradicts   - Implementation contradicts criterion (invalid drift)

HANDOFF PATHS:
    .specflow/handoffs/dev-guidance-{feature}.md   - Dev guidance
    .specflow/handoffs/pm-improvement-{feature}.md - PM improvement review
    .specflow/handoffs/pm-drift-{feature}.md       - PM drift resolution

EXAMPLES:
    # Detect drift at component checkpoint
    drift-detector.sh detect user-auth component-complete

    # Parse spec into criteria
    drift-detector.sh parse user-auth

    # List pending dev handoffs
    drift-detector.sh list-handoffs dev

    # Apply PM decision
    drift-detector.sh apply-pm-decision user-auth

    # Source and use functions
    source scripts/drift-detector.sh
    report=$(detect_drift "my-feature" "component-complete")
    echo "$report" | jq '.summary'
EOF
}

# =============================================================================
# CLI Entry Point
# =============================================================================

# Only run CLI when executed directly, not when sourced
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        case "${1:-help}" in
            detect)
                _cmd_detect "${2:-}" "${3:-}"
                ;;
            parse)
                _cmd_parse "${2:-}"
                ;;
            show)
                _cmd_show "${2:-}" "${3:-}"
                ;;
            list-handoffs)
                _cmd_list_handoffs "${2:-all}"
                ;;
            apply-pm-decision)
                _cmd_apply_pm_decision "${2:-}"
                ;;
            help|--help|-h)
                _show_help
                ;;
            *)
                echo "Unknown command: ${1:-}" >&2
                echo "Run 'drift-detector.sh help' for usage" >&2
                exit 1
                ;;
        esac
    fi
fi
