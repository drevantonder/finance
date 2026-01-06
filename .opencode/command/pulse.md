---
description: Show status of Issues, Ralph Worktrees, and Task Progress
agent: project-manager
---

Show me the current state:

1. **GitHub Issues**:
<injected-shell-output>
```bash
gh issue list
```
<result>
</result>
</injected-shell-output>

2. **Ralph Worktrees**:
<injected-shell-output>
```bash
ls -la /Users/drevan/projects/finance-worktrees/ralph-*/.ralph/ 2>/dev/null || echo "No Ralph worktrees found"
```
<result>
</result>
</injected-shell-output>

3. **Ralph Status & Progress**:
<injected-shell-output>
```bash
for worktree in /Users/drevan/projects/finance-worktrees/ralph-*/; do
  branch=$(basename "$worktree" | tr '-' ' ' | sed 's/ $//')
  if [[ -f "$worktree/.ralph/status" ]]; then
    status=$(cat "$worktree/.ralph/status")
    tasks_json="$worktree/.ralph/tasks.json"
    if [[ -f "$tasks_json" ]]; then
      total=$(jq '.tasks | length' "$tasks_json")
      done=$(jq '[.tasks[] | select(.status == "completed")] | length' "$tasks_json")
      echo "$branch: $status ($done/$total tasks)"
    else
      echo "$branch: $status"
    fi
  fi
done
```
<result>
</result>
</injected-shell-output>

4. **Ralph Task Details** (if RUNNING):
<injected-shell-output>
```bash
for tasks_json in /Users/drevan/projects/finance-worktrees/ralph-*/.ralph/tasks.json; do
  if [[ -f "$tasks_json" ]]; then
    branch=$(dirname "$tasks_json" | xargs -I {} basename {} | tr '-' ' ' | sed 's/ $//')
    echo "=== $branch ==="
    jq -r '.tasks[] | "  \(.status == "completed" ? "✅" : "✋") \(.title)"' "$tasks_json"
  fi
done
```
<result>
</result>
</injected-shell-output>

Display as a clean dashboard.
