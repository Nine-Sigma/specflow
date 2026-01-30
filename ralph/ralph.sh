#!/bin/bash
# Ralph - TDD execution loop
# Source: https://github.com/snarktank/ralph
# Adapted for SpecFlow integration

set -euo pipefail

# Configuration
TOOL="${1:-claude}"
MAX_ITERATIONS="${2:-10}"
PROMPT_FILE="ralph/prompt.md"
CLAUDE_PROMPT_FILE="ralph/CLAUDE.md"

# Use appropriate prompt based on tool
if [[ "$TOOL" == "claude" ]]; then
  PROMPT_FILE="$CLAUDE_PROMPT_FILE"
fi

# Check prompt file exists
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Error: Prompt file not found: $PROMPT_FILE"
  exit 1
fi

echo "Ralph TDD Loop"
echo "Tool: $TOOL"
echo "Max iterations: $MAX_ITERATIONS"
echo "Prompt: $PROMPT_FILE"
echo ""

# The actual loop is driven by the AI tool
# This script provides the prompt and manages iterations
iteration=0
while [[ $iteration -lt $MAX_ITERATIONS ]]; do
  ((iteration++))
  echo "=== Iteration $iteration of $MAX_ITERATIONS ==="

  # In practice, the AI tool reads the prompt and executes
  # This script tracks progress via promise markers

  # Check for completion marker
  if grep -q "<promise>COMPLETE</promise>" .ralph-state 2>/dev/null; then
    echo ""
    echo "=== COMPLETE ==="
    echo "Ralph loop finished in $iteration iterations"
    exit 0
  fi

  # Placeholder for AI tool invocation
  # In actual use, Claude Code or Amp reads the prompt and iterates
  echo "Waiting for AI tool to process iteration..."
  echo "(In practice, run claude code or amp with the prompt)"

  # For now, exit after showing setup
  echo ""
  echo "Ralph setup complete. Run your AI tool with:"
  echo "  claude --prompt $PROMPT_FILE"
  echo "  OR"
  echo "  amp --prompt $PROMPT_FILE"
  exit 0
done

echo "Max iterations reached without completion"
exit 1
