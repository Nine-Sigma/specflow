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
    local id  # Declare outside loop for zsh compatibility
    # Use find instead of glob for cross-shell compatibility
    while IFS= read -r file; do
        if [ -f "$file" ]; then
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

tracker_create_story() {
    # Create a story issue, optionally linked to an epic
    # Arguments: title, body, [labels], [epic_node_id]
    # Returns: JSON object with number, title, url, node_id, parent_id, type

    local title="$1"
    local body="${2:-}"
    local labels="${3:-}"
    local epic_node_id="${4:-}"
    local type
    type=$(tracker_type)

    # Get the story label from config
    local story_label
    story_label=$(_get_config_value '.ticket_management.labels.story' 'specflow:story')

    # Ensure story label is included
    if [ -n "$labels" ]; then
        labels="$labels,$story_label"
    else
        labels="$story_label"
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

            # Get node_id via GraphQL
            local node_id
            node_id=$(_get_issue_node_id "$issue_number")

            if [ -z "$node_id" ]; then
                echo "Warning: Could not fetch node_id for issue #$issue_number" >&2
            fi

            # If epic_node_id provided, link as sub-issue
            local link_success="false"
            if [ -n "$epic_node_id" ] && [ -n "$node_id" ]; then
                # Check if sub-issues are enabled in config
                local use_sub_issues
                use_sub_issues=$(_get_config_value '.tracker.github.use_sub_issues' 'true')

                if [ "$use_sub_issues" = "true" ]; then
                    # Try to link via GraphQL with sub_issues feature header
                    local link_result
                    link_result=$(gh api graphql \
                        -H "GraphQL-Features: sub_issues" \
                        -f query='
                            mutation($parent: ID!, $child: ID!) {
                                addSubIssue(input: {issueId: $parent, subIssueId: $child}) {
                                    issue { title }
                                }
                            }' \
                        -F parent="$epic_node_id" -F child="$node_id" 2>&1) || true

                    if echo "$link_result" | grep -q '"title"'; then
                        link_success="true"
                    else
                        echo "Warning: Could not link story as sub-issue: $link_result" >&2
                        # Check fallback setting
                        local fallback
                        fallback=$(_get_config_value '.tracker.github.fallback_to_task_list' 'true')
                        if [ "$fallback" = "true" ]; then
                            echo "Note: Fallback to task list not yet implemented" >&2
                        fi
                    fi
                fi
            fi

            _log_tracker_op "create_story" "$issue_number" "title=$title, epic=$epic_node_id, linked=$link_success"

            # Return JSON with all fields
            jq -n \
                --arg number "$issue_number" \
                --arg title "$title" \
                --arg url "$issue_url" \
                --arg node_id "$node_id" \
                --arg parent_id "$epic_node_id" \
                '{
                    number: ($number | tonumber),
                    title: $title,
                    url: $url,
                    node_id: $node_id,
                    parent_id: $parent_id,
                    type: "story"
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

            # Create story JSON with type and parent_id
            jq -n \
                --arg id "$issue_id" \
                --arg title "$title" \
                --arg body "$body" \
                --argjson labels "$labels_array" \
                --arg ts "$timestamp" \
                --arg parent_id "$epic_node_id" \
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
                    type: "story",
                    parent_id: $parent_id
                }' > "$file"

            # If epic exists locally, update its sub_issues array
            if [ -n "$epic_node_id" ]; then
                local epic_file="$ISSUES_DIR/${epic_node_id}.json"
                if [ -f "$epic_file" ]; then
                    jq --arg story_id "$issue_id" \
                        '.sub_issues = (.sub_issues // []) + [$story_id]' \
                        "$epic_file" > "${epic_file}.tmp"
                    mv "${epic_file}.tmp" "$epic_file"
                fi
            fi

            _log_tracker_op "create_story" "$issue_id" "title=$title, epic=$epic_node_id"

            # Return JSON in same format as GitHub
            jq '{
                number: .number,
                title: .title,
                url: ("local://" + .id),
                node_id: .id,
                parent_id: .parent_id,
                type: .type
            }' "$file"
            ;;
        *)
            echo "Unknown tracker type: $type" >&2
            return 1
            ;;
    esac
}

_calculate_story_points() {
    # Calculate story points based on criteria count
    # Arguments: criteria_count
    # Returns: points (1 per 2 criteria, capped at configured max)

    local criteria_count="${1:-0}"
    local cap
    cap=$(_get_config_value '.ticket_management.story_point_cap' '8')

    # 1 point per 2 criteria
    local points=$(( (criteria_count + 1) / 2 ))

    # Cap at configured max
    if [ "$points" -gt "$cap" ]; then
        points=$cap
    fi

    # Minimum 1 point if any criteria
    if [ "$criteria_count" -gt 0 ] && [ "$points" -lt 1 ]; then
        points=1
    fi

    echo "$points"
}

tracker_set_story_points() {
    # Set story points on an issue
    # Arguments: issue_id_or_node_id, points
    # For GitHub: Uses Projects API if configured, otherwise label fallback

    local issue_id="$1"
    local points="$2"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            # Check if Projects API is configured
            local project_id story_points_field_id
            project_id=$(_get_config_value '.tracker.github.project_id' '')
            story_points_field_id=$(_get_config_value '.tracker.github.story_points_field_id' '')

            if [ -n "$project_id" ] && [ -n "$story_points_field_id" ]; then
                # Use GitHub Projects API
                # Note: This requires the issue to be added to the project first
                echo "Warning: GitHub Projects API for story points not yet implemented" >&2
                echo "Falling back to label" >&2
            fi

            # Fallback: Use label
            # First remove any existing points:N labels
            local existing_labels
            existing_labels=$(gh issue view "$issue_id" --json labels --jq '.labels[].name' 2>/dev/null || echo "")
            for lbl in $existing_labels; do
                if [[ "$lbl" =~ ^points:[0-9]+$ ]]; then
                    gh issue edit "$issue_id" --remove-label "$lbl" 2>/dev/null || true
                fi
            done

            # Add new points label
            gh issue edit "$issue_id" --add-label "points:$points" 2>/dev/null || {
                echo "Warning: Could not add points label" >&2
            }

            _log_tracker_op "set_story_points" "$issue_id" "points=$points"
            echo "{\"issue_id\": \"$issue_id\", \"story_points\": $points}"
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
                jq --argjson points "$points" '.story_points = $points' "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
                _log_tracker_op "set_story_points" "$issue_id" "points=$points"
                echo "{\"issue_id\": \"$issue_id\", \"story_points\": $points}"
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

tracker_get_comments() {
    # Get comments from an issue
    # Arguments: issue_id
    # Returns: JSON array of {body, created_at, author} objects

    local issue_id="$1"
    local type
    type=$(tracker_type)

    case "$type" in
        github)
            gh issue view "$issue_id" --json comments \
                --jq '[.comments[] | {body: .body, created_at: .createdAt, author: .author.login}]' 2>/dev/null || echo "[]"
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
                jq '[(.comments // [])[] | {body: .body, created_at: .created_at, author: (.author // "local")}]' "$file"
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
    echo "Epic/Story Management:"
    echo "  tracker_create_epic TITLE BODY [LABELS]"
    echo "                                    - Create epic issue with parent tracking"
    echo "  tracker_create_story TITLE BODY [LABELS] [EPIC_NODE_ID]"
    echo "                                    - Create story, optionally linked to epic"
    echo "  tracker_set_story_points ID POINTS"
    echo "                                    - Set story points (via Projects or label)"
    echo "  tracker_get_comments ID           - Get comments from issue"
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
