import { $ } from "bun";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createTask, findTaskAcrossBuckets, listTasks, readTask, moveTask } from "./kanban";
import type { Task } from "./schema";
import { getConfig } from "./config";

export async function syncEpics() {
  console.log("Syncing epics from GitHub...");
  
  try {
    const output = await $`gh issue list --label epic --json number,title,body`.text();
    const epics = JSON.parse(output);
    
    for (const epic of epics) {
      const existing = await findTaskAcrossBuckets(epic.number);
      if (existing) {
        console.log(`Skipping epic #${epic.number}: already exists in ${existing.bucket}`);
        continue;
      }
      
      console.log(`Creating task for epic #${epic.number}: ${epic.title}`);
      
      const tasks = parseTasks(epic.body);
      
      const taskData: Partial<Task> = {
        id: epic.number,
        title: epic.title,
        description: epic.body,
        tasks: tasks.map((desc, index) => ({
          id: `${epic.number}-${index}`,
          description: desc,
          completed: false
        })),
        priority: "medium",
        rejection_count: 0,
        rejection_history: [],
        review: {
          status: "pending",
          issues: []
        }
      };
      
      await createTask("unassigned", taskData as Task);
    }
    
    console.log("Sync complete.");
  } catch (err) {
    console.error("Failed to sync epics:", err);
    throw err;
  }
}

export async function createPRs() {
  console.log("Checking for completed tasks to create PRs...");
  const complete = await listTasks("complete");
  const baseBranch = getConfig().baseBranch;
  
  for (const filename of complete) {
    const task = await readTask("complete", filename);
    
    if (task.pr_number) {
      continue;
    }

    console.log(`Creating PR for task #${task.id}: ${task.title}`);
    
    try {
      const branch = task.branch;
      if (!branch) {
        console.error(`Task #${task.id} has no branch metadata`);
        continue;
      }

      // Check if branch has commits that differ from base
      try {
        const commitCount = await $`git rev-list --count ${baseBranch}..${branch}`.text();
        const count = parseInt(commitCount.trim());
        
        if (count === 0) {
          console.log(`Skipping task #${task.id}: branch ${branch} has no new commits`);
          continue;
        }
        
        console.log(`Branch ${branch} has ${count} new commit(s)`);
      } catch (err) {
        console.error(`Failed to check commits for branch ${branch}:`, err);
        continue;
      }

      // Push branch
      console.log(`Pushing branch ${branch} to origin...`);
      await $`git push origin ${branch}`.quiet();

      // Create PR body with agent metadata and acceptance criteria
      const body = `Closes #${task.id}

## Agent Information
- **Implemented by**: ${task.implemented_by || "Unknown"}
- **Review status**: ${task.review.status === "approved" ? "✅ Approved" : "❌ Rejected"}
- **Reviewed by**: ${task.review.reviewer || "Unknown"}
- **Reviewed at**: ${task.review.reviewed_at || "Pending"}

## Acceptance Criteria
${task.tasks.map(t => `- [${t.completed ? "x" : " "}] ${t.description}`).join("\n")}${task.rejection_count > 0 ? `

## Review History
${task.rejection_history.map(r => `**${r.reviewer}** (${r.reviewed_at}): ${r.issues.join(", ")}`).join("\n")}
` : ""}`;
      
      const title = `Epic #${task.id}: ${task.title}`;
      
      const prOutput = await $`gh pr create --title ${title} --body ${body} --head ${branch} --base ${baseBranch}`.text();
      const prUrl = prOutput.trim();
      
      // Extract PR number from URL (e.g., .../pull/123)
      const prNumber = parseInt(prUrl.split("/").pop() || "0");

      const updatedTask: Task = {
        ...task,
        pr_number: prNumber,
        pr_url: prUrl,
        updated_at: new Date().toISOString()
      };

      const completePath = join(process.cwd(), "kanban", "complete", filename);
      await writeFile(completePath, JSON.stringify(updatedTask, null, 2));

      console.log(`PR created: ${prUrl}`);
    } catch (err) {
      console.error(`Failed to create PR for task #${task.id}:`, err);
    }
  }
}

export async function monitorPRs() {
  console.log("Monitoring PRs for status changes...");
  const complete = await listTasks("complete");
  
  for (const filename of complete) {
    const task = await readTask("complete", filename);
    
    if (!task.pr_number) {
      continue;
    }

    console.log(`Checking status of PR #${task.pr_number} (Task #${task.id})...`);
    
    try {
      const prOutput = await $`gh pr view ${task.pr_number} --json state,reviews,comments`.text();
      const pr = JSON.parse(prOutput);
      
      if (pr.state === "MERGED" || pr.state === "CLOSED") {
        console.log(`PR #${task.pr_number} is ${pr.state}. Archiving task #${task.id}.`);
        
        // Move to archived/
        await moveTask("complete", "archived", filename);
        
        // Remove worktree
        if (task.worktree_path) {
          console.log(`Removing worktree at ${task.worktree_path}...`);
          await $`git worktree remove ${task.worktree_path} --force`.quiet();
        }
      } else {
        // Check for requested changes
        const requestedChanges = pr.reviews.some((r: any) => r.state === "CHANGES_REQUESTED");
        
        if (requestedChanges) {
          console.log(`PR #${task.pr_number} has requested changes. Moving back to unassigned/.`);
          
          // Append feedback to tasks
          const feedback = pr.reviews
            .filter((r: any) => r.state === "CHANGES_REQUESTED" && r.body)
            .map((r: any) => `Review feedback: ${r.body}`);
          
          const updatedTask: Task = {
            ...task,
            tasks: [
              ...task.tasks,
              ...feedback.map((f: string, i: number) => ({
                id: `${task.id}-fb-${Date.now()}-${i}`,
                description: f,
                completed: false
              }))
            ],
            updated_at: new Date().toISOString()
          };
          
          const completePath = join(process.cwd(), "kanban", "complete", filename);
          await writeFile(completePath, JSON.stringify(updatedTask, null, 2));
          await moveTask("complete", "unassigned", filename);
        }
      }
    } catch (err) {
      console.error(`Failed to check PR #${task.pr_number}:`, err);
    }
  }
}

function parseTasks(body: string): string[] {
  const lines = body.split("\n");
  const taskRegex = /^- \[ \] (.*)$/;
  const tasks: string[] = [];
  
  for (const line of lines) {
    const match = line.trim().match(taskRegex);
    if (match) {
      tasks.push(match[1].trim());
    }
  }
  
  return tasks;
}

if (import.meta.main) {
  const SLEEP_MS = getConfig().sleep.pm;
  let running = true;
  let sleepTimeout: Timer | null = null;

  process.on("SIGINT", () => {
    console.log("\nShutting down PM...");
    running = false;
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
  });

  (async () => {
    while (running) {
      try {
        await syncEpics();
        await createPRs();
        await monitorPRs();
        
        if (running) {
          console.log(`Sleeping for ${SLEEP_MS / 1000}s...`);
          await new Promise(resolve => {
            sleepTimeout = setTimeout(() => {
              sleepTimeout = null;
              resolve(undefined);
            }, SLEEP_MS);
          });
        }
      } catch (err) {
        console.error("Error in PM cycle:", err);
      }
    }
  })().then(() => {
    console.log("PM shut down cleanly.");
    process.exit(0);
  });
}
