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

## The `.ralph/` Folder (In Worktree Only!)

**CRITICAL:** The `.ralph/` folder exists **ONLY in worktrees**. It does **NOT** exist in the main repository.

**Main Repo:** `/Users/drevan/projects/finance/` → No `.ralph/` folder
**Worktree:** `/Users/drevan/projects/finance-worktrees/ralph/alpha-.../.ralph/` → Contains all state

```
# Main Repo - NO .ralph folder
/Users/drevan/projects/finance/
├── .git/
├── app/
├── test/
└── ...

# Worktree - HAS .ralph folder (created during dispatch)
/Users/drevan/projects/finance-worktrees/ralph/alpha-testing/
├── .git/                    # Worktree's git repo
├── app/
├── test/
└── .ralph/                  # ← Created by PM during dispatch
    ├── tasks.json           # Curated task list
    ├── progress.txt         # Execution log
    └── status               # RUNNING | COMPLETE | BLOCKED:<reason>
```

**Why?** Worktrees are disposable. The `.ralph/` folder contains generated artifacts and state that should never pollute the main branch.

### What The PM Does Before Dispatch
1. Plan tasks in their head (or in a separate file)
2. When user says `/dispatch`:
   - Create the worktree
   - **Create `.ralph/` folder INSIDE the worktree**
   - Write `tasks.json` to `worktree/.ralph/tasks.json`
   - Write empty `progress.txt` to `worktree/.ralph/progress.txt`
   - Write `RUNNING` to `worktree/.ralph/status`
   - Launch harness
<worktree>/.ralph/
  ├── tasks.json      # The curated task list (source of truth)
  ├── progress.txt    # Append-only execution log
  └── status          # Current state: RUNNING | COMPLETE | BLOCKED:<reason>
```

### `tasks.json` Schema

**IMPORTANT**: tasks.json must contain full context from GitHub issues. The `body` field includes all details Ralph needs to work independently in a fresh context window.

```json
{
  "run_id": "ralph-alpha-20260106-143000",
  "branch": "ralph/alpha-login",
  "tasks": [
    {
      "id": 1,
      "issue": 42,
      "title": "Create POST /api/login endpoint",
      "body": "## Summary\nImplement login endpoint that accepts email/password and returns JWT token.\n\n## Acceptance Criteria\n- [ ] POST /api/login with valid creds returns 200 with JWT\n- [ ] POST /api/login with invalid creds returns 401\n- [ ] POST /api/login with missing body returns 400\n- [ ] Run pnpm test:run and verify tests pass\n- [ ] Run pnpm nuxt typecheck and verify no errors\n\n## Implementation Notes\nUse `jose` library to generate JWT tokens:\n```typescript\nimport { SignJWT } from 'jose'\nconst secret = new TextEncoder().encode(process.env.JWT_SECRET)\nconst token = await new SignJWT({ userId: user.id })\n  .setProtectedHeader({ alg: 'HS256' })\n  .setExpirationTime('24h')\n  .sign(secret)\n```\n\n## Files to modify\n- `server/api/login.post.ts` (create new)\n- `test/integration/login.test.ts` (create new)",
      "status": "pending"
    },
    {
      "id": 2,
      "issue": 43,
      "title": "Add JWT validation middleware",
      "body": "## Summary\nCreate middleware to validate JWT tokens on protected routes.\n\n## Acceptance Criteria\n- [ ] Protected routes return 401 without valid token\n- [ ] Valid tokens allow access to protected routes\n- [ ] Expired tokens return 401\n- [ ] All tests pass\n\n## Implementation Notes\nUse `jose` for validation:\n```typescript\nimport { jwtVerify } from 'jose'\nconst { payload } = await jwtVerify(token, secret)\n```\n\n## Files to modify\n- `server/middleware/auth.ts` (create new)\n- `test/integration/auth-middleware.test.ts` (create new)",
      "status": "pending"
    }
  ]
}
```

**Schema Fields:**
- `id`: Unique integer per task
- `issue`: GitHub issue number
- `title`: Clear task description
- `body`: **Full GitHub issue body in markdown** (contains summary, acceptance criteria, implementation notes, code examples, etc.)
- `status`: `pending` | `done` | `blocked`

**Why `body` contains everything:** Ralph is stateless and needs complete context. The issue body should contain:
- Summary/story (the "why")
- Acceptance criteria (the "what")
- Implementation notes (the "how" - approaches, APIs, code examples)
- Files to modify
- References/links

**Example:**
```json
{
  "id": 1,
  "issue": 42,
  "title": "Login Endpoint",
  "status": "pending",
  "body": "## Summary\nAs a frontend app, I need to authenticate users via email/pass so I can get a JWT for secured requests.\n\n## Acceptance Criteria\n- [ ] POST /api/login with valid creds returns 200 + JWT\n- [ ] POST /api/login with invalid creds returns 401\n- [ ] POST /api/login with missing body returns 400\n\n## Implementation Notes\nUse `jose` library for JWT generation:\n```typescript\nimport { SignJWT } from 'jose'\nconst token = await new SignJWT({ userId: user.id }).sign(secret)\n```\n\n## Files to modify\n- `server/api/login.post.ts`"
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

1. **Assign Identity**: Pick next available NATO name (Alpha → Juliet)
   - **Use script**: `bash .opencode/bin/ralph-check-name` (shows all availability)
   - Or check manually: `git gtr list --porcelain | grep "ralph/"`
   
2. **Label Issues** (REQUIRED):
   - **Use script**: `bash .opencode/bin/ralph-label-issues <name> <issue1> <issue2> ...`
   - Or label manually: `gh label create "ralph-<name>" --color "0052CC" ...` then `gh issue edit <num> --add-label "ralph-<name>"`
   
3. **Create Environment**:
   - `git gtr new ralph/<name>-<descriptor>`
   - `WORKTREE_PATH=$(git gtr go ralph/<name>-<descriptor>)`
   - `mkdir -p "$WORKTREE_PATH/.ralph"`
   
4. **Generate tasks.json**:
   - **Recommended**: `bash .opencode/bin/gh-issues-to-tasks <name> <issue1> ... > "$WORKTREE_PATH/.ralph/tasks.json"`
   - Or write manually (see schema above)
   
5. **Launch**: `bash .opencode/bin/ralph-dispatch.sh "$WORKTREE_PATH" "<name>"`

### 3. Execution (Ralph Loop)

Ralph operates in a loop managed by the harness. **Every iteration starts fresh with zero context.**

**Ralph's Startup Sequence (Every Iteration):**
```
1. Run `pwd` to verify working directory
2. Read `.ralph/tasks.json` to get task list
3. Read `.ralph/progress.txt` to understand what's done
4. Run `git log --oneline -20` to see recent commits
5. Choose the highest-priority pending task (based on dependencies and logical order)
```

**Implementation Loop:**
```
6. Read the task's `body` field (full GitHub issue markdown) to understand:
   - Summary (the "why")
   - Acceptance criteria (the "what")
   - Implementation notes (the "how" - code examples, APIs, approaches)
   - Files to modify
7. Read relevant code to orient himself
8. Implement the behavior
9. Verify implementation matches acceptance criteria (usually by running tests)
10. If verification fails: Fix and retry (up to 8 attempts total)
11. If verification passes:
    - Update task.status to "done" in .ralph/tasks.json
    - Commit: git commit -am "<type>: <title> (#<issue>)"
    - Append detailed summary to .ralph/progress.txt with timestamp
12. Output signal:
    - If all tasks done: `<promise>COMPLETE</promise>`
    - If blocked after 8 attempts: `<promise>BLOCKED: <detailed reason></promise>`
13. Exit - harness will restart Ralph for next iteration
```

**Exit Signals**:
- All tasks done: `<promise>COMPLETE</promise>`
- Blocked: `<promise>BLOCKED: <detailed reason></promise>`

### 4. Review (PM + Human)

After Ralph exits:

- **If COMPLETE**: PM reads `progress.txt`, user reviews branch, PM manually creates PR
- **If BLOCKED**: PM reads status reason, user fixes blocker, PM re-triggers harness
- **If timeout**: PM investigates logs, user decides next action

## Operational Rules

### Ralph Names (Sequential Assignment)
Alpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliet

**Names are reusable** - once a worktree is cleaned up, the name becomes available again.

PM checks existing worktrees and picks the next available name:
- Quick: `bash .opencode/bin/ralph-check-name`
- Manual: `git gtr list --porcelain | grep "ralph/"`

### Worktree Isolation
- Location: Default GTR location (`../finance-worktrees/`)
- Branch pattern: `ralph/<name>-<descriptor>` (e.g., `ralph/alpha-login`)
- Each Ralph run gets its own isolated environment

### Test Gatekeeper
- Test command: `pnpm run test:run` (vitest in run mode)
- Ralph has **8 attempts** to fix failing tests before blocking
- Tasks are only marked "done" if tests pass

### GitHub Integration
- **Labels are REQUIRED** - PM must label issues before dispatch
- **Use script**: `bash .opencode/bin/ralph-label-issues <name> <issue1> <issue2> ...`
- Or manually: `gh label create "ralph-<name>" --color "0052CC" ...` then `gh issue edit <num> --add-label "ralph-<name>"`
- **Generate tasks.json**: `bash .opencode/bin/gh-issues-to-tasks <name> <issue1> ... > tasks.json`
- PM creates consolidated PR linking all completed issues
- PR body format: "Fixes #42, Fixes #43, Fixes #44"

## Commands Reference

| Command | Purpose | Used By |
|---------|---------|---------|
| `/pulse` | Dashboard of issues and Ralph worktrees | PM |
| `/dispatch` | Start Ralph on curated tasks | PM |
| `/ralph-status` | Check progress of active runs | PM |

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

### Bash Scripts (`.opencode/bin/`)

| Script | Purpose |
|--------|---------|
| `ralph-check-name [name]` | Check Ralph name availability (no args = show all) |
| `ralph-label-issues <name> <issue1> ...` | Bulk label issues for Ralph batch |
| `gh-issues-to-tasks <name> <issue1> ...` | Convert GitHub issues to tasks.json (outputs to stdout) |
| `ralph-pulse` | Show project dashboard |
| `ralph-status` | Check progress of active Ralph runs |
| `ralph-details <worktree>` | Show detailed status of a specific worktree |
| `ralph-dispatch.sh <path> <name>` | Launch Ralph in new Kitty tab |
| `ralph-harness.sh` | Run Ralph in a loop (max 100 iterations) |

### Git Worktree Runner (GTR)
See **@.opencode/skill/git-worktree-runner.md** for command reference.

### Harness Script
Located at `.opencode/bin/ralph-harness.sh`. Manages:
- Dependency installation (`pnpm install`)
- Loop execution (max 100 iterations)
- Exit signal detection
- Status file updates

## Best Practices

### For Curating Tasks (Writing Good Issues)
Since tasks.json is now auto-generated from issues, focus on writing comprehensive issues:

1. **Include ## Summary** - The "why" (user story or business value)
2. **Include ## Acceptance Criteria** - Checkbox list of testable requirements
3. **Include ## Implementation Notes** - Code examples, API references, approaches
4. **Include ## Files to modify** - Specific file paths to guide Ralph
5. **Atomic**: Each issue should be independently completable
6. **Scoped**: Small enough for one Ralph iteration

**Example Issue (becomes task via gh-issues-to-tasks):**
```markdown
## Summary
As a user, I need dates displayed in different formats depending on context.

## Acceptance Criteria
- [ ] formatDateLabel('2025-07-01', 'short') returns 'Jul 2025'
- [ ] formatDateLabel('2025-07-01', 'full') returns '1 Jul 2025'
- [ ] All unit tests pass
- [ ] pnpm nuxt typecheck passes

## Implementation Notes
Add to `composables/useFormatter.ts`:
```typescript
export function formatDateLabel(date: string, format: 'short' | 'full'): string {
  const d = new Date(date)
  const month = d.toLocaleString('en', { month: 'short' })
  const year = d.getFullYear()
  if (format === 'short') return `${month} ${year}`
  return `${d.getDate()} ${month} ${year}`
}
```

## Files to modify
- `composables/useFormatter.ts`
- `test/unit/formatter.test.ts`
```

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
