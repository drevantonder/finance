import { join } from "node:path";
import { rename, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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

export async function createTask(bucket: Bucket, data: { id: string | number; [key: string]: any }): Promise<string> {
  const filename = `epic-${data.id}.json`;
  const path = join(getBucketPath(bucket), filename);
  await writeFile(path, JSON.stringify(data, null, 2));
  return filename;
}

export async function readTask(bucket: Bucket, filename: string): Promise<any> {
  const path = join(getBucketPath(bucket), filename);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
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
