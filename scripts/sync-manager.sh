#!/usr/bin/env bash
set -euo pipefail

# Sync Manager - Checkpoint-based sync between external trackers and local state
# Usage: scripts/sync-manager.sh <command> [args]
#
# Syncs at defined checkpoints (starting, before_spec, after_completion, scope_change, manual)
# Conflicts are flagged for user resolution, not auto-resolved
# Sync failures warn and continue offline with cached state

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
CONFIG_FILE="$SPECFLOW_DIR/config.json"
ISSUES_DIR="$SPECFLOW_DIR/issues"
SYNC_LOG="$SPECFLOW_DIR/sync.log"

# Source tracker adapter
source "$SCRIPT_DIR/tracker-adapter.sh"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_ensure_sync_log() {
    mkdir -p "$(dirname "$SYNC_LOG")"
    touch "$SYNC_LOG"
}

_log_sync() {
    local level="$1"  # INFO, WARN, ERROR
    local message="$2"
    _ensure_sync_log
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$level] $message" >> "$SYNC_LOG"
}

_content_hash() {
    # Generate MD5 hash of title + body for change detection
    local title="$1"
    local body="$2"
    echo -n "${title}${body}" | md5 | cut -d' ' -f1
}

_get_local_file() {
    local issue_id="$1"
    echo "$ISSUES_DIR/${issue_id}.json"
}

# Online check with 30-second cache
_ONLINE_CACHE_TIME=0
_ONLINE_CACHE_VALUE=false

_check_online() {
    local current_time
    current_time=$(date +%s)
    local cache_age=$((current_time - _ONLINE_CACHE_TIME))

    # Use cached result if less than 30 seconds old
    if [ $cache_age -lt 30 ] && [ $_ONLINE_CACHE_TIME -gt 0 ]; then
        echo "$_ONLINE_CACHE_VALUE"
        return 0
    fi

    local type
    type=$(tracker_type)

    case "$type" in
        github)
            # Quick auth check
            if gh api user --silent 2>/dev/null; then
                _ONLINE_CACHE_VALUE=true
            else
                _ONLINE_CACHE_VALUE=false
            fi
            ;;
        local)
            # Local mode is always "online"
            _ONLINE_CACHE_VALUE=true
            ;;
        *)
            # Unknown tracker types assume offline for safety
            _ONLINE_CACHE_VALUE=false
            ;;
    esac

    _ONLINE_CACHE_TIME=$current_time
    echo "$_ONLINE_CACHE_VALUE"
}

_normalize_labels() {
    # Extract label names from GitHub format (array of objects with name field)
    # or handle simple string arrays
    local labels_json="$1"

    # Check if it's an array of objects with 'name' field
    if echo "$labels_json" | jq -e '.[0].name' >/dev/null 2>&1; then
        echo "$labels_json" | jq '[.[].name]'
    else
        echo "$labels_json"
    fi
}

_extract_remote_updated() {
    # Extract updated timestamp from remote issue
    local remote="$1"
    echo "$remote" | jq -r '.updatedAt // .updated_at // "1970-01-01T00:00:00Z"'
}

# =============================================================================
# Core Sync Functions
# =============================================================================

sync_issue() {
    # Sync a single issue at a defined checkpoint
    # Arguments: issue_id, checkpoint
    # Checkpoints: starting, before_spec, after_completion, scope_change, manual
    # Returns: JSON with sync result

    local issue_id="$1"
    local checkpoint="${2:-manual}"
    local local_file
    local_file=$(_get_local_file "$issue_id")

    _log_sync "INFO" "Starting sync for issue #$issue_id at checkpoint: $checkpoint"

    # Check if online
    local online
    online=$(_check_online)

    if [ "$online" = "false" ]; then
        _log_sync "WARN" "Offline - using cached state for issue #$issue_id"
        if [ -f "$local_file" ]; then
            echo '{"synced": false, "offline": true, "cached": true, "issue_id": "'"$issue_id"'"}'
        else
            echo '{"synced": false, "offline": true, "cached": false, "issue_id": "'"$issue_id"'", "error": "No cached data"}'
        fi
        return 0
    fi

    # Fetch latest from tracker
    local remote
    remote=$(tracker_get_issue "$issue_id" 2>/dev/null) || {
        _log_sync "ERROR" "Failed to fetch issue #$issue_id from tracker"
        echo '{"synced": false, "error": "Failed to fetch from tracker", "issue_id": "'"$issue_id"'"}'
        return 1
    }

    # Case 1: First sync (no local file)
    if [ ! -f "$local_file" ]; then
        _log_sync "INFO" "First sync for issue #$issue_id - saving remote state"

        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        local title body labels_raw labels content_hash remote_updated
        title=$(echo "$remote" | jq -r '.title // ""')
        body=$(echo "$remote" | jq -r '.body // ""')
        labels_raw=$(echo "$remote" | jq '.labels // []')
        labels=$(_normalize_labels "$labels_raw")
        content_hash=$(_content_hash "$title" "$body")
        remote_updated=$(_extract_remote_updated "$remote")

        # Create local cache file with sync metadata
        echo "$remote" | jq \
            --arg ts "$timestamp" \
            --arg cp "$checkpoint" \
            --arg hash "$content_hash" \
            --arg remote_updated "$remote_updated" \
            --argjson labels "$labels" \
            '. + {
                source: "'"$(tracker_type)"'",
                labels: $labels,
                sync: {
                    last_sync: $ts,
                    last_checkpoint: $cp,
                    local_updated: $ts,
                    remote_updated: $remote_updated,
                    content_hash: $hash
                }
            }' > "$local_file"

        _log_sync "INFO" "Saved initial state for issue #$issue_id"
        echo '{"synced": true, "first_sync": true, "issue_id": "'"$issue_id"'"}'
        return 0
    fi

    # Case 2 & 3: Existing local file - check for conflicts
    local local_data
    local_data=$(cat "$local_file")

    local last_sync local_updated remote_updated local_hash
    last_sync=$(echo "$local_data" | jq -r '.sync.last_sync // "1970-01-01T00:00:00Z"')
    local_updated=$(echo "$local_data" | jq -r '.sync.local_updated // "1970-01-01T00:00:00Z"')
    remote_updated=$(_extract_remote_updated "$remote")
    local_hash=$(echo "$local_data" | jq -r '.sync.content_hash // ""')

    # Calculate remote hash
    local remote_title remote_body remote_hash
    remote_title=$(echo "$remote" | jq -r '.title // ""')
    remote_body=$(echo "$remote" | jq -r '.body // ""')
    remote_hash=$(_content_hash "$remote_title" "$remote_body")

    # Check for content changes using hash comparison
    local local_changed=false
    local remote_changed=false

    # Local changed if local_updated > last_sync
    if [[ "$local_updated" > "$last_sync" ]]; then
        local_changed=true
    fi

    # Remote changed if hash differs
    if [ "$local_hash" != "$remote_hash" ]; then
        remote_changed=true
    fi

    # Case: Both changed - conflict
    if [ "$local_changed" = "true" ] && [ "$remote_changed" = "true" ]; then
        _log_sync "WARN" "Conflict detected for issue #$issue_id"
        local conflicts
        conflicts=$(detect_conflicts "$issue_id")
        echo "$conflicts"
        return 1
    fi

    # Case: Only remote changed - update local
    if [ "$remote_changed" = "true" ]; then
        _log_sync "INFO" "Remote changes detected for issue #$issue_id - updating local"
        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        local labels_raw labels
        labels_raw=$(echo "$remote" | jq '.labels // []')
        labels=$(_normalize_labels "$labels_raw")

        echo "$remote" | jq \
            --arg ts "$timestamp" \
            --arg cp "$checkpoint" \
            --arg hash "$remote_hash" \
            --arg remote_updated "$remote_updated" \
            --argjson labels "$labels" \
            '. + {
                source: "'"$(tracker_type)"'",
                labels: $labels,
                sync: {
                    last_sync: $ts,
                    last_checkpoint: $cp,
                    local_updated: $ts,
                    remote_updated: $remote_updated,
                    content_hash: $hash
                }
            }' > "$local_file"

        echo '{"synced": true, "updated": "local", "issue_id": "'"$issue_id"'"}'
        return 0
    fi

    # Case: Only local changed or no changes - update sync timestamp
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq --arg ts "$timestamp" --arg cp "$checkpoint" \
        '.sync.last_sync = $ts | .sync.last_checkpoint = $cp' \
        "$local_file" > "${local_file}.tmp"
    mv "${local_file}.tmp" "$local_file"

    if [ "$local_changed" = "true" ]; then
        _log_sync "INFO" "Local changes for issue #$issue_id - sync timestamp updated"
        echo '{"synced": true, "local_changes_pending": true, "issue_id": "'"$issue_id"'"}'
    else
        _log_sync "INFO" "No changes for issue #$issue_id"
        echo '{"synced": true, "no_changes": true, "issue_id": "'"$issue_id"'"}'
    fi
    return 0
}

# =============================================================================
# Conflict Detection and Resolution
# =============================================================================

detect_conflicts() {
    # Compare local and remote versions, return conflicting fields
    # Arguments: issue_id
    # Returns: JSON with conflict details

    local issue_id="$1"
    local local_file
    local_file=$(_get_local_file "$issue_id")

    if [ ! -f "$local_file" ]; then
        echo '{"error": "No local file for issue #'"$issue_id"'"}'
        return 1
    fi

    local remote
    remote=$(tracker_get_issue "$issue_id" 2>/dev/null) || {
        echo '{"error": "Failed to fetch remote issue #'"$issue_id"'"}'
        return 1
    }

    local local_data
    local_data=$(cat "$local_file")

    # Compare specific fields: title, body, labels, state
    local conflicts="[]"

    # Title comparison
    local local_title remote_title
    local_title=$(echo "$local_data" | jq -r '.title // ""')
    remote_title=$(echo "$remote" | jq -r '.title // ""')
    if [ "$local_title" != "$remote_title" ]; then
        conflicts=$(echo "$conflicts" | jq --arg field "title" \
            --arg local "$local_title" --arg remote "$remote_title" \
            '. + [{"field": $field, "local": $local, "remote": $remote}]')
    fi

    # Body comparison
    local local_body remote_body
    local_body=$(echo "$local_data" | jq -r '.body // ""')
    remote_body=$(echo "$remote" | jq -r '.body // ""')
    if [ "$local_body" != "$remote_body" ]; then
        conflicts=$(echo "$conflicts" | jq --arg field "body" \
            --arg local "$local_body" --arg remote "$remote_body" \
            '. + [{"field": $field, "local": $local, "remote": $remote}]')
    fi

    # Labels comparison (normalize both sides)
    local local_labels remote_labels_raw remote_labels
    local_labels=$(echo "$local_data" | jq -c '.labels // []' | jq 'sort')
    remote_labels_raw=$(echo "$remote" | jq '.labels // []')
    remote_labels=$(_normalize_labels "$remote_labels_raw" | jq 'sort')
    if [ "$local_labels" != "$remote_labels" ]; then
        conflicts=$(echo "$conflicts" | jq --arg field "labels" \
            --argjson local "$local_labels" --argjson remote "$remote_labels" \
            '. + [{"field": $field, "local": $local, "remote": $remote}]')
    fi

    # State comparison
    local local_state remote_state
    local_state=$(echo "$local_data" | jq -r '.state // "open"')
    remote_state=$(echo "$remote" | jq -r '.state // "open"')
    if [ "$local_state" != "$remote_state" ]; then
        conflicts=$(echo "$conflicts" | jq --arg field "state" \
            --arg local "$local_state" --arg remote "$remote_state" \
            '. + [{"field": $field, "local": $local, "remote": $remote}]')
    fi

    local num_conflicts
    num_conflicts=$(echo "$conflicts" | jq 'length')

    echo '{
        "conflict": true,
        "issue_id": "'"$issue_id"'",
        "fields": '"$conflicts"',
        "count": '"$num_conflicts"'
    }'
}

present_conflicts() {
    # Format conflicts for user display
    # Arguments: conflicts_json (output from detect_conflicts)
    # Returns: Formatted text for terminal display

    local conflicts_json="$1"
    local issue_id
    issue_id=$(echo "$conflicts_json" | jq -r '.issue_id')
    local fields
    fields=$(echo "$conflicts_json" | jq -r '.fields')
    local count
    count=$(echo "$conflicts_json" | jq -r '.count')

    echo ""
    echo "Conflicts found for issue #$issue_id:"
    echo ""

    echo "$fields" | jq -r '.[] | "Field: \(.field)\n  Local:  \(.local)\n  Remote: \(.remote)\n"'

    echo ""
    echo "Resolve with: /sf:resolve #$issue_id --accept=local|remote|merge"
    echo ""
}

resolve_conflict() {
    # Resolve a conflict with specified strategy
    # Arguments: issue_id, resolution (local|remote|merge)
    # local: Push local values to remote
    # remote: Pull remote values to local
    # merge: Create conflict file for manual resolution

    local issue_id="$1"
    local resolution="$2"
    local local_file
    local_file=$(_get_local_file "$issue_id")

    if [ ! -f "$local_file" ]; then
        echo '{"error": "No local file for issue #'"$issue_id"'"}'
        return 1
    fi

    _log_sync "INFO" "Resolving conflict for issue #$issue_id with strategy: $resolution"

    case "$resolution" in
        local)
            # Push local values to remote (requires tracker write operations)
            local local_data
            local_data=$(cat "$local_file")
            local title body
            title=$(echo "$local_data" | jq -r '.title')
            body=$(echo "$local_data" | jq -r '.body')

            # Note: tracker_update_issue would need to be implemented for full push
            # For now, update sync timestamps to mark as resolved
            local timestamp
            timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            jq --arg ts "$timestamp" \
                '.sync.last_sync = $ts | .sync.local_updated = $ts' \
                "$local_file" > "${local_file}.tmp"
            mv "${local_file}.tmp" "$local_file"

            _log_sync "INFO" "Conflict resolved for issue #$issue_id - local values kept"
            echo '{"resolved": true, "strategy": "local", "issue_id": "'"$issue_id"'"}'
            ;;
        remote)
            # Pull remote values to local
            local remote
            remote=$(tracker_get_issue "$issue_id") || {
                echo '{"error": "Failed to fetch remote issue #'"$issue_id"'"}'
                return 1
            }

            local timestamp
            timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            local title body labels_raw labels content_hash remote_updated
            title=$(echo "$remote" | jq -r '.title // ""')
            body=$(echo "$remote" | jq -r '.body // ""')
            labels_raw=$(echo "$remote" | jq '.labels // []')
            labels=$(_normalize_labels "$labels_raw")
            content_hash=$(_content_hash "$title" "$body")
            remote_updated=$(_extract_remote_updated "$remote")

            echo "$remote" | jq \
                --arg ts "$timestamp" \
                --arg hash "$content_hash" \
                --arg remote_updated "$remote_updated" \
                --argjson labels "$labels" \
                '. + {
                    source: "'"$(tracker_type)"'",
                    labels: $labels,
                    sync: {
                        last_sync: $ts,
                        last_checkpoint: "conflict_resolution",
                        local_updated: $ts,
                        remote_updated: $remote_updated,
                        content_hash: $hash
                    }
                }' > "$local_file"

            _log_sync "INFO" "Conflict resolved for issue #$issue_id - remote values accepted"
            echo '{"resolved": true, "strategy": "remote", "issue_id": "'"$issue_id"'"}'
            ;;
        merge)
            # Create conflict file for manual resolution
            local conflict_file="$ISSUES_DIR/${issue_id}.conflict.md"
            local local_data remote
            local_data=$(cat "$local_file")
            remote=$(tracker_get_issue "$issue_id") || {
                echo '{"error": "Failed to fetch remote issue #'"$issue_id"'"}'
                return 1
            }

            local local_title local_body remote_title remote_body
            local_title=$(echo "$local_data" | jq -r '.title')
            local_body=$(echo "$local_data" | jq -r '.body')
            remote_title=$(echo "$remote" | jq -r '.title')
            remote_body=$(echo "$remote" | jq -r '.body')

            cat > "$conflict_file" << EOF
# Conflict Resolution: Issue #$issue_id

## Local Version

### Title
$local_title

### Body
$local_body

---

## Remote Version

### Title
$remote_title

### Body
$remote_body

---

## Resolution Instructions

1. Edit this file to create the merged version
2. Run: /sf:resolve #$issue_id --apply-merge
3. This file will be deleted after successful merge

EOF

            _log_sync "INFO" "Conflict file created for issue #$issue_id: $conflict_file"
            echo '{"resolved": false, "strategy": "merge", "conflict_file": "'"$conflict_file"'", "issue_id": "'"$issue_id"'"}'
            ;;
        *)
            echo '{"error": "Unknown resolution strategy: '"$resolution"'", "valid": ["local", "remote", "merge"]}'
            return 1
            ;;
    esac
}

# =============================================================================
# Batch Sync Functions
# =============================================================================

sync_all() {
    # Sync all issues from tracker
    # Arguments: checkpoint
    # Returns: Summary JSON with sync results

    local checkpoint="${1:-manual}"
    local synced=0
    local conflicts=0
    local failed=0
    local conflict_issues="[]"

    _log_sync "INFO" "Starting sync_all at checkpoint: $checkpoint"

    # Check if online
    local online
    online=$(_check_online)

    if [ "$online" = "false" ]; then
        _log_sync "WARN" "Offline - cannot sync all issues"
        echo "Working offline - changes will sync at next checkpoint" >&2
        echo '{
            "synced": 0,
            "conflicts": 0,
            "failed": 0,
            "offline": true,
            "conflict_issues": []
        }'
        return 0
    fi

    # Get all issues from tracker
    local issues
    issues=$(tracker_list_issues 2>/dev/null) || {
        _log_sync "ERROR" "Failed to list issues from tracker"
        echo '{
            "synced": 0,
            "conflicts": 0,
            "failed": 1,
            "offline": false,
            "error": "Failed to list issues from tracker",
            "conflict_issues": []
        }'
        return 1
    }

    local issue_count
    issue_count=$(echo "$issues" | jq 'length')

    if [ "$issue_count" -eq 0 ]; then
        _log_sync "INFO" "No issues to sync"
        echo '{
            "synced": 0,
            "conflicts": 0,
            "failed": 0,
            "offline": false,
            "conflict_issues": []
        }'
        return 0
    fi

    # Sync each issue
    for i in $(seq 0 $((issue_count - 1))); do
        local issue_id
        issue_id=$(echo "$issues" | jq -r ".[$i].number // .[$i].id")

        local result
        result=$(sync_issue "$issue_id" "$checkpoint" 2>/dev/null) || true

        # Check result
        if echo "$result" | jq -e '.conflict == true' >/dev/null 2>&1; then
            conflicts=$((conflicts + 1))
            conflict_issues=$(echo "$conflict_issues" | jq --arg id "$issue_id" '. + [$id]')
        elif echo "$result" | jq -e '.synced == true' >/dev/null 2>&1; then
            synced=$((synced + 1))
        elif echo "$result" | jq -e '.error' >/dev/null 2>&1; then
            failed=$((failed + 1))
        elif echo "$result" | jq -e '.offline == true' >/dev/null 2>&1; then
            # Already handled above
            :
        else
            failed=$((failed + 1))
        fi
    done

    _log_sync "INFO" "sync_all complete: synced=$synced, conflicts=$conflicts, failed=$failed"

    echo '{
        "synced": '"$synced"',
        "conflicts": '"$conflicts"',
        "failed": '"$failed"',
        "offline": false,
        "conflict_issues": '"$conflict_issues"'
    }'
}

# =============================================================================
# Ticket Mapping Sync Functions
# =============================================================================

TICKETS_DIR="$SPECFLOW_DIR/tickets"

_find_mapping_for_ticket() {
    # Search all mapping files for a ticket number
    # Arguments: ticket_id
    # Returns: mapping file path or empty string

    local ticket_id="$1"
    local mapping_file=""

    if [ ! -d "$TICKETS_DIR" ]; then
        echo ""
        return 0
    fi

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Check if this ticket is the epic or a story
            local epic_number story_numbers
            epic_number=$(jq -r '.epic.number // 0' "$file" 2>/dev/null)
            story_numbers=$(jq -r '.stories[].number' "$file" 2>/dev/null)

            if [ "$epic_number" = "$ticket_id" ]; then
                mapping_file="$file"
                break
            fi

            for num in $story_numbers; do
                if [ "$num" = "$ticket_id" ]; then
                    mapping_file="$file"
                    break 2
                fi
            done
        fi
    done < <(find "$TICKETS_DIR" -maxdepth 1 -name "*.json" 2>/dev/null || true)

    echo "$mapping_file"
}

sync_ticket_status() {
    # Sync a single ticket's status and auto-complete tasks if closed
    # Arguments: ticket_id
    # Returns: JSON with sync result

    local ticket_id="$1"

    # Find mapping file containing this ticket
    local mapping_file
    mapping_file=$(_find_mapping_for_ticket "$ticket_id")

    if [ -z "$mapping_file" ]; then
        # No mapping found, nothing to sync
        echo '{"synced": false, "no_mapping": true, "ticket_id": "'"$ticket_id"'"}'
        return 0
    fi

    # Check if online
    local online
    online=$(_check_online)

    if [ "$online" = "false" ]; then
        echo '{"synced": false, "offline": true, "ticket_id": "'"$ticket_id"'"}'
        return 0
    fi

    # Fetch current ticket state
    local remote
    remote=$(tracker_get_issue "$ticket_id" 2>/dev/null) || {
        _log_sync "ERROR" "Failed to fetch ticket #$ticket_id from tracker"
        echo '{"synced": false, "error": "Failed to fetch from tracker", "ticket_id": "'"$ticket_id"'"}'
        return 1
    }

    local ticket_state
    ticket_state=$(echo "$remote" | jq -r '.state // "open"')

    # Check auto_complete_on_close config
    local auto_complete
    auto_complete=$(_get_config_value '.ticket_management.auto_complete_on_close' 'true')

    # Load current mapping
    local mapping
    mapping=$(cat "$mapping_file")

    local changes_made=false
    local feature_name
    feature_name=$(basename "$mapping_file" .json)

    if [ "$ticket_state" = "closed" ]; then
        # Check if this is an epic or story
        local epic_number
        epic_number=$(echo "$mapping" | jq -r '.epic.number // 0')

        if [ "$epic_number" = "$ticket_id" ]; then
            # Epic closed - update epic status in mapping
            local current_status
            current_status=$(echo "$mapping" | jq -r '.epic.status // "open"')

            if [ "$current_status" != "closed" ]; then
                mapping=$(echo "$mapping" | jq '.epic.status = "closed"')
                changes_made=true
                _log_sync "INFO" "Updated epic #$ticket_id status to closed"
            fi
        else
            # Story closed - find and update
            local story_index
            story_index=$(echo "$mapping" | jq --arg num "$ticket_id" \
                '.stories | to_entries | map(select(.value.number == ($num | tonumber))) | .[0].key // -1')

            if [ "$story_index" != "-1" ] && [ "$story_index" != "null" ]; then
                local current_status
                current_status=$(echo "$mapping" | jq -r ".stories[$story_index].status // \"open\"")

                if [ "$current_status" != "closed" ]; then
                    if [ "$auto_complete" = "true" ]; then
                        # Update story status and all tasks
                        mapping=$(echo "$mapping" | jq --argjson idx "$story_index" '
                            .stories[$idx].status = "closed" |
                            .stories[$idx].tasks = (.stories[$idx].tasks // [] | map(
                                if .status != "complete" then
                                    .status = "complete" | .auto_completed = true
                                else
                                    .
                                end
                            ))
                        ')
                        changes_made=true
                        _log_sync "INFO" "Auto-completed tasks for closed ticket #$ticket_id"
                    else
                        # Just update story status, not tasks
                        mapping=$(echo "$mapping" | jq --argjson idx "$story_index" '
                            .stories[$idx].status = "closed"
                        ')
                        changes_made=true
                        _log_sync "INFO" "Ticket #$ticket_id closed (auto-complete disabled)"
                    fi
                fi
            fi
        fi
    else
        # Ticket is open - check for reverts needed
        local story_index
        story_index=$(echo "$mapping" | jq --arg num "$ticket_id" \
            '.stories | to_entries | map(select(.value.number == ($num | tonumber))) | .[0].key // -1')

        if [ "$story_index" != "-1" ] && [ "$story_index" != "null" ]; then
            # Check if any tasks were auto-completed
            local auto_completed_count
            auto_completed_count=$(echo "$mapping" | jq --argjson idx "$story_index" \
                '[.stories[$idx].tasks // [] | .[] | select(.auto_completed == true)] | length')

            if [ "$auto_completed_count" -gt 0 ]; then
                # Revert auto-completed tasks
                mapping=$(echo "$mapping" | jq --argjson idx "$story_index" '
                    .stories[$idx].status = "open" |
                    .stories[$idx].tasks = (.stories[$idx].tasks // [] | map(
                        if .auto_completed == true then
                            .status = "pending" | del(.auto_completed)
                        else
                            .
                        end
                    ))
                ')
                changes_made=true
                _log_sync "INFO" "Reverted tasks for reopened ticket #$ticket_id"
            fi
        fi

        # Check epic status if it's an epic
        local epic_number
        epic_number=$(echo "$mapping" | jq -r '.epic.number // 0')

        if [ "$epic_number" = "$ticket_id" ]; then
            local current_status
            current_status=$(echo "$mapping" | jq -r '.epic.status // "open"')

            if [ "$current_status" = "closed" ]; then
                mapping=$(echo "$mapping" | jq '.epic.status = "open"')
                changes_made=true
                _log_sync "INFO" "Reverted epic #$ticket_id status to open"
            fi
        fi
    fi

    # Save changes if any
    if [ "$changes_made" = "true" ]; then
        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        mapping=$(echo "$mapping" | jq --arg ts "$timestamp" '.last_sync = $ts')
        echo "$mapping" > "$mapping_file"
        echo '{"synced": true, "changes": true, "ticket_id": "'"$ticket_id"'", "state": "'"$ticket_state"'"}'
    else
        echo '{"synced": true, "changes": false, "ticket_id": "'"$ticket_id"'", "state": "'"$ticket_state"'"}'
    fi
}

sync_mapping_file() {
    # Sync all tickets in a feature's mapping file
    # Arguments: feature_name [--comments]
    # Returns: JSON summary of changes

    local feature_name="$1"
    local sync_comments=false

    if [ "${2:-}" = "--comments" ]; then
        sync_comments=true
    fi

    local mapping_file="$TICKETS_DIR/${feature_name}.json"

    if [ ! -f "$mapping_file" ]; then
        echo '{"error": "Mapping file not found", "feature": "'"$feature_name"'"}'
        return 1
    fi

    # Check if online
    local online
    online=$(_check_online)

    if [ "$online" = "false" ]; then
        echo '{"synced": false, "offline": true, "feature": "'"$feature_name"'"}'
        return 0
    fi

    local mapping
    mapping=$(cat "$mapping_file")

    local epic_number stories_changed=0 total_stories
    epic_number=$(echo "$mapping" | jq -r '.epic.number // 0')
    total_stories=$(echo "$mapping" | jq '.stories | length')

    # Sync epic status
    local epic_result
    if [ "$epic_number" != "0" ]; then
        epic_result=$(sync_ticket_status "$epic_number")
    fi

    # Sync each story
    local story_numbers
    story_numbers=$(echo "$mapping" | jq -r '.stories[].number')

    for num in $story_numbers; do
        local result
        result=$(sync_ticket_status "$num")

        if echo "$result" | jq -e '.changes == true' >/dev/null 2>&1; then
            stories_changed=$((stories_changed + 1))
        fi

        # Sync comments if requested
        if [ "$sync_comments" = "true" ]; then
            sync_ticket_comments "$num" "$mapping_file"
        fi
    done

    echo '{
        "synced": true,
        "feature": "'"$feature_name"'",
        "epic": '"$epic_number"',
        "stories_synced": '"$total_stories"',
        "stories_changed": '"$stories_changed"'
    }'
}

# =============================================================================
# Comment Sync Functions
# =============================================================================

# Rate limit tracking
_SYNC_API_CALLS=0
_SYNC_API_LIMIT=100

_hash_comment() {
    # Generate content hash for comment deduplication
    # Arguments: comment_body
    # Returns: MD5 hash of comment body

    local body="$1"
    echo -n "$body" | md5 | cut -d' ' -f1
}

_rate_limit_check() {
    # Check if we're approaching rate limit
    # Returns: "ok" or "limit"

    _SYNC_API_CALLS=$((_SYNC_API_CALLS + 1))

    if [ $_SYNC_API_CALLS -ge $_SYNC_API_LIMIT ]; then
        _log_sync "WARN" "Rate limit approaching ($_SYNC_API_CALLS calls), deferring remaining syncs"
        echo "limit"
        return 0
    fi

    echo "ok"
}

_reset_rate_limit() {
    # Reset rate limit counter for new sync cycle
    _SYNC_API_CALLS=0
}

sync_ticket_comments() {
    # Sync comments bidirectionally between tracker and mapping file
    # Arguments: ticket_id, mapping_file
    # Returns: JSON with sync result

    local ticket_id="$1"
    local mapping_file="$2"

    if [ ! -f "$mapping_file" ]; then
        echo '{"synced": false, "error": "Mapping file not found", "ticket_id": "'"$ticket_id"'"}'
        return 1
    fi

    # Check rate limit
    local rate_check
    rate_check=$(_rate_limit_check)
    if [ "$rate_check" = "limit" ]; then
        echo '{"synced": false, "rate_limited": true, "ticket_id": "'"$ticket_id"'"}'
        return 0
    fi

    # Check if online
    local online
    online=$(_check_online)
    if [ "$online" = "false" ]; then
        echo '{"synced": false, "offline": true, "ticket_id": "'"$ticket_id"'"}'
        return 0
    fi

    # Add small delay for rate limiting (100ms)
    sleep 0.1

    # Fetch remote comments
    local remote_comments
    remote_comments=$(tracker_get_comments "$ticket_id" 2>/dev/null) || {
        _log_sync "ERROR" "Failed to fetch comments for ticket #$ticket_id"
        echo '{"synced": false, "error": "Failed to fetch comments", "ticket_id": "'"$ticket_id"'"}'
        return 1
    }

    # Load mapping and find story
    local mapping
    mapping=$(cat "$mapping_file")

    local story_index
    story_index=$(echo "$mapping" | jq --arg num "$ticket_id" \
        '.stories | to_entries | map(select(.value.number == ($num | tonumber))) | .[0].key // -1')

    if [ "$story_index" = "-1" ] || [ "$story_index" = "null" ]; then
        # Maybe it's the epic
        local epic_number
        epic_number=$(echo "$mapping" | jq -r '.epic.number // 0')

        if [ "$epic_number" != "$ticket_id" ]; then
            echo '{"synced": false, "no_match": true, "ticket_id": "'"$ticket_id"'"}'
            return 0
        fi
    fi

    # Get existing comments in mapping (stored per-story)
    local local_comments
    if [ "$story_index" != "-1" ] && [ "$story_index" != "null" ]; then
        local_comments=$(echo "$mapping" | jq ".stories[$story_index].comments // []")
    else
        local_comments=$(echo "$mapping" | jq '.epic.comments // []')
    fi

    # Build hash sets for deduplication
    local local_hashes remote_hashes
    local_hashes=$(echo "$local_comments" | jq -r '.[].hash // empty' | sort -u)
    remote_hashes=""

    local new_comments="[]"
    local remote_count
    remote_count=$(echo "$remote_comments" | jq 'length')

    # Process remote comments
    for i in $(seq 0 $((remote_count - 1))); do
        local comment_body
        comment_body=$(echo "$remote_comments" | jq -r ".[$i].body // \"\"")
        local comment_hash
        comment_hash=$(_hash_comment "$comment_body")

        # Check if already in local
        if ! echo "$local_hashes" | grep -q "^${comment_hash}$"; then
            # New remote comment - add to local
            local comment_ts author
            comment_ts=$(echo "$remote_comments" | jq -r ".[$i].created_at // \"\"")
            author=$(echo "$remote_comments" | jq -r ".[$i].author // \"unknown\"")

            new_comments=$(echo "$new_comments" | jq --arg body "$comment_body" \
                --arg hash "$comment_hash" --arg ts "$comment_ts" --arg author "$author" \
                '. + [{"body": $body, "hash": $hash, "created_at": $ts, "author": $author, "source": "remote"}]')
        fi

        remote_hashes="${remote_hashes}${comment_hash}
"
    done

    # Check for local comments not in remote (unlikely but handle)
    local local_count local_to_push=0
    local_count=$(echo "$local_comments" | jq 'length')

    for i in $(seq 0 $((local_count - 1))); do
        local comment_hash
        comment_hash=$(echo "$local_comments" | jq -r ".[$i].hash // \"\"")

        if [ -n "$comment_hash" ] && ! echo "$remote_hashes" | grep -q "^${comment_hash}$"; then
            local source
            source=$(echo "$local_comments" | jq -r ".[$i].source // \"local\"")

            if [ "$source" = "local" ]; then
                # Local comment not in remote - push to tracker
                local comment_body
                comment_body=$(echo "$local_comments" | jq -r ".[$i].body // \"\"")

                tracker_add_comment "$ticket_id" "$comment_body" 2>/dev/null || true
                local_to_push=$((local_to_push + 1))
            fi
        fi
    done

    # Merge new comments into mapping
    local new_count
    new_count=$(echo "$new_comments" | jq 'length')

    if [ "$new_count" -gt 0 ]; then
        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

        if [ "$story_index" != "-1" ] && [ "$story_index" != "null" ]; then
            mapping=$(echo "$mapping" | jq --argjson idx "$story_index" --argjson new "$new_comments" --arg ts "$timestamp" '
                .stories[$idx].comments = ((.stories[$idx].comments // []) + $new | unique_by(.hash)) |
                .stories[$idx].last_comment_sync = $ts
            ')
        else
            mapping=$(echo "$mapping" | jq --argjson new "$new_comments" --arg ts "$timestamp" '
                .epic.comments = ((.epic.comments // []) + $new | unique_by(.hash)) |
                .epic.last_comment_sync = $ts
            ')
        fi

        echo "$mapping" > "$mapping_file"
        _log_sync "INFO" "Synced $new_count new comments for ticket #$ticket_id"
    fi

    echo '{
        "synced": true,
        "ticket_id": "'"$ticket_id"'",
        "new_remote_comments": '"$new_count"',
        "pushed_local_comments": '"$local_to_push"'
    }'
}

sync_all_mappings() {
    # Sync all mapping files
    # Arguments: [--comments]
    # Returns: JSON summary of all changes

    local sync_comments=""
    if [ "${1:-}" = "--comments" ]; then
        sync_comments="--comments"
    fi

    if [ ! -d "$TICKETS_DIR" ]; then
        echo '{"synced": false, "error": "No tickets directory", "mappings_synced": 0}'
        return 0
    fi

    local total_mappings=0
    local total_changes=0
    local features_changed="[]"

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local feature_name
            feature_name=$(basename "$file" .json)
            total_mappings=$((total_mappings + 1))

            local result
            result=$(sync_mapping_file "$feature_name" $sync_comments)

            local changes
            changes=$(echo "$result" | jq '.stories_changed // 0')

            if [ "$changes" -gt 0 ]; then
                total_changes=$((total_changes + changes))
                features_changed=$(echo "$features_changed" | jq --arg f "$feature_name" '. + [$f]')
            fi
        fi
    done < <(find "$TICKETS_DIR" -maxdepth 1 -name "*.json" 2>/dev/null || true)

    _log_sync "INFO" "sync_all_mappings complete: mappings=$total_mappings, changes=$total_changes"

    echo '{
        "synced": true,
        "mappings_synced": '"$total_mappings"',
        "total_changes": '"$total_changes"',
        "features_changed": '"$features_changed"'
    }'
}

# =============================================================================
# Pending Changes (Offline Mode)
# =============================================================================

_save_pending_change() {
    # Save a pending change for offline mode
    # Arguments: issue_id, change_type, data

    local issue_id="$1"
    local change_type="$2"
    local data="$3"
    local pending_file="$ISSUES_DIR/${issue_id}.pending.json"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    if [ -f "$pending_file" ]; then
        # Append to existing pending changes
        jq --arg type "$change_type" --arg ts "$timestamp" --argjson data "$data" \
            '.changes += [{"type": $type, "timestamp": $ts, "data": $data}]' \
            "$pending_file" > "${pending_file}.tmp"
        mv "${pending_file}.tmp" "$pending_file"
    else
        # Create new pending file
        jq -n --arg id "$issue_id" --arg type "$change_type" --arg ts "$timestamp" --argjson data "$data" \
            '{
                issue_id: $id,
                changes: [{"type": $type, "timestamp": $ts, "data": $data}]
            }' > "$pending_file"
    fi

    _log_sync "INFO" "Saved pending change for issue #$issue_id: $change_type"
}

_apply_pending_changes() {
    # Apply all pending changes for an issue
    # Arguments: issue_id
    # Called after coming back online

    local issue_id="$1"
    local pending_file="$ISSUES_DIR/${issue_id}.pending.json"

    if [ ! -f "$pending_file" ]; then
        return 0
    fi

    _log_sync "INFO" "Applying pending changes for issue #$issue_id"

    # For now, just sync the issue (pending changes inform the user)
    sync_issue "$issue_id" "manual"

    # Remove pending file after successful sync
    rm -f "$pending_file"
}

# =============================================================================
# Help / CLI Interface
# =============================================================================

_sync_manager_show_help() {
    echo "Sync Manager - Checkpoint-based sync for issue tracking"
    echo ""
    echo "Usage: scripts/sync-manager.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  sync ISSUE_ID [CHECKPOINT]  - Sync single issue"
    echo "  sync-all [CHECKPOINT]       - Sync all issues"
    echo "  conflicts ISSUE_ID          - Show conflicts for an issue"
    echo "  resolve ISSUE_ID STRATEGY   - Resolve conflict (local|remote|merge)"
    echo "  status                      - Show sync status"
    echo ""
    echo "Checkpoints: starting, before_spec, after_completion, scope_change, manual"
    echo ""
    echo "Examples:"
    echo "  scripts/sync-manager.sh sync 123 starting"
    echo "  scripts/sync-manager.sh sync-all before_spec"
    echo "  scripts/sync-manager.sh resolve 123 remote"
}

# CLI interface when run directly
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        case "${1:-help}" in
            sync)
                if [ -z "${2:-}" ]; then
                    echo "Error: Issue ID required" >&2
                    echo "Usage: scripts/sync-manager.sh sync ISSUE_ID [CHECKPOINT]" >&2
                    exit 1
                fi
                sync_issue "$2" "${3:-manual}"
                ;;
            sync-all)
                sync_all "${2:-manual}"
                ;;
            conflicts)
                if [ -z "${2:-}" ]; then
                    echo "Error: Issue ID required" >&2
                    exit 1
                fi
                conflicts=$(detect_conflicts "$2")
                present_conflicts "$conflicts"
                ;;
            resolve)
                if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
                    echo "Error: Issue ID and strategy required" >&2
                    echo "Usage: scripts/sync-manager.sh resolve ISSUE_ID STRATEGY" >&2
                    exit 1
                fi
                resolve_conflict "$2" "$3"
                ;;
            status)
                echo "Sync Status:"
                echo "  Tracker: $(tracker_type)"
                echo "  Online: $(_check_online)"
                echo "  Issues dir: $ISSUES_DIR"
                if [ -f "$SYNC_LOG" ]; then
                    echo "  Last log entries:"
                    tail -5 "$SYNC_LOG" | sed 's/^/    /'
                fi
                ;;
            help|--help|-h)
                _sync_manager_show_help
                ;;
            *)
                _sync_manager_show_help
                ;;
        esac
    fi
fi
