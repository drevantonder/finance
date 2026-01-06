---
description: Show Ralph status across all worktrees with process tracking
agent: project-manager
---

You are running `/ralph-pulse`.

This command shows the status of all Ralph worktrees using both OpenCode session data and local PID files.

## Steps

### 1. Check OpenCode Server Health
```bash
curl -s http://127.0.0.1:9999/global/health
```

### 2. Get All Ralph Sessions from OpenCode
```bash
curl -s http://127.0.0.1:9999/session | jq -r '.[] | select(.title | contains("ralph")) | "\(.id) \(.title) \(.directory) \(.time.updated)"
```

### 3. Find All Worktrees with .ralph folders
```bash
git gtr list --porcelain | grep "ralph/" | while read branch path; do
  if [[ -d "$path/.ralph" ]]; then
    echo "$path"
  fi
done
```

### 4. For Each Worktree, Check:
- Does `.ralph/pid` exist?
- Is the PID still running? (`ps -p $PID > /dev/null`)
- What's in `.ralph/status`?
- What's the task progress?

## Display Format

```
=== Ralph Status ===
Worktree: ralph/alpha-testing-overhaul
  Status: RUNNING | COMPLETE | BLOCKED | ZOMBIE
  PID: 12345 (running) or 12345 (dead) or missing
  Tasks: 1/3 done (Task 1: done, Task 2: pending, Task 3: pending)
  Session: ses_46f601f9dffeOq32Xq8a9IZvvR (ralph-Alpha)
  Last Updated: 10:12 AM
```

## Status Logic

| Condition | Status |
|-----------|--------|
| status=COMPLETE | COMPLETE |
| status=BLOCKED:* | BLOCKED |
| PID exists + process running | RUNNING |
| PID exists + process dead | ZOMBIE (orphaned) |
| No PID file | STOPPED |
