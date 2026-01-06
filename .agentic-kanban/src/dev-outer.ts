import { $ } from "bun";
import { join, resolve } from "node:path";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { listTasks, readTask, moveTask, Bucket } from "./kanban";
import { TaskSchema, type Task } from "./schema";

export async function claimTask(modelName: string) {
  const unassigned = await listTasks("unassigned");
  if (unassigned.length === 0) {
    console.log("No unassigned tasks found.");
    return null;
  }

  // In a real scenario, we might prompt an LLM here. 
  // For the bootstrap, we pick the first one or highest priority.
  const tasks = await Promise.all(unassigned.map(f => readTask("unassigned", f)));
  tasks.sort((a, b) => {
    const priorities = { high: 0, medium: 1, low: 2 };
    return priorities[a.priority] - priorities[b.priority];
  });

  const chosenTask = tasks[0];
  const filename = `epic-${chosenTask.id}.json`;

  console.log(`Claiming task #${chosenTask.id}: ${chosenTask.title}`);

  // Atomic move
  await moveTask("unassigned", "assigned", filename);

  // We are in .agentic-kanban/src/, process.cwd() is .agentic-kanban/
  // The finance-worktrees is at the same level as the main repo.
  // The main repo is move-to-kanban-workflow.
  // The path provided in prompt: /Users/drevan/projects/finance-worktrees/move-to-kanban-workflow
  // So ../finance-worktrees is /Users/drevan/projects/finance-worktrees
  const worktreeRoot = resolve(process.cwd(), "..", "finance-worktrees");
  const worktreePath = join(worktreeRoot, `feat-epic-${chosenTask.id}`);
  const branchName = `feat/epic-${chosenTask.id}`;

  console.log(`Creating worktree at ${worktreePath} on branch ${branchName}...`);
  
  try {
    // Check if branch exists
    const branchCheck = await $`git rev-parse --verify ${branchName}`.quiet().nothrow();
    const branchExists = branchCheck.exitCode === 0;
    
    if (branchExists) {
      await $`git worktree add ${worktreePath} ${branchName}`;
    } else {
      await $`git worktree add -b ${branchName} ${worktreePath} main`;
    }

    // Update task JSON with metadata
    const updatedTask: Task = {
      ...chosenTask,
      assigned_to: `ralph-dev-${modelName}`,
      assigned_at: new Date().toISOString(),
      branch: branchName,
      worktree_path: worktreePath,
      updated_at: new Date().toISOString()
    };

    // Save back to assigned bucket
    const assignedBucketPath = join(process.cwd(), "kanban", "assigned", filename);
    await writeFile(assignedBucketPath, JSON.stringify(updatedTask, null, 2));

    // Prepare inner loop context in worktree
    const taskDir = join(worktreePath, ".agentic-task");
    await mkdir(taskDir, { recursive: true });
    await writeFile(join(taskDir, "current.json"), JSON.stringify(updatedTask, null, 2));

    console.log(`Task #${chosenTask.id} prepared for inner loop.`);
    return updatedTask;
  } catch (err) {
    console.error("Failed to prepare worktree:", err);
    // Move back to unassigned if failed
    await moveTask("assigned", "unassigned", filename);
    throw err;
  }
}

export async function finishTask(epicId: string | number, modelName: string) {
  const filename = `epic-${epicId}.json`;
  const assignedPath = join(process.cwd(), "kanban", "assigned", filename);
  
  if (!existsSync(assignedPath)) {
    throw new Error(`Task #${epicId} not found in assigned/`);
  }

  const task = await readTask("assigned", filename);
  const worktreePath = task.worktree_path;
  
  if (!worktreePath) {
    throw new Error(`Task #${epicId} has no worktree_path`);
  }

  const innerJsonPath = join(worktreePath, ".agentic-task", "current.json");

  if (!existsSync(innerJsonPath)) {
    throw new Error(`Inner task JSON not found at ${innerJsonPath}`);
  }

  // Read updated JSON from worktree
  const innerContent = await readFile(innerJsonPath, "utf-8");
  const innerData = JSON.parse(innerContent);

  // Sync back and update metadata
  const finalTask: Task = {
    ...innerData,
    implemented_by: `ralph-dev-${modelName}`,
    updated_at: new Date().toISOString()
  };

  // Write back to assigned/ first
  await writeFile(assignedPath, JSON.stringify(finalTask, null, 2));

  // Move to needs-review/
  await moveTask("assigned", "needs-review", filename);

  console.log(`Task #${epicId} moved to needs-review/.`);
}

if (import.meta.main) {
  const mode = process.argv[2]; // claim or finish
  const modelName = process.argv[3] || "unknown-model";
  
  if (mode === "finish") {
    const epicId = process.argv[4];
    if (!epicId) {
      console.error("Epic ID required for finish mode");
      process.exit(1);
    }
    finishTask(epicId, modelName).then(() => {
      console.log("<promise>COMPLETE</promise>");
    }).catch(err => {
      console.log(`<promise>BLOCKED: ${err.message}</promise>`);
      process.exit(1);
    });
  } else {
    // default to claim
    claimTask(modelName).then((task) => {
      if (task) {
        console.log("<promise>COMPLETE</promise>");
      } else {
        console.log("No work found.");
        console.log("<promise>COMPLETE</promise>");
      }
    }).catch(err => {
      console.log(`<promise>BLOCKED: ${err.message}</promise>`);
      process.exit(1);
    });
  }
}
