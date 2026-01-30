#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# SpecFlow Hybrid Classification Engine
# ============================================================================
# Classifies work items by type and size using pattern matching first,
# with LLM fallback flagging for ambiguous cases.
#
# Usage: source scripts/classifier.sh
#
# Functions:
#   classify_issue ISSUE_JSON     - Full classification
#   classify_type TITLE BODY LABELS_JSON
#   classify_size TITLE BODY LABELS_JSON
#   log_classification ISSUE_ID CLASSIFICATION_JSON
# ============================================================================

SPECFLOW_DIR=".specflow"
CONFIG_FILE="$SPECFLOW_DIR/config.json"

# Default confidence threshold if not in config
DEFAULT_CONFIDENCE_THRESHOLD=70

# ============================================================================
# Type Classification
# ============================================================================
# Two-pass classifier:
# 1. Pre-classified labels (confidence: 100)
# 2. Keyword matching (confidence: 75-85)
# 3. No match - unknown (confidence: 40, needs_llm: true)
# ============================================================================

classify_type() {
    local title="${1:-}"
    local body="${2:-}"
    local labels="${3:-[]}"

    # Ensure labels is valid JSON array
    if ! echo "$labels" | jq -e 'type == "array"' >/dev/null 2>&1; then
        labels="[]"
    fi

    # --- First pass: Pre-classified labels (confidence: 100) ---

    # Bug labels
    if echo "$labels" | jq -e '.[] | select(ascii_downcase | test("^(specflow:bug|bug)$"))' >/dev/null 2>&1; then
        jq -n '{type: "bug", confidence: 100, source: "label", needs_llm: false}'
        return 0
    fi

    # Feature labels
    if echo "$labels" | jq -e '.[] | select(ascii_downcase | test("^(specflow:feature|feature|enhancement)$"))' >/dev/null 2>&1; then
        jq -n '{type: "feature", confidence: 100, source: "label", needs_llm: false}'
        return 0
    fi

    # Refactor labels
    if echo "$labels" | jq -e '.[] | select(ascii_downcase | test("^(specflow:refactor|refactor)$"))' >/dev/null 2>&1; then
        jq -n '{type: "refactor", confidence: 100, source: "label", needs_llm: false}'
        return 0
    fi

    # Chore labels
    if echo "$labels" | jq -e '.[] | select(ascii_downcase | test("^(specflow:chore|chore|maintenance)$"))' >/dev/null 2>&1; then
        jq -n '{type: "chore", confidence: 100, source: "label", needs_llm: false}'
        return 0
    fi

    # Docs labels
    if echo "$labels" | jq -e '.[] | select(ascii_downcase | test("^(specflow:docs|docs|documentation)$"))' >/dev/null 2>&1; then
        jq -n '{type: "docs", confidence: 100, source: "label", needs_llm: false}'
        return 0
    fi

    # --- Second pass: Keyword matching (confidence: 75-85) ---
    local text_lower
    text_lower=$(echo "$title $body" | tr '[:upper:]' '[:lower:]')

    # Bug patterns (85% confidence)
    if echo "$text_lower" | grep -qE '\b(bug|fix|broken|error|crash|fails?|issue|wrong|incorrect|regression)\b'; then
        jq -n '{type: "bug", confidence: 85, source: "keyword", needs_llm: false}'
        return 0
    fi

    # Feature patterns (80% confidence)
    if echo "$text_lower" | grep -qE '\b(add|new|feature|implement|create|support|enable|introduce)\b'; then
        jq -n '{type: "feature", confidence: 80, source: "keyword", needs_llm: false}'
        return 0
    fi

    # Refactor patterns (80% confidence)
    if echo "$text_lower" | grep -qE '\b(refactor|clean|reorganize|restructure|improve|optimize|simplify)\b'; then
        jq -n '{type: "refactor", confidence: 80, source: "keyword", needs_llm: false}'
        return 0
    fi

    # Docs patterns (80% confidence)
    if echo "$text_lower" | grep -qE '\b(doc|documentation|readme|comment|explain|guide|tutorial)\b'; then
        jq -n '{type: "docs", confidence: 80, source: "keyword", needs_llm: false}'
        return 0
    fi

    # Chore patterns (75% confidence)
    if echo "$text_lower" | grep -qE '\b(chore|update|upgrade|bump|dependency|dependencies|ci|cd|build)\b'; then
        jq -n '{type: "chore", confidence: 75, source: "keyword", needs_llm: false}'
        return 0
    fi

    # --- No match: Unknown (confidence: 40, needs LLM) ---
    jq -n '{type: "unknown", confidence: 40, source: "none", needs_llm: true}'
    return 0
}

# ============================================================================
# Size Classification
# ============================================================================
# Two-pass classifier:
# 1. Label-based size from config mapping (confidence: 100)
# 2. Content-based heuristics (confidence: 60-70)
# 3. Default to standard when no strong signals
# ============================================================================

classify_size() {
    local title="${1:-}"
    local body="${2:-}"
    local labels="${3:-[]}"

    # Ensure labels is valid JSON array
    if ! echo "$labels" | jq -e 'type == "array"' >/dev/null 2>&1; then
        labels="[]"
    fi

    # Get confidence threshold from config (default 70)
    local confidence_threshold="$DEFAULT_CONFIDENCE_THRESHOLD"
    if [ -f "$CONFIG_FILE" ]; then
        local config_threshold
        config_threshold=$(jq -r '.classification.confidence_threshold // empty' "$CONFIG_FILE" 2>/dev/null)
        if [ -n "$config_threshold" ]; then
            confidence_threshold="$config_threshold"
        fi
    fi

    # --- First pass: Label-based size from config mapping (confidence: 100) ---
    if [ -f "$CONFIG_FILE" ]; then
        # Check each issue label against size mappings using jq for case-insensitive matching
        local label_lower size_match
        while IFS= read -r label; do
            [ -z "$label" ] && continue
            label_lower=$(echo "$label" | tr '[:upper:]' '[:lower:]')

            # Check quick labels
            size_match=$(jq -r --arg lbl "$label_lower" \
                '.size_mapping.quick // [] | map(ascii_downcase) | if any(. == $lbl) then "quick" else "" end' \
                "$CONFIG_FILE" 2>/dev/null)
            if [ "$size_match" = "quick" ]; then
                jq -n '{size: "quick", confidence: 100, source: "label", needs_llm: false}'
                return 0
            fi

            # Check standard labels
            size_match=$(jq -r --arg lbl "$label_lower" \
                '.size_mapping.standard // [] | map(ascii_downcase) | if any(. == $lbl) then "standard" else "" end' \
                "$CONFIG_FILE" 2>/dev/null)
            if [ "$size_match" = "standard" ]; then
                jq -n '{size: "standard", confidence: 100, source: "label", needs_llm: false}'
                return 0
            fi

            # Check complex labels
            size_match=$(jq -r --arg lbl "$label_lower" \
                '.size_mapping.complex // [] | map(ascii_downcase) | if any(. == $lbl) then "complex" else "" end' \
                "$CONFIG_FILE" 2>/dev/null)
            if [ "$size_match" = "complex" ]; then
                jq -n '{size: "complex", confidence: 100, source: "label", needs_llm: false}'
                return 0
            fi
        done < <(echo "$labels" | jq -r '.[]' 2>/dev/null)
    fi

    # --- Second pass: Content-based heuristics (confidence: 60-70) ---
    local text_lower text_combined word_count
    text_combined="$title $body"
    text_lower=$(echo "$text_combined" | tr '[:upper:]' '[:lower:]')
    word_count=$(echo "$text_combined" | wc -w | tr -d ' ')

    # Quick indicators (70% confidence)
    if echo "$text_lower" | grep -qE '\b(small|trivial|quick|minor|typo|simple|tiny)\b'; then
        local needs_llm=false
        [ 70 -lt "$confidence_threshold" ] && needs_llm=true
        jq -n --argjson needs_llm "$needs_llm" \
            '{size: "quick", confidence: 70, source: "heuristic", needs_llm: $needs_llm}'
        return 0
    fi

    # Word count < 50 suggests quick (65% confidence)
    if [ "$word_count" -lt 50 ]; then
        local needs_llm=false
        [ 65 -lt "$confidence_threshold" ] && needs_llm=true
        jq -n --argjson needs_llm "$needs_llm" \
            '{size: "quick", confidence: 65, source: "heuristic", needs_llm: $needs_llm}'
        return 0
    fi

    # Complex indicators (70% confidence)
    if echo "$text_lower" | grep -qE '\b(large|major|significant|architecture|redesign|rewrite|complex|extensive)\b'; then
        local needs_llm=false
        [ 70 -lt "$confidence_threshold" ] && needs_llm=true
        jq -n --argjson needs_llm "$needs_llm" \
            '{size: "complex", confidence: 70, source: "heuristic", needs_llm: $needs_llm}'
        return 0
    fi

    # Word count > 500 suggests complex (65% confidence)
    if [ "$word_count" -gt 500 ]; then
        local needs_llm=false
        [ 65 -lt "$confidence_threshold" ] && needs_llm=true
        jq -n --argjson needs_llm "$needs_llm" \
            '{size: "complex", confidence: 65, source: "heuristic", needs_llm: $needs_llm}'
        return 0
    fi

    # Default: standard (60% confidence - below threshold, needs LLM)
    local needs_llm=false
    [ 60 -lt "$confidence_threshold" ] && needs_llm=true
    jq -n --argjson needs_llm "$needs_llm" \
        '{size: "standard", confidence: 60, source: "heuristic", needs_llm: $needs_llm}'
    return 0
}

# ============================================================================
# Combined Issue Classification
# ============================================================================
# Combines type and size classification, adds pillars from config,
# generates reasoning, and determines LLM need.
# ============================================================================

classify_issue() {
    local issue_json="${1:-{}}"

    # Extract title, body, and labels from issue JSON
    local title body labels
    title=$(echo "$issue_json" | jq -r '.title // ""' 2>/dev/null)
    body=$(echo "$issue_json" | jq -r '.body // ""' 2>/dev/null)
    labels=$(echo "$issue_json" | jq -c '.labels // []' 2>/dev/null)

    # Handle GitHub issue format where labels are objects with name property
    if echo "$labels" | jq -e '.[0].name?' >/dev/null 2>&1; then
        labels=$(echo "$labels" | jq -c '[.[].name]' 2>/dev/null)
    fi

    # Classify type and size
    local type_result size_result
    type_result=$(classify_type "$title" "$body" "$labels")
    size_result=$(classify_size "$title" "$body" "$labels")

    # Extract values from results
    local type_val type_conf type_src type_llm
    type_val=$(echo "$type_result" | jq -r '.type')
    type_conf=$(echo "$type_result" | jq -r '.confidence')
    type_src=$(echo "$type_result" | jq -r '.source')
    type_llm=$(echo "$type_result" | jq -r '.needs_llm')

    local size_val size_conf size_src size_llm
    size_val=$(echo "$size_result" | jq -r '.size')
    size_conf=$(echo "$size_result" | jq -r '.confidence')
    size_src=$(echo "$size_result" | jq -r '.source')
    size_llm=$(echo "$size_result" | jq -r '.needs_llm')

    # Determine if LLM is needed (either sub-classifier needs it)
    local needs_llm=false
    if [ "$type_llm" = "true" ] || [ "$size_llm" = "true" ]; then
        needs_llm=true
    fi

    # Get pillars from config based on type
    local pillars="[]"
    if [ -f "$CONFIG_FILE" ] && [ "$type_val" != "unknown" ]; then
        pillars=$(jq -r --arg t "$type_val" \
            '.classification.type_defaults[$t].pillars // []' \
            "$CONFIG_FILE" 2>/dev/null)
    fi

    # Generate reasoning
    local reasoning=""
    if [ "$type_src" = "label" ]; then
        reasoning="Label indicates $type_val"
    elif [ "$type_src" = "keyword" ]; then
        reasoning="Keyword pattern indicates $type_val"
    else
        reasoning="No clear type indicators"
    fi

    if [ "$size_src" = "label" ]; then
        reasoning="$reasoning; label indicates $size_val size"
    elif [ "$size_src" = "heuristic" ]; then
        reasoning="$reasoning; heuristics suggest $size_val size"
    fi

    # Build and output combined result (compact format for shell compatibility)
    jq -cn \
        --arg type "$type_val" \
        --argjson type_confidence "$type_conf" \
        --arg size "$size_val" \
        --argjson size_confidence "$size_conf" \
        --argjson pillars "$pillars" \
        --argjson needs_llm "$needs_llm" \
        --arg reasoning "$reasoning" \
        '{
            type: $type,
            type_confidence: $type_confidence,
            size: $size,
            size_confidence: $size_confidence,
            pillars: $pillars,
            needs_llm: $needs_llm,
            reasoning: $reasoning
        }'
}

# ============================================================================
# Classification Audit Logging
# ============================================================================
# Logs classification decisions to .specflow/classification.log
# ============================================================================

log_classification() {
    local issue_id="${1:-unknown}"
    local classification_json="${2:-{}}"

    # Ensure log directory exists
    mkdir -p "$SPECFLOW_DIR"

    local log_file="$SPECFLOW_DIR/classification.log"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Extract key values from classification with explicit null/empty handling
    local type_val size_val reasoning
    type_val=$(printf '%s' "$classification_json" | jq -r '.type' 2>/dev/null) || true
    [ -z "$type_val" ] || [ "$type_val" = "null" ] && type_val="unknown"

    size_val=$(printf '%s' "$classification_json" | jq -r '.size' 2>/dev/null) || true
    [ -z "$size_val" ] || [ "$size_val" = "null" ] && size_val="unknown"

    reasoning=$(printf '%s' "$classification_json" | jq -r '.reasoning' 2>/dev/null) || true
    [ -z "$reasoning" ] || [ "$reasoning" = "null" ] && reasoning="No reasoning provided"

    # Append to log
    echo "$timestamp | Issue #$issue_id | $type_val/$size_val | $reasoning" >> "$log_file"
}

# ============================================================================
# Usage Help (when run directly)
# ============================================================================

if [[ "${BASH_SOURCE[0]:-}" == "${0}" ]]; then
    echo "Usage: source scripts/classifier.sh"
    echo ""
    echo "Functions:"
    echo "  classify_issue ISSUE_JSON  - Full classification"
    echo "  classify_type TITLE BODY LABELS_JSON"
    echo "  classify_size TITLE BODY LABELS_JSON"
    echo "  log_classification ISSUE_ID CLASSIFICATION_JSON"
fi
