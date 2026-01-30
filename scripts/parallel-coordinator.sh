#!/usr/bin/env bash
set -euo pipefail

# Parallel Coordinator - Dev/QA parallel work coordination via git worktrees
# Usage: scripts/parallel-coordinator.sh <command> [args]
#
# This script can be sourced by other scripts to use its functions directly:
#   source scripts/parallel-coordinator.sh
#
# Commands:
#   start <feature>      - Setup worktrees and generate baseline tests
#   cleanup <feature>    - Remove worktrees for a feature
#   validate <feature>   - Run QA scope validation
#   status <feature>     - Show worktree and execution status
#   help                 - Show this help message

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECFLOW_DIR=".specflow"
WORKTREES_DIR="$SPECFLOW_DIR/worktrees"
EXECUTION_DIR="$SPECFLOW_DIR/execution"
TEMPLATES_DIR="$SPECFLOW_DIR/templates"
SPECS_DIR="$SPECFLOW_DIR/specs"

# =============================================================================
# Internal Helper Functions
# =============================================================================

_log() {
    local level="$1"
    shift
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$level] $*"
}

_ensure_dir() {
    local dir="$1"
    mkdir -p "$dir"
}

# =============================================================================
# Worktree Management Functions
# =============================================================================

setup_parallel_worktrees() {
    # Setup isolated git worktrees for Dev and QA parallel work
    # Arguments: feature_name, [base_branch]
    # Returns: JSON with worktree paths
    #
    # Creates:
    #   - Feature branch: feature/{feature} (from base_branch)
    #   - Dev worktree: .specflow/worktrees/{feature}/dev on {feature}-dev branch
    #   - QA worktree: .specflow/worktrees/{feature}/qa on {feature}-qa branch

    local feature="$1"
    local base_branch="${2:-main}"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local feature_branch="feature/${feature}"
    local dev_branch="${feature}-dev"
    local qa_branch="${feature}-qa"
    local dev_worktree="$WORKTREES_DIR/${feature}/dev"
    local qa_worktree="$WORKTREES_DIR/${feature}/qa"

    _log "INFO" "Setting up parallel worktrees for feature: $feature"

    # Ensure worktrees directory exists
    _ensure_dir "$WORKTREES_DIR/${feature}"

    # Create feature branch if not exists
    if ! git show-ref --verify --quiet "refs/heads/$feature_branch"; then
        _log "INFO" "Creating feature branch: $feature_branch from $base_branch"
        git branch "$feature_branch" "$base_branch"
    else
        _log "INFO" "Feature branch already exists: $feature_branch"
    fi

    # Create Dev worktree
    if [ -d "$dev_worktree" ]; then
        _log "WARN" "Dev worktree already exists: $dev_worktree"
    else
        _log "INFO" "Creating Dev worktree: $dev_worktree"
        git worktree add "$dev_worktree" -b "$dev_branch" "$feature_branch" 2>/dev/null || \
            git worktree add "$dev_worktree" "$dev_branch"
    fi

    # Create QA worktree
    if [ -d "$qa_worktree" ]; then
        _log "WARN" "QA worktree already exists: $qa_worktree"
    else
        _log "INFO" "Creating QA worktree: $qa_worktree"
        git worktree add "$qa_worktree" -b "$qa_branch" "$feature_branch" 2>/dev/null || \
            git worktree add "$qa_worktree" "$qa_branch"
    fi

    # Return worktree paths as JSON
    jq -n \
        --arg feature "$feature" \
        --arg dev "$dev_worktree" \
        --arg qa "$qa_worktree" \
        --arg feature_branch "$feature_branch" \
        --arg dev_branch "$dev_branch" \
        --arg qa_branch "$qa_branch" \
        '{
            feature: $feature,
            worktrees: {
                dev: $dev,
                qa: $qa
            },
            branches: {
                feature: $feature_branch,
                dev: $dev_branch,
                qa: $qa_branch
            }
        }'
}

cleanup_worktrees() {
    # Remove worktrees for a feature
    # Arguments: feature_name
    # Returns: JSON with cleanup status

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local dev_worktree="$WORKTREES_DIR/${feature}/dev"
    local qa_worktree="$WORKTREES_DIR/${feature}/qa"
    local removed_dev=false
    local removed_qa=false

    _log "INFO" "Cleaning up worktrees for feature: $feature"

    # Remove Dev worktree
    if [ -d "$dev_worktree" ]; then
        _log "INFO" "Removing Dev worktree: $dev_worktree"
        git worktree remove "$dev_worktree" --force 2>/dev/null && removed_dev=true || {
            _log "WARN" "Could not remove Dev worktree via git, removing directory"
            rm -rf "$dev_worktree"
            removed_dev=true
        }
    fi

    # Remove QA worktree
    if [ -d "$qa_worktree" ]; then
        _log "INFO" "Removing QA worktree: $qa_worktree"
        git worktree remove "$qa_worktree" --force 2>/dev/null && removed_qa=true || {
            _log "WARN" "Could not remove QA worktree via git, removing directory"
            rm -rf "$qa_worktree"
            removed_qa=true
        }
    fi

    # Remove worktree directory
    if [ -d "$WORKTREES_DIR/${feature}" ]; then
        rm -rf "$WORKTREES_DIR/${feature}"
        _log "INFO" "Removed worktree directory: $WORKTREES_DIR/${feature}"
    fi

    # Prune worktree references
    git worktree prune 2>/dev/null || true

    jq -n \
        --arg feature "$feature" \
        --argjson removed_dev "$removed_dev" \
        --argjson removed_qa "$removed_qa" \
        '{
            feature: $feature,
            removed: {
                dev: $removed_dev,
                qa: $removed_qa
            },
            status: "cleaned"
        }'
}

# =============================================================================
# QA Scope Validation Functions
# =============================================================================

validate_qa_scope() {
    # Validate QA changes are test-only (no source code modifications)
    # Arguments: feature_name
    # Returns: JSON with validation result and any violations

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local feature_branch="feature/${feature}"
    local qa_branch="${feature}-qa"
    local qa_worktree="$WORKTREES_DIR/${feature}/qa"

    _log "INFO" "Validating QA scope for feature: $feature"

    # Check if branches exist
    if ! git show-ref --verify --quiet "refs/heads/$feature_branch" || \
       ! git show-ref --verify --quiet "refs/heads/$qa_branch"; then
        echo '{"error": "Feature or QA branch not found", "feature": "'"$feature"'"}'
        return 1
    fi

    # Get changed files in QA branch
    local changed_files
    changed_files=$(git diff --name-only "$feature_branch...$qa_branch" 2>/dev/null || echo "")

    if [ -z "$changed_files" ]; then
        jq -n \
            --arg feature "$feature" \
            '{
                feature: $feature,
                valid: true,
                violations: [],
                corrected: false,
                message: "No changes in QA branch"
            }'
        return 0
    fi

    local violations="[]"
    local has_violations=false

    while IFS= read -r file; do
        [ -z "$file" ] && continue

        # QA can only modify:
        # - tests/**
        # - __tests__/**
        # - *.test.* or *.spec.*
        # - test-data/**
        # - fixtures/**
        # - *.feature (Gherkin files)

        if [[ "$file" == tests/* ]] || \
           [[ "$file" == __tests__/* ]] || \
           [[ "$file" == *test-data/* ]] || \
           [[ "$file" == *fixtures/* ]] || \
           [[ "$file" == *.test.* ]] || \
           [[ "$file" == *.spec.* ]] || \
           [[ "$file" == *.feature ]]; then
            continue  # Allowed
        else
            violations=$(echo "$violations" | jq --arg file "$file" '. + [$file]')
            has_violations=true
        fi
    done <<< "$changed_files"

    local corrected=false

    # Auto-revert violations if any found
    if [ "$has_violations" = true ] && [ -d "$qa_worktree" ]; then
        _log "WARN" "QA scope violations detected - auto-reverting"

        # Navigate to QA worktree and revert violations
        local violation_list
        violation_list=$(echo "$violations" | jq -r '.[]')

        while IFS= read -r file; do
            [ -z "$file" ] && continue
            _log "INFO" "Reverting: $file"
            git -C "$qa_worktree" checkout HEAD~1 -- "$file" 2>/dev/null || {
                # If HEAD~1 fails, checkout from feature branch
                git -C "$qa_worktree" checkout "$feature_branch" -- "$file" 2>/dev/null || true
            }
        done <<< "$violation_list"

        # Check if there are changes to commit
        if git -C "$qa_worktree" diff --quiet 2>/dev/null; then
            _log "INFO" "No changes to commit after revert"
        else
            git -C "$qa_worktree" add -A
            git -C "$qa_worktree" commit -m "Auto-revert: QA scope violation - non-test files reverted" 2>/dev/null || true
            corrected=true
            _log "INFO" "Committed scope violation revert"
        fi
    fi

    jq -n \
        --arg feature "$feature" \
        --argjson valid "$([ "$has_violations" = false ] && echo true || echo false)" \
        --argjson violations "$violations" \
        --argjson corrected "$corrected" \
        '{
            feature: $feature,
            valid: $valid,
            violations: $violations,
            corrected: $corrected
        }'

    [ "$has_violations" = false ]
}

# =============================================================================
# Baseline Test Generation Functions
# =============================================================================

_extract_gherkin_scenarios() {
    # Extract Gherkin scenarios from a spec file
    # Arguments: spec_file
    # Returns: JSON array of scenarios

    local spec_file="$1"

    if [ ! -f "$spec_file" ]; then
        echo "[]"
        return 0
    fi

    # Extract content between ```gherkin and ``` markers
    local in_gherkin=false
    local current_scenario=""
    local scenarios="[]"
    local scenario_count=0

    while IFS= read -r line || [ -n "$line" ]; do
        if [[ "$line" =~ ^\`\`\`gherkin ]]; then
            in_gherkin=true
            current_scenario=""
            continue
        fi

        if [[ "$line" =~ ^\`\`\` ]] && [ "$in_gherkin" = true ]; then
            in_gherkin=false
            if [ -n "$current_scenario" ]; then
                # Extract scenario name and type
                local scenario_name
                scenario_name=$(echo "$current_scenario" | grep -E "^\s*Scenario:" | head -1 | sed 's/.*Scenario:\s*//' | tr -d '\r')

                # Determine type based on content
                local scenario_type="functional"
                if echo "$current_scenario" | grep -qiE "error|fail|invalid|unauthorized"; then
                    scenario_type="error"
                elif echo "$current_scenario" | grep -qiE "edge|boundary|limit|empty"; then
                    scenario_type="edge"
                elif echo "$current_scenario" | grep -qiE "security|auth|permission|inject"; then
                    scenario_type="security"
                fi

                scenarios=$(echo "$scenarios" | jq \
                    --arg name "${scenario_name:-Scenario $scenario_count}" \
                    --arg type "$scenario_type" \
                    --arg content "$current_scenario" \
                    '. + [{name: $name, type: $type, content: $content}]')
                scenario_count=$((scenario_count + 1))
            fi
            continue
        fi

        if [ "$in_gherkin" = true ]; then
            current_scenario+="$line"$'\n'
        fi
    done < "$spec_file"

    echo "$scenarios"
}

generate_baseline_tests() {
    # Generate baseline test skeletons from spec Gherkin scenarios
    # Arguments: feature_name
    # Returns: JSON with generation result

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local spec_file="$SPECS_DIR/${feature}/spec.md"
    local tests_dir="tests/${feature}"

    _log "INFO" "Generating baseline tests for feature: $feature"

    # Check if spec file exists
    if [ ! -f "$spec_file" ]; then
        _log "WARN" "Spec file not found: $spec_file"
        echo '{"error": "Spec file not found", "spec_file": "'"$spec_file"'"}'
        return 1
    fi

    # Create tests directory
    _ensure_dir "$tests_dir"

    # Extract Gherkin scenarios
    local scenarios
    scenarios=$(_extract_gherkin_scenarios "$spec_file")

    local scenario_count
    scenario_count=$(echo "$scenarios" | jq 'length')

    if [ "$scenario_count" -eq 0 ]; then
        _log "WARN" "No Gherkin scenarios found in spec"
        echo '{"warning": "No Gherkin scenarios found", "spec_file": "'"$spec_file"'"}'
        return 0
    fi

    _log "INFO" "Found $scenario_count Gherkin scenarios"

    # Generate test skeleton for each scenario
    local generated_files="[]"

    for i in $(seq 0 $((scenario_count - 1))); do
        local scenario_name scenario_type scenario_content
        scenario_name=$(echo "$scenarios" | jq -r ".[$i].name")
        scenario_type=$(echo "$scenarios" | jq -r ".[$i].type")
        scenario_content=$(echo "$scenarios" | jq -r ".[$i].content")

        # Create safe filename
        local safe_name
        safe_name=$(echo "$scenario_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
        local test_file="$tests_dir/${safe_name}.test.ts"

        # Generate test skeleton
        cat > "$test_file" << EOF
/**
 * Test: ${scenario_name}
 * Type: ${scenario_type}
 * Feature: ${feature}
 * Source: Generated from spec Gherkin scenarios
 * Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
 *
 * Gherkin Scenario:
$(echo "$scenario_content" | sed 's/^/ * /')
 */

describe('${scenario_name}', () => {
    beforeEach(() => {
        // TODO: Setup test fixtures
    });

    afterEach(() => {
        // TODO: Cleanup
    });

    it('should implement scenario behavior', () => {
        // TODO: Implement test based on Gherkin steps
        // This is a baseline test skeleton - QA should implement
        expect(true).toBe(true); // Placeholder
    });
});
EOF

        generated_files=$(echo "$generated_files" | jq --arg file "$test_file" '. + [$file]')
        _log "INFO" "Generated: $test_file"
    done

    # Create baseline marker file
    local marker_file="$tests_dir/.baseline-marker.json"
    jq -n \
        --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --argjson count "$scenario_count" \
        --arg source "$spec_file" \
        --argjson files "$generated_files" \
        '{
            generated: $generated,
            count: $count,
            source: $source,
            files: $files,
            edge_cases: []
        }' > "$marker_file"

    _log "INFO" "Created baseline marker: $marker_file"

    jq -n \
        --arg feature "$feature" \
        --argjson scenario_count "$scenario_count" \
        --argjson files "$generated_files" \
        --arg marker "$marker_file" \
        '{
            feature: $feature,
            scenarios_found: $scenario_count,
            files_generated: $files,
            marker_file: $marker
        }'
}

# =============================================================================
# State Management Functions
# =============================================================================

get_state() {
    # Get execution state for a feature
    # Arguments: feature_name
    # Returns: JSON state object or error

    local feature="$1"

    if [ -z "$feature" ]; then
        echo '{"error": "Feature name required"}' >&2
        return 1
    fi

    local state_file="$EXECUTION_DIR/${feature}/state.json"

    if [ -f "$state_file" ]; then
        cat "$state_file"
    else
        echo '{"error": "No state file found", "feature": "'"$feature"'"}'
        return 1
    fi
}

update_state() {
    # Update execution state using jq filter
    # Arguments: feature_name, jq_filter
    # Returns: Updated state JSON

    local feature="$1"
    local jq_filter="$2"

    if [ -z "$feature" ] || [ -z "$jq_filter" ]; then
        echo '{"error": "Feature name and jq filter required"}' >&2
        return 1
    fi

    local state_file="$EXECUTION_DIR/${feature}/state.json"

    if [ ! -f "$state_file" ]; then
        echo '{"error": "No state file found", "feature": "'"$feature"'"}'
        return 1
    fi

    # Atomic update: write to temp file, then move
    local tmp_file="${state_file}.tmp"
    jq "$jq_filter" "$state_file" > "$tmp_file"
    mv "$tmp_file" "$state_file"

    cat "$state_file"
}

_initialize_state() {
    # Initialize state from template
    # Arguments: feature_name, worktree_json

    local feature="$1"
    local worktree_json="$2"
    local template_file="$TEMPLATES_DIR/parallel-state.json"
    local state_file="$EXECUTION_DIR/${feature}/state.json"

    _ensure_dir "$EXECUTION_DIR/${feature}"

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local dev_path qa_path
    dev_path=$(echo "$worktree_json" | jq -r '.worktrees.dev')
    qa_path=$(echo "$worktree_json" | jq -r '.worktrees.qa')

    if [ -f "$template_file" ]; then
        jq \
            --arg feature "$feature" \
            --arg started "$timestamp" \
            --arg dev "$dev_path" \
            --arg qa "$qa_path" \
            --arg spec_file "$SPECS_DIR/${feature}/spec.md" \
            '.feature = $feature |
             .started = $started |
             .status = "in_progress" |
             .worktrees.dev = $dev |
             .worktrees.qa = $qa |
             .spec_file = $spec_file' \
            "$template_file" > "$state_file"
    else
        # Create state without template
        jq -n \
            --arg feature "$feature" \
            --arg started "$timestamp" \
            --arg dev "$dev_path" \
            --arg qa "$qa_path" \
            --arg spec_file "$SPECS_DIR/${feature}/spec.md" \
            '{
                feature: $feature,
                started: $started,
                status: "in_progress",
                worktrees: {
                    dev: $dev,
                    qa: $qa
                },
                spec_file: $spec_file,
                baseline_tests: {
                    generated: null,
                    count: 0,
                    source: null
                },
                checkpoints: [],
                current_checkpoint: null,
                dev_status: "working",
                qa_status: "working",
                scope_validations: []
            }' > "$state_file"
    fi

    _log "INFO" "Initialized state: $state_file"
}

# =============================================================================
# CLI Commands
# =============================================================================

_cmd_start() {
    # Start command: setup worktrees + generate baseline tests
    local feature="$1"
    local base_branch="${2:-main}"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: parallel-coordinator.sh start <feature> [base_branch]" >&2
        return 1
    fi

    echo "=== Starting Parallel Development: $feature ==="
    echo ""

    # 1. Setup worktrees
    echo "Setting up worktrees..."
    local worktree_result
    worktree_result=$(setup_parallel_worktrees "$feature" "$base_branch")

    if echo "$worktree_result" | jq -e '.error' >/dev/null 2>&1; then
        echo "Error setting up worktrees:" >&2
        echo "$worktree_result" | jq -r '.error' >&2
        return 1
    fi

    # 2. Initialize state
    echo "Initializing execution state..."
    _initialize_state "$feature" "$worktree_result"

    # 3. Generate baseline tests (if spec exists)
    echo "Generating baseline tests..."
    local baseline_result
    baseline_result=$(generate_baseline_tests "$feature" 2>/dev/null) || {
        echo "Note: Could not generate baseline tests (spec may not exist yet)"
        baseline_result='{"scenarios_found": 0}'
    }

    # Update state with baseline info
    local baseline_count
    baseline_count=$(echo "$baseline_result" | jq '.scenarios_found // 0')
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    update_state "$feature" \
        --arg ts "$timestamp" \
        --argjson count "$baseline_count" \
        '.baseline_tests.generated = $ts | .baseline_tests.count = $count' >/dev/null

    echo ""
    echo "=== Parallel Development Ready ==="
    echo ""
    echo "Worktrees:"
    echo "  Dev: $(echo "$worktree_result" | jq -r '.worktrees.dev')"
    echo "  QA:  $(echo "$worktree_result" | jq -r '.worktrees.qa')"
    echo ""
    echo "Baseline tests: $baseline_count scenarios"
    echo ""
    echo "Commands:"
    echo "  Validate QA scope: parallel-coordinator.sh validate $feature"
    echo "  Check status:      parallel-coordinator.sh status $feature"
    echo "  Cleanup:           parallel-coordinator.sh cleanup $feature"
}

_cmd_cleanup() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: parallel-coordinator.sh cleanup <feature>" >&2
        return 1
    fi

    echo "Cleaning up worktrees for: $feature"
    cleanup_worktrees "$feature"
    echo "Done."
}

_cmd_validate() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: parallel-coordinator.sh validate <feature>" >&2
        return 1
    fi

    echo "Validating QA scope for: $feature"
    local result
    result=$(validate_qa_scope "$feature")

    if echo "$result" | jq -e '.valid == true' >/dev/null 2>&1; then
        echo "QA scope: VALID"
    else
        echo "QA scope: VIOLATIONS FOUND"
        echo "Violations:"
        echo "$result" | jq -r '.violations[]' 2>/dev/null | sed 's/^/  - /'
        if echo "$result" | jq -e '.corrected == true' >/dev/null 2>&1; then
            echo "Status: Auto-corrected"
        fi
    fi
}

_cmd_status() {
    local feature="$1"

    if [ -z "$feature" ]; then
        echo "Error: Feature name required" >&2
        echo "Usage: parallel-coordinator.sh status <feature>" >&2
        return 1
    fi

    echo "=== Status: $feature ==="
    echo ""

    # Check worktrees
    echo "Worktrees:"
    local dev_worktree="$WORKTREES_DIR/${feature}/dev"
    local qa_worktree="$WORKTREES_DIR/${feature}/qa"

    if [ -d "$dev_worktree" ]; then
        echo "  Dev: $dev_worktree (exists)"
    else
        echo "  Dev: not found"
    fi

    if [ -d "$qa_worktree" ]; then
        echo "  QA:  $qa_worktree (exists)"
    else
        echo "  QA:  not found"
    fi

    echo ""

    # Check state
    local state_file="$EXECUTION_DIR/${feature}/state.json"
    if [ -f "$state_file" ]; then
        echo "State:"
        jq '{
            status: .status,
            started: .started,
            checkpoints: (.checkpoints | length),
            dev_status: .dev_status,
            qa_status: .qa_status,
            baseline_tests: .baseline_tests.count
        }' "$state_file"
    else
        echo "State: No execution state found"
    fi

    echo ""

    # Check git worktree status
    echo "Git Worktrees:"
    git worktree list | grep -E "${feature}" || echo "  No worktrees registered"
}

_show_help() {
    cat << 'EOF'
Parallel Coordinator - Dev/QA parallel work coordination via git worktrees

USAGE:
    parallel-coordinator.sh <command> [arguments]

COMMANDS:
    start <feature> [base_branch]
        Setup parallel worktrees and generate baseline tests
        - Creates feature/{feature} branch from base_branch (default: main)
        - Creates {feature}-dev and {feature}-qa branches with worktrees
        - Generates baseline test skeletons from spec Gherkin scenarios
        - Initializes execution state tracking

    cleanup <feature>
        Remove worktrees and clean up for a feature
        - Removes Dev and QA worktrees
        - Prunes git worktree references

    validate <feature>
        Run QA scope validation
        - Checks QA branch changes are test-only
        - Auto-reverts non-test file changes
        - Returns validation result

    status <feature>
        Show worktree and execution status
        - Lists active worktrees
        - Shows execution state
        - Reports checkpoint progress

    help
        Show this help message

FUNCTIONS (when sourced):
    setup_parallel_worktrees(feature, [base_branch])
        Create isolated git worktrees for Dev and QA

    cleanup_worktrees(feature)
        Remove worktrees for a feature

    validate_qa_scope(feature)
        Validate QA changes are test-only

    generate_baseline_tests(feature)
        Generate test skeletons from spec Gherkin scenarios

    get_state(feature)
        Get execution state JSON for a feature

    update_state(feature, jq_filter)
        Update execution state using jq filter

EXAMPLES:
    # Start parallel development for a feature
    parallel-coordinator.sh start user-auth

    # Start from a specific branch
    parallel-coordinator.sh start user-auth develop

    # Check status
    parallel-coordinator.sh status user-auth

    # Validate QA scope before checkpoint
    parallel-coordinator.sh validate user-auth

    # Cleanup after feature complete
    parallel-coordinator.sh cleanup user-auth

    # Source and use functions
    source scripts/parallel-coordinator.sh
    worktrees=$(setup_parallel_worktrees "my-feature")
    echo "$worktrees" | jq '.worktrees.dev'
EOF
}

# =============================================================================
# CLI Entry Point
# =============================================================================

# Only run CLI when executed directly, not when sourced
if [ -n "${BASH_SOURCE:-}" ]; then
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        case "${1:-help}" in
            start)
                _cmd_start "${2:-}" "${3:-}"
                ;;
            cleanup)
                _cmd_cleanup "${2:-}"
                ;;
            validate)
                _cmd_validate "${2:-}"
                ;;
            status)
                _cmd_status "${2:-}"
                ;;
            help|--help|-h)
                _show_help
                ;;
            *)
                echo "Unknown command: ${1:-}" >&2
                echo "Run 'parallel-coordinator.sh help' for usage" >&2
                exit 1
                ;;
        esac
    fi
fi
