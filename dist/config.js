import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
export const DEFAULT_BASE = "https://ai.58pic.com/api";
function configDir() {
    const xdg = process.env.XDG_CONFIG_HOME;
    if (xdg)
        return join(xdg, "58pic");
    return join(homedir(), ".config", "58pic");
}
export function configPath() {
    return join(configDir(), "config.json");
}
export async function loadConfig() {
    try {
        const raw = await readFile(configPath(), "utf8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export async function saveConfig(partial) {
    const dir = configDir();
    await mkdir(dir, { recursive: true });
    const prev = await loadConfig();
    const next = { ...prev, ...partial };
    await writeFile(configPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
}
export function maskKey(key) {
    if (!key)
        return "(not set)";
    if (key.length <= 8)
        return "***";
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
//# sourceMappingURL=config.js.map