#!/bin/bash
# Bootstrap harness for building Agentic Kanban
# Runs Ralph loop until complete or blocked

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKS_JSON="$SCRIPT_DIR/tasks.json"
PROGRESS_TXT="$SCRIPT_DIR/progress.txt"
MAX_ITERATIONS=50

if [ ! -f "$TASKS_JSON" ]; then
  echo "❌ Error: tasks.json not found at $TASKS_JSON"
  exit 1
fi

echo "🤖 Agentic Kanban Bootstrap Started"
echo "📂 Working directory: $(pwd)"
echo "📜 Tasks: $TASKS_JSON"
echo "📝 Progress: $PROGRESS_TXT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  echo "🔄 Iteration $i / $MAX_ITERATIONS"
  echo "────────────────────────────────────────────"
  
  # Run Ralph with tasks.json AND progress.txt in context
  # Use || true to prevent script exit on non-zero
  result=$(opencode run "@$TASKS_JSON @$PROGRESS_TXT

You are Ralph, an autonomous coding agent building the Agentic Kanban system.

PROCESS:
1. Read tasks.json to see all pending tasks
2. Read progress.txt to understand what has been done
3. Choose the highest priority pending task (consider dependencies)
4. Implement the task fully - ensure all acceptance criteria are met
5. Run tests to verify the implementation works
6. Update tasks.json: change task status to 'done'
7. Commit your work: git commit -am \"feat(agentic-kanban): {title}\"
8. Append to progress.txt with format:
   ## Ralph Bootstrap | {ISO-8601-timestamp}
   ### Task {id}: {title}
   - {summary of what was implemented}
   - Tests: {passing/failing}
   - Commit: {git hash}
   
If all tasks are done, output: <promise>COMPLETE</promise>
If you are blocked, output: <promise>BLOCKED: {detailed reason}</promise>

IMPORTANT: Only mark a task 'done' when ALL acceptance criteria are verified to work.
" 2>&1) || true

  echo "$result"
  echo ""
  
  # Append iteration result to progress.txt
  echo "" >> "$PROGRESS_TXT"
  echo "---" >> "$PROGRESS_TXT"
  echo "## Iteration $i | $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$PROGRESS_TXT"
  echo "$result" | tail -50 >> "$PROGRESS_TXT"
  
  # Check for completion signals
  if echo "$result" | grep -q "<promise>COMPLETE</promise>"; then
    echo "✅ Ralph signaled COMPLETE - Agentic Kanban is built!"
    echo ""
    echo "Next steps:"
    echo "  1. Review the code in .agentic-kanban/"
    echo "  2. Test: cd .agentic-kanban && bun run test"
    echo "  3. Start PM: bun run ralph-pm"
    echo "  4. Start dev: bun run ralph-dev glm-4-7"
    exit 0
  elif echo "$result" | grep -q "<promise>BLOCKED"; then
    reason=$(echo "$result" | grep -o "<promise>BLOCKED:.*</promise>" | sed 's/<promise>BLOCKED: //;s/<\/promise>//')
    echo "🛑 Ralph is blocked: $reason"
    echo ""
    echo "Please investigate and resolve the blocker, then re-run this script."
    exit 1
  fi
  
  # Small delay between iterations
  sleep 2
done

echo "⚠️  Max iterations ($MAX_ITERATIONS) reached without completion"
echo "Check progress.txt and tasks.json to see current state"
exit 1
