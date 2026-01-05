# Git Worktree Runner (GTR) Skill

`git-worktree-runner` (`git gtr`) is the primary tool for managing isolated work environments.

## Core Commands

| Command | Description |
|---------|-------------|
| `git gtr new <branch>` | Create a new worktree for a branch (sibling to repo root) |
| `git gtr list --porcelain` | List worktrees in machine-readable format (Branch PATH) |
| `git gtr rm <branch>` | Remove a worktree and its directory |
| `git gtr go <branch>` | Return the absolute path to a worktree |
| `git gtr run <branch> <cmd>` | Run a command inside a specific worktree |

## Ralph Workflow Patterns

### Create Ralph Worktree
```bash
git gtr new ralph/alpha-feature
```

### Check if worktree exists
```bash
git gtr list --porcelain | grep -q "ralph/alpha-feature"
```

### Navigate to worktree
```bash
cd "$(git gtr go ralph/alpha-feature)"
```

## Error Handling
- If `git gtr new` fails because branch exists, harness ensures it is checked out in the correct path.
- Always use branch names (e.g., `ralph/alpha`) to identify worktrees.
