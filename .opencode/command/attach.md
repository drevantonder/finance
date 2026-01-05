---
description: Attach to or create work session for issue
agent: project-manager
---
You are running the /attach command.

Work on issue $ARGUMENTS.

Ensure OpenCode server is running first:
```bash
curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)
```
!`bash -c 'curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)'`

If OpenCode session exists for $ARGUMENTS (where $ARGUMENTS is like "#123"):
- Find session ID by title "$ARGUMENTS"
- Spawn Kitty tab attaching to existing session

If no session exists:
- Create worktree for "$ARGUMENTS" via `git gtr new feature/$ARGUMENTS`
- Create session with title "$ARGUMENTS" and agent "impl"
- Spawn Kitty tab with that session attaching to it
