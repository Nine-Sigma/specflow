#!/usr/bin/env bash
set -euo pipefail

# Checkpoint Merge - Dev/QA checkpoint merge coordination
# Usage: scripts/checkpoint-merge.sh <command> [args]
#
# This script can be sourced by other scripts to use its functions directly:
#   source scripts/checkpoint-merge.sh
#
# Commands:
#   merge <feature> <checkpoint>        - Force merge at checkpoint
#   signal <feature> <agent> <checkpoint> - Signal checkpoint readiness
#   status <feature>                    - Show checkpoint status
#   list-checkpoints <feature>          - List completed checkpoints
#   help                                - Show this help message

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
EXECUTION_DIR="$SPECFLOW_DIR/execution"
WORKTREES_DIR="$SPECFLOW_DIR/worktrees"
TEMPLATES_DIR="$SPECFLOW_DIR/templates"

# Valid checkpoint types
CHECKPOINT_TYPES=("component-complete" "feature-complete")

# Source parallel-coordinator for state functions
source "$SCRIPT_DIR/parallel-coordinator.sh"

# Source sync-manager for ticket updates
source "$SCRIPT_DIR/sync-manager.sh"

# Source drift-detector for drift detection
source "$SCRIPT_DIR/drift-detector.sh"

# Source conflict-resolver for conflict handling
source "$SCRIPT_DIR/conflict-resolver.sh"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_checkpoint_log() {
    local level="$1"
    shift
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [checkpoint] [$level] $*"
}

_ensure_checkpoint_dir() {
    local feature="$1"
    mkdir -p "$EXECUTION_DIR/${feature}/merge-results"
    mkdir -p "$EXECUTION_DIR/${feature}/conflicts"
    mkdir -p "$EXECUTION_DIR/${feature}/dev"
    mkdir -p "$EXECUTION_DIR/${feature}/qa"
}

_validate_checkpoint_type() {
    local checkpoint="$1"
    for valid in "${CHECKPOINT_TYPES[@]}"; do
        if [ "$checkpoint" = "$valid" ]; then
            return 0
        fi
    done
    echo "Invalid checkpoint type: $checkpoint. Valid types: ${CHECKPOINT_TYPES[*]}" >&2
    return 1
}

# =============================================================================
# Core Checkpoint Functions
# =============================================================================

save_checkpoint_diff() {
    # Save diff for an agent at checkpoint
    # Arguments: feature, checkpoint, agent (dev|qa)
    # Returns: Path to diff file

    local feature="$1"
    local checkpoint="$2"
    local agent="$3"

    if [ -z "$feature" ] || [ -z "$checkpoint" ] || [ -z "$agent" ]; then
        echo '{"error": "Feature, checkpoint, and agent required"}' >&2
        return 1
    fi

    _ensure_checkpoint_dir "$feature"

    local diff_file="$EXECUTION_DIR/${feature}/${agent}/${checkpoint}.diff"
    local feature_branch="feature/${feature}"
    local agent_branch="${feature}-${agent}"

    _checkpoint_log "INFO" "Saving $agent diff for checkpoint: $checkpoint"

    # Save the diff
    git diff "${feature_branch}...${agent_branch}" > "$diff_file" 2>/dev/null || {
        _checkpoint_log "WARN" "Could not generate diff for $agent branch"
        touch "$diff_file"  # Create empty diff file
    }

    echo "$diff_file"
}

handle_merge_conflict() {
    # Handle merge conflict during checkpoint
    # Arguments: feature, agent, checkpoint
    # Returns: JSON with conflict info
    # Uses conflict-resolver.sh for proper conflict tracking and resolution

    local feature="$1"
    local agent="$2"
    local checkpoint="$3"
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    _checkpoint_log "ERROR" "Merge conflict detected for $agent at checkpoint: $checkpoint"

    _ensure_checkpoint_dir "$feature"

    # Get conflicted files
    local conflicts
    conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")

    local resolved_count=0
    local unresolved_count=0
    local conflict_ids="[]"

    # Process each conflicted file through conflict-resolver
    for file in $conflicts; do
        [ -z "$file" ] && continue

        _checkpoint_log "INFO" "Processing conflict for file: $file"

        # Create conflict record via conflict-resolver
        local conflict_id
        conflict_id=$(create_conflict "$feature" "file" "{\"affected_path\": \"$file\", \"agent\": \"$agent\", \"checkpoint\": \"$checkpoint\"}")

        conflict_ids=$(echo "$conflict_ids" | jq --arg id "$conflict_id" '. + [$id]')

        # Attempt resolution
        local resolve_result
        resolve_result=$(resolve_conflict "$feature" "$conflict_id" 2>/dev/null) || resolve_result='{"resolved": false}'

        if echo "$resolve_result" | jq -e '.resolved == true' >/dev/null 2>&1; then
            resolved_count=$((resolved_count + 1))
            _checkpoint_log "INFO" "Conflict $conflict_id resolved automatically"
        else
            unresolved_count=$((unresolved_count + 1))
            _checkpoint_log "WARN" "Conflict $conflict_id requires escalation"
        fi
    done

    # Also write legacy conflict marker file for backwards compatibility
    local conflict_file="$EXECUTION_DIR/${feature}/conflicts/merge-${checkpoint}-${agent}.json"
    local conflicted_files
    conflicted_files=$(echo "$conflicts" | jq -R -s 'split("\n") | map(select(length > 0))')
    jq -n \
        --arg feature "$feature" \
        --arg agent "$agent" \
        --arg checkpoint "$checkpoint" \
        --arg timestamp "$timestamp" \
        --argjson files "$conflicted_files" \
        --argjson conflict_ids "$conflict_ids" \
        --argjson resolved "$resolved_count" \
        --argjson unresolved "$unresolved_count" \
        '{
            feature: $feature,
            agent: $agent,
            checkpoint: $checkpoint,
            timestamp: $timestamp,
            conflicted_files: $files,
            conflict_ids: $conflict_ids,
            resolved: $resolved,
            unresolved: $unresolved,
            status: (if $unresolved > 0 then "conflict" else "resolved" end)
        }' > "$conflict_file"

    # Return conflict info
    jq -n \
        --arg feature "$feature" \
        --arg agent "$agent" \
        --arg checkpoint "$checkpoint" \
        --argjson files "$conflicted_files" \
        --argjson conflict_ids "$conflict_ids" \
        --argjson resolved "$resolved_count" \
        --argjson unresolved "$unresolved_count" \
        '{
            conflict: ($unresolved > 0),
            feature: $feature,
            agent: $agent,
            checkpoint: $checkpoint,
            files: $files,
            conflict_ids: $conflict_ids,
            auto_resolved: $resolved,
            unresolved: $unresolved
        }'
}

checkpoint_merge() {
    # Merge Dev and QA changes at checkpoint
    # Arguments: feature, checkpoint_type
    # Returns: JSON with merge result

    local feature="$1"
    local checkpoint_type="$2"

    if [ -z "$feature" ] || [ -z "$checkpoint_type" ]; then
        echo '{"error": "Feature and checkpoint type required"}' >&2
        return 1
    fi

    # Validate checkpoint type
    _validate_checkpoint_type "$checkpoint_type" || return 1

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local feature_branch="feature/${feature}"
    local dev_branch="${feature}-dev"
    local qa_branch="${feature}-qa"

    _checkpoint_log "INFO" "Starting checkpoint merge: $feature at $checkpoint_type"

    _ensure_checkpoint_dir "$feature"

    # Initialize result tracking
    local dev_merged=false
    local qa_merged=false
    local conflicts="[]"
    local scope_valid=true
    local scope_violations="[]"
    local scope_corrected=false
    local dev_rebased=false
    local qa_rebased=false
    local test_triggered=false
    local ticket_updated=false

    # Step 1: Run QA scope validation
    _checkpoint_log "INFO" "Step 1: Validating QA scope"
    local scope_result
    scope_result=$(validate_qa_scope "$feature" 2>/dev/null) || scope_result='{"valid": true}'

    scope_valid=$(echo "$scope_result" | jq -r '.valid // true')
    scope_violations=$(echo "$scope_result" | jq '.violations // []')
    scope_corrected=$(echo "$scope_result" | jq -r '.corrected // false')

    if [ "$scope_valid" = "false" ]; then
        _checkpoint_log "WARN" "QA scope violations detected (auto-corrected: $scope_corrected)"
    fi

    # Step 1.5: Run drift detection (unless skipped)
    local drift_report=""
    local drift_status="skipped"
    if [[ "${SKIP_DRIFT_CHECK:-false}" != "true" ]]; then
        _checkpoint_log "INFO" "Step 1.5: Running drift detection"
        drift_report=$(detect_drift "$feature" "$checkpoint_type" 2>/dev/null) || drift_report='{"has_invalid_drift": false, "has_valid_drift": false}'

        # Handle invalid drift (missing criteria)
        if echo "$drift_report" | jq -e '.has_invalid_drift == true' >/dev/null 2>&1; then
            _checkpoint_log "WARN" "Invalid drift detected - missing acceptance criteria"
            local guidance
            guidance=$(handle_invalid_drift "$feature" "$drift_report")
            _checkpoint_log "INFO" "Guidance written to: $guidance"
            drift_status="has_invalid_drift"
            # Continue with merge but record warning
        fi

        # Handle valid drift (improvements)
        if echo "$drift_report" | jq -e '.has_valid_drift == true' >/dev/null 2>&1; then
            _checkpoint_log "INFO" "Valid drift detected (improvement) - escalating to PM"
            local handoff
            handoff=$(escalate_improvement_to_pm "$feature" "$checkpoint_type" "$drift_report")
            _checkpoint_log "INFO" "PM handoff created: $handoff"
            if [ "$drift_status" = "has_invalid_drift" ]; then
                drift_status="both"
            else
                drift_status="has_valid_drift"
            fi
            # Continue with merge, PM reviews async
        fi

        if [ "$drift_status" = "skipped" ]; then
            drift_status="clean"
        fi
    else
        _checkpoint_log "WARN" "Drift detection skipped (--skip-drift-check)"
    fi

    # Step 2: Save checkpoint diffs for both agents
    _checkpoint_log "INFO" "Step 2: Saving checkpoint diffs"
    local dev_diff qa_diff
    dev_diff=$(save_checkpoint_diff "$feature" "$checkpoint_type" "dev")
    qa_diff=$(save_checkpoint_diff "$feature" "$checkpoint_type" "qa")

    # Store current branch to return to
    local original_branch
    original_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

    # Step 3: Merge Dev changes first
    _checkpoint_log "INFO" "Step 3: Merging Dev branch"
    git checkout "$feature_branch" 2>/dev/null || {
        _checkpoint_log "ERROR" "Could not checkout feature branch: $feature_branch"
        git checkout "$original_branch" 2>/dev/null || true
        echo '{"error": "Could not checkout feature branch"}'
        return 1
    }

    if git merge "$dev_branch" --no-edit 2>/dev/null; then
        dev_merged=true
        _checkpoint_log "INFO" "Dev branch merged successfully"
    else
        # Handle merge conflict
        local conflict_result
        conflict_result=$(handle_merge_conflict "$feature" "dev" "$checkpoint_type")
        conflicts=$(echo "$conflicts" | jq --argjson c "$conflict_result" '. + [$c]')
        git merge --abort 2>/dev/null || true
        git checkout "$original_branch" 2>/dev/null || true

        # Return early with conflict
        echo "$conflict_result"
        return 1
    fi

    # Step 4: Merge QA changes
    _checkpoint_log "INFO" "Step 4: Merging QA branch"
    if git merge "$qa_branch" --no-edit 2>/dev/null; then
        qa_merged=true
        _checkpoint_log "INFO" "QA branch merged successfully"
    else
        # Handle merge conflict
        local conflict_result
        conflict_result=$(handle_merge_conflict "$feature" "qa" "$checkpoint_type")
        conflicts=$(echo "$conflicts" | jq --argjson c "$conflict_result" '. + [$c]')
        git merge --abort 2>/dev/null || true
        git checkout "$original_branch" 2>/dev/null || true

        echo "$conflict_result"
        return 1
    fi

    # Step 5: Rebase worktrees onto merged feature branch
    _checkpoint_log "INFO" "Step 5: Rebasing worktrees"

    local dev_worktree="$WORKTREES_DIR/${feature}/dev"
    local qa_worktree="$WORKTREES_DIR/${feature}/qa"

    if [ -d "$dev_worktree" ]; then
        if git -C "$dev_worktree" rebase "$feature_branch" 2>/dev/null; then
            dev_rebased=true
            _checkpoint_log "INFO" "Dev worktree rebased"
        else
            _checkpoint_log "WARN" "Dev worktree rebase failed - may need manual resolution"
            git -C "$dev_worktree" rebase --abort 2>/dev/null || true
        fi
    fi

    if [ -d "$qa_worktree" ]; then
        if git -C "$qa_worktree" rebase "$feature_branch" 2>/dev/null; then
            qa_rebased=true
            _checkpoint_log "INFO" "QA worktree rebased"
        else
            _checkpoint_log "WARN" "QA worktree rebase failed - may need manual resolution"
            git -C "$qa_worktree" rebase --abort 2>/dev/null || true
        fi
    fi

    # Step 6: Update state with checkpoint completion
    _checkpoint_log "INFO" "Step 6: Updating state"
    local state_file="$EXECUTION_DIR/${feature}/state.json"
    if [ -f "$state_file" ]; then
        jq --arg ts "$timestamp" --arg cp "$checkpoint_type" --arg drift "$drift_status" \
            '.checkpoints += [{
                type: $cp,
                timestamp: $ts,
                status: "completed",
                drift_status: $drift
            }] |
            .current_checkpoint = $cp |
            .last_checkpoint_at = $ts |
            .last_drift_status = $drift' \
            "$state_file" > "${state_file}.tmp"
        mv "${state_file}.tmp" "$state_file"
    fi

    # Step 7: Build and write checkpoint result
    _checkpoint_log "INFO" "Step 7: Recording checkpoint result"
    local result_json
    result_json=$(jq -n \
        --arg feature "$feature" \
        --arg checkpoint "$checkpoint_type" \
        --arg timestamp "$timestamp" \
        --arg dev_diff "$dev_diff" \
        --arg qa_diff "$qa_diff" \
        --argjson dev_merged "$dev_merged" \
        --argjson qa_merged "$qa_merged" \
        --argjson conflicts "$conflicts" \
        --argjson scope_valid "$scope_valid" \
        --argjson scope_violations "$scope_violations" \
        --argjson scope_corrected "$scope_corrected" \
        --argjson dev_rebased "$dev_rebased" \
        --argjson qa_rebased "$qa_rebased" \
        --arg drift_status "$drift_status" \
        '{
            feature: $feature,
            checkpoint: $checkpoint,
            timestamp: $timestamp,
            status: "completed",
            diffs: {
                dev: $dev_diff,
                qa: $qa_diff
            },
            merge_result: {
                dev_merged: $dev_merged,
                qa_merged: $qa_merged,
                conflicts: $conflicts
            },
            scope_validation: {
                passed: $scope_valid,
                violations: $scope_violations,
                auto_corrected: $scope_corrected
            },
            drift_detection: {
                status: $drift_status
            },
            rebase_result: {
                dev_rebased: $dev_rebased,
                qa_rebased: $qa_rebased
            },
            test_triggered: false,
            ticket_updated: false
        }')

    # Step 8: Trigger tests based on checkpoint type
    _checkpoint_log "INFO" "Step 8: Triggering tests"
    case "$checkpoint_type" in
        component-complete)
            if [ -x "./scripts/integration-tests.sh" ]; then
                _checkpoint_log "INFO" "Running integration tests"
                if ./scripts/integration-tests.sh --feature "$feature" 2>/dev/null; then
                    test_triggered=true
                else
                    _checkpoint_log "WARN" "Integration tests failed or script not found"
                fi
            else
                _checkpoint_log "INFO" "No integration-tests.sh script found - skipping"
            fi
            ;;
        feature-complete)
            if [ -x "./scripts/integration-tests.sh" ]; then
                _checkpoint_log "INFO" "Running integration tests"
                ./scripts/integration-tests.sh --feature "$feature" 2>/dev/null || true
                test_triggered=true
            fi
            if [ -x "./scripts/e2e-tests.sh" ]; then
                _checkpoint_log "INFO" "Running e2e tests with trace"
                ./scripts/e2e-tests.sh --feature "$feature" --trace 2>/dev/null || true
            fi
            ;;
    esac
    result_json=$(echo "$result_json" | jq --argjson tt "$test_triggered" '.test_triggered = $tt')

    # Step 9: Update ticket with checkpoint status
    _checkpoint_log "INFO" "Step 9: Updating ticket"
    local mapping_file="$SPECFLOW_DIR/tickets/${feature}.json"
    if [ -f "$mapping_file" ]; then
        local epic_number
        epic_number=$(jq -r '.epic.number // 0' "$mapping_file" 2>/dev/null)
        if [ "$epic_number" != "0" ]; then
            if tracker_add_comment "$epic_number" "Checkpoint $checkpoint_type completed. Dev and QA changes merged successfully." 2>/dev/null; then
                ticket_updated=true
                _checkpoint_log "INFO" "Ticket updated with checkpoint status"
            fi
        fi
    fi
    result_json=$(echo "$result_json" | jq --argjson tu "$ticket_updated" '.ticket_updated = $tu')

    # Write result file
    record_checkpoint_result "$feature" "$checkpoint_type" "$result_json"

    # Return to original branch
    git checkout "$original_branch" 2>/dev/null || true

    _checkpoint_log "INFO" "Checkpoint merge complete: $feature at $checkpoint_type"

    echo "$result_json"
}

signal_checkpoint() {
    # Signal that an agent is ready for checkpoint
    # Arguments: feature, agent (dev|qa), checkpoint_type
    # Returns: JSON with signal result (waiting or merge triggered)

    local feature="$1"
    local agent="$2"
    local checkpoint_type="$3"

    if [ -z "$feature" ] || [ -z "$agent" ] || [ -z "$checkpoint_type" ]; then
        echo '{"error": "Feature, agent, and checkpoint type required"}' >&2
        return 1
    fi

    # Validate agent
    if [ "$agent" != "dev" ] && [ "$agent" != "qa" ]; then
        echo '{"error": "Agent must be dev or qa"}' >&2
        return 1
    fi

    # Validate checkpoint type
    _validate_checkpoint_type "$checkpoint_type" || return 1

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local state_file="$EXECUTION_DIR/${feature}/state.json"

    _checkpoint_log "INFO" "$agent signaling checkpoint: $checkpoint_type for $feature"

    _ensure_checkpoint_dir "$feature"

    # Initialize state file if not exists
    if [ ! -f "$state_file" ]; then
        jq -n \
            --arg feature "$feature" \
            --arg ts "$timestamp" \
            '{
                feature: $feature,
                started: $ts,
                status: "in_progress",
                checkpoint_signals: {},
                checkpoints: []
            }' > "$state_file"
    fi

    # Record the signal
    local signal_key=".checkpoint_signals.\"${checkpoint_type}\".${agent}_ready"
    jq --arg ts "$timestamp" \
        "$signal_key = \$ts" \
        "$state_file" > "${state_file}.tmp"
    mv "${state_file}.tmp" "$state_file"

    # Check if both agents are ready
    local dev_ready qa_ready
    dev_ready=$(jq -r ".checkpoint_signals.\"${checkpoint_type}\".dev_ready // null" "$state_file")
    qa_ready=$(jq -r ".checkpoint_signals.\"${checkpoint_type}\".qa_ready // null" "$state_file")

    if [ "$dev_ready" != "null" ] && [ "$qa_ready" != "null" ]; then
        _checkpoint_log "INFO" "Both agents ready - triggering checkpoint merge"

        # Clear signals
        jq --arg cp "$checkpoint_type" \
            'del(.checkpoint_signals[$cp])' \
            "$state_file" > "${state_file}.tmp"
        mv "${state_file}.tmp" "$state_file"

        # Trigger the merge
        local merge_result
        merge_result=$(checkpoint_merge "$feature" "$checkpoint_type")

        jq -n \
            --arg feature "$feature" \
            --arg checkpoint "$checkpoint_type" \
            --argjson merge_result "$merge_result" \
            '{
                status: "merged",
                feature: $feature,
                checkpoint: $checkpoint,
                merge_result: $merge_result
            }'
    else
        # Only one agent ready, waiting for the other
        local waiting_for
        if [ "$dev_ready" = "null" ]; then
            waiting_for="dev"
        else
            waiting_for="qa"
        fi

        jq -n \
            --arg feature "$feature" \
            --arg checkpoint "$checkpoint_type" \
            --arg agent "$agent" \
            --arg waiting "$waiting_for" \
            '{
                status: "waiting",
                feature: $feature,
                checkpoint: $checkpoint,
                signaled_by: $agent,
                waiting_for: $waiting
            }'
    fi
}

get_checkpoint_status() {
    # Get current checkpoint status for a feature
    # Arguments: feature
    # Returns: JSON with checkpoint state

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local state_file="$EXECUTION_DIR/${feature}/state.json"

    if [ ! -f "$state_file" ]; then
        jq -n --arg feature "$feature" \
            '{
                error: "No state found",
                feature: $feature
            }'
        return 1
    fi

    # Extract checkpoint-relevant info
    jq '{
        feature: .feature,
        status: .status,
        current_checkpoint: .current_checkpoint,
        last_checkpoint_at: .last_checkpoint_at,
        checkpoint_signals: .checkpoint_signals,
        completed_checkpoints: [.checkpoints[] | select(.status == "completed") | .type],
        pending_signals: (.checkpoint_signals // {} | to_entries | map({
            checkpoint: .key,
            dev_ready: (.value.dev_ready != null),
            qa_ready: (.value.qa_ready != null)
        }))
    }' "$state_file"
}

record_checkpoint_result() {
    # Record checkpoint result to merge-results directory
    # Arguments: feature, checkpoint, result_json
    # Returns: Path to result file

    local feature="$1"
    local checkpoint="$2"
    local result_json="$3"

    if [ -z "$feature" ] || [ -z "$checkpoint" ] || [ -z "$result_json" ]; then
        echo '{"error": "Feature, checkpoint, and result_json required"}' >&2
        return 1
    fi

    _ensure_checkpoint_dir "$feature"

    local result_file="$EXECUTION_DIR/${feature}/merge-results/${checkpoint}.json"

    # Write result file
    echo "$result_json" > "$result_file"

    _checkpoint_log "INFO" "Recorded checkpoint result: $result_file"

    # Update state.json checkpoints array
    local state_file="$EXECUTION_DIR/${feature}/state.json"
    if [ -f "$state_file" ]; then
        local timestamp
        timestamp=$(echo "$result_json" | jq -r '.timestamp')
        local status
        status=$(echo "$result_json" | jq -r '.status')

        # Check if checkpoint entry already exists, update or add
        local exists
        exists=$(jq --arg cp "$checkpoint" '[.checkpoints[] | select(.type == $cp)] | length' "$state_file")

        if [ "$exists" = "0" ]; then
            jq --arg cp "$checkpoint" --arg ts "$timestamp" --arg status "$status" \
                '.checkpoints += [{type: $cp, timestamp: $ts, status: $status, result_file: "'"$result_file"'"}]' \
                "$state_file" > "${state_file}.tmp"
            mv "${state_file}.tmp" "$state_file"
        fi
    fi

    echo "$result_file"
}

list_checkpoints() {
    # List all completed checkpoints for a feature
    # Arguments: feature
    # Returns: JSON array of checkpoint info

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local results_dir="$EXECUTION_DIR/${feature}/merge-results"

    if [ ! -d "$results_dir" ]; then
        echo '[]'
        return 0
    fi

    local checkpoints="[]"

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local checkpoint_data
            checkpoint_data=$(cat "$file")
            local checkpoint_type status timestamp
            checkpoint_type=$(echo "$checkpoint_data" | jq -r '.checkpoint // "unknown"')
            status=$(echo "$checkpoint_data" | jq -r '.status // "unknown"')
            timestamp=$(echo "$checkpoint_data" | jq -r '.timestamp // "unknown"')

            checkpoints=$(echo "$checkpoints" | jq \
                --arg type "$checkpoint_type" \
                --arg status "$status" \
                --arg ts "$timestamp" \
                --arg file "$file" \
                '. + [{type: $type, status: $status, timestamp: $ts, file: $file}]')
        fi
    done < <(find "$results_dir" -maxdepth 1 -name "*.json" 2>/dev/null | sort)

    echo "$checkpoints"
}

# =============================================================================
# CLI Commands
# =============================================================================

_cmd_merge() {
    local feature="$1"
    local checkpoint="$2"
    shift 2 2>/dev/null || true

    if [ -z "$feature" ] || [ -z "$checkpoint" ]; then
        echo "Error: Feature and checkpoint required" >&2
        echo "Usage: checkpoint-merge.sh merge <feature> <checkpoint> [--skip-drift-check]" >&2
        return 1
    fi

    # Parse optional flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-drift-check|-s)
                export SKIP_DRIFT_CHECK=true
                echo "Warning: Drift detection will be skipped (--skip-drift-check)"
                ;;
            *)
                echo "Unknown option: $1" >&2
                ;;
        esac
        shift
    done

    echo "=== Checkpoint Merge: $feature at $checkpoint ==="
    echo ""
    checkpoint_merge "$feature" "$checkpoint"
}

_cmd_signal() {
    local feature="$1"
    local agent="$2"
    local checkpoint="$3"

    if [ -z "$feature" ] || [ -z "$agent" ] || [ -z "$checkpoint" ]; then
        echo "Error: Feature, agent, and checkpoint required" >&2
        echo "Usage: checkpoint-merge.sh signal <feature> <agent> <checkpoint>" >&2
        return 1
    fi

    echo "=== Signaling Checkpoint: $agent for $feature at $checkpoint ==="
    echo ""
    signal_checkpoint "$feature" "$agent" "$checkpoint"
}

_cmd_status() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: checkpoint-merge.sh status <feature>" >&2
        return 1
    fi

    echo "=== Checkpoint Status: $feature ==="
    echo ""
    get_checkpoint_status "$feature" | jq '.'
}

_cmd_list_checkpoints() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: checkpoint-merge.sh list-checkpoints <feature>" >&2
        return 1
    fi

    echo "=== Completed Checkpoints: $feature ==="
    echo ""
    list_checkpoints "$feature" | jq '.'
}

_show_help() {
    cat << 'EOF'
Checkpoint Merge - Dev/QA checkpoint merge coordination

USAGE:
    checkpoint-merge.sh <command> [arguments]

COMMANDS:
    merge <feature> <checkpoint> [--skip-drift-check]
        Force a checkpoint merge for the feature
        Checkpoint types: component-complete, feature-complete
        - Validates QA scope before merge
        - Runs drift detection against acceptance criteria
        - Merges Dev then QA into feature branch
        - Rebases worktrees onto merged feature
        - Triggers appropriate test suite
        - Updates ticket with checkpoint status
        Use --skip-drift-check for emergency merges (not recommended)

    signal <feature> <agent> <checkpoint>
        Signal that an agent is ready for checkpoint
        Agent: dev | qa
        - Records readiness signal
        - If both agents ready, triggers merge automatically
        - If only one ready, returns waiting status

    status <feature>
        Show current checkpoint status
        - Current checkpoint
        - Pending signals
        - Completed checkpoints

    list-checkpoints <feature>
        List all completed checkpoints with details
        - Returns JSON array of checkpoint results

    help
        Show this help message

CHECKPOINT TYPES:
    component-complete
        Triggered when a component is ready for integration
        Runs integration tests after merge

    feature-complete
        Triggered when the entire feature is ready
        Runs integration tests and e2e tests with tracing

FUNCTIONS (when sourced):
    checkpoint_merge(feature, checkpoint_type)
        Execute checkpoint merge protocol

    signal_checkpoint(feature, agent, checkpoint_type)
        Signal checkpoint readiness

    get_checkpoint_status(feature)
        Get current checkpoint state

    save_checkpoint_diff(feature, checkpoint, agent)
        Save agent diff at checkpoint

    handle_merge_conflict(feature, agent, checkpoint)
        Handle and record merge conflict

    record_checkpoint_result(feature, checkpoint, result_json)
        Persist checkpoint result

    list_checkpoints(feature)
        List completed checkpoints

EXAMPLES:
    # Dev signals component complete
    checkpoint-merge.sh signal my-feature dev component-complete

    # QA signals component complete (triggers merge if Dev already signaled)
    checkpoint-merge.sh signal my-feature qa component-complete

    # Force a checkpoint merge
    checkpoint-merge.sh merge my-feature feature-complete

    # Check status
    checkpoint-merge.sh status my-feature

    # List completed checkpoints
    checkpoint-merge.sh list-checkpoints my-feature

    # Source and use functions
    source scripts/checkpoint-merge.sh
    result=$(signal_checkpoint "my-feature" "dev" "component-complete")
    echo "$result" | jq '.status'
EOF
}

# =============================================================================
# CLI Entry Point
# =============================================================================

# Only run CLI when executed directly, not when sourced
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        case "${1:-help}" in
            merge)
                _cmd_merge "${2:-}" "${3:-}"
                ;;
            signal)
                _cmd_signal "${2:-}" "${3:-}" "${4:-}"
                ;;
            status)
                _cmd_status "${2:-}"
                ;;
            list-checkpoints)
                _cmd_list_checkpoints "${2:-}"
                ;;
            help|--help|-h)
                _show_help
                ;;
            *)
                echo "Unknown command: ${1:-}" >&2
                echo "Run 'checkpoint-merge.sh help' for usage" >&2
                exit 1
                ;;
        esac
    fi
fi
