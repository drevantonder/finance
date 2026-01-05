# Shell Commands in Custom Commands

## Pattern for `.opencode/command/*.md` Files

When writing custom commands that need to execute shell commands, follow this pattern:

### Two Parts Required

1. **Code Block** - Shows the agent what command will run (for context)
   ```bash
   command here
   ```

2. **Shell Output** - Actually runs the command and includes output
   !`command here`

### Example

```
---
description: Example command
agent: project-manager
---
You are running the /example command.

This is what I'm doing:
```bash
curl -s http://127.0.0.1:9999/health
```

Actually run it:
!`curl -s http://127.0.0.1:9999/health`
```

### Why Two Parts?

1. **Code block** gives agent clear context before execution - improves confidence and understanding
2. **Shell output (`!`)** actually executes and includes results in response

### Best Practices

- Use `bash -c` for complex commands with pipes/conditionals
- Add timeouts to curl commands: `--max-time 1` or `--max-time 2`
- Add explicit "Result of:" labels before `!` commands for clarity

### Common Patterns

**Server check with auto-start:**
```bash
curl -s --max-time 1 http://127.0.0.1:9999/global/health || (opencode serve --port 9999 --hostname 127.0.0.1 > /dev/null 2>&1 & sleep 2)
```

**Filter JSON output:**
```bash
curl -s http://127.0.0.1:9999/session | jq -r '.[] | "\(.id | split("_")[1]) \(.title)"'
```

**Explicit Result Labeling:**
```bash
# Explanation of what command does
```bash
command here
```
Result of [command name]:
!`command here`
```
