#!/bin/bash
# .opencode/bin/ralph-dispatch.sh
# Launch Ralph in a new Kitty tab

set -euo pipefail

WORKTREE_PATH="${1:-}"
RALPH_NAME="${2:-alpha}"
RALPH_LEVEL="${3:-junior}"  # junior or senior

if [[ -z "$WORKTREE_PATH" ]]; then
    echo "Usage: $0 <worktree-path> [ralph-name] [junior|senior]"
    echo "Example: $0 /Users/drevan/projects/finance-worktrees/ralph-alpha-testing alpha junior"
    exit 1
fi

if [[ "$RALPH_LEVEL" != "junior" && "$RALPH_LEVEL" != "senior" ]]; then
    echo "❌ Invalid level: $RALPH_LEVEL (must be 'junior' or 'senior')"
    exit 1
fi

# Find Kitty socket
SOCKET=$(ls /tmp/kitty-socket-* 2>/dev/null | head -1 || echo "")
if [[ -z "$SOCKET" ]]; then
    echo "❌ No Kitty socket found. Is Kitty running?"
    exit 1
fi

echo "🚀 Dispatching ${RALPH_LEVEL^}-Ralph-${RALPH_NAME} in new Kitty tab..."
echo "   Worktree: $WORKTREE_PATH"
echo "   Level: ${RALPH_LEVEL}"

# Launch in new Kitty tab
# Use absolute path for harness to ensure correct working directory
kitten @ --to "unix:${SOCKET}" launch \
    --type=tab \
    --tab-title "${RALPH_LEVEL}-ralph-${RALPH_NAME}" \
    --cwd "$WORKTREE_PATH" \
    --copy-env \
    zsh -ic "bash '$WORKTREE_PATH/.opencode/bin/ralph-harness.sh' '$RALPH_LEVEL'"

echo "✅ ${RALPH_LEVEL^}-Ralph-${RALPH_NAME} dispatched in new Kitty tab"
