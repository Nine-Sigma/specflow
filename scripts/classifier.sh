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
