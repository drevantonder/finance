---
name: github-workflow
description: GitHub conventions for issues, PRs, and labels
---

## Issue Management
- **Creation**: Always use `gh issue create --label "in-progress"`.
- **Structure**:
  - Title: Concise, imperative (e.g., "Add user notifications")
  - Body: Problem, Solution, Acceptance Criteria (from PRD)

## PR Management
- **Creation**: `gh pr create --fill` or with specific title/body.
- **Linking**: Body MUST contain "Fixes #<issue>" to auto-close.
- **Worktree**: Push from the worktree branch, not main.

## Commit Messages
- Format: `<type>: <description> (Ref #<issue>)`
- Example: `feat: add email service (Ref #123)`

## Status Updates
- Use `gh issue comment` to post major updates (e.g., "Architecture finalized", "Ready for review").
- Do not spam minor file edit updates.
