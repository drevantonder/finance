import { config } from "../config/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type { DeveloperDefinition, AgenticKanbanConfig } from "../config/config";

export interface DeveloperConfig {
  name: string;
  model: string;
  enabled: boolean;
}

let modelsCache: { enabled: Record<string, boolean> } | null = null;

async function getModelsConfig() {
  if (modelsCache) return modelsCache;
  
  try {
    const path = join(process.cwd(), "config", "models.json");
    const content = await readFile(path, "utf-8");
    modelsCache = JSON.parse(content);
    return modelsCache!;
  } catch (err) {
    console.warn("Warning: models.json not found, all models enabled by default");
    modelsCache = { enabled: {} };
    return modelsCache;
  }
}

export function getConfig() {
  return config;
}

export function getBaseBranch() {
  return config.baseBranch;
}

export async function getDevelopers(): Promise<DeveloperConfig[]> {
  const models = await getModelsConfig();
  
  return config.developers.map(dev => ({
    ...dev,
    enabled: models.enabled[dev.name] ?? true // Default to enabled if not in models.json
  }));
}

export async function validateModelName(name: string): Promise<DeveloperConfig> {
  const developers = await getDevelopers();
  const dev = developers.find(d => d.model === name);
  
  if (!dev) {
    throw new Error(`Model ${name} not found in configuration.`);
  }
  
  if (!dev.enabled) {
    throw new Error(`Model ${name} is currently disabled in models.json.`);
  }
  
  return dev;
}
