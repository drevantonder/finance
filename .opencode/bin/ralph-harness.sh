#!/bin/bash
# .opencode/bin/ralph-harness.sh
# The execution engine for the Ralph-GitHub workflow.

set -euo pipefail

MAX_ITERATIONS=${1:-100}
RALPH_ID=$(basename "$PWD" | sed 's/ralph-//' | sed 's/-.*$//' | sed 's/^./\U&/')

# Validate environment
if [[ ! -f ".ralph/tasks.json" ]]; then
    echo "Error: .ralph/tasks.json not found. This script must run inside a Ralph worktree."
    exit 1
fi

echo "🚀 Starting Ralph-${RALPH_ID} (Max $MAX_ITERATIONS iterations)"
echo "RUNNING" > .ralph/status

# Ensure dependencies are up to date
if [[ -f "pnpm-lock.yaml" ]]; then
    echo "Installing dependencies..."
    pnpm install > /dev/null 2>&1
fi

for ((i=1; i<=MAX_ITERATIONS; i++)); do
    echo "--- Iteration $i ---"
    
    # Run Ralph agent (capture all output)
    # We use --auto-approve because Ralph is autonomous
    output=$(opencode run --agent ralph --auto-approve 2>&1 || true)
    
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
