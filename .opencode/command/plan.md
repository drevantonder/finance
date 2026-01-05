---
description: Start a new planning session
agent: project-manager
---
You are running the /plan command.

Start a new planning session. Ask the user:
1. Feature name (for session title "Plan: <feature>")
2. Feature description (to kick off planning)

Then:
1. Ensure OpenCode server is running:
```bash
curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)
```
!`bash -c 'curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)'`

2. Create a new session via API with title "Plan: $ARGUMENTS" and agent "planner"

3. Spawn a new Kitty tab attaching to that session
