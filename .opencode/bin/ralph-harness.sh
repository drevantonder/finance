#!/bin/bash
# .opencode/bin/ralph-harness.sh
# The execution engine for the Ralph-GitHub workflow.

set -euo pipefail

MAX_ITERATIONS=${1:-100}
RALPH_ID=$(basename "$PWD" | sed 's/ralph-//' | sed 's/-.*$//' | awk '{print toupper(substr($0,1,1)) substr($0,2)}')

# Validate environment
if [[ ! -f ".ralph/tasks.json" ]]; then
    echo "Error: .ralph/tasks.json not found. This script must run inside a Ralph worktree."
    exit 1
fi

# Write PID file for process tracking
echo $$ > .ralph/pid
trap 'rm -f .ralph/pid' EXIT

echo "🚀 Starting Ralph-${RALPH_ID} (Max $MAX_ITERATIONS iterations)"
echo "RUNNING" > .ralph/status

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
    opencode run \
      --agent ralph \
      --format json \
      --title "ralph-${RALPH_ID}" \
      "Read .ralph/tasks.json. Execute the highest-priority pending task. Run tests with 'pnpm run test:run'. If all tasks complete, output <promise>COMPLETE</promise>. If blocked, output <promise>BLOCKED:reason</promise>. If successful, commit and output <promise>COMPLETE</promise>." 2>&1 | \
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
        echo "✅ Ralph completed all tasks!"
        exit 0
    fi
    
    # Check for blocked signal
    if echo "$output" | grep -q "<promise>BLOCKED:"; then
        reason=$(echo "$output" | grep -o "BLOCKED:.*</promise>" | sed 's/BLOCKED: //' | sed 's/<\/promise>//')
        echo "BLOCKED: $reason" > .ralph/status
        echo "❌ Ralph blocked: $reason"
        exit 1
    fi
    
    # Check if Ralph crashed or exited without signal
    echo "Iteration $i finished without stop signal. Continuing..."
    sleep 2
done

echo "TIMEOUT: Max iterations reached without completion." > .ralph/status
exit 1
