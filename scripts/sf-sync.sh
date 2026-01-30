#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# sf-sync.sh - Manual sync command for issue tracking
# ============================================================================
# Usage: sf-sync.sh [ISSUE_ID]
#   sf-sync.sh        # Sync all issues
#   sf-sync.sh 123    # Sync specific issue
#   sf-sync.sh #123   # Same as above
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source sync manager
source "$SCRIPT_DIR/sync-manager.sh"

_show_help() {
    echo "sf-sync.sh - Manual sync for issue tracking"
    echo ""
    echo "Usage: sf-sync.sh [ISSUE_ID]"
    echo ""
    echo "Arguments:"
    echo "  ISSUE_ID    Issue number to sync (optional)"
    echo "              If omitted, syncs all issues"
    echo ""
    echo "Options:"
    echo "  --help, -h  Show this help message"
    echo "  --status    Show sync status"
    echo ""
    echo "Examples:"
    echo "  sf-sync.sh           # Sync all issues"
    echo "  sf-sync.sh 123       # Sync issue #123"
    echo "  sf-sync.sh #123      # Same as above"
    echo "  sf-sync.sh --status  # Show sync status"
}

main() {
    case "${1:-}" in
        --help|-h)
            _show_help
            exit 0
            ;;
        --status)
            echo "Sync Status:"
            echo "  Tracker: $(tracker_type)"
            echo "  Online: $(_check_online)"
            echo ""
            local issues_dir=".specflow/issues"
            if [ -d "$issues_dir" ]; then
                local issue_count
                issue_count=$(find "$issues_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
                echo "  Cached issues: $issue_count"
            else
                echo "  Cached issues: 0"
            fi
            echo ""
            local sync_log=".specflow/sync.log"
            if [ -f "$sync_log" ]; then
                echo "  Last sync operations:"
                tail -5 "$sync_log" | sed 's/^/    /'
            fi
            exit 0
            ;;
        "")
            echo "Syncing all issues..."
            local result
            result=$(sync_all manual)
            echo ""
            echo "Sync complete:"
            echo "$result" | jq '.'
            ;;
        *)
            # Extract issue ID (strip # if present)
            local issue_id="${1#\#}"
            echo "Syncing issue #$issue_id..."
            local result
            result=$(sync_issue "$issue_id" manual)
            echo ""
            echo "Sync result:"
            echo "$result" | jq '.'
            ;;
    esac
}

main "$@"
