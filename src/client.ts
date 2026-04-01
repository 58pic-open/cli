import { DEFAULT_BASE, type Pic58Config } from "./config.js";

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

export function resolveCredentials(
  flags: { apiKey?: string; baseUrl?: string },
  file: Pic58Config
): { apiKey: string; baseUrl: string } {
  const apiKey =
    flags.apiKey ?? process.env["58PIC_API_KEY"] ?? file.apiKey;
  if (!apiKey) {
    throw new Error(
      "缺少 API Key：设置环境变量 58PIC_API_KEY，或执行 58pic config init，或使用 --api-key"
    );
  }
  const baseUrl =
    flags.baseUrl ??
    process.env["58PIC_BASE_URL"] ??
    file.baseUrl ??
    DEFAULT_BASE;
  return { apiKey, baseUrl };
}
