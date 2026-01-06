# Configuration

## `config.ts` (Committed)
Main project configuration:
- `baseBranch`: Which branch to fork feature branches from
- `developers`: Available models (name + model identifier)
- `sleep`: How long loops sleep when idle

## `models.json` (Gitignored - Local Only)
Personal toggle for which models are enabled:

```json
{
  "enabled": {
    "glm-4.7": true,
    "gemini-3-flash": false,
    "minimax-m2.1": true
  }
}
```

This file is gitignored because:
- Different developers have different API keys
- Rate limits vary per person
- Personal model preferences shouldn't be committed

**First Time Setup:**
```bash
cp models.example.json models.json
# Edit models.json to enable/disable models
```

If `models.json` doesn't exist, all models default to enabled.
