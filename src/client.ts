import { DEFAULT_BASE, saveConfig, type Pic58Config } from "./config.js";
import { refreshOAuthToken } from "./auth.js";

export type ApiEnvelope<T = unknown> = {
  code: number;
  msg: string;
  data?: T;
};

export type ClientOptions = {
  apiKey: string;
  baseUrl?: string;
  signal?: AbortSignal;
};

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export function routeUrl(base: string, route: string): string {
  const b = normalizeBase(base);
  const r = route.startsWith("open-platform/")
    ? route
    : `open-platform/${route}`;
  const root = b.endsWith("/api") ? `${b}/` : `${b}/`;
  return `${root}?r=${r}`;
}

export async function pic58Request<T = unknown>(
  opts: ClientOptions,
  route: string,
  init: RequestInit & { jsonBody?: unknown } = {}
): Promise<{ http: number; body: ApiEnvelope<T> | Record<string, unknown> }> {
  const base = normalizeBase(opts.baseUrl ?? DEFAULT_BASE);
  const url = routeUrl(base, route);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${opts.apiKey}`);
  if (!headers.has("Content-Type") && init.jsonBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const { jsonBody, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers,
    body:
      jsonBody !== undefined
        ? JSON.stringify(jsonBody)
        : (rest.body as BodyInit | null | undefined),
    signal: opts.signal,
  });
  const text = await res.text();
  let parsed: ApiEnvelope<T> | Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    parsed = { raw: text, httpStatus: res.status };
  }
  return { http: res.status, body: parsed };
}

export async function resolveCredentials(
  flags: { apiKey?: string; baseUrl?: string },
  file: Pic58Config
): Promise<{ apiKey: string; baseUrl: string }> {
  const baseUrl =
    flags.baseUrl ??
    process.env["58PIC_BASE_URL"] ??
    file.baseUrl ??
    DEFAULT_BASE;

  // 优先级 1：命令行 --api-key 或环境变量
  const explicit = flags.apiKey ?? process.env["58PIC_API_KEY"];
  if (explicit) {
    return { apiKey: explicit.trim(), baseUrl };
  }

  // 优先级 2：OAuth access token
  if (file.oauth?.accessToken) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = file.oauth.expiresAt ?? Infinity;

    if (expiresAt > now) {
      // token 有效，直接使用
      return { apiKey: file.oauth.accessToken, baseUrl };
    }

    // token 已过期，尝试用 refresh token 续期
    if (file.oauth.refreshToken) {
      try {
        process.stderr.write("Access token 已过期，正在自动刷新…\n");
        const refreshed = await refreshOAuthToken(
          baseUrl,
          file.oauth.refreshToken,
          file.oauth.clientId
        );
        const updated = { ...file.oauth, ...refreshed };
        await saveConfig({ oauth: updated });
        return { apiKey: updated.accessToken, baseUrl };
      } catch (e) {
        process.stderr.write(
          `Token 刷新失败（${(e as Error).message}），请重新执行 58pic auth login\n`
        );
        // 刷新失败，继续尝试 apiKey 兜底
      }
    } else {
      process.stderr.write(
        "OAuth token 已过期，请重新执行 58pic auth login\n"
      );
    }
  }

  // 优先级 3：配置文件中的 API Key
  if (file.apiKey) {
    return { apiKey: file.apiKey, baseUrl };
  }

  throw new Error(
    "未配置认证信息，请先执行 58pic auth login（OAuth）或 58pic config init（API Key）"
  );
}
