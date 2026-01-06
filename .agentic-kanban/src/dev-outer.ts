import { $ } from "bun";
import { join, resolve } from "node:path";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { listTasks, readTask, moveTask, Bucket } from "./kanban";
import { TaskSchema, type Task } from "./schema";
import { validateModel } from "./config";

export async function claimTask(modelName: string) {
  await validateModel(modelName);
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

export async function claimReview(modelName: string) {
  const needsReview = await listTasks("needs-review");
  if (needsReview.length === 0) {
    console.log("No tasks in needs-review/.");
    return null;
  }

  const tasks = await Promise.all(needsReview.map(f => readTask("needs-review", f)));
  
  // Filter out tasks implemented by the same model
  const claimable = tasks.filter(t => t.implemented_by !== `ralph-dev-${modelName}`);

  if (claimable.length === 0) {
    console.log("No review tasks claimable by this model.");
    return null;
  }

  const chosenTask = claimable[0];
  const filename = `epic-${chosenTask.id}.json`;

  console.log(`Claiming review for task #${chosenTask.id}: ${chosenTask.title}`);

  // Atomically move to assigned (representing it's being reviewed)
  // Wait, the criteria says "moves task from needs-review/ to complete/ after approved".
  // So during review it might stay in needs-review/ or move to assigned/?
  // Usually, claiming for review should mark it as "under review".
  // Let's use 'assigned' bucket for the reviewer too, but we need to know it's a review assignment.
  // Actually, Task 9 doesn't specify a bucket for "under review".
  // Let's just update the metadata to say it's being reviewed.
  
  const updatedTask: Task = {
    ...chosenTask,
    review: {
      ...chosenTask.review,
      status: "pending",
      reviewer: `ralph-dev-${modelName}`
    },
    updated_at: new Date().toISOString()
  };

  const reviewPath = join(process.cwd(), "kanban", "needs-review", filename);
  await writeFile(reviewPath, JSON.stringify(updatedTask, null, 2));

  console.log(`Reviewer ${modelName} assigned to task #${chosenTask.id}.`);
  return updatedTask;
}

export async function finishReview(epicId: string | number, status: "approved" | "rejected", issues: string[] = []) {
  const filename = `epic-${epicId}.json`;
  const reviewPath = join(process.cwd(), "kanban", "needs-review", filename);

  if (!existsSync(reviewPath)) {
    throw new Error(`Task #${epicId} not found in needs-review/`);
  }

  const task = await readTask("needs-review", filename);
  
  const finalTask: Task = {
    ...task,
    review: {
      ...task.review,
      status,
      reviewed_at: new Date().toISOString(),
      issues
    },
    updated_at: new Date().toISOString()
  };

  if (status === "approved") {
    await writeFile(reviewPath, JSON.stringify(finalTask, null, 2));
    await moveTask("needs-review", "complete", filename);
    console.log(`Task #${epicId} approved and moved to complete/.`);
  } else {
    // Rejection handling (Task 10)
    finalTask.rejection_count += 1;
    finalTask.rejection_history.push({
      reviewer: task.review.reviewer,
      reviewed_at: new Date().toISOString(),
      issues
    });
    
    if (finalTask.rejection_count >= 3) {
      (finalTask as any).escalation_reason = "Max rejections reached (3). Requires human intervention.";
      await writeFile(reviewPath, JSON.stringify(finalTask, null, 2));
      await moveTask("needs-review", "needs-human", filename);
      console.log(`Task #${epicId} rejected 3 times. Moved to needs-human/.`);
    } else {
      // Move back to unassigned with issues
      await writeFile(reviewPath, JSON.stringify(finalTask, null, 2));
      await moveTask("needs-review", "unassigned", filename);
      console.log(`Task #${epicId} rejected. Moved back to unassigned/.`);
    }
  }
}

if (import.meta.main) {
  const mode = process.argv[2]; // claim, finish, claim-review, finish-review, or loop
  const modelName = process.argv[3] || "unknown-model";
  
  if (mode === "loop") {
    const SLEEP_MS = 30000; // 30 seconds
    let running = true;
    let sleepTimeout: Timer | null = null;

    process.on("SIGINT", () => {
      console.log("\nShutting down developer loop...");
      running = false;
      if (sleepTimeout) {
        clearTimeout(sleepTimeout);
        sleepTimeout = null;
      }
    });

    (async () => {
      while (running) {
        try {
          // 1. Check for reviews first
          const review = await claimReview(modelName);
          if (review) {
            console.log(`Assigned review for Task #${review.id}. Please perform review and run finish-review.`);
            // In a real loop, we'd spawn the review process here.
            // For now, we just claim it.
          } else {
            // 2. Check for new work
            const task = await claimTask(modelName);
            if (task) {
              console.log(`Claimed Task #${task.id}. Worktree: ${task.worktree_path}`);
              // In a real loop, we'd spawn the inner loop here.
            } else {
              console.log(`No work found for ${modelName}. Sleeping for ${SLEEP_MS / 1000}s...`);
            }
          }
        } catch (err) {
          console.error("Error in developer loop:", err);
        }
        
        if (running) {
          await new Promise(resolve => {
            sleepTimeout = setTimeout(() => {
              sleepTimeout = null;
              resolve(undefined);
            }, SLEEP_MS);
          });
        }
      }
    })().then(() => {
      console.log("Developer loop shut down cleanly.");
      process.exit(0);
    });
  } else if (mode === "claim-review") {
    claimReview(modelName).then((task) => {
      if (task) {
        console.log("<promise>COMPLETE</promise>");
      } else {
        console.log("<promise>COMPLETE</promise>");
      }
    }).catch(err => {
      console.log(`<promise>BLOCKED: ${err.message}</promise>`);
      process.exit(1);
    });
  } else if (mode === "finish-review") {
    const epicId = process.argv[4];
    const status = process.argv[5] as "approved" | "rejected";
    const issues = process.argv.slice(6);
    
    finishReview(epicId, status, issues).then(() => {
      console.log("<promise>COMPLETE</promise>");
    }).catch(err => {
      console.log(`<promise>BLOCKED: ${err.message}</promise>`);
      process.exit(1);
    });
  } else if (mode === "finish") {
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
