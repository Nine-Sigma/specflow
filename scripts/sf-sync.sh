#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# sf-sync.sh - Manual sync command for issue tracking and ticket mappings
# ============================================================================
# Usage: sf-sync.sh [COMMAND] [ARGS]
#   sf-sync.sh                    # Sync all issues and mappings
#   sf-sync.sh 123                # Sync specific issue
#   sf-sync.sh mapping <feature>  # Sync specific feature's ticket mapping
#   sf-sync.sh mappings           # Sync all ticket mappings
#   sf-sync.sh status <feature>   # Show sync status for feature
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source sync manager
source "$SCRIPT_DIR/sync-manager.sh"

_show_help() {
    echo "sf-sync.sh - Manual sync for issue tracking and ticket mappings"
    echo ""
    echo "Usage: sf-sync.sh [COMMAND] [ARGS] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  (no args)              Sync all issues and mappings"
    echo "  <issue_id>             Sync specific issue (e.g., 123 or #123)"
    echo "  mapping <feature>      Sync specific feature's ticket mapping"
    echo "  mappings               Sync all ticket mapping files"
    echo "  status [feature]       Show sync status (optionally for specific feature)"
    echo ""
    echo "Options:"
    echo "  --help, -h             Show this help message"
    echo "  --skip-mappings        Skip mapping sync when syncing all"
    echo "  --comments             Include comment sync (slower)"
    echo ""
    echo "Examples:"
    echo "  sf-sync.sh                           # Sync all issues and mappings"
    echo "  sf-sync.sh 123                       # Sync issue #123"
    echo "  sf-sync.sh mapping add-logout        # Sync add-logout feature's tickets"
    echo "  sf-sync.sh mappings                  # Sync all mapping files"
    echo "  sf-sync.sh mappings --comments       # Sync all mappings with comments"
    echo "  sf-sync.sh status                    # Show overall sync status"
    echo "  sf-sync.sh status add-logout         # Show status for add-logout feature"
    echo "  sf-sync.sh --skip-mappings           # Sync issues only, skip mappings"
}

_show_feature_status() {
    local feature_name="$1"
    local mapping_file=".specflow/tickets/${feature_name}.json"

    if [ ! -f "$mapping_file" ]; then
        echo "Error: Mapping file not found for feature: $feature_name"
        echo "Path: $mapping_file"
        return 1
    fi

    local mapping
    mapping=$(cat "$mapping_file")

    local epic_number epic_status
    epic_number=$(echo "$mapping" | jq -r '.epic.number // "N/A"')
    epic_status=$(echo "$mapping" | jq -r '.epic.status // "open"')

    echo "Feature: $feature_name"
    echo "Epic: #$epic_number ($epic_status)"
    echo ""
    echo "Stories:"

    local story_count
    story_count=$(echo "$mapping" | jq '.stories | length')

    for i in $(seq 0 $((story_count - 1))); do
        local num title status tasks_total tasks_complete tasks_pending
        num=$(echo "$mapping" | jq -r ".stories[$i].number")
        title=$(echo "$mapping" | jq -r ".stories[$i].title")
        status=$(echo "$mapping" | jq -r ".stories[$i].status // \"open\"")
        tasks_total=$(echo "$mapping" | jq ".stories[$i].tasks | length")
        tasks_complete=$(echo "$mapping" | jq "[.stories[$i].tasks[] | select(.status == \"complete\")] | length")
        tasks_pending=$((tasks_total - tasks_complete))

        local status_indicator
        if [ "$status" = "closed" ]; then
            status_indicator="closed -> tasks complete"
        else
            status_indicator="open -> $tasks_pending tasks pending"
        fi

        echo "  #$num $title - $status_indicator"
    done

    local last_sync
    last_sync=$(echo "$mapping" | jq -r '.last_sync // "Never"')
    echo ""
    echo "Last sync: $last_sync"
}

_show_overall_status() {
    echo "Sync Status:"
    echo "  Tracker: $(tracker_type)"
    echo "  Online: $(_check_online)"
    echo ""

    local issues_dir=".specflow/issues"
    if [ -d "$issues_dir" ]; then
        local issue_count
        issue_count=$(find "$issues_dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        echo "  Cached issues: $issue_count"
    else
        echo "  Cached issues: 0"
    fi

    local tickets_dir=".specflow/tickets"
    if [ -d "$tickets_dir" ]; then
        local mapping_count
        mapping_count=$(find "$tickets_dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        echo "  Ticket mappings: $mapping_count"

        if [ "$mapping_count" -gt 0 ]; then
            echo ""
            echo "  Features:"
            while IFS= read -r file; do
                if [ -f "$file" ]; then
                    local feature_name epic_number story_count
                    feature_name=$(basename "$file" .json)
                    epic_number=$(jq -r '.epic.number // "N/A"' "$file")
                    story_count=$(jq '.stories | length' "$file")
                    echo "    - $feature_name (epic #$epic_number, $story_count stories)"
                fi
            done < <(find "$tickets_dir" -maxdepth 1 -name "*.json" 2>/dev/null || true)
        fi
    else
        echo "  Ticket mappings: 0"
    fi

    echo ""
    local sync_log=".specflow/sync.log"
    if [ -f "$sync_log" ]; then
        echo "  Last sync operations:"
        tail -5 "$sync_log" | sed 's/^/    /'
    fi
}

main() {
    local skip_mappings=false
    local with_comments=""
    local args=()

    # Parse options first
    for arg in "$@"; do
        case "$arg" in
            --help|-h)
                _show_help
                exit 0
                ;;
            --skip-mappings)
                skip_mappings=true
                ;;
            --comments)
                with_comments="--comments"
                ;;
            *)
                args+=("$arg")
                ;;
        esac
    done

    # Process command
    local cmd="${args[0]:-}"
    local arg1="${args[1]:-}"

    case "$cmd" in
        "")
            # Sync all issues and mappings
            echo "Syncing all issues..."
            local issue_result
            issue_result=$(sync_all manual)
            echo "Issue sync complete:"
            echo "$issue_result" | jq '.'

            if [ "$skip_mappings" = "false" ]; then
                echo ""
                echo "Syncing all ticket mappings..."
                local mapping_result
                mapping_result=$(sync_all_mappings $with_comments)
                echo "Mapping sync complete:"
                echo "$mapping_result" | jq '.'
            else
                echo ""
                echo "Skipping mapping sync (--skip-mappings)"
            fi
            ;;
        mapping)
            if [ -z "$arg1" ]; then
                echo "Error: Feature name required"
                echo "Usage: sf-sync.sh mapping <feature>"
                exit 1
            fi
            echo "Syncing mapping for feature: $arg1..."
            local result
            result=$(sync_mapping_file "$arg1" $with_comments)
            echo "Sync result:"
            echo "$result" | jq '.'
            ;;
        mappings)
            echo "Syncing all ticket mappings..."
            local result
            result=$(sync_all_mappings $with_comments)
            echo "Sync result:"
            echo "$result" | jq '.'
            ;;
        status)
            if [ -n "$arg1" ]; then
                _show_feature_status "$arg1"
            else
                _show_overall_status
            fi
            ;;
        *)
            # Check if it looks like an issue number
            local issue_id="${cmd#\#}"
            if [[ "$issue_id" =~ ^[0-9]+$ ]]; then
                echo "Syncing issue #$issue_id..."
                local result
                result=$(sync_issue "$issue_id" manual)
                echo ""
                echo "Sync result:"
                echo "$result" | jq '.'
            else
                echo "Unknown command: $cmd"
                echo ""
                _show_help
                exit 1
            fi
            ;;
    esac
}

main "$@"
