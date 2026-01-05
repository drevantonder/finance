---
description: Resume all in-progress issues
agent: project-manager
---
You are running the /resume-all command.

For every GitHub issue with "in-progress" label:
1. Check if OpenCode session exists for this issue (search by title "#<issue>")
2. If session exists but no open tab, spawn new Kitty tab attaching to it
3. If no session exists, create worktree `git gtr new feature/#<id>`, create session "#<id>" with agent "impl", spawn Kitty tab

Use OpenCode API to list sessions, Kitty to spawn tabs, and git gtr for worktrees.

Ensure OpenCode server is running first:
```bash
curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)
```
!`bash -c 'curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)'`
