import { describe, it, expect, afterEach } from "bun:test";
import { readTask, Bucket } from "./kanban";
import { writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const KANBAN_ROOT = join(process.cwd(), "kanban");

describe("Task Healing", () => {
  const filename = "epic-123.json";

  async function writeRaw(bucket: Bucket, content: string) {
    const path = join(KANBAN_ROOT, bucket, filename);
    await writeFile(path, content);
  }

  it("should add missing optional fields and rewrite", async () => {
    const raw = { id: 123, title: "Missing Fields" }; // No priority, no tasks, etc.
    await writeRaw("unassigned", JSON.stringify(raw));
    
    const task = await readTask("unassigned", filename);
    expect(task.priority).toBe("medium"); // Default
    expect(task.tasks).toEqual([]); // Default
    
    // Verify file was rewritten
    const onDisk = JSON.parse(await readFile(join(KANBAN_ROOT, "unassigned", filename), "utf-8"));
    expect(onDisk.priority).toBe("medium");
  });

  it("should strip unknown fields and rewrite", async () => {
    const raw = { id: 123, title: "Unknown Fields", foo: "bar", secret: 42 };
    await writeRaw("unassigned", JSON.stringify(raw));
    
    const task = await readTask("unassigned", filename);
    expect((task as any).foo).toBeUndefined();
    expect((task as any).secret).toBeUndefined();
    
    // Verify file was rewritten
    const onDisk = JSON.parse(await readFile(join(KANBAN_ROOT, "unassigned", filename), "utf-8"));
    expect(onDisk.foo).toBeUndefined();
  });

  it("should coerce types and rewrite", async () => {
    const raw = { id: "123", title: "Coerced Type" }; // ID is string
    await writeRaw("unassigned", JSON.stringify(raw));
    
    const task = await readTask("unassigned", filename);
    expect(task.id).toBe(123); // Now a number
    
    // Verify file was rewritten
    const onDisk = JSON.parse(await readFile(join(KANBAN_ROOT, "unassigned", filename), "utf-8"));
    expect(onDisk.id).toBe(123);
  });

  it("should move completely malformed JSON to blocked/", async () => {
    const content = "THIS IS NOT JSON";
    await writeRaw("unassigned", content);
    
    await expect(readTask("unassigned", filename)).rejects.toThrow(/Malformed JSON/);
    
    expect(existsSync(join(KANBAN_ROOT, "unassigned", filename))).toBe(false);
    expect(existsSync(join(KANBAN_ROOT, "blocked", filename))).toBe(true);
    expect(existsSync(join(KANBAN_ROOT, "blocked", `${filename}.error.txt`))).toBe(true);
  });

  it("should move failed validation to blocked/", async () => {
    const raw = { id: 123 }; // Missing required 'title'
    await writeRaw("unassigned", JSON.stringify(raw));
    
    await expect(readTask("unassigned", filename)).rejects.toThrow(/Validation failed/);
    
    expect(existsSync(join(KANBAN_ROOT, "unassigned", filename))).toBe(false);
    expect(existsSync(join(KANBAN_ROOT, "blocked", filename))).toBe(true);
  });

  afterEach(async () => {
    const buckets: Bucket[] = ["unassigned", "assigned", "blocked", "needs-review", "needs-human", "complete", "archived"];
    for (const bucket of buckets) {
      const path = join(KANBAN_ROOT, bucket, filename);
      if (existsSync(path)) {
        await rm(path);
      }
      const errPath = `${path}.error.txt`;
      if (existsSync(errPath)) {
        await rm(errPath);
      }
    }
  });
});
