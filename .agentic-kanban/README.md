# Agentic Kanban System

A pull-based, autonomous software development workflow where AI agents ("Ralphs") collaborate to build features.

## 🔄 The Workflow Lifecycle

1.  **Plan (Product Manager)**
    *   Human & Product Manager agent define an **Epic** (GitHub Issue with `epic` label).
    *   Epic contains a checkbox list of atomic tasks.

2.  **Sync (Project Manager)**
    *   `project-manager` (a deterministic script) detects the Epic and creates a task file in `kanban/unassigned/`.

3.  **Claim & Implement/Review (Developer Ralph)**
    *   `ralph-dev` claims a task from `unassigned/` or `needs-review/`.
    *   `unassigned/`:
        *   Moves it to `assigned/` and creates a git worktree (`feat/epic-123`).
        *   Implements features, runs tests, and commits work.
        *   When done, moves task to `needs-review/`.
        *   If not able to complete, moves task back to `unassigned/` with feedback.
    *   `review`:
        *   Opens or creates a git worktree (`feat/epic-123`). (if a branch/worktree doesn't exist yet.)
        *   Reviews code, runs tests, and commits work.
        *   When done, moves task to `complete/`.
        *   If not able to complete, moves task back to `needs-review/` with feedback.

4.  **Ship (Project Manager Script)**
    *   `project-manager` (a deterministic script) sees task in `complete/`.
    *   Pushes branch and creates a GitHub Pull Request.
    *   Monitors PR:
        *   **Merged:** Moves task to `archived/`, deletes worktree.
        *   **Changes Requested:** Moves task back to `unassigned/` with feedback.

---

## 🚀 Usage

### 1. Configuration
Define available models and your personal enabled/disabled preferences.

*   **Shared Config:** `config/config.ts` (Base branch, model definitions)
*   **Local Config:** `config/models.json` (Enable/disable models locally)

```bash
cp config/models.example.json config/models.json
```

### 2. Start Agents

Run these in separate terminal tabs or background processes.

**Project Manager** (The Orchestrator)
```bash
bun run project-manager
```

**Developer Ralphs** (The Workers)
You can run multiple instances with different models.
```bash
# Run with GLM-4.7
bun run ralph-dev glm-4.7

# Run with Gemini Flash
bun run ralph-dev gemini-3-flash
```

---

## 📂 Directory Structure

*   **`agents/`**: The "brains" - instructions for each agent role.
    *   `product-manager.md`: Interactive planning agent.
    *   `ralph-dev-selector.md`: Task selection agent.
    *   `ralph-dev-inner.md`: Implementation loop agent.
    *   `ralph-dev-reviewer.md`: Review loop agent.
*   **`bin/`**: Helper scripts.
*   **`config/`**: Configuration files.
*   **`kanban/`**: The state of the world.
    *   `unassigned/`: Ready to be picked up.
    *   `assigned/`: Currently being worked on.
    *   `needs-review/`: Waiting for code review.
    *   `complete/`: Approved, waiting for PR creation.
    *   `needs-human/`: Failed too many times (3+ rejections).
    *   `archived/`: Merged and done.
*   **`src/`**: TypeScript source code for the infrastructure.
    *   `ralph-dev.ts`: The developer loop harness.
    *   `project-manager.ts`: The project manager loop harness.
    *   `kanban.ts`: Kanban bucket operations.
    *   `schema.ts`: Task and state schemas.
    *   `config.ts`: Configuration loader.

