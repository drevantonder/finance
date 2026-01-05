---
name: kitty-terminal
description: Spawn and manage Kitty terminal tabs for worktree isolation
license: MIT
compatibility: opencode
---

## What I Do

Spawn new Kitty terminal tabs for isolated worktree operations. This enables running long-running processes (like Ralph harness) in a visible, persistent tab without blocking the Project Manager session.

## When to Use Me

Use this skill when you need to:
- Run Ralph harness in a visible, persistent tab
- Attach to an existing OpenCode session in a new tab
- Run long-running processes without blocking the main PM session
- Isolate worktree operations from the main terminal

## Prerequisite

**Find the Kitty socket**:
```bash
SOCKET=$(ls /tmp/kitty-socket-* | head -1)
```

## Pattern 1: Run Ralph Harness (Recommended for Ralph Workflow)

Use this pattern to dispatch Ralph in a visible Kitty tab:

```bash
kitten @ --to unix:$SOCKET launch \
  --type=tab \
  --tab-title "Ralph-<Name>" \
  --cwd "$WORKTREE_PATH" \
  --copy-env \
  zsh -ic "bash .opencode/bin/ralph-harness.sh"
```

## Pattern 2: Attach to OpenCode Session (Legacy/Interactive)

Use this pattern to open a new tab attached to an existing OpenCode session:

```bash
kitten @ --to unix:$SOCKET launch \
  --type=tab \
  --tab-title "<Session-Title>" \
  --cwd "$WORKTREE_PATH" \
  --copy-env \
  zsh -ic "opencode attach http://127.0.0.1:9999 --session $SESSION_ID --dir $WORKTREE_PATH"
```

## Key Parameters

| Parameter | Description |
|-----------|-------------|
| `--to unix:$SOCKET` | Connect to Kitty socket for remote control |
| `--type=tab` | Create new tab (vs `--type=window`) |
| `--tab-title` | Human-readable title for the tab (visible in tab bar) |
| `--cwd` | Working directory (use worktree path for isolation) |
| `--copy-env` | Inherit environment variables from parent shell |
| `zsh -ic` | Interactive zsh that loads `.zshrc` for full shell features |
| Command | The actual command to run in the new tab |

## Common Commands for PM

| Use Case | Command |
|----------|---------|
| Start Ralph harness | `bash .opencode/bin/ralph-harness.sh` |
| OpenCode interactive | `opencode attach http://127.0.0.1:9999 --session <id>` |
| Just navigate to worktree | `cd "$(git gtr go <branch>)" && zsh` |

## Example: Dispatch Ralph-Alpha

```bash
# 1. Find socket
SOCKET=$(ls /tmp/kitty-socket-* | head -1)

# 2. Get worktree path
WORKTREE_PATH=$(git gtr go ralph/alpha-testing-overhaul)

# 3. Spawn Ralph tab
kitten @ --to unix:$SOCKET launch \
  --type=tab \
  --tab-title "Ralph-Alpha" \
  --cwd "$WORKTREE_PATH" \
  --copy-env \
  zsh -ic "bash .opencode/bin/ralph-harness.sh"
```

## Troubleshooting

- **No socket found**: Kitty is not running. Start Kitty first.
- **Tab doesn't open**: Check that the socket path `$SOCKET` is correct and accessible.
- **Command fails**: Verify the worktree path exists and the command is valid.
- **Environment not copied**: Ensure `--copy-env` is present to inherit variables.
- **Permission denied**: Check that the socket has proper permissions.

## Notes

- The new tab runs independently - closing it stops the process
- Use `Ctrl+C` in the tab to interrupt Ralph if needed
- The harness script handles its own retries and exit signals
