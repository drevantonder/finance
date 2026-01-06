import { $ } from "bun";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { createTask, findTaskAcrossBuckets, listTasks, readTask } from "./kanban";
import type { Task } from "./schema";

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

      // Push branch
      console.log(`Pushing branch ${branch} to origin...`);
      await $`git push origin ${branch}`.quiet();

      // Create PR
      const body = `Closes #${task.id}\n\n${task.description}`;
      const title = `Epic #${task.id}: ${task.title}`;
      
      const prOutput = await $`gh pr create --title ${title} --body ${body} --head ${branch}`.text();
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
  (async () => {
    await syncEpics();
    await createPRs();
  })().then(() => {
    console.log("<promise>COMPLETE</promise>");
  }).catch(err => {
    console.log(`<promise>BLOCKED: ${err.message}</promise>`);
    process.exit(1);
  });
}
