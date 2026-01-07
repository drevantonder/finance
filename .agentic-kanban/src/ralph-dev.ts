import { $ } from "bun";
import { join, resolve, basename } from "node:path";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { listTasks, readTask, moveTask, Bucket } from "./kanban";
import { TaskSchema, type Task } from "./schema";
import { validateModel, getBaseBranch, getConfig } from "./config";
import type { Subprocess } from "bun";

/**
 * Uses an LLM agent to intelligently select the next task to work on.
 */
async function selectTaskAgentically(modelName: string): Promise<{ bucket: Bucket; filename: string } | null> {
  console.log(`\n🤖 Ralph (${modelName}) is analyzing the board to select a task...`);
  
  const dev = await validateModel(modelName);
  const selectorAgent = resolve(process.cwd(), "agents", "ralph-dev-selector.md");
  
  const unassignedFiles = await listTasks("unassigned");
  const needsReviewFiles = await listTasks("needs-review");
  
  if (unassignedFiles.length === 0 && needsReviewFiles.length === 0) {
    console.log("Result: No tasks found.");
    return null;
  }

  // Gather board state to provide as context
  const unassignedTasks = await Promise.all(unassignedFiles.map(async f => ({ 
    path: `unassigned/${f}`, 
    content: await readTask("unassigned", f) 
  })));
  const needsReviewTasks = await Promise.all(needsReviewFiles.map(async f => ({ 
    path: `needs-review/${f}`, 
    content: await readTask("needs-review", f) 
  })));

  const boardState = JSON.stringify({ 
    unassigned: unassignedTasks, 
    needsReview: needsReviewTasks 
  }, null, 2);
  
  const prompt = `Current Model: ${modelName}\n\nKANBAN BOARD STATE:\n${boardState}\n\nSelect the next task to work on. Output ONLY the <choice>bucket/file.json</choice> or <choice>NONE</choice>.`;

  console.log("────────────────────────────────────────────────────────────");
  const cmd = ["opencode", "run", selectorAgent, "--model", dev.model, prompt];
  const proc = Bun.spawn(cmd, { 
    stdout: "pipe",
    stderr: "inherit",
    env: { ...process.env, RALPH_MODEL: modelName }
  });

  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let fullOutput = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    process.stdout.write(chunk);
    fullOutput += chunk;
  }
  await proc.exited;
  console.log("────────────────────────────────────────────────────────────");

  const match = fullOutput.match(/<choice>(.*?)<\/choice>/);
  
  if (!match || match[1].trim() === "NONE") {
    console.log("Result: No task selected by agent.");
    return null;
  }

  const chosen = match[1].trim();
  console.log(`Result: Selected ${chosen}`);
  const parts = chosen.split("/");
  if (parts.length !== 2) {
    console.warn(`⚠️ Invalid task selection format: ${chosen}`);
    return null;
  }

  return { bucket: parts[0] as Bucket, filename: parts[1] };
}

/**
 * Claims a task and prepares the worktree.
 */
async function claimAndPrepare(bucket: Bucket, filename: string, modelName: string): Promise<Task> {
  const task = await readTask(bucket, filename);
  const epicId = task.id;

  console.log(`🎯 Claiming task #${epicId} from ${bucket}...`);

  // Move to assigned/
  await moveTask(bucket, "assigned", filename);

  const worktreeRoot = resolve(process.cwd(), "..", "finance-worktrees");
  const worktreePath = join(worktreeRoot, `feat-epic-${epicId}`);
  const branchName = `feat/epic-${epicId}`;

  try {
    const baseBranch = getBaseBranch();
    
    // Ensure worktree directory is clean
    if (existsSync(worktreePath)) {
      console.log(`Cleaning up existing worktree at ${worktreePath}...`);
      await $`git worktree remove ${worktreePath} --force`.quiet().nothrow();
    }

    // Check if branch exists
    const branchCheck = await $`git rev-parse --verify ${branchName}`.quiet().nothrow();
    const branchExists = branchCheck.exitCode === 0;
    
    if (branchExists) {
      console.log(`Using existing branch ${branchName}...`);
      await $`git worktree add ${worktreePath} ${branchName}`;
    } else {
      console.log(`Creating new branch ${branchName} from ${baseBranch}...`);
      await $`git worktree add -b ${branchName} ${worktreePath} ${baseBranch}`;
    }

    const updatedTask: Task = {
      ...task,
      assigned_to: `ralph-dev-${modelName}`,
      assigned_at: new Date().toISOString(),
      branch: branchName,
      worktree_path: worktreePath,
      updated_at: new Date().toISOString()
    };

    // Save metadata
    const assignedPath = join(process.cwd(), "kanban", "assigned", filename);
    await writeFile(assignedPath, JSON.stringify(updatedTask, null, 2));

    // Prepare inner task context
    const taskDir = join(worktreePath, ".agentic-task");
    await mkdir(taskDir, { recursive: true });
    await writeFile(join(taskDir, "current.json"), JSON.stringify(updatedTask, null, 2));

    return updatedTask;
  } catch (err) {
    await moveTask("assigned", bucket, filename);
    throw err;
  }
}

/**
 * Runs the Ralph loop for a task until completion, rejection, or blockage.
 */
async function runRalphLoop(agentFile: string, task: Task, modelName: string, signalHandler: { currentProc: Subprocess | null }) {
  const isReview = agentFile.includes("reviewer");
  const taskName = isReview ? "review" : "implementation";
  const dev = await validateModel(modelName);
  
  console.log(`🚀 Starting Ralph ${taskName} loop for task #${task.id} (${modelName})...`);
  
  const progressPath = join(task.worktree_path!, ".agentic-task", "progress.txt");
  if (!existsSync(progressPath)) {
    await writeFile(progressPath, `# Progress for Task #${task.id}: ${task.title}\n\n`);
  }

  const MAX_ITERATIONS = 10;
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const progressContent = await readFile(progressPath, "utf-8");
    
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`🔄 Iteration ${i}/${MAX_ITERATIONS} | ${taskName.toUpperCase()}`);
    console.log(`────────────────────────────────────────────────────────────`);
    
    const prompt = `
Task: #${task.id} - ${task.title}
Role: ${taskName.toUpperCase()}
Current Model: ${modelName}
Base Branch: ${getBaseBranch()}

Requirements: See .agentic-task/current.json
Previous Progress:
${progressContent}

INSTRUCTIONS:
1. Work on the task.
2. Run tests to verify.
3. Commit your work.
4. APPEND a concise summary of this iteration to .agentic-task/progress.txt.
5. If complete, output <promise>COMPLETE</promise> (or <promise>APPROVED</promise> if reviewing).
6. If stuck, output <promise>BLOCKED: reason</promise>.
`;

    const cmd = [
      "opencode", "run", 
      agentFile, 
      "--model", dev.model,
      prompt
    ];

    const proc = Bun.spawn(cmd, {
      cwd: task.worktree_path,
      stdout: "pipe",
      stderr: "inherit"
    });

    signalHandler.currentProc = proc;

    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let output = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      process.stdout.write(chunk);
      output += chunk;
    }

    const exitInfo = await proc.exited;
    signalHandler.currentProc = null;

    if (output.includes("<promise>COMPLETE</promise>") || output.includes("<promise>APPROVED</promise>")) {
      return { status: "COMPLETE", output };
    }

    if (output.includes("<promise>REJECTED") || output.includes("<promise>CHANGES_REQUESTED")) {
      const match = output.match(/<promise>(?:REJECTED|CHANGES_REQUESTED):\s*(.*?)<\/promise>/s);
      return { status: "REJECTED", reason: match ? match[1] : "Review rejected", output };
    }

    if (output.includes("<promise>BLOCKED")) {
      const match = output.match(/<promise>BLOCKED:\s*(.*?)<\/promise>/s);
      return { status: "BLOCKED", reason: match ? match[1] : "Task blocked", output };
    }

    if (exitInfo !== 0) {
      console.warn(`\n⚠️ Agent process exited with code ${exitInfo} without signal. Retrying...`);
    } else {
      console.log("\nIteration finished without signal. Continuing...");
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }

  return { status: "BLOCKED", reason: "Max iterations reached without completion signal." };
}

export async function finalizeTask(epicId: string | number, modelName: string, status: "COMPLETE" | "REJECTED" | "BLOCKED", isReview: boolean, reason?: string) {
  const filename = `epic-${epicId}.json`;
  const assignedPath = join(process.cwd(), "kanban", "assigned", filename);
  const task = await readTask("assigned", filename);
  
  const innerJsonPath = join(task.worktree_path!, ".agentic-task", "current.json");
  let finalData = task;
  
  if (existsSync(innerJsonPath)) {
    const innerContent = await readFile(innerJsonPath, "utf-8");
    finalData = { ...task, ...JSON.parse(innerContent) };
  }

  finalData.updated_at = new Date().toISOString();

  if (status === "COMPLETE") {
    if (isReview) {
       // Logic for moving to complete bucket
       finalData.review = { 
         ...finalData.review, 
         status: "approved", 
         reviewed_at: new Date().toISOString(), 
         reviewer: `ralph-dev-${modelName}` 
       };
       await writeFile(assignedPath, JSON.stringify(finalData, null, 2));
       await moveTask("assigned", "complete", filename);
    } else {
       finalData.implemented_by = `ralph-dev-${modelName}`;
       await writeFile(assignedPath, JSON.stringify(finalData, null, 2));
       await moveTask("assigned", "needs-review", filename);
    }
  } else if (status === "REJECTED") {
    finalData.rejection_count = (finalData.rejection_count || 0) + 1;
    finalData.rejection_history = finalData.rejection_history || [];
    finalData.rejection_history.push({
      reviewer: `ralph-dev-${modelName}`,
      reviewed_at: new Date().toISOString(),
      issues: reason ? [reason] : []
    });
    
    if (finalData.rejection_count >= 3) {
      finalData.escalation_reason = "Max rejections reached. Human intervention required.";
      await writeFile(assignedPath, JSON.stringify(finalData, null, 2));
      await moveTask("assigned", "needs-human", filename);
    } else {
      // Add rejection feedback to tasks
      if (reason) {
        finalData.tasks.push({
          id: `rej-${Date.now()}`,
          description: `Review rejection feedback: ${reason}`,
          completed: false
        });
      }
      await writeFile(assignedPath, JSON.stringify(finalData, null, 2));
      await moveTask("assigned", "unassigned", filename);
    }
  } else if (status === "BLOCKED") {
    finalData.blocked_reason = reason;
    await writeFile(assignedPath, JSON.stringify(finalData, null, 2));
    await moveTask("assigned", "blocked", filename);
  }
}

if (import.meta.main) {
  const modelName = process.argv[3];
  if (!modelName) {
    console.error("Usage: bun src/ralph-dev.ts loop <model-name>");
    process.exit(1);
  }

  const SLEEP_MS = getConfig().sleep.developer;
  let running = true;
  let sleepTimeout: Timer | null = null;
  const signalHandler = { currentProc: null as Subprocess | null };

  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down Ralph...");
    running = false;
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
    if (signalHandler.currentProc) {
      console.log("Killing active agent process...");
      signalHandler.currentProc.kill();
    }
  });

  (async () => {
    while (running) {
      try {
        const selection = await selectTaskAgentically(modelName);
        
        if (selection) {
          const task = await claimAndPrepare(selection.bucket, selection.filename, modelName);
          const isReview = selection.bucket === "needs-review";
          const agentFile = resolve(process.cwd(), "agents", isReview ? "ralph-dev-reviewer.md" : "ralph-dev-inner.md");
          
          const result = await runRalphLoop(agentFile, task, modelName, signalHandler);
          await finalizeTask(task.id, modelName, result.status as any, isReview, (result as any).reason);
          
          console.log(`✅ Finished task #${task.id} with status: ${result.status}`);
        } else {
          console.log(`💤 No work found for ${modelName}. Sleeping for ${SLEEP_MS / 1000}s...`);
          if (running) {
            await new Promise(r => {
              sleepTimeout = setTimeout(r, SLEEP_MS);
            });
          }
        }
      } catch (err) {
        console.error("💥 Error in Ralph loop:", err);
        if (running) await new Promise(r => setTimeout(r, 5000));
      }
    }
  })().then(() => {
    console.log("👋 Ralph shut down cleanly.");
    process.exit(0);
  });
}
