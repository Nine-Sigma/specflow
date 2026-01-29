#!/bin/bash
# scripts/specflow-watcher.sh
# SpecFlow watcher: monitors handoffs, triggers swarms
# Design: Simple polling, file-based coordination
# Foreground process with graceful abort

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SPECFLOW_DIR=".specflow"
HANDOFFS_DIR="$SPECFLOW_DIR/handoffs"
ARCHIVE_DIR="$HANDOFFS_DIR/archive"
CONFIG_FILE="$SPECFLOW_DIR/config.json"
PROGRESS_FILE="$SPECFLOW_DIR/.watcher-progress"

# Poll interval in seconds
POLL_INTERVAL=2

# Graceful shutdown handler
RUNNING=true
cleanup() {
    echo ""
    echo -e "${YELLOW}Graceful shutdown...${NC}"
    RUNNING=false
}
trap cleanup SIGINT SIGTERM

# Load config value (returns default if not found)
config_get() {
    local key="$1"
    local default="$2"
    if [ -f "$CONFIG_FILE" ]; then
        jq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# Show current status
show_status() {
    echo "=== SpecFlow Watcher Status ==="
    echo ""

    if [ ! -d "$SPECFLOW_DIR" ]; then
        echo -e "${RED}Error: $SPECFLOW_DIR not found. Run 'specflow init' first.${NC}"
        exit 1
    fi

    # Check for pending handoffs
    local handoffs
    handoffs=$(find "$HANDOFFS_DIR" -maxdepth 1 -name "handoff-to-*.md" 2>/dev/null | wc -l | tr -d ' ')

    echo "Handoffs pending: $handoffs"
    if [ "$handoffs" -gt 0 ]; then
        echo "Files:"
        find "$HANDOFFS_DIR" -maxdepth 1 -name "handoff-to-*.md" -exec basename {} \;
    fi
    echo ""

    # Check for saved progress
    if [ -f "$PROGRESS_FILE" ]; then
        echo -e "${YELLOW}Saved progress found:${NC}"
        cat "$PROGRESS_FILE"
    else
        echo "No saved progress."
    fi
    echo ""

    # Config summary
    echo "Config:"
    echo "  Archive handoffs: $(config_get '.handoff_archive' 'true')"
    echo "  Pause before execution: $(config_get '.pause_before_execution' 'true')"
}

# Process a single handoff file
process_handoff() {
    local handoff_file="$1"
    local filename
    filename=$(basename "$handoff_file")

    # Extract swarm name from filename (handoff-to-{swarm}.md)
    local swarm
    swarm=$(echo "$filename" | sed 's/handoff-to-\(.*\)\.md/\1/')

    echo -e "${BLUE}[$(date +%H:%M:%S)] Detected: $filename${NC}"
    echo -e "  Next swarm: ${GREEN}$swarm${NC}"

    # Check if swarm is enabled
    local enabled
    enabled=$(config_get ".swarms.$swarm.enabled" "true")
    if [ "$enabled" != "true" ]; then
        echo -e "  ${YELLOW}Swarm '$swarm' is disabled. Archiving handoff.${NC}"
    fi

    # Check for execution pause
    if [ "$swarm" = "execution" ]; then
        local pause
        pause=$(config_get '.pause_before_execution' 'true')
        if [ "$pause" = "true" ]; then
            echo ""
            echo -e "${YELLOW}=== PM Approval Required ===${NC}"
            echo "Spec creation complete. Review before execution."
            echo -n "Continue to execution swarm? (y/n): "
            read -r response
            if [ "$response" != "y" ]; then
                echo "Paused. Run 'specflow-watcher.sh resume' to continue."
                echo "$handoff_file" > "$PROGRESS_FILE"
                return 1
            fi
        fi
    fi

    # Archive the handoff if configured
    local archive
    archive=$(config_get '.handoff_archive' 'true')
    if [ "$archive" = "true" ]; then
        mv "$handoff_file" "$ARCHIVE_DIR/"
        echo "  Archived: $ARCHIVE_DIR/$filename"
    fi

    # TODO: Actual swarm execution will be added in future plans
    echo -e "  ${GREEN}Ready to trigger: $swarm swarm${NC}"
    echo ""
}

# Main watch loop
watch_loop() {
    echo "=== SpecFlow Watcher ==="
    echo "Monitoring: $HANDOFFS_DIR"
    echo "Poll interval: ${POLL_INTERVAL}s"
    echo "Press Ctrl+C for graceful shutdown"
    echo ""

    while $RUNNING; do
        # Find handoff files
        for handoff in "$HANDOFFS_DIR"/handoff-to-*.md; do
            [ -e "$handoff" ] || continue
            process_handoff "$handoff" || break
        done

        sleep "$POLL_INTERVAL"
    done

    echo "Watcher stopped."
}

# Resume from saved progress
resume() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "No saved progress to resume."
        exit 0
    fi

    local saved_handoff
    saved_handoff=$(cat "$PROGRESS_FILE")

    if [ -f "$saved_handoff" ]; then
        echo "Resuming from: $saved_handoff"
        rm "$PROGRESS_FILE"
        process_handoff "$saved_handoff"
    else
        echo "Saved handoff no longer exists: $saved_handoff"
        rm "$PROGRESS_FILE"
    fi

    # Continue watching
    watch_loop
}

# Main entry point
main() {
    local command="${1:-watch}"

    case "$command" in
        watch)
            watch_loop
            ;;
        resume)
            resume
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: specflow-watcher.sh [watch|resume|status]"
            echo ""
            echo "Commands:"
            echo "  watch   Start watching for handoffs (default)"
            echo "  resume  Resume from saved progress"
            echo "  status  Show current watcher state"
            exit 1
            ;;
    esac
}

main "$@"
