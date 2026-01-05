---
description: Show status of Issues, Sessions, and Ralph Worktrees
agent: project-manager
---

Show me the current state:

1. **GitHub issues** with "in-progress" label:
<injected-shell-output>
```bash
gh issue list --label in-progress
```
<result>
!`gh issue list --label in-progress` 
</result>
</injected-shell-output>

2. **Ralph Worktrees** (from `../finance-worktrees/`):
<injected-shell-output>
```bash
git gtr list --porcelain | grep "ralph/" || echo "No active Ralph runs."
```
<result>
!`bash -c 'git gtr list --porcelain | grep "ralph/" || echo "No active Ralph runs."'`
</result>
</injected-shell-output>

3. **Detailed Ralph Status**:
<injected-shell-output>
```bash
git gtr list --porcelain | grep "ralph/" | while read -r branch path; do
    if [[ -f "$path/.ralph/status" ]]; then
        status=$(cat "$path/.ralph/status")
        echo "[$branch]: $status"
    fi
done
```
<result>
!`bash -c 'git gtr list --porcelain | grep "ralph/" | while read -r branch path; do if [[ -f "$path/.ralph/status" ]]; then status=$(cat "$path/.ralph/status"); echo "[$branch]: $status"; fi; done'`
</result>
</injected-shell-output>

Display as a clean dashboard.
