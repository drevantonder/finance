---
description: Show status of Issues, Sessions, and Ralph Worktrees
agent: project-manager
---

Show me the current state:

1. **GitHub issues** with "in-progress" label:
```
gh issue list --label in-progress
``` result:
!`gh issue list --label in-progress` 

2. **Ralph Worktrees** (from `../finance-worktrees/`):
```bash
git gtr list --porcelain | grep "ralph/" || echo "No active Ralph runs."
``` result:
!`bash -c 'git gtr list --porcelain | grep "ralph/" || echo "No active Ralph runs."'`

3. **Detailed Ralph Status**:
```bash
git gtr list --porcelain | grep "ralph/" | while read -r branch path; do
    if [[ -f "$path/.ralph/status" ]]; then
        status=$(cat "$path/.ralph/status")
        echo "[$branch]: $status"
    fi
done
``` result:
!`bash -c 'git gtr list --porcelain | grep "ralph/" | while read -r branch path; do if [[ -f "$path/.ralph/status" ]]; then status=$(cat "$path/.ralph/status"); echo "[$branch]: $status"; fi; done'`

Display as a clean dashboard.
