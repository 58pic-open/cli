import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_BASE = "https://ai.58pic.com/api";

export type Pic58Config = {
  apiKey?: string;
  baseUrl?: string;
};

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "pic58");
  return join(homedir(), ".config", "pic58");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export async function loadConfig(): Promise<Pic58Config> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return JSON.parse(raw) as Pic58Config;
  } catch {
    return {};
  }
}

export async function saveConfig(partial: Pic58Config): Promise<void> {
  const dir = configDir();
  await mkdir(dir, { recursive: true });
  const prev = await loadConfig();
  const next = { ...prev, ...partial };
  await writeFile(configPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
}

export function maskKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
