#!/bin/bash
# .opencode/bin/ralph-harness.sh
# The execution engine for the Ralph-GitHub workflow.

set -euo pipefail

RALPH_LEVEL="${1:-junior}"  # junior or senior
MAX_ITERATIONS=${2:-100}
RALPH_ID=$(basename "$PWD" | sed 's/ralph-//' | sed 's/-.*$//' | awk '{print toupper(substr($0,1,1)) substr($0,2)}')

# Validate environment
if [[ ! -f ".ralph/tasks.json" ]]; then
    echo "Error: .ralph/tasks.json not found. This script must run inside a Ralph worktree."
    exit 1
fi

# Write PID file for process tracking
echo $$ > .ralph/pid
trap 'rm -f .ralph/pid' EXIT

echo "🚀 Starting ${RALPH_LEVEL^}-Ralph-${RALPH_ID} (Max $MAX_ITERATIONS iterations)"
echo "RUNNING" > .ralph/status
echo "$RALPH_LEVEL" > .ralph/level  # Track which Ralph is running

# Ensure dependencies are up to date
if [[ -f "pnpm-lock.yaml" ]]; then
    echo "Installing dependencies..."
    pnpm install > /dev/null 2>&1
fi

for ((i=1; i<=MAX_ITERATIONS; i++)); do
    echo "--- Iteration $i ---"
    
    # Run Ralph agent (stream output AND capture for signal detection)
    # Ralph reads .ralph/tasks.json, executes task, tests, commits, and exits with signal
    # Set session title for visibility in Kitty tabs
    output_file=$(mktemp)
    
    # Build prompt based on level
    if [[ "$RALPH_LEVEL" == "junior" ]]; then
        PROMPT="Read .ralph/tasks.json. Execute the highest-priority pending task. Run tests with 'pnpm run test:run'. If all tasks complete, output <promise>COMPLETE</promise>. If blocked, output <promise>BLOCKED:reason</promise>."
    else
        PROMPT="Read .ralph/tasks.json. Execute tasks or review completed work. Output appropriate signal: <promise>APPROVED</promise>, <promise>NEEDS_WORK:reason</promise>, or <promise>BLOCKED:reason</promise>."
    fi
    
    opencode run \
      --agent "${RALPH_LEVEL}-ralph" \
      --format json \
      --title "${RALPH_LEVEL}-ralph-${RALPH_ID}" \
      "$PROMPT" 2>&1 | \
      while IFS= read -r line; do
        echo "$line" >> "$output_file"
        # Extract and display text from JSON events
        text=$(echo "$line" | jq -r 'select(.type == "text") | .part.text' 2>/dev/null || true)
        if [[ -n "$text" ]]; then
          echo -n "$text"
        fi
      done || true
    echo ""  # Newline after output
    output=$(cat "$output_file")
    rm -f "$output_file"
    
    # Check for completion signal
    if echo "$output" | grep -q "<promise>COMPLETE</promise>"; then
        echo "COMPLETE" > .ralph/status
        echo "✅ ${RALPH_LEVEL^}-Ralph completed all tasks!"
        exit 0
    fi
    
    # Check for approved signal (reviews)
    if echo "$output" | grep -q "<promise>APPROVED</promise>"; then
        echo "APPROVED" > .ralph/status
        echo "✅ ${RALPH_LEVEL^}-Ralph approved the work!"
        exit 0
    fi
    
    # Check for needs work signal (reviews)
    if echo "$output" | grep -q "<promise>NEEDS_WORK:"; then
        reason=$(echo "$output" | grep -o "NEEDS_WORK:.*</promise>" | sed 's/NEEDS_WORK: //' | sed 's/<\/promise>//')
        echo "NEEDS_WORK: $reason" > .ralph/status
        echo "⚠️  ${RALPH_LEVEL^}-Ralph says needs work: $reason"
        exit 1
    fi
    
    # Check for blocked signal
    if echo "$output" | grep -q "<promise>BLOCKED:"; then
        reason=$(echo "$output" | grep -o "BLOCKED:.*</promise>" | sed 's/BLOCKED: //' | sed 's/<\/promise>//')
        echo "BLOCKED: $reason" > .ralph/status
        echo "❌ ${RALPH_LEVEL^}-Ralph blocked: $reason"
        exit 1
    fi
    
    # Check if Ralph crashed or exited without signal
    echo "Iteration $i finished without stop signal. Continuing..."
    sleep 2
done

echo "TIMEOUT: Max iterations reached without completion." > .ralph/status
exit 1
