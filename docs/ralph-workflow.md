# Ralph-GitHub Workflow Protocol

This document defines the autonomous batch execution model used in this project.

## Overview

Ralph is a stateless autonomous agent that executes curated tasks in isolated Git worktrees. Work is planned by the Project Manager (PM) in collaboration with the user, then dispatched to Ralph who works independently until completion or blockage.

## Architecture

```
Human ↔ PM (Interactive) → Harness (Bash Loop) → Ralph (Stateless Agent)
                                ↓
                          .ralph/ folder
                    (tasks.json, progress.txt, status)
```

### Roles

| Role | Type | Responsibility |
|------|------|----------------|
| **Project Manager (PM)** | Interactive Agent | Curates tasks, dispatches Ralph, reviews work, manages GitHub |
| **Harness** | Bash Script | Runs Ralph in a loop, manages iterations, captures exit signals |
| **Ralph** | Stateless Agent | Implements tasks, runs tests, commits code, updates progress |

## The `.ralph/` Folder

Every Ralph worktree contains a `.ralph/` folder (git-ignored) that serves as the state store:

```
<worktree>/.ralph/
  ├── tasks.json      # The curated task list (source of truth)
  ├── progress.txt    # Append-only execution log
  └── status          # Current state: RUNNING | COMPLETE | BLOCKED:<reason>
```

### `tasks.json` Schema

```json
{
  "run_id": "ralph-alpha-20260106-143000",
  "branch": "ralph/alpha-login",
  "tasks": [
    {
      "id": 1,
      "issue": 42,
      "title": "Create POST /api/login endpoint",
      "status": "pending",
      "acceptance": "Endpoint returns 200 with JWT on valid credentials"
    },
    {
      "id": 2,
      "issue": 43,
      "title": "Add JWT validation middleware",
      "status": "pending",
      "acceptance": "Protected routes return 401 without valid token"
    }
  ]
}
```

### `progress.txt` Format

```
## Ralph-Alpha | 2026-01-06T14:23:00Z

### Task 1: Create POST /api/login endpoint (#42)
- Created server/api/login.post.ts
- Added JWT generation with jose library
- Tests: 2 new, all passing
- Commit: abc1234

---

## Ralph-Alpha | 2026-01-06T14:45:00Z

### Task 2: Add JWT validation middleware (#43)
- Created server/middleware/auth.ts
- Tests: 3 new, all passing
- Commit: def5678

---
```

## Workflow Phases

### 1. Curation (PM + Human)

The PM discusses features with the user and breaks them into **atomic, testable tasks**:

1. Create GitHub issues with clear acceptance criteria
2. Build a `tasks.json` structure
3. Get user approval before dispatch

**Key principle**: Each task should be completable in one iteration and independently verifiable.

### 2. Dispatch (PM)

When the user approves (`/dispatch`):

1. **Assign Identity**: Pick next available NATO name (Alpha → Juliet) by checking existing worktrees
2. **Label Issues**: Add `ralph-<name>` label to all issues in the batch (e.g., `ralph-alpha`)
3. **Create Environment**:
   - `git gtr new ralph/<name>-<descriptor>`
   - Initialize `.ralph/` folder in the worktree
   - Write `tasks.json`, create empty `progress.txt`, set status to `RUNNING`
4. **Launch**: Spawn Kitty tab running `.opencode/bin/ralph-harness.sh`

### 3. Execution (Ralph Loop)

Ralph operates in a loop managed by the harness:

```
1. Read tasks.json and progress.txt (orientation)
2. Choose highest-priority pending task (intelligent selection)
3. Implement the task
4. Run tests: pnpm run test:run
5. If tests fail: Fix and retry (up to 8 attempts)
6. If tests pass:
   - Update task status to "done"
   - Commit: git commit -am "feat: <title> (#<issue>)"
   - Append to progress.txt
7. Loop or exit with signal
```

**Exit Signals**:
- All tasks done: `<promise>COMPLETE</promise>`
- Blocked: `<promise>BLOCKED: <detailed reason></promise>`

### 4. Review (PM + Human)

After Ralph exits:

- **If COMPLETE**: PM reads `progress.txt`, user reviews branch, PM creates PR (`/ralph-pr`)
- **If BLOCKED**: PM reads status reason, user fixes blocker, PM re-triggers harness
- **If timeout**: PM investigates logs, user decides next action

## Operational Rules

### Ralph Names (Sequential Assignment)
Alpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliet

PM checks existing worktrees and picks the next available name.

### Worktree Isolation
- Location: Default GTR location (`../finance-worktrees/`)
- Branch pattern: `ralph/<name>-<descriptor>` (e.g., `ralph/alpha-login`)
- Each Ralph run gets its own isolated environment

### Test Gatekeeper
- Test command: `pnpm run test:run` (vitest in run mode)
- Ralph has **8 attempts** to fix failing tests before blocking
- Tasks are only marked "done" if tests pass

### GitHub Integration
- Issues are labeled with Ralph ID (e.g., `ralph-alpha`)
- PM creates consolidated PR linking all completed issues
- PR body format: "Fixes #42, Fixes #43, Fixes #44"

## Commands Reference

| Command | Purpose | Used By |
|---------|---------|---------|
| `/pulse` | Dashboard of issues and Ralph worktrees | PM |
| `/dispatch` | Start Ralph on curated tasks | PM |
| `/ralph-status` | Check progress of active runs | PM |
| `/ralph-pr` | Create PR for completed batch | PM |

## Ralph Agent Behavior

### Task Selection (Intelligence)
Ralph does NOT simply take the first pending task. He analyzes all pending tasks and chooses the highest priority based on:
- Dependencies between tasks
- Technical complexity
- Risk assessment
- Logical implementation order

### Constraints
- **No branch creation**: Ralph is already on the correct branch
- **No pushing**: Ralph only commits locally
- **No metadata changes**: Ralph does not modify `.opencode/` files
- **Focus**: One task at a time, complete it fully before moving to the next

### Failure Handling
If Ralph encounters a blocker (tests fail after 8 attempts, unclear requirements, external dependency):
1. Output `<promise>BLOCKED: <specific reason></promise>`
2. Harness captures this and writes to `.ralph/status`
3. PM notifies user with the reason
4. User fixes the blocker (update issue, fix test environment, etc.)
5. PM re-runs harness in the same worktree (Ralph resumes from where he left off)

## Tooling

### Git Worktree Runner (GTR)
See **@.opencode/skill/git-worktree-runner.md** for command reference.

### Harness Script
Located at `.opencode/bin/ralph-harness.sh`. Manages:
- Dependency installation (`pnpm install`)
- Loop execution (max 100 iterations)
- Exit signal detection
- Status file updates

## Best Practices

### For Curating Tasks
1. **Atomic**: Each task should be independently implementable
2. **Testable**: Clear acceptance criteria that can be verified with tests
3. **Ordered**: Consider dependencies (e.g., "Create model" before "Add validation")
4. **Scoped**: Avoid tasks that touch too many files or systems

### PM Responsibilities (Before Dispatch)
1. **Sync main**: `git checkout main && git pull`
2. **Verify .gitignore**: Ensure generated artifacts are covered (playwright-report, .nuxt, etc.)
3. **Clean state**: No untracked files in main repo

### For Managing Ralph
1. **Monitor regularly**: Use `/ralph-status` to check progress
2. **Respond to blocks quickly**: The sooner you fix blockers, the faster Ralph can resume
3. **Review branches before PR**: Always check the work before merging
4. **Clean up worktrees**: After PR merge, remove the worktree

### After PR Merge
```bash
# Sync main
git checkout main && git pull

# Clean up worktree (force due to generated files)
git gtr rm ralph/alpha-testing --delete-branch --force --yes
```

### For Re-triggers
If Ralph gets blocked or you need to adjust:
1. Fix the blocker (update issue, fix tests, clarify requirements)
2. Optionally update `tasks.json` in the worktree
3. Re-run the harness in the same worktree (Ralph will skip "done" tasks)

## Troubleshooting

### Divergent main after pull
```bash
git stash && git pull --rebase && git stash pop
```

### Conflict in `.opencode/` files
The harness script may have local customizations. Resolve by:
1. Keeping your local version (has your customizations like `--title`)
2. Or pulling upstream and re-applying changes

### Untracked files in worktree after cleanup
If `git gtr rm` fails due to untracked files:
1. Check what's untracked: `cd <worktree> && git status`
2. Add to main `.gitignore` if it's a generated artifact
3. Use `--force` flag: `git gtr rm <branch> --delete-branch --force --yes`

## Limitations & Future Enhancements

### Current Limitations
- One Ralph at a time (no parallel runs yet)
- No automatic type checking (only vitest tests)
- Manual PR creation (not auto-merged)

### Planned Enhancements
- Parallel Ralph runs (multiple worktrees simultaneously)
- Integration with CI/CD for auto-merge
- Smarter task dependency detection
- Auto-retry on transient failures

## Appendix: Design Rationale & Lessons Learned

### 1. Signal-over-Exit Pattern
The harness script (`ralph-harness.sh`) is designed to be "exit-code agnostic." It uses `|| true` when running the agent and relies strictly on the presence of `<promise>` tags in stdout.
- **Rationale**: This prevents the loop from crashing due to transient CLI errors (like network timeouts) while ensuring that a task is only marked "done" if the agent explicitly signals success.

### 2. State-on-Disk vs. State-in-Context
The core of this architecture is **Context Shedding**. By killing the agent after every task, we reset the context window to zero.
- **Insight**: Ralph's "memory" is the filesystem. If you need to "teach" Ralph something during a run, update the issue body or the `tasks.json` in the worktree. He will "learn" it upon his next wake-up.

### 3. Resumability & Healing
The PM is designed to be "idempotent." If a Ralph run fails or is manually interrupted:
- The worktree and branch remain.
- The `.ralph/tasks.json` tracks what was finished.
- Running `/dispatch` again will simply re-attach to the existing environment and resume from the first `pending` task.

### 4. Terminal Automation (`zsh -ic`)
Spawning Kitty tabs requires the `zsh -ic` (or equivalent) wrapper.
- **Reason**: Standard non-interactive shells often do not source profile files, leading to "command not found" errors for `pnpm`, `node`, or `opencode`. The interactive flag ensures the environment is identical to your main terminal.

### 5. Intelligent Selection
Ralph is instructed to pick the "highest priority" task, not just the next one in the list.
- **Benefit**: This allows the agent to recognize if a later task is actually a prerequisite for an earlier one, or if a "refactor" task should happen before a "feature" task to ensure a cleaner implementation.

### 6. Generated Artifacts and .gitignore
Test outputs (playwright-report, coverage, etc.) must be in `.gitignore`.
- **PM responsibility**: Verify `.gitignore` covers generated artifacts before dispatch
- If untracked files appear after a Ralph run, add them to the main `.gitignore`
