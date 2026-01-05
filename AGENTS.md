# OpenCode Project Manager Workflow

## Agent Roles
- **Project Manager**: COORDINATOR. Spawns agents, manages sessions/worktrees/tabs. 
- **Planner**: PRODUCT OWNER. Plans features, drafts PRDs, creates GitHub issues.
- **Implementation**: ENGINEER. Builds features in worktrees, updates GitHub.

## Workflow Status Flow
1. **Planning**: PM spawns Planner → Planner drafts PRD → Planner creates issue (Label: `in-progress`)
2. **Implementation**: PM attaches to issue → PM creates worktree/session → Impl agent works
3. **Review**: PM spawns review subagent → PR created → Merged → Issue auto-closed

## Conventions
- **GitHub Label**: `in-progress` (Must be present for active work)
- **Session Titles**: 
  - Implementation: `#<issue-number>` (e.g., `#123`)
  - Planning: `Plan: <feature-name>`
- **Worktrees**: Created via `git gtr new feature/#<issue-number>`

## Tooling Reference
- **Server**: `http://127.0.0.1:9999` (Lazy-started by PM on `:9999` if needed)
- **Kitty**: Use `kitten @` to launch tabs attached to OpenCode sessions
- **GTR**: Use `git gtr` for all worktree operations
