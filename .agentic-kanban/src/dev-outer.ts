import { $ } from "bun";
import { join, resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
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

if (import.meta.main) {
  const modelName = process.argv[2] || "unknown-model";
  claimTask(modelName).then((task) => {
    if (task) {
      console.log("<promise>COMPLETE</promise>");
    } else {
      console.log("No work found. Sleeping...");
      console.log("<promise>COMPLETE</promise>");
    }
  }).catch(err => {
    console.log(`<promise>BLOCKED: ${err.message}</promise>`);
    process.exit(1);
  });
}
