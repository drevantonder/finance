---
description: Check detailed progress of Ralph runs
agent: project-manager
---

1. **Active Ralphs**:
<injected-shell-output>
```bash
git gtr list --porcelain | grep "ralph/"
```
<result>
!`bash -c 'git gtr list --porcelain | grep "ralph/"'`
</result>
</injected-shell-output>

2. **Progress Logs**:   
<injected-shell-output>
```bash
git gtr list --porcelain | grep "ralph/" | while read -r branch path; do
    echo "--- $branch ---"
    echo "Status: $(cat "$path/.ralph/status" 2>/dev/null || echo "Unknown")"
    echo "Recent Progress:"
    tail -n 10 "$path/.ralph/progress.txt" 2>/dev/null || echo "No logs yet."
done
```
<result>
!`bash -c 'git gtr list --porcelain | grep "ralph/" | while read -r branch path; do echo "--- $branch ---"; echo "Status: $(cat "$path/.ralph/status" 2>/dev/null || echo "Unknown")"; echo "Recent Progress:"; tail -n 10 "$path/.ralph/progress.txt" 2>/dev/null || echo "No logs yet."; done'`
</result>
</injected-shell-output>