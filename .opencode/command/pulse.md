---
description: Show table of Active Issues vs Sessions vs Worktrees
agent: project-manager
---
You are running the /pulse command.

Show me the current state:

1. Ensure OpenCode server is running:
```bash
curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)
```
Result of server check:
!`bash -c 'curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)'`

2. GitHub issues with "in-progress" label:
```bash
gh issue list --label in-progress
```
Result of GitHub issues:
!`gh issue list --label in-progress`

3. Active OpenCode sessions (Implementation and Planning):
```bash
curl -s --max-time 2 http://127.0.0.1:9999/session | jq -r '.[] | select(.title | test("^#|^Plan:")) | "\(.title) (\(.id[4:12]))"'
```
Result of active sessions:
!`bash -c 'curl -s --max-time 2 http://127.0.0.1:9999/session | jq -r ".[] | select(.title | test(\"^#|^Plan:\")) | \"\\(.title) (\\(.id[4:12]))\""'`

4. Worktrees:
```bash
git gtr list --porcelain
```
Result of worktrees:
!`git gtr list --porcelain`

For each in-progress issue, show:
- Issue # and title
- Has OpenCode session? (Match by title "#<id>")
- Has worktree? (Match by branch "feature/#<id>")
- Session title if exists

Display as a clean table.
