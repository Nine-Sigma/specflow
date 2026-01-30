#!/usr/bin/env bash
set -euo pipefail

# Tracker Adapter - Unified interface for GitHub/Jira/Linear/Local issue tracking
# Usage: source scripts/tracker-adapter.sh
#
# This script provides a common interface for tracker operations regardless
# of the backend system configured in .specflow/config.json

SPECFLOW_DIR=".specflow"
CONFIG_FILE="$SPECFLOW_DIR/config.json"
ISSUES_DIR="$SPECFLOW_DIR/issues"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_ensure_issues_dir() {
    mkdir -p "$ISSUES_DIR"
}

_next_local_id() {
    _ensure_issues_dir
    local max_id=0
    # Use find instead of glob for cross-shell compatibility
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local id
            id=$(basename "$file" .json)
            if [[ "$id" =~ ^[0-9]+$ ]] && [ "$id" -gt "$max_id" ]; then
                max_id=$id
            fi
        fi
    done < <(find "$ISSUES_DIR" -maxdepth 1 -name "*.json" 2>/dev/null || true)
    echo $((max_id + 1))
}

_log_tracker_op() {
    local operation="$1"
    local issue_id="$2"
    local details="${3:-}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    _ensure_issues_dir
    echo "$timestamp | $operation | Issue #$issue_id | $details" >> "$SPECFLOW_DIR/tracker.log"
}

_get_config_value() {
    local key="$1"
    local default="${2:-}"

    if [ -f "$CONFIG_FILE" ]; then
        local value
        value=$(jq -r "$key // \"$default\"" "$CONFIG_FILE")
        echo "$value"
    else
        echo "$default"
    fi
}

# =============================================================================
# Core Tracker Functions
# =============================================================================

tracker_type() {
    # Returns the configured tracker type (github, jira, linear, local)
    _get_config_value '.tracker.type' 'local'
}

tracker_list_issues() {
    # List open issues assigned to current user
    # Returns JSON array of issues

    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue list --assignee "@me" --state open \
                --json number,title,body,labels,state,assignees
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            _ensure_issues_dir
            local issues="[]"
            while IFS= read -r file; do
                if [ -f "$file" ]; then
                    local issue
                    issue=$(cat "$file")
                    local state
                    state=$(echo "$issue" | jq -r '.state // "open"')
                    if [ "$state" = "open" ]; then
                        issues=$(echo "$issues" | jq --argjson i "$issue" '. + [$i]')
                    fi
                fi
            done < <(find "$ISSUES_DIR" -maxdepth 1 -name "*.json" 2>/dev/null || true)
            echo "$issues"
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_get_issue() {
    # Get a single issue by ID
    # Arguments: issue_id
    # Returns JSON object

    local issue_id="$1"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue view "$issue_id" --json number,title,body,labels,state,assignees,updatedAt
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            local file="$ISSUES_DIR/${issue_id}.json"
            if [ -f "$file" ]; then
                cat "$file"
            else
                echo "Issue not found: $issue_id" >&2
                return 1
            fi
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_add_label() {
    # Add a label to an issue
    # Arguments: issue_id, label

    local issue_id="$1"
    local label="$2"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue edit "$issue_id" --add-label "$label"
            _log_tracker_op "add_label" "$issue_id" "label=$label"
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            local file="$ISSUES_DIR/${issue_id}.json"
            if [ -f "$file" ]; then
                jq --arg lbl "$label" '.labels += [$lbl] | .labels |= unique' "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
                _log_tracker_op "add_label" "$issue_id" "label=$label"
            else
                echo "Issue not found: $issue_id" >&2
                return 1
            fi
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_remove_label() {
    # Remove a label from an issue
    # Arguments: issue_id, label

    local issue_id="$1"
    local label="$2"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue edit "$issue_id" --remove-label "$label"
            _log_tracker_op "remove_label" "$issue_id" "label=$label"
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            local file="$ISSUES_DIR/${issue_id}.json"
            if [ -f "$file" ]; then
                jq --arg lbl "$label" '.labels = (.labels | map(select(. != $lbl)))' "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
                _log_tracker_op "remove_label" "$issue_id" "label=$label"
            else
                echo "Issue not found: $issue_id" >&2
                return 1
            fi
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_update_status() {
    # Update issue status (open/closed)
    # Arguments: issue_id, status (open|closed)

    local issue_id="$1"
    local status="$2"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            if [ "$status" = "closed" ]; then
                gh issue close "$issue_id" --reason completed
            else
                gh issue reopen "$issue_id"
            fi
            _log_tracker_op "update_status" "$issue_id" "status=$status"
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            local file="$ISSUES_DIR/${issue_id}.json"
            if [ -f "$file" ]; then
                jq --arg status "$status" '.state = $status' "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
                _log_tracker_op "update_status" "$issue_id" "status=$status"
            else
                echo "Issue not found: $issue_id" >&2
                return 1
            fi
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_add_comment() {
    # Add a comment to an issue
    # Arguments: issue_id, comment

    local issue_id="$1"
    local comment="$2"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue comment "$issue_id" --body "$comment"
            _log_tracker_op "add_comment" "$issue_id" "comment added"
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            local file="$ISSUES_DIR/${issue_id}.json"
            if [ -f "$file" ]; then
                local timestamp
                timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                jq --arg comment "$comment" --arg ts "$timestamp" \
                    '.comments = (.comments // []) + [{"body": $comment, "created_at": $ts}]' \
                    "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
                _log_tracker_op "add_comment" "$issue_id" "comment added"
            else
                echo "Issue not found: $issue_id" >&2
                return 1
            fi
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

# =============================================================================
# Additional Functions
# =============================================================================

tracker_create_issue() {
    # Create a new issue
    # Arguments: title, body, [labels]
    # Returns: JSON object with created issue

    local title="$1"
    local body="${2:-}"
    local labels="${3:-}"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            local cmd="gh issue create --title \"$title\" --body \"$body\""
            if [ -n "$labels" ]; then
                cmd="$cmd --label \"$labels\""
            fi
            local result
            result=$(eval "$cmd" 2>&1)
            local issue_number
            issue_number=$(echo "$result" | grep -oE '[0-9]+$' || echo "")
            if [ -n "$issue_number" ]; then
                _log_tracker_op "create_issue" "$issue_number" "title=$title"
                gh issue view "$issue_number" --json number,title,body,labels,state,assignees
            else
                echo "$result"
                return 1
            fi
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            _ensure_issues_dir
            local issue_id
            issue_id=$(_next_local_id)
            local timestamp
            timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
            local file="$ISSUES_DIR/${issue_id}.json"

            # Parse labels into array
            local labels_array="[]"
            if [ -n "$labels" ]; then
                labels_array=$(echo "$labels" | tr ',' '\n' | jq -R '.' | jq -s '.')
            fi

            # Create issue JSON
            jq -n \
                --arg id "$issue_id" \
                --arg title "$title" \
                --arg body "$body" \
                --argjson labels "$labels_array" \
                --arg ts "$timestamp" \
                '{
                    id: $id,
                    number: ($id | tonumber),
                    title: $title,
                    body: $body,
                    labels: $labels,
                    state: "open",
                    assignees: [],
                    created_at: $ts,
                    updated_at: $ts,
                    comments: []
                }' > "$file"

            _log_tracker_op "create_issue" "$issue_id" "title=$title"
            cat "$file"
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

tracker_search() {
    # Search issues by query
    # Arguments: query
    # Returns: JSON array of matching issues

    local query="$1"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue list --search "$query" \
                --json number,title,body,labels,state,assignees
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            _ensure_issues_dir
            local issues="[]"
            local query_lower
            query_lower=$(echo "$query" | tr '[:upper:]' '[:lower:]')
            while IFS= read -r file; do
                if [ -f "$file" ]; then
                    local issue
                    issue=$(cat "$file")
                    local title body
                    title=$(echo "$issue" | jq -r '.title // ""' | tr '[:upper:]' '[:lower:]')
                    body=$(echo "$issue" | jq -r '.body // ""' | tr '[:upper:]' '[:lower:]')
                    # Simple substring search
                    if [[ "$title" == *"$query_lower"* ]] || [[ "$body" == *"$query_lower"* ]]; then
                        issues=$(echo "$issues" | jq --argjson i "$issue" '. + [$i]')
                    fi
                fi
            done < <(find "$ISSUES_DIR" -maxdepth 1 -name "*.json" 2>/dev/null || true)
            echo "$issues"
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

# =============================================================================
# Epic/Story Management Functions
# =============================================================================

_get_repo_owner() {
    # Extract owner from gh repo view
    gh repo view --json owner --jq '.owner.login' 2>/dev/null || echo ""
}

_get_repo_name() {
    # Extract repo name from gh repo view
    gh repo view --json name --jq '.name' 2>/dev/null || echo ""
}

_get_issue_node_id() {
    # Get the GraphQL node_id for a GitHub issue
    # Arguments: issue_number
    local issue_number="$1"
    local owner repo

    owner=$(_get_repo_owner)
    repo=$(_get_repo_name)

    if [ -z "$owner" ] || [ -z "$repo" ]; then
        echo "" # Return empty if we can't get repo info
        return 0
    fi

    gh api graphql -f query='
        query($owner: String!, $repo: String!, $number: Int!) {
            repository(owner: $owner, name: $repo) {
                issue(number: $number) { id }
            }
        }' \
        -F owner="$owner" -F repo="$repo" -F number="$issue_number" \
        --jq '.data.repository.issue.id' 2>/dev/null || echo ""
}

tracker_create_epic() {
    # Create an epic issue with parent tracking capability
    # Arguments: title, body, [labels]
    # Returns: JSON object with number, title, url, node_id, type

    local title="$1"
    local body="${2:-}"
    local labels="${3:-}"
    local type
    type=$(tracker_type)

    # Get the epic label from config
    local epic_label
    epic_label=$(_get_config_value '.ticket_management.labels.epic' 'specflow:epic')

    # Ensure epic label is included
    if [ -n "$labels" ]; then
        labels="$labels,$epic_label"
    else
        labels="$epic_label"
    fi

    case "$type" in
        github)
            # Create the issue
            local cmd="gh issue create --title \"$title\" --body \"$body\" --label \"$labels\""
            local result
            result=$(eval "$cmd" 2>&1)
            local issue_number
            issue_number=$(echo "$result" | grep -oE '[0-9]+$' || echo "")

            if [ -z "$issue_number" ]; then
                echo "$result" >&2
                return 1
            fi

            # Get issue URL
            local issue_url
            issue_url=$(gh issue view "$issue_number" --json url --jq '.url' 2>/dev/null || echo "")

            # Try to get node_id via GraphQL
            local node_id
            node_id=$(_get_issue_node_id "$issue_number")

            if [ -z "$node_id" ]; then
                echo "Warning: Could not fetch node_id for issue #$issue_number" >&2
            fi

            _log_tracker_op "create_epic" "$issue_number" "title=$title"

            # Return JSON with all fields
            jq -n \
                --arg number "$issue_number" \
                --arg title "$title" \
                --arg url "$issue_url" \
                --arg node_id "$node_id" \
                '{
                    number: ($number | tonumber),
                    title: $title,
                    url: $url,
                    node_id: $node_id,
                    type: "epic"
                }'
            ;;
        jira)
            echo "Jira adapter not implemented" >&2
            return 1
            ;;
        linear)
            echo "Linear adapter not implemented" >&2
            return 1
            ;;
        local)
            _ensure_issues_dir
            local issue_id
            issue_id=$(_next_local_id)
            local timestamp
            timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
            local file="$ISSUES_DIR/${issue_id}.json"

            # Parse labels into array
            local labels_array="[]"
            if [ -n "$labels" ]; then
                labels_array=$(echo "$labels" | tr ',' '\n' | jq -R '.' | jq -s '.')
            fi

            # Create epic JSON with type and sub_issues array
            jq -n \
                --arg id "$issue_id" \
                --arg title "$title" \
                --arg body "$body" \
                --argjson labels "$labels_array" \
                --arg ts "$timestamp" \
                '{
                    id: $id,
                    number: ($id | tonumber),
                    title: $title,
                    body: $body,
                    labels: $labels,
                    state: "open",
                    assignees: [],
                    created_at: $ts,
                    updated_at: $ts,
                    comments: [],
                    type: "epic",
                    sub_issues: []
                }' > "$file"

            _log_tracker_op "create_epic" "$issue_id" "title=$title"

            # Return JSON in same format as GitHub
            jq '{
                number: .number,
                title: .title,
                url: ("local://" + .id),
                node_id: .id,
                type: .type
            }' "$file"
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

# =============================================================================
# Help / Usage
# =============================================================================

_tracker_adapter_show_help() {
    echo "Tracker Adapter - Unified interface for issue tracking"
    echo ""
    echo "Usage: source scripts/tracker-adapter.sh"
    echo ""
    echo "Functions:"
    echo "  tracker_type                      - Get configured tracker type"
    echo "  tracker_list_issues               - List open issues"
    echo "  tracker_get_issue ID              - Get issue by ID"
    echo "  tracker_add_label ID LABEL        - Add label to issue"
    echo "  tracker_remove_label ID LABEL     - Remove label from issue"
    echo "  tracker_update_status ID STATUS   - Update status (open|closed)"
    echo "  tracker_add_comment ID COMMENT    - Add comment to issue"
    echo "  tracker_create_issue TITLE BODY [LABELS]"
    echo "                                    - Create new issue"
    echo "  tracker_search QUERY              - Search issues"
    echo ""
    echo "Current configuration:"
    if [ -f "$CONFIG_FILE" ]; then
        echo "  Tracker type: $(tracker_type)"
        echo "  Config file: $CONFIG_FILE"
    else
        echo "  Config file not found: $CONFIG_FILE"
        echo "  Defaulting to: local"
    fi
}

# Show help only when executed directly, not when sourced
# Works with both bash and zsh
if [ -n "${BASH_SOURCE:-}" ]; then
    # Bash
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        _tracker_adapter_show_help
    fi
elif [ -n "${ZSH_VERSION:-}" ]; then
    # Zsh - check if sourced by looking at funcfiletrace
    if [[ ${#funcfiletrace[@]} -eq 0 ]]; then
        _tracker_adapter_show_help
    fi
else
    # Unknown shell, default to showing help when run directly
    _tracker_adapter_show_help
fi
