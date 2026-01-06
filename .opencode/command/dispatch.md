---
description: Start autonomous Ralph loop for curated tasks in a new Kitty tab
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

4. **Launch Loop in Kitty Tab**:
   Use the `ralph-dispatch.sh` script to spawn a new Kitty tab:
   ```bash
   bash .opencode/bin/ralph-dispatch.sh "$WORKTREE_PATH" "<name>"
   ```
   Example:
   ```bash
   bash .opencode/bin/ralph-dispatch.sh /Users/drevan/projects/finance-worktrees/ralph/alpha-testing-overhaul alpha
   ```

5. **Confirm Launch**:
   - Tab title should show "ralph-<name>"
   - Tab runs the harness loop autonomously

Inform the user that the Ralph loop has been dispatched and provide the Kitty tab name.
