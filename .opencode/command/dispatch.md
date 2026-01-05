---
description: Start autonomous Ralph loop for curated tasks
agent: project-manager
---

You are running the `/dispatch` command.

1. **Check for curated tasks**:
   Ensure you have a `tasks.json` structure ready based on your planning with the user.

2. **Assign Identity**:
   Available names: Alpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliet.
   Find the first one not present in `git gtr list --porcelain`.

3. **Create Environment**:
   - `git gtr new ralph/<name>-<descriptor>`
   - `WORKTREE_PATH=$(git gtr go ralph/<name>-<descriptor>)`
   - `mkdir -p "$WORKTREE_PATH/.ralph"`
   - Write your `tasks.json` to `"$WORKTREE_PATH/.ralph/tasks.json"`.
   - Create empty `"$WORKTREE_PATH/.ralph/progress.txt"`.
   - Write `RUNNING` to `"$WORKTREE_PATH/.ralph/status"`.

4. **Launch Loop**:
```bash
SOCKET=$(ls /tmp/kitty-socket-* | head -1)
kitten @ --to unix:$SOCKET launch \
  --type=tab \
  --tab-title "Ralph-<Name>" \
  --cwd "$WORKTREE_PATH" \
  --copy-env \
  zsh -ic "bash .opencode/bin/ralph-harness.sh"
``` result:
! `bash -c 'SOCKET=$(ls /tmp/kitty-socket-* | head -1); WORKTREE_PATH=$(git gtr go ralph/<name>-<descriptor>); kitten @ --to unix:$SOCKET launch --type=tab --tab-title "Ralph-<Name>" --cwd "$WORKTREE_PATH" --copy-env zsh -ic "bash .opencode/bin/ralph-harness.sh"'`

Inform the user that the Ralph loop has been dispatched.
