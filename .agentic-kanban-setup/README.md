# Agentic Kanban Bootstrap

This folder contains everything needed to bootstrap the Agentic Kanban system using a Ralph loop.

## What's Inside

- **`tasks.json`** - 14 atomic tasks that build the complete system
- **`progress.txt`** - Ralph appends progress here as tasks complete
- **`ralph-bootstrap.sh`** - The Ralph harness that runs the build loop

## How to Use

### 1. Start the Bootstrap

From the project root:

```bash
bash .agentic-kanban-setup/ralph-bootstrap.sh
```

Ralph will:
- Read tasks.json + progress.txt for context
- Choose the highest priority pending task
- Implement it fully (all acceptance criteria)
- Run tests to verify
- Commit the work
- Mark task as done
- Move to the next task

### 2. Monitor Progress

Watch `progress.txt` to see what Ralph has completed:

```bash
tail -f .agentic-kanban-setup/progress.txt
```

### 3. When Complete

Once Ralph signals `<promise>COMPLETE</promise>`, the Agentic Kanban system is ready!

Test it:
```bash
cd .agentic-kanban
bun install
bun run test
```

Start using it:
```bash
# Terminal 1: Project Manager (syncs GitHub, creates PRs)
bun run ralph-pm

# Terminal 2: Developer Ralph (claims and implements work)
bun run ralph-dev glm-4-7
```

## Test Epic

A test epic has been created: https://github.com/drevantonder/finance/issues/69

This will be used to validate the PM sync functionality (Task 5).

## What Gets Built

The bootstrap creates:

```
.agentic-kanban/
├── src/                     # TypeScript source
│   ├── lib/                 # Core library (kanban ops, schema)
│   └── cli/                 # CLI entry points
├── agents/                  # Agent instruction files
│   ├── ralph-pm.md
│   ├── ralph-dev-outer.md
│   └── ralph-dev-inner.md
├── kanban/                  # Work queue buckets
│   ├── unassigned/
│   ├── assigned/
│   ├── blocked/
│   ├── needs-review/
│   ├── needs-human/
│   ├── complete/
│   └── archived/
├── config/
│   └── fleet.json           # Model configuration
├── package.json
└── tsconfig.json
```

## Task Overview

1. Initialize TypeScript project
2. Kanban file operations
3. Schema validation with self-healing
4. Agent instruction files
5. PM syncs GitHub epics
6. Dev outer loop claims work
7. Dev inner loop implements
8. Outer loop handles completion
9. Review workflow
10. Rejection escalation
11. PM creates PRs
12. PM monitors PR feedback
13. Fleet configuration
14. CLI scripts

## Notes

- Ralph commits directly to your current branch
- Each task is atomic and independently testable
- If blocked, fix the issue and re-run the script
- Progress is logged after each iteration (even if Ralph doesn't explicitly append)
- The bootstrap is self-contained and won't interfere with existing code
