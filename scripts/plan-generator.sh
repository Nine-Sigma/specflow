#!/usr/bin/env bash
set -euo pipefail

# Plan Generator - Generate internal execution plans from tickets
# Usage: scripts/plan-generator.sh [command] <feature-name>
# Reads ticket mapping and generates plan with task links
#
# NOTE: The PLAN.md generated here is a HUMAN REFERENCE document showing
# ticket-to-task mapping and wave structure. It is NOT a GSD execution plan.
# This plan shows which external tickets to work on and in what order.
# The external tracker (GitHub Issues) is the source of truth for execution.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
TICKETS_DIR="$SPECFLOW_DIR/tickets"
SPECS_DIR="$SPECFLOW_DIR/specs"

# Source tracker-adapter for _get_config_value
if [ -f "$SCRIPT_DIR/tracker-adapter.sh" ]; then
    source "$SCRIPT_DIR/tracker-adapter.sh"
fi

# =============================================================================
# Helper Functions
# =============================================================================

_get_mapping_file() {
    local feature="$1"
    echo "$TICKETS_DIR/${feature}.json"
}

_mapping_exists() {
    local feature="$1"
    local mapping_file
    mapping_file=$(_get_mapping_file "$feature")
    [ -f "$mapping_file" ]
}

# =============================================================================
# Core Functions
# =============================================================================

create_mapping_file() {
    # Create mapping file from epic and stories JSON
    # Arguments: feature_name, epic_json, stories_json
    local feature="$1"
    local epic_json="$2"
    local stories_json="$3"

    local mapping_file
    mapping_file=$(_get_mapping_file "$feature")

    mkdir -p "$TICKETS_DIR"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local tracker_type="local"
    if type tracker_type &>/dev/null; then
        tracker_type=$(tracker_type)
    fi

    # Build mapping structure
    local epic_number epic_node_id epic_title epic_url
    epic_number=$(echo "$epic_json" | jq -r '.number')
    epic_node_id=$(echo "$epic_json" | jq -r '.node_id // .id // ""')
    epic_title=$(echo "$epic_json" | jq -r '.title')
    epic_url=$(echo "$epic_json" | jq -r '.url // ""')

    # Process stories
    local stories_array="[]"
    local story_count
    story_count=$(echo "$stories_json" | jq 'length')

    for i in $(seq 0 $((story_count - 1))); do
        local story
        story=$(echo "$stories_json" | jq ".[$i]")

        local s_number s_node_id s_title s_url s_points
        s_number=$(echo "$story" | jq -r '.number')
        s_node_id=$(echo "$story" | jq -r '.node_id // .id // ""')
        s_title=$(echo "$story" | jq -r '.title')
        s_url=$(echo "$story" | jq -r '.url // ""')
        s_points=$(echo "$story" | jq -r '.story_points // 0')

        # Add to stories array with empty tasks (populated later)
        stories_array=$(echo "$stories_array" | jq \
            --arg tracker "$tracker_type" \
            --argjson number "$s_number" \
            --arg node_id "$s_node_id" \
            --arg title "$s_title" \
            --arg url "$s_url" \
            --argjson points "$s_points" \
            '. + [{
                tracker: $tracker,
                number: $number,
                node_id: $node_id,
                title: $title,
                url: $url,
                story_points: $points,
                tasks: []
            }]')
    done

    # Create full mapping
    jq -n \
        --arg feature "$feature" \
        --arg created "$timestamp" \
        --arg tracker "$tracker_type" \
        --argjson epic_number "$epic_number" \
        --arg epic_node_id "$epic_node_id" \
        --arg epic_title "$epic_title" \
        --arg epic_url "$epic_url" \
        --argjson stories "$stories_array" \
        '{
            feature: $feature,
            created: $created,
            epic: {
                tracker: $tracker,
                number: $epic_number,
                node_id: $epic_node_id,
                title: $epic_title,
                url: $epic_url
            },
            stories: $stories,
            wave_grouping: []
        }' > "$mapping_file"

    echo "$mapping_file"
}

generate_plan_tasks() {
    # Generate tasks for each story in mapping
    # Arguments: mapping_file
    local mapping_file="$1"

    local feature
    feature=$(jq -r '.feature' "$mapping_file")

    local story_count
    story_count=$(jq '.stories | length' "$mapping_file")

    # Generate tasks for each story
    for i in $(seq 0 $((story_count - 1))); do
        local story_number story_title story_points
        story_number=$(jq -r ".stories[$i].number" "$mapping_file")
        story_title=$(jq -r ".stories[$i].title" "$mapping_file")
        story_points=$(jq -r ".stories[$i].story_points" "$mapping_file")

        # Generate tasks based on complexity (story points)
        # Simple stories (1-2 pts): 1 task
        # Medium stories (3-5 pts): 2 tasks
        # Complex stories (6-8 pts): 3 tasks
        local task_count=1
        if [ "$story_points" -ge 6 ]; then
            task_count=3
        elif [ "$story_points" -ge 3 ]; then
            task_count=2
        fi

        local tasks="[]"
        for j in $(seq 1 "$task_count"); do
            local task_id="${feature}-${story_number}-${j}"
            local task_desc="Implementation task $j for story #$story_number"

            tasks=$(echo "$tasks" | jq \
                --arg plan_task "$task_id" \
                --arg desc "$task_desc" \
                '. + [{plan_task: $plan_task, description: $desc, status: "pending"}]')
        done

        # Update mapping with tasks
        local tmp_file="${mapping_file}.tmp"
        jq --argjson idx "$i" --argjson tasks "$tasks" \
            '.stories[$idx].tasks = $tasks' "$mapping_file" > "$tmp_file"
        mv "$tmp_file" "$mapping_file"
    done
}

generate_wave_grouping() {
    # Generate wave grouping based on story types
    # Arguments: mapping_file
    local mapping_file="$1"

    local story_count
    story_count=$(jq '.stories | length' "$mapping_file")

    local wave1="[]"
    local wave2="[]"

    for i in $(seq 0 $((story_count - 1))); do
        local story_number story_title
        story_number=$(jq -r ".stories[$i].number" "$mapping_file")
        story_title=$(jq -r ".stories[$i].title" "$mapping_file")

        # Wave 1: Backend, Infrastructure (independent)
        # Wave 2: Frontend, Testing (dependent)
        if echo "$story_title" | grep -qiE "backend|infrastructure|api|database"; then
            wave1=$(echo "$wave1" | jq --argjson n "$story_number" '. + [$n]')
        else
            wave2=$(echo "$wave2" | jq --argjson n "$story_number" '. + [$n]')
        fi
    done

    # Handle edge case: if wave1 is empty, move first story there
    local w1_count w2_count
    w1_count=$(echo "$wave1" | jq 'length')
    w2_count=$(echo "$wave2" | jq 'length')

    if [ "$w1_count" -eq 0 ] && [ "$w2_count" -gt 0 ]; then
        local first
        first=$(echo "$wave2" | jq '.[0]')
        wave1="[$first]"
        wave2=$(echo "$wave2" | jq '.[1:]')
    fi

    # Update mapping with wave grouping
    local wave_grouping
    wave_grouping=$(jq -n \
        --argjson w1 "$wave1" \
        --argjson w2 "$wave2" \
        '[{wave: 1, stories: $w1}, {wave: 2, stories: $w2}]')

    local tmp_file="${mapping_file}.tmp"
    jq --argjson waves "$wave_grouping" '.wave_grouping = $waves' "$mapping_file" > "$tmp_file"
    mv "$tmp_file" "$mapping_file"
}

generate_plan_markdown() {
    # Generate markdown execution plan
    # Arguments: mapping_file
    # Writes to .specflow/specs/{feature}/PLAN.md
    local mapping_file="$1"

    local feature epic_number epic_url timestamp
    feature=$(jq -r '.feature' "$mapping_file")
    epic_number=$(jq -r '.epic.number' "$mapping_file")
    epic_url=$(jq -r '.epic.url // ""' "$mapping_file")
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local plan_dir="$SPECS_DIR/$feature"
    mkdir -p "$plan_dir"
    local plan_file="$plan_dir/PLAN.md"

    # Build markdown
    local md=""
    md+="# Execution Plan: $feature"$'\n\n'
    md+="> **Note:** This is a ticket execution reference showing which external"$'\n'
    md+="> tickets to work on. The external tracker is the source of truth."$'\n\n'
    md+="**Epic:** #$epic_number"
    if [ -n "$epic_url" ] && [ "$epic_url" != "null" ]; then
        md+=" ($epic_url)"
    fi
    md+=$'\n'
    md+="**Generated:** $timestamp"$'\n\n'

    # Wave sections
    local wave_count
    wave_count=$(jq '.wave_grouping | length' "$mapping_file")

    for w in $(seq 0 $((wave_count - 1))); do
        local wave_num
        wave_num=$(jq -r ".wave_grouping[$w].wave" "$mapping_file")
        md+="## Wave $wave_num"$'\n\n'

        local wave_stories
        wave_stories=$(jq -r ".wave_grouping[$w].stories[]" "$mapping_file" 2>/dev/null || echo "")

        for story_num in $wave_stories; do
            # Find story in stories array
            local story_idx=-1
            local story_count
            story_count=$(jq '.stories | length' "$mapping_file")

            for i in $(seq 0 $((story_count - 1))); do
                local sn
                sn=$(jq -r ".stories[$i].number" "$mapping_file")
                if [ "$sn" = "$story_num" ]; then
                    story_idx=$i
                    break
                fi
            done

            if [ "$story_idx" -ge 0 ]; then
                local story_title story_url story_points
                story_title=$(jq -r ".stories[$story_idx].title" "$mapping_file")
                story_url=$(jq -r ".stories[$story_idx].url // \"\"" "$mapping_file")
                story_points=$(jq -r ".stories[$story_idx].story_points" "$mapping_file")

                md+="### Story #$story_num: $story_title"$'\n'
                md+="*Story Points: $story_points*"
                if [ -n "$story_url" ] && [ "$story_url" != "null" ]; then
                    md+=" | [View ticket]($story_url)"
                fi
                md+=$'\n\n'

                # Tasks
                local task_count
                task_count=$(jq ".stories[$story_idx].tasks | length" "$mapping_file")

                for t in $(seq 0 $((task_count - 1))); do
                    local task_id task_desc task_status
                    task_id=$(jq -r ".stories[$story_idx].tasks[$t].plan_task" "$mapping_file")
                    task_desc=$(jq -r ".stories[$story_idx].tasks[$t].description" "$mapping_file")
                    task_status=$(jq -r ".stories[$story_idx].tasks[$t].status" "$mapping_file")

                    local checkbox="[ ]"
                    if [ "$task_status" = "complete" ]; then
                        checkbox="[x]"
                    fi

                    md+="- $checkbox **$task_id:** $task_desc (Ticket: #$story_num)"$'\n'
                done
                md+=$'\n'
            fi
        done
    done

    # Footer
    md+="---"$'\n'
    md+="*Generated by SpecFlow plan-generator.sh*"$'\n'
    md+="*Mapping file: $mapping_file*"$'\n'

    echo "$md" > "$plan_file"
    echo "$plan_file"
}

generate_plan() {
    # Full plan generation: mapping -> tasks -> waves -> markdown
    # Arguments: feature_name, epic_json, stories_json
    local feature="$1"
    local epic_json="${2:-}"
    local stories_json="${3:-}"

    # If epic and stories not provided, try to load from mapping
    if [ -z "$epic_json" ]; then
        if _mapping_exists "$feature"; then
            local mapping_file
            mapping_file=$(_get_mapping_file "$feature")
            echo "Using existing mapping file: $mapping_file"
        else
            echo "Error: No epic_json provided and no mapping file exists" >&2
            return 1
        fi
    else
        # Create mapping file from provided data
        echo "Creating mapping file..."
        local mapping_file
        mapping_file=$(create_mapping_file "$feature" "$epic_json" "$stories_json")
        echo "  Created: $mapping_file"
    fi

    local mapping_file
    mapping_file=$(_get_mapping_file "$feature")

    # Generate tasks
    echo "Generating plan tasks..."
    generate_plan_tasks "$mapping_file"

    # Generate wave grouping
    echo "Generating wave grouping..."
    generate_wave_grouping "$mapping_file"

    # Generate markdown plan
    echo "Generating markdown plan..."
    local plan_file
    plan_file=$(generate_plan_markdown "$mapping_file")
    echo "  Created: $plan_file"

    echo ""
    echo "Plan generation complete!"
    echo "  Mapping: $mapping_file"
    echo "  Plan: $plan_file"
}

show_plan() {
    # Display existing plan for a feature
    local feature="$1"

    if ! _mapping_exists "$feature"; then
        echo "Error: No mapping found for feature: $feature" >&2
        echo "Run 'plan-generator.sh generate $feature' first" >&2
        return 1
    fi

    local mapping_file
    mapping_file=$(_get_mapping_file "$feature")

    echo "=========================================="
    echo "EXECUTION PLAN: $feature"
    echo "=========================================="
    echo ""

    local epic_number epic_title
    epic_number=$(jq -r '.epic.number' "$mapping_file")
    epic_title=$(jq -r '.epic.title' "$mapping_file")
    echo "Epic: #$epic_number - $epic_title"
    echo ""

    local wave_count
    wave_count=$(jq '.wave_grouping | length' "$mapping_file")

    for w in $(seq 0 $((wave_count - 1))); do
        local wave_num
        wave_num=$(jq -r ".wave_grouping[$w].wave" "$mapping_file")
        echo "Wave $wave_num:"

        local wave_stories
        wave_stories=$(jq -r ".wave_grouping[$w].stories[]" "$mapping_file" 2>/dev/null || echo "")

        for story_num in $wave_stories; do
            # Find story
            local story_count
            story_count=$(jq '.stories | length' "$mapping_file")

            for i in $(seq 0 $((story_count - 1))); do
                local sn
                sn=$(jq -r ".stories[$i].number" "$mapping_file")
                if [ "$sn" = "$story_num" ]; then
                    local title points status
                    title=$(jq -r ".stories[$i].title" "$mapping_file")
                    points=$(jq -r ".stories[$i].story_points" "$mapping_file")

                    # Count complete tasks
                    local total_tasks complete_tasks
                    total_tasks=$(jq ".stories[$i].tasks | length" "$mapping_file")
                    complete_tasks=$(jq "[.stories[$i].tasks[] | select(.status == \"complete\")] | length" "$mapping_file")

                    echo "  #$story_num: $title (${points}pts) [$complete_tasks/$total_tasks tasks]"
                    break
                fi
            done
        done
        echo ""
    done

    echo "=========================================="
    local plan_file="$SPECS_DIR/$feature/PLAN.md"
    if [ -f "$plan_file" ]; then
        echo "Full plan: $plan_file"
    fi
    echo "Mapping: $mapping_file"
}

update_plan() {
    # Refresh markdown from mapping (after status updates)
    local feature="$1"

    if ! _mapping_exists "$feature"; then
        echo "Error: No mapping found for feature: $feature" >&2
        return 1
    fi

    local mapping_file
    mapping_file=$(_get_mapping_file "$feature")

    echo "Updating plan from mapping..."
    local plan_file
    plan_file=$(generate_plan_markdown "$mapping_file")
    echo "Updated: $plan_file"
}

# =============================================================================
# CLI Interface
# =============================================================================

show_help() {
    echo "Plan Generator - Generate internal execution plans from tickets"
    echo ""
    echo "Usage:"
    echo "  plan-generator.sh generate <feature>  Create mapping and plan"
    echo "  plan-generator.sh show <feature>      Display existing plan"
    echo "  plan-generator.sh update <feature>    Refresh plan from mapping"
    echo "  plan-generator.sh --help              Show this help"
    echo ""
    echo "NOTE: The PLAN.md generated is a HUMAN REFERENCE document showing"
    echo "ticket-to-task mapping. It is NOT a GSD execution plan."
    echo "The external tracker (GitHub Issues) is the source of truth."
    echo ""
    echo "Files:"
    echo "  Mapping: .specflow/tickets/{feature}.json"
    echo "  Plan: .specflow/specs/{feature}/PLAN.md"
}

main() {
    local command="${1:-}"

    case "$command" in
        --help|-h)
            show_help
            exit 0
            ;;
        generate)
            local feature="${2:-}"
            if [ -z "$feature" ]; then
                echo "Error: Feature name required" >&2
                show_help
                exit 1
            fi
            # Check for additional arguments (epic_json, stories_json)
            local epic_json="${3:-}"
            local stories_json="${4:-}"
            generate_plan "$feature" "$epic_json" "$stories_json"
            ;;
        show)
            local feature="${2:-}"
            if [ -z "$feature" ]; then
                echo "Error: Feature name required" >&2
                show_help
                exit 1
            fi
            show_plan "$feature"
            ;;
        update)
            local feature="${2:-}"
            if [ -z "$feature" ]; then
                echo "Error: Feature name required" >&2
                show_help
                exit 1
            fi
            update_plan "$feature"
            ;;
        "")
            echo "Error: Command required" >&2
            show_help
            exit 1
            ;;
        *)
            echo "Error: Unknown command: $command" >&2
            show_help
            exit 1
            ;;
    esac
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
