#!/usr/bin/env bash
set -euo pipefail

# Conflict Resolver - Tiered Dev/QA conflict resolution with escalation chain
# Usage: scripts/conflict-resolver.sh <command> [args]
#
# This script can be sourced by other scripts to use its functions directly:
#   source scripts/conflict-resolver.sh
#
# Commands:
#   create <feature> <type> <details_json> - Create new conflict
#   resolve <feature> <conflict_id>        - Attempt resolution
#   list <feature>                         - List active conflicts
#   show <feature> <conflict_id>           - Show conflict details
#   pm-decision <feature> <conflict_id> <decision> [--criterion <id>] [--add-criterion <id:text>]
#   help                                   - Show this help message

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
EXECUTION_DIR="$SPECFLOW_DIR/execution"
HANDOFFS_DIR="$SPECFLOW_DIR/handoffs"
TEMPLATES_DIR="$SPECFLOW_DIR/templates"
TICKETS_DIR="$SPECFLOW_DIR/tickets"
SPECS_DIR="$SPECFLOW_DIR/specs"

# Constants per architecture decisions
MAX_AUTO_ATTEMPTS=2

# Source parallel-coordinator for state functions
source "$SCRIPT_DIR/parallel-coordinator.sh"

# Source sync-manager for ticket updates
source "$SCRIPT_DIR/sync-manager.sh"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_conflict_log() {
    local level="$1"
    shift
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [conflict] [$level] $*"
}

_ensure_conflict_dir() {
    local feature="$1"
    mkdir -p "$EXECUTION_DIR/${feature}/conflicts"
    mkdir -p "$HANDOFFS_DIR"
}

_get_conflicts_dir() {
    local feature="$1"
    echo "$EXECUTION_DIR/${feature}/conflicts"
}

_get_conflict_file() {
    local feature="$1"
    local conflict_id="$2"
    echo "$(_get_conflicts_dir "$feature")/${conflict_id}.json"
}

# =============================================================================
# Core Conflict Functions
# =============================================================================

create_conflict() {
    # Create a new conflict record
    # Arguments: feature, conflict_type (file|logic|spec), details_json
    # Returns: conflict_id

    local feature="$1"
    local conflict_type="$2"
    local details_json="$3"

    if [ -z "$feature" ] || [ -z "$conflict_type" ] || [ -z "$details_json" ]; then
        echo '{"error": "Feature, conflict_type, and details_json required"}' >&2
        return 1
    fi

    _conflict_log "INFO" "Creating $conflict_type conflict for feature: $feature"

    _ensure_conflict_dir "$feature"

    # Generate conflict ID
    local conflict_id
    conflict_id="CONF-$(date +%s)"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local conflicts_dir
    conflicts_dir=$(_get_conflicts_dir "$feature")

    local conflict_file="${conflicts_dir}/${conflict_id}.json"

    # Extract affected_path from details if present
    local affected_path
    affected_path=$(echo "$details_json" | jq -r '.affected_path // ""')

    # Create conflict record
    jq -n \
        --arg id "$conflict_id" \
        --arg feature "$feature" \
        --arg type "$conflict_type" \
        --arg created "$timestamp" \
        --arg path "$affected_path" \
        --argjson details "$details_json" \
        '{
            conflict_id: $id,
            feature: $feature,
            checkpoint: "",
            type: $type,
            status: "pending",
            created: $created,
            resolution_attempts: 0,
            affected_path: $path,
            dev_position: {
                claim: "",
                rationale: "",
                affected_files: []
            },
            qa_position: {
                claim: "",
                rationale: "",
                affected_files: []
            },
            related_criteria: [],
            escalation_history: [],
            ticket_updates: [],
            details: $details
        }' > "$conflict_file"

    _conflict_log "INFO" "Created conflict: $conflict_id"

    # Update ticket with conflict notification
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Conflict ${conflict_id} created: ${conflict_type} conflict detected. Auto-resolution will be attempted."
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
            _conflict_log "INFO" "Ticket #$epic_number notified of conflict"

            # Record ticket update in conflict file
            jq --arg ts "$timestamp" --arg msg "$comment" \
                '.ticket_updates += [{"timestamp": $ts, "message": $msg}]' \
                "$conflict_file" > "${conflict_file}.tmp"
            mv "${conflict_file}.tmp" "$conflict_file"
        fi
    fi

    echo "$conflict_id"
}

resolve_conflict() {
    # Attempt to resolve a conflict through tiered resolution
    # Arguments: feature, conflict_id
    # Returns: JSON with resolution result

    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo '{"error": "Feature and conflict_id required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Resolving conflict: $conflict_id for feature: $feature"

    # Load conflict
    local conflict
    conflict=$(cat "$conflict_file")

    local conflict_type status resolution_attempts affected_path
    conflict_type=$(echo "$conflict" | jq -r '.type')
    status=$(echo "$conflict" | jq -r '.status')
    resolution_attempts=$(echo "$conflict" | jq -r '.resolution_attempts')
    affected_path=$(echo "$conflict" | jq -r '.affected_path // ""')

    # Check if already resolved
    if [ "$status" = "resolved" ]; then
        _conflict_log "INFO" "Conflict $conflict_id already resolved"
        echo '{"resolved": true, "already_resolved": true, "conflict_id": "'"$conflict_id"'"}'
        return 0
    fi

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # =================================
    # Tier 1: Auto-resolve based on type
    # =================================
    case "$conflict_type" in
        file)
            # Dev owns src/**, QA owns tests/**
            if [[ "$affected_path" == src/* ]] || [[ "$affected_path" == lib/* ]] || [[ "$affected_path" == app/* ]]; then
                _conflict_log "INFO" "Auto-resolving: Dev wins for source file: $affected_path"

                # Apply git resolution (Dev wins = --theirs from feature branch perspective)
                git checkout --theirs "$affected_path" 2>/dev/null || {
                    _conflict_log "WARN" "Could not checkout file: $affected_path"
                }

                record_resolution "$feature" "$conflict_id" "auto:dev-wins-src"
                echo '{"resolved": true, "resolution": "auto:dev-wins-src", "conflict_id": "'"$conflict_id"'"}'
                return 0

            elif [[ "$affected_path" == tests/* ]] || \
                 [[ "$affected_path" == __tests__/* ]] || \
                 [[ "$affected_path" == *test* ]] || \
                 [[ "$affected_path" == *spec* ]] || \
                 [[ "$affected_path" == *.feature ]]; then
                _conflict_log "INFO" "Auto-resolving: QA wins for test file: $affected_path"

                # Apply git resolution (QA wins = --ours from feature branch perspective)
                git checkout --ours "$affected_path" 2>/dev/null || {
                    _conflict_log "WARN" "Could not checkout file: $affected_path"
                }

                record_resolution "$feature" "$conflict_id" "auto:qa-wins-tests"
                echo '{"resolved": true, "resolution": "auto:qa-wins-tests", "conflict_id": "'"$conflict_id"'"}'
                return 0
            fi
            ;;

        logic|spec)
            # Logic and spec conflicts need more careful handling
            if [ "$resolution_attempts" -lt "$MAX_AUTO_ATTEMPTS" ]; then
                _conflict_log "INFO" "Requesting clarification (attempt $((resolution_attempts + 1)) of $MAX_AUTO_ATTEMPTS)"
                request_conflict_clarification "$feature" "$conflict_id"
                echo '{"resolved": false, "status": "clarification_requested", "attempts": '"$((resolution_attempts + 1))"', "conflict_id": "'"$conflict_id"'"}'
                return 1
            fi
            ;;
    esac

    # =================================
    # Tier 2: Escalate to PM if auto-resolve fails
    # =================================
    _conflict_log "INFO" "Auto-resolve failed, escalating to PM"

    local handoff_file
    handoff_file=$(escalate_to_pm "$feature" "$conflict_id")

    echo '{"resolved": false, "escalated": "pm", "handoff": "'"$handoff_file"'", "conflict_id": "'"$conflict_id"'"}'
    return 1
}

record_resolution() {
    # Record conflict resolution
    # Arguments: feature, conflict_id, resolution_type
    # Returns: updated conflict JSON

    local feature="$1"
    local conflict_id="$2"
    local resolution_type="$3"

    if [ -z "$feature" ] || [ -z "$conflict_id" ] || [ -z "$resolution_type" ]; then
        echo '{"error": "Feature, conflict_id, and resolution_type required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Recording resolution for $conflict_id: $resolution_type"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local affected_path
    affected_path=$(jq -r '.affected_path // ""' "$conflict_file")

    # Update conflict file
    jq --arg ts "$timestamp" --arg res "$resolution_type" \
        '.status = "resolved" |
         .resolved = $ts |
         .resolution_type = $res |
         .escalation_history += [{"timestamp": $ts, "action": "resolved", "resolution": $res}]' \
        "$conflict_file" > "${conflict_file}.tmp"
    mv "${conflict_file}.tmp" "$conflict_file"

    # Update state.json if exists
    local state_file="$EXECUTION_DIR/${feature}/state.json"
    if [ -f "$state_file" ]; then
        jq --arg id "$conflict_id" --arg res "$resolution_type" --arg ts "$timestamp" \
            '.resolved_conflicts = ((.resolved_conflicts // []) + [{
                conflict_id: $id,
                resolution: $res,
                timestamp: $ts
            }])' \
            "$state_file" > "${state_file}.tmp"
        mv "${state_file}.tmp" "$state_file"
    fi

    # Update ticket
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Conflict ${conflict_id} resolved: ${resolution_type}. Affected files: ${affected_path}"
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
            _conflict_log "INFO" "Ticket #$epic_number notified of resolution"

            # Record ticket update in conflict file
            jq --arg ts "$timestamp" --arg msg "$comment" \
                '.ticket_updates += [{"timestamp": $ts, "message": $msg}]' \
                "$conflict_file" > "${conflict_file}.tmp"
            mv "${conflict_file}.tmp" "$conflict_file"
        fi
    fi

    _conflict_log "INFO" "Resolution recorded for $conflict_id"

    cat "$conflict_file"
}

request_conflict_clarification() {
    # Request clarification from agents for ambiguous conflict
    # Arguments: feature, conflict_id
    # Returns: path to clarification request file

    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo '{"error": "Feature and conflict_id required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Requesting clarification for conflict: $conflict_id"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Increment resolution attempts
    jq --arg ts "$timestamp" \
        '.resolution_attempts += 1 |
         .status = "clarification_requested" |
         .escalation_history += [{"timestamp": $ts, "action": "clarification_requested"}]' \
        "$conflict_file" > "${conflict_file}.tmp"
    mv "${conflict_file}.tmp" "$conflict_file"

    # Create clarification request file
    local clarification_file="$HANDOFFS_DIR/clarify-${conflict_id}.md"

    local conflict_type affected_path
    conflict_type=$(jq -r '.type' "$conflict_file")
    affected_path=$(jq -r '.affected_path // "unknown"' "$conflict_file")

    cat > "$clarification_file" << EOF
# Clarification Request: ${conflict_id}

**Feature:** ${feature}
**Conflict Type:** ${conflict_type}
**Affected Path:** ${affected_path}
**Generated:** ${timestamp}
**Status:** REQUIRES_CLARIFICATION

## Conflict Details

$(jq -r '.details | to_entries | map("- \(.key): \(.value)") | join("\n")' "$conflict_file")

## Requested Information

- [ ] Dev: Please explain your reasoning for changes to \`${affected_path}\`
- [ ] QA: Please explain your reasoning for changes to \`${affected_path}\`

## Resolution Options

1. **Accept Dev's approach** - Dev's implementation takes precedence
2. **Accept QA's approach** - QA's test requirements take precedence
3. **Escalate to PM** - Requires PM judgment on spec interpretation

## Response Instructions

Add your clarification below and check the box when complete:

### Dev Response
\`\`\`
[Add response here]
\`\`\`

### QA Response
\`\`\`
[Add response here]
\`\`\`

---

After clarification, run: \`scripts/conflict-resolver.sh resolve ${feature} ${conflict_id}\`
EOF

    # Update ticket with clarification request
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Conflict ${conflict_id} requires clarification. See: $clarification_file"
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
        fi
    fi

    _conflict_log "INFO" "Clarification request created: $clarification_file"

    echo "$clarification_file"
}

# =============================================================================
# Escalation Functions
# =============================================================================

escalate_to_pm() {
    # Escalate conflict to PM for resolution
    # Arguments: feature, conflict_id
    # Returns: path to PM handoff file

    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo '{"error": "Feature and conflict_id required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Escalating conflict $conflict_id to PM"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Load conflict details
    local conflict
    conflict=$(cat "$conflict_file")

    local conflict_type affected_path dev_claim qa_claim related_criteria
    conflict_type=$(echo "$conflict" | jq -r '.type')
    affected_path=$(echo "$conflict" | jq -r '.affected_path // "unknown"')
    dev_claim=$(echo "$conflict" | jq -r '.dev_position.claim // "Not specified"')
    qa_claim=$(echo "$conflict" | jq -r '.qa_position.claim // "Not specified"')
    related_criteria=$(echo "$conflict" | jq -r '.related_criteria // [] | join(", ")' | sed 's/^$/None specified/')

    # Update conflict status
    jq --arg ts "$timestamp" \
        '.status = "pending_pm" |
         .escalation_history += [{"timestamp": $ts, "action": "escalated_to_pm"}]' \
        "$conflict_file" > "${conflict_file}.tmp"
    mv "${conflict_file}.tmp" "$conflict_file"

    # Create PM handoff file
    local handoff_file="$HANDOFFS_DIR/pm-conflict-${conflict_id}.md"

    cat > "$handoff_file" << EOF
# PM Conflict Resolution: ${conflict_id}

**Feature:** ${feature}
**Conflict Type:** ${conflict_type}
**Affected Path:** ${affected_path}
**Generated:** ${timestamp}
**Status:** PENDING_PM_DECISION

## Conflict Summary

This conflict could not be automatically resolved after $MAX_AUTO_ATTEMPTS attempts.

## Dev Position

**Claim:** ${dev_claim}
**Rationale:** $(echo "$conflict" | jq -r '.dev_position.rationale // "Not provided"')
**Affected Files:** $(echo "$conflict" | jq -r '.dev_position.affected_files // [] | join(", ")' | sed 's/^$/None specified/')

## QA Position

**Claim:** ${qa_claim}
**Rationale:** $(echo "$conflict" | jq -r '.qa_position.rationale // "Not provided"')
**Affected Files:** $(echo "$conflict" | jq -r '.qa_position.affected_files // [] | join(", ")' | sed 's/^$/None specified/')

## Related Acceptance Criteria

${related_criteria}

## Resolution Options

- [ ] **Option 1: Accept Dev's approach**
  - Implementation as Dev proposes
  - May require updating tests to match

- [ ] **Option 2: Accept QA's approach**
  - Implementation follows QA's test expectations
  - May require refactoring implementation

- [ ] **Option 3: Escalate to user**
  - Neither Dev nor QA position is clearly correct
  - Requires human judgment on feature intent

## PM Decision (fill in)

**Selected Option:** ___
**Reasoning:** ___
**Criterion to Update (if any):** ___
**New Criterion Text (if needed):** ___

## Apply Decision

After filling in decision, run:
\`\`\`bash
scripts/conflict-resolver.sh pm-decision ${feature} ${conflict_id} <dev|qa|user> [--criterion <id>] [--add-criterion <id:text>]
\`\`\`

---

*PM Conflict Handoff - SpecFlow*
EOF

    # Update ticket
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Conflict ${conflict_id} escalated to PM for resolution. See: $handoff_file"
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
        fi
    fi

    _conflict_log "INFO" "PM handoff created: $handoff_file"

    echo "$handoff_file"
}

escalate_to_user() {
    # Escalate conflict to user (from PM)
    # Arguments: feature, conflict_id
    # Returns: path to user escalation file

    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo '{"error": "Feature and conflict_id required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Escalating conflict $conflict_id to user"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Load conflict details
    local conflict
    conflict=$(cat "$conflict_file")

    local conflict_type affected_path
    conflict_type=$(echo "$conflict" | jq -r '.type')
    affected_path=$(echo "$conflict" | jq -r '.affected_path // "unknown"')

    # Update conflict status
    jq --arg ts "$timestamp" \
        '.status = "pending_user" |
         .escalation_history += [{"timestamp": $ts, "action": "escalated_to_user"}]' \
        "$conflict_file" > "${conflict_file}.tmp"
    mv "${conflict_file}.tmp" "$conflict_file"

    # Create user escalation file
    local escalation_file="$HANDOFFS_DIR/user-conflict-${conflict_id}.md"

    # Check if PM handoff exists for context
    local pm_handoff="$HANDOFFS_DIR/pm-conflict-${conflict_id}.md"
    local pm_context=""
    if [ -f "$pm_handoff" ]; then
        pm_context=$(cat "$pm_handoff")
    fi

    cat > "$escalation_file" << EOF
# User Decision Required: ${conflict_id}

**Feature:** ${feature}
**Conflict Type:** ${conflict_type}
**Affected Path:** ${affected_path}
**Generated:** ${timestamp}
**Status:** REQUIRES_USER_DECISION

## Why This Needs Your Input

PM was unable to resolve this conflict. The ambiguity requires human judgment on the intended feature behavior.

## Full Context

${pm_context}

## Escalation History

$(echo "$conflict" | jq -r '.escalation_history | map("- \(.timestamp): \(.action)") | join("\n")')

## Your Decision

Please indicate your decision:

- [ ] **Accept Dev's approach** - The implementation is correct, tests should adapt
- [ ] **Accept QA's approach** - The tests are correct, implementation should change
- [ ] **Clarify the spec** - Update acceptance criteria to resolve ambiguity

**Your reasoning:** ___

## After Decision

Run:
\`\`\`bash
scripts/conflict-resolver.sh pm-decision ${feature} ${conflict_id} <dev|qa> [--criterion <id>] [--add-criterion <id:text>]
\`\`\`

---

*User Escalation - SpecFlow*
EOF

    # Update ticket
    local mapping_file="$TICKETS_DIR/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            local comment="Conflict ${conflict_id} escalated to user - PM unable to resolve. See: $escalation_file"
            tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
        fi
    fi

    _conflict_log "INFO" "User escalation created: $escalation_file"

    echo "$escalation_file"
}

apply_pm_decision() {
    # Apply PM's decision on a conflict
    # Arguments: feature, conflict_id, decision (dev|qa|user), [criterion_id], [add_new_criterion], [new_criterion_id], [new_criterion_text]
    # Returns: JSON with result

    local feature="$1"
    local conflict_id="$2"
    local decision="$3"
    local criterion_id="${4:-}"
    local add_new_criterion="${5:-false}"
    local new_criterion_id="${6:-}"
    local new_criterion_text="${7:-}"

    if [ -z "$feature" ] || [ -z "$conflict_id" ] || [ -z "$decision" ]; then
        echo '{"error": "Feature, conflict_id, and decision required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    _conflict_log "INFO" "Applying PM decision for $conflict_id: $decision"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # If decision is "user", escalate to user and return early
    if [ "$decision" = "user" ]; then
        local escalation_file
        escalation_file=$(escalate_to_user "$feature" "$conflict_id")
        echo '{"applied": false, "escalated": "user", "file": "'"$escalation_file"'", "conflict_id": "'"$conflict_id"'"}'
        return 0
    fi

    # Validate decision
    if [ "$decision" != "dev" ] && [ "$decision" != "qa" ]; then
        echo '{"error": "Decision must be dev, qa, or user", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    # Load conflict to get affected_path
    local conflict affected_path
    conflict=$(cat "$conflict_file")
    affected_path=$(echo "$conflict" | jq -r '.affected_path // ""')

    # Apply git resolution based on decision
    if [ -n "$affected_path" ] && [ "$affected_path" != "" ]; then
        if [ "$decision" = "dev" ]; then
            git checkout --theirs "$affected_path" 2>/dev/null || {
                _conflict_log "WARN" "Could not checkout file: $affected_path (may not be in conflict state)"
            }
        else
            git checkout --ours "$affected_path" 2>/dev/null || {
                _conflict_log "WARN" "Could not checkout file: $affected_path (may not be in conflict state)"
            }
        fi
    fi

    # Record resolution
    record_resolution "$feature" "$conflict_id" "pm:${decision}"

    # Update spec file if decision affects acceptance criteria
    local spec_file="$SPECS_DIR/${feature}/spec.md"
    local spec_updated=false

    if [ -f "$spec_file" ]; then
        # 1. Find Acceptance Criteria section line
        local ac_section_line
        ac_section_line=$(grep -n "^## Acceptance Criteria\|^## BOSS Criteria" "$spec_file" | head -1 | cut -d: -f1)

        # 2. If criterion_id provided, locate and update specific criterion
        if [ -n "$criterion_id" ]; then
            # Find line with criterion ID
            local criterion_line
            criterion_line=$(grep -n "$criterion_id" "$spec_file" | head -1 | cut -d: -f1)

            if [ -n "$criterion_line" ]; then
                # Update criterion based on decision
                if [ "$decision" = "dev" ]; then
                    # Keep Dev's interpretation - clarify criterion text
                    sed -i.bak "${criterion_line}s/$/ [Clarified: Dev interpretation accepted per ${conflict_id}]/" "$spec_file"
                else
                    # Keep QA's interpretation
                    sed -i.bak "${criterion_line}s/$/ [Clarified: QA interpretation accepted per ${conflict_id}]/" "$spec_file"
                fi
                rm -f "${spec_file}.bak"
                spec_updated=true
                _conflict_log "INFO" "Updated criterion $criterion_id in spec"
            fi
        fi

        # 3. If new criterion needed, append to Acceptance Criteria section
        if [ "$add_new_criterion" = "true" ] && [ -n "$new_criterion_id" ] && [ -n "$new_criterion_text" ]; then
            if [ -n "$ac_section_line" ]; then
                # Find next section (next ## line) or end of file
                local next_section_line
                next_section_line=$(tail -n "+$((ac_section_line + 1))" "$spec_file" | grep -n "^## " | head -1 | cut -d: -f1)

                local insert_line
                if [ -n "$next_section_line" ]; then
                    insert_line=$((ac_section_line + next_section_line - 1))
                else
                    # No next section, append before EOF
                    insert_line=$(wc -l < "$spec_file")
                fi

                # Insert new criterion
                local new_line="- [ ] ${new_criterion_id}: ${new_criterion_text} [Added per ${conflict_id}]"
                sed -i.bak "${insert_line}a\\
${new_line}
" "$spec_file"
                rm -f "${spec_file}.bak"
                spec_updated=true
                _conflict_log "INFO" "Added new criterion $new_criterion_id to spec"
            fi
        fi

        # 4. Commit spec change if updated
        if [ "$spec_updated" = "true" ]; then
            git add "$spec_file" 2>/dev/null || true
            git commit -m "spec(${feature}): update criteria per PM decision ${conflict_id}

Decision: ${decision}
Criterion: ${criterion_id:-N/A}
Conflict: ${conflict_id}" 2>/dev/null || {
                _conflict_log "WARN" "Could not commit spec update (may need manual commit)"
            }

            # Update ticket with spec change notification
            local mapping_file="$TICKETS_DIR/${feature}.json"
            if [ -f "$mapping_file" ]; then
                local epic_number
                epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
                if [ "$epic_number" != "0" ]; then
                    local comment="Spec updated per PM decision on ${conflict_id}. Criterion: ${criterion_id:-N/A}"
                    tracker_add_comment "$epic_number" "$comment" 2>/dev/null || true
                fi
            fi
        fi
    fi

    # Mark PM handoff as consumed
    local pm_handoff="$HANDOFFS_DIR/pm-conflict-${conflict_id}.md"
    if [ -f "$pm_handoff" ]; then
        local consumed_file="${pm_handoff%.md}.consumed.md"
        mv "$pm_handoff" "$consumed_file"
        echo "" >> "$consumed_file"
        echo "---" >> "$consumed_file"
        echo "**Consumed:** ${timestamp}" >> "$consumed_file"
        echo "**Decision Applied:** ${decision}" >> "$consumed_file"
        _conflict_log "INFO" "PM handoff marked as consumed"
    fi

    echo '{"applied": true, "decision": "'"$decision"'", "spec_updated": '"$spec_updated"', "conflict_id": "'"$conflict_id"'"}'
}

# =============================================================================
# Query Functions
# =============================================================================

list_conflicts() {
    # List all conflicts for a feature
    # Arguments: feature
    # Returns: JSON array of conflicts

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature required"}' >&2
        return 1
    fi

    local conflicts_dir
    conflicts_dir=$(_get_conflicts_dir "$feature")

    if [ ! -d "$conflicts_dir" ]; then
        echo '[]'
        return 0
    fi

    local conflicts="[]"

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local conflict_data
            conflict_data=$(cat "$file")
            local conflict_id status conflict_type created
            conflict_id=$(echo "$conflict_data" | jq -r '.conflict_id // "unknown"')
            status=$(echo "$conflict_data" | jq -r '.status // "unknown"')
            conflict_type=$(echo "$conflict_data" | jq -r '.type // "unknown"')
            created=$(echo "$conflict_data" | jq -r '.created // "unknown"')

            conflicts=$(echo "$conflicts" | jq \
                --arg id "$conflict_id" \
                --arg status "$status" \
                --arg type "$conflict_type" \
                --arg created "$created" \
                --arg file "$file" \
                '. + [{
                    conflict_id: $id,
                    status: $status,
                    type: $type,
                    created: $created,
                    file: $file
                }]')
        fi
    done < <(find "$conflicts_dir" -maxdepth 1 -name "CONF-*.json" 2>/dev/null | sort)

    echo "$conflicts"
}

show_conflict() {
    # Show details of a specific conflict
    # Arguments: feature, conflict_id
    # Returns: conflict JSON

    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo '{"error": "Feature and conflict_id required"}' >&2
        return 1
    fi

    local conflict_file
    conflict_file=$(_get_conflict_file "$feature" "$conflict_id")

    if [ ! -f "$conflict_file" ]; then
        echo '{"error": "Conflict not found", "conflict_id": "'"$conflict_id"'"}'
        return 1
    fi

    cat "$conflict_file"
}

# =============================================================================
# CLI Commands
# =============================================================================

_cmd_create() {
    local feature="$1"
    local conflict_type="$2"
    local details_json="$3"

    if [ -z "$feature" ] || [ -z "$conflict_type" ] || [ -z "$details_json" ]; then
        echo "Error: Feature, type, and details_json required" >&2
        echo "Usage: conflict-resolver.sh create <feature> <type> <details_json>" >&2
        echo "Types: file, logic, spec" >&2
        return 1
    fi

    echo "=== Creating Conflict ==="
    echo ""
    local conflict_id
    conflict_id=$(create_conflict "$feature" "$conflict_type" "$details_json")
    echo "Created: $conflict_id"
}

_cmd_resolve() {
    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo "Error: Feature and conflict_id required" >&2
        echo "Usage: conflict-resolver.sh resolve <feature> <conflict_id>" >&2
        return 1
    fi

    echo "=== Resolving Conflict: $conflict_id ==="
    echo ""
    resolve_conflict "$feature" "$conflict_id"
}

_cmd_list() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature required" >&2
        echo "Usage: conflict-resolver.sh list <feature>" >&2
        return 1
    fi

    echo "=== Conflicts for: $feature ==="
    echo ""
    list_conflicts "$feature" | jq '.'
}

_cmd_show() {
    local feature="$1"
    local conflict_id="$2"

    if [ -z "$feature" ] || [ -z "$conflict_id" ]; then
        echo "Error: Feature and conflict_id required" >&2
        echo "Usage: conflict-resolver.sh show <feature> <conflict_id>" >&2
        return 1
    fi

    echo "=== Conflict: $conflict_id ==="
    echo ""
    show_conflict "$feature" "$conflict_id" | jq '.'
}

_cmd_pm_decision() {
    local feature="$1"
    local conflict_id="$2"
    local decision="$3"
    shift 3 2>/dev/null || true

    if [ -z "$feature" ] || [ -z "$conflict_id" ] || [ -z "$decision" ]; then
        echo "Error: Feature, conflict_id, and decision required" >&2
        echo "Usage: conflict-resolver.sh pm-decision <feature> <conflict_id> <decision> [--criterion <id>] [--add-criterion <id:text>]" >&2
        echo "Decisions: dev, qa, user" >&2
        return 1
    fi

    # Parse optional flags
    local criterion_id=""
    local add_new_criterion="false"
    local new_criterion_id=""
    local new_criterion_text=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --criterion)
                criterion_id="$2"
                shift 2
                ;;
            --add-criterion)
                add_new_criterion="true"
                # Parse id:text format
                new_criterion_id=$(echo "$2" | cut -d: -f1)
                new_criterion_text=$(echo "$2" | cut -d: -f2-)
                shift 2
                ;;
            *)
                echo "Unknown option: $1" >&2
                shift
                ;;
        esac
    done

    echo "=== Applying PM Decision ==="
    echo ""
    apply_pm_decision "$feature" "$conflict_id" "$decision" "$criterion_id" "$add_new_criterion" "$new_criterion_id" "$new_criterion_text"
}

_show_help() {
    cat << 'EOF'
Conflict Resolver - Tiered Dev/QA conflict resolution with escalation chain

USAGE:
    conflict-resolver.sh <command> [arguments]

COMMANDS:
    create <feature> <type> <details_json>
        Create a new conflict record
        Types: file, logic, spec
        details_json: JSON object with affected_path, agent, etc.
        Returns: conflict_id

    resolve <feature> <conflict_id>
        Attempt to resolve a conflict through tiered resolution
        Tier 1: Auto-resolve (Dev wins src/, QA wins tests/)
        Tier 2: Escalate to PM after 2 failed attempts
        Tier 3: PM escalates to user if needed

    list <feature>
        List all conflicts for a feature
        Returns: JSON array with conflict summaries

    show <feature> <conflict_id>
        Show full details of a specific conflict
        Returns: complete conflict JSON

    pm-decision <feature> <conflict_id> <decision> [options]
        Apply PM's decision on a conflict
        Decisions: dev, qa, user
        Options:
            --criterion <id>           Update existing criterion by ID
            --add-criterion <id:text>  Add new criterion to spec

    help
        Show this help message

FUNCTIONS (when sourced):
    create_conflict(feature, conflict_type, details_json)
        Create new conflict record

    resolve_conflict(feature, conflict_id)
        Attempt tiered resolution

    record_resolution(feature, conflict_id, resolution_type)
        Record resolution outcome

    request_conflict_clarification(feature, conflict_id)
        Request clarification from agents

    escalate_to_pm(feature, conflict_id)
        Escalate to PM for decision

    escalate_to_user(feature, conflict_id)
        Escalate to user (from PM)

    apply_pm_decision(feature, conflict_id, decision, ...)
        Apply PM's decision with optional spec updates

    list_conflicts(feature)
        List all conflicts

    show_conflict(feature, conflict_id)
        Get conflict details

RESOLUTION TIERS:
    Tier 1 - Auto-resolve (file conflicts):
        - Dev owns: src/**, lib/**, app/**
        - QA owns: tests/**, __tests__/**, *.test.*, *.spec.*, *.feature

    Tier 2 - PM escalation (after 2 attempts):
        - Logic conflicts
        - Spec interpretation conflicts
        - File conflicts outside ownership rules

    Tier 3 - User escalation:
        - PM cannot make decision
        - Requires human judgment on feature intent

EXAMPLES:
    # Create a file conflict
    conflict-resolver.sh create user-auth file '{"affected_path": "src/auth.ts", "agent": "qa"}'

    # Attempt resolution
    conflict-resolver.sh resolve user-auth CONF-1706644800

    # List all conflicts
    conflict-resolver.sh list user-auth

    # Show conflict details
    conflict-resolver.sh show user-auth CONF-1706644800

    # Apply PM decision (accept Dev's approach)
    conflict-resolver.sh pm-decision user-auth CONF-1706644800 dev

    # Apply PM decision with criterion update
    conflict-resolver.sh pm-decision user-auth CONF-1706644800 qa --criterion AC-003

    # Apply PM decision with new criterion
    conflict-resolver.sh pm-decision user-auth CONF-1706644800 dev --add-criterion "AC-010:New requirement text"

    # Source and use functions
    source scripts/conflict-resolver.sh
    conflict_id=$(create_conflict "my-feature" "logic" '{"details": "test"}')
    resolve_conflict "my-feature" "$conflict_id"
EOF
}

# =============================================================================
# CLI Entry Point
# =============================================================================

# Only run CLI when executed directly, not when sourced
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        case "${1:-help}" in
            create)
                _cmd_create "${2:-}" "${3:-}" "${4:-}"
                ;;
            resolve)
                _cmd_resolve "${2:-}" "${3:-}"
                ;;
            list)
                _cmd_list "${2:-}"
                ;;
            show)
                _cmd_show "${2:-}" "${3:-}"
                ;;
            pm-decision)
                shift
                _cmd_pm_decision "$@"
                ;;
            help|--help|-h)
                _show_help
                ;;
            *)
                echo "Unknown command: ${1:-}" >&2
                echo "Run 'conflict-resolver.sh help' for usage" >&2
                exit 1
                ;;
        esac
    fi
fi
