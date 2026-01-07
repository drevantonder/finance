import { describe, it, expect, afterEach } from "bun:test";
import { createTask, readTask, moveTask, listTasks, findTaskAcrossBuckets, Bucket } from "./kanban";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const TEST_FILENAME = "epic-999.json";

describe("Kanban Operations", () => {
  it("should create a task", async () => {
    const data = { title: "Test Task", id: 999 };
    await createTask("unassigned", data);
    
    const tasks = await listTasks("unassigned");
    expect(tasks).toContain(TEST_FILENAME);
    
    const read = await readTask("unassigned", TEST_FILENAME);
    expect(read.title).toBe("Test Task");
  });

  it("should move a task between buckets", async () => {
    const data = { title: "Move Task", id: 999 };
    await createTask("unassigned", data);
    
    await moveTask("unassigned", "assigned", TEST_FILENAME);
    
    const unassignedTasks = await listTasks("unassigned");
    expect(unassignedTasks).not.toContain(TEST_FILENAME);
    
    const assignedTasks = await listTasks("assigned");
    expect(assignedTasks).toContain(TEST_FILENAME);
  });

  it("should find a task across buckets", async () => {
    const data = { title: "Find Task", id: 999 };
    await createTask("complete", data);
    
    const result = await findTaskAcrossBuckets(999);
    expect(result).not.toBeNull();
    expect(result?.bucket).toBe("complete");
    expect(result?.filename).toBe(TEST_FILENAME);
  });

  it("should return null if task not found", async () => {
    const result = await findTaskAcrossBuckets(888);
    expect(result).toBeNull();
  });

  it("should list only JSON files", async () => {
    const data = { title: "List Task", id: 999 };
    await createTask("archived", data);
    
    const tasks = await listTasks("archived");
    expect(tasks).toContain(TEST_FILENAME);
    expect(tasks.every(t => t.endsWith(".json"))).toBe(true);
  });

  // Cleanup after each test to avoid interference
  afterEach(async () => {
    const buckets: Bucket[] = ["unassigned", "assigned", "blocked", "needs-review", "needs-human", "complete", "archived"];
    for (const bucket of buckets) {
      const path = join(process.cwd(), "kanban", bucket, TEST_FILENAME);
      if (existsSync(path)) {
        await rm(path);
      }
    }
  });
});
