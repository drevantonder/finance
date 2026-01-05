---
name: workflow
description: The Project Manager Operating System - Architecture, Protocols, and Tooling
---

# Project Protocol & Operating System

This project uses a specialized "Project Manager" architecture to coordinate multiple parallel streams of work using OpenCode, GitHub, Git Worktrees, and Kitty.

## 1. Core Architecture

We use a **Coordinator-Worker** model.

- **Project Manager (PM)**: The central hub.
  - **Role**: State management, orchestration, spawning workers.
  - **Location**: Runs in the main project root.
  - **Responsibilities**: Checks status (`/pulse`), spawns tabs, manages the server.
- **Planner**: The Product Owner.
  - **Role**: Requirements gathering, PRD drafting.
  - **Output**: Creates GitHub Issues with `in-progress` label.
  - **Session**: `Plan: <feature-name>`
- **Implementation (Impl)**: The Engineer.
  - **Role**: Coding, testing, building.
  - **Location**: Runs in an isolated worktree (`feature/#123`).
  - **Session**: `#<issue-number>` (e.g., `#123`).

## 2. The "Active Work" State Machine

A piece of work is considered **Active** if and only if it aligns with this state:

1.  **GitHub Issue**: Exists and has label `in-progress`.
2.  **Git Worktree**: Exists at path `../finance-worktrees/feature-#<id>` (managed via `git gtr`).
3.  **OpenCode Session**: Exists on server `:9999` with title `#<id>`.
4.  **Kitty Tab**: Is open and attached to that session.

**The PM's job is to reconcile these states.** If an issue is `in-progress` but has no session/worktree, the PM creates them (`/resume-all` or `/attach`).

## 3. Tooling Protocols

### OpenCode Server
- **Port**: `9999` (Distinct from default `4096`).
- **Management**: PM checks health and lazy-starts it.
- **Check Command**: `curl -s --max-time 1 http://127.0.0.1:9999/global/health`
- **Start Command**: `opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2`

### Git Worktrees (GTR)
- **Tool**: `git-worktree-runner` (`git gtr`).
- **Naming**: ALWAYS use `feature/#<id>` for branches.
- **Creation**: `git gtr new feature/#123` -> Creates folder `feature-#123`.
- **Listing**: `git gtr list --porcelain`.

### Kitty Terminal Integration
- **Socket**: Dynamic discovery via `ls /tmp/kitty-socket-*`.
- **Spawning Tabs**: Use `kitten @` to launch tabs running `opencode attach`.
- **Command Template**:
  ```bash
  kitten @ --to unix:$SOCKET launch \
    --type=tab \
    --tab-title "impl #123" \
    --cwd "$WORKTREE_PATH" \
    --copy-env \
    zsh -ic "opencode attach http://127.0.0.1:9999 --session $SESSION_ID --dir $WORKTREE_PATH"
  ```

## 4. Agent Commands Reference

### Project Manager Commands
- **/pulse**: Status dashboard. Checks Server, GitHub, Sessions, and Worktrees.
- **/plan**: Spawns a Planner agent in a new tab.
- **/resume-all**: Reconciles state. Finds `in-progress` issues without sessions and spins them up.
- **/attach #<id>**: Focuses on a specific issue. Creates worktree/session if missing, then opens tab.

### Planner Commands
- **/create-issue**: Takes the finalized PRD and posts it to GitHub with `in-progress` label.

## 5. GitHub Workflow (Legacy Context)

### Issue Management
- **Creation**: Always use `gh issue create --label "in-progress"`.
- **Structure**: Title (Imperative), Body (Problem, Solution, Acceptance Criteria).

### PR Management
- **Creation**: `gh pr create --fill` or with specific title/body.
- **Linking**: Body MUST contain "Fixes #<issue>" to auto-close.
- **Worktree**: Push from the worktree branch, not main.

### Commit Messages
- **Format**: `<type>: <description> (Ref #<issue>)`
- **Example**: `feat: add email service (Ref #123)`
