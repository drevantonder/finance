import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface DeveloperConfig {
  name: string;
  model: string;
  enabled: boolean;
}

export async function getFleetConfig() {
  const path = join(process.cwd(), "config", "fleet.json");
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as { developers: DeveloperConfig[] };
}

export async function validateModel(model: string) {
  const config = await getFleetConfig();
  const dev = config.developers.find(d => d.model === model);
  
  if (!dev) {
    throw new Error(`Model ${model} not found in fleet configuration.`);
  }
  
  if (!dev.enabled) {
    throw new Error(`Model ${model} is currently disabled in fleet configuration.`);
  }
  
  return dev;
}
