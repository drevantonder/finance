---
description: Create PR for a completed Ralph run
agent: project-manager
---

Work on branch associated with $ARGUMENTS (e.g., "ralph/alpha-login").

1. **Verify Completion**:
   Check if `.ralph/status` is `COMPLETE` in the worktree.

2. **Collect Issues**:
   Read `tasks.json` to get the list of issues covered.

3. **Push**:
```bash
git gtr run $ARGUMENTS git push -u origin $ARGUMENTS
```
! `bash -c 'git gtr run $ARGUMENTS git push -u origin $ARGUMENTS'`

4. **Create PR**:
   Draft a PR title and body. The body MUST link all issues using "Fixes #ID".
! `bash -c 'git gtr run $ARGUMENTS gh pr create --fill --body "Batch implementation by Ralph. Fixes <Issues>"'`

Confirm PR URL to the user.
