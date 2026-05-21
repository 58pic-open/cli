import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_BASE = "https://ai.58pic.com/api";

/** OAuth 登录后持久化的 token 信息 */
export type OAuthTokens = {
  /** 注册的 OAuth client_id */
  clientId: string;
  /** Bearer access token（at_ 前缀） */
  accessToken: string;
  /** Refresh token（rt_ 前缀） */
  refreshToken?: string;
  /** access token 过期时间（unix 秒） */
  expiresAt?: number;
};

export type Pic58Config = {
  apiKey?: string;
  baseUrl?: string;
  /** OAuth 登录后写入，优先级高于 apiKey */
  oauth?: OAuthTokens;
};

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "58pic");
  return join(homedir(), ".config", "58pic");
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

/** 删除已存储的 OAuth tokens（保留 apiKey / baseUrl） */
export async function clearOAuth(): Promise<void> {
  const dir = configDir();
  await mkdir(dir, { recursive: true });
  const prev = await loadConfig();
  const { oauth: _removed, ...rest } = prev;
  await writeFile(configPath(), JSON.stringify(rest, null, 2) + "\n", "utf8");
}

export function maskKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
