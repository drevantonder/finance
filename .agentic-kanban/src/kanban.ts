import { join } from "node:path";
import { rename, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { TaskSchema, type Task } from "./schema";

export type Bucket = 
  | "unassigned" 
  | "assigned" 
  | "blocked" 
  | "needs-review" 
  | "needs-human" 
  | "complete" 
  | "archived";

const KANBAN_ROOT = join(process.cwd(), "kanban");

function getBucketPath(bucket: Bucket): string {
  return join(KANBAN_ROOT, bucket);
}

export async function createTask(bucket: Bucket, data: any): Promise<string> {
  const validated = TaskSchema.parse(data);
  const filename = `epic-${validated.id}.json`;
  const path = join(getBucketPath(bucket), filename);
  await writeFile(path, JSON.stringify(validated, null, 2));
  return filename;
}

export async function readTask(bucket: Bucket, filename: string): Promise<Task> {
  const path = join(getBucketPath(bucket), filename);
  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read task file: ${path}`);
  }

  let rawData: any;
  try {
    rawData = JSON.parse(content);
  } catch (err) {
    // Malformed JSON: move to blocked/
    if (bucket !== "blocked") {
      const blockedPath = join(getBucketPath("blocked"), filename);
      await rename(path, blockedPath);
      const errorDetailsPath = `${blockedPath}.error.txt`;
      await writeFile(errorDetailsPath, `JSON Parse Error: ${(err as Error).message}\nOriginal Content:\n${content}`);
      throw new Error(`Malformed JSON in ${filename}. Moved to blocked/`);
    }
    throw err;
  }

  const result = TaskSchema.safeParse(rawData);
  if (result.success) {
    // Check if we need to heal (if rawData is different from validated data)
    // A simple way is to compare JSON strings, but that might be noisy due to formatting.
    // However, the criteria says "adds defaults and rewrites", "strips unknown", "coerces and rewrites".
    // So we should rewrite if safeParse gave us a valid object but it differs from rawData.
    
    const validatedData = result.data;
    // We rewrite to ensure it's "healed"
    await writeFile(path, JSON.stringify(validatedData, null, 2));
    return validatedData;
  } else {
    // Zod validation failed and couldn't be coerced
    if (bucket !== "blocked") {
      const blockedPath = join(getBucketPath("blocked"), filename);
      await rename(path, blockedPath);
      const errorDetailsPath = `${blockedPath}.error.txt`;
      await writeFile(errorDetailsPath, `Zod Validation Error: ${JSON.stringify(result.error.format(), null, 2)}\nOriginal Content:\n${content}`);
      throw new Error(`Validation failed for ${filename}. Moved to blocked/`);
    }
    throw new Error(`Validation failed for ${filename} already in blocked/`);
  }
}

export async function moveTask(fromBucket: Bucket, toBucket: Bucket, filename: string): Promise<void> {
  const fromPath = join(getBucketPath(fromBucket), filename);
  const toPath = join(getBucketPath(toBucket), filename);
  await rename(fromPath, toPath);
}

export async function listTasks(bucket: Bucket): Promise<string[]> {
  const path = getBucketPath(bucket);
  const files = await readdir(path);
  return files.filter(f => f.endsWith(".json"));
}

export async function findTaskAcrossBuckets(epicId: string | number): Promise<{ bucket: Bucket; filename: string } | null> {
  const buckets: Bucket[] = [
    "unassigned",
    "assigned",
    "blocked",
    "needs-review",
    "needs-human",
    "complete",
    "archived"
  ];
  const filename = `epic-${epicId}.json`;

  for (const bucket of buckets) {
    const path = join(getBucketPath(bucket), filename);
    if (existsSync(path)) {
      return { bucket, filename };
    }
  }

  return null;
}
