import { $ } from "bun";
import { createTask, findTaskAcrossBuckets } from "./kanban";
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
  syncEpics().then(() => {
    console.log("<promise>COMPLETE</promise>");
  }).catch(err => {
    console.log(`<promise>BLOCKED: ${err.message}</promise>`);
    process.exit(1);
  });
}
