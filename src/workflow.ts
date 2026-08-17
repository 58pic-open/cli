import { DEFAULT_WORKFLOW_BASE } from "./config.js";

export type WorkflowClientOptions = {
  apiKey: string;
  workflowBaseUrl?: string;
  signal?: AbortSignal;
};

export type WorkflowEnvelope<T = unknown> = {
  code: number;
  message?: string;
  msg?: string;
  data?: T;
};

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export function workflowUrl(base: string, path = ""): string {
  const suffix = path === "" ? "" : path.startsWith("/") || path.startsWith("?") ? path : `/${path}`;
  return `${normalizeBase(base)}/v1/workflows${suffix}`;
}

export async function workflowRequest<T = unknown>(
  opts: WorkflowClientOptions,
  path: string,
  init: RequestInit & { jsonBody?: unknown } = {}
): Promise<{ http: number; body: WorkflowEnvelope<T> | Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${opts.apiKey}`);
  if (!headers.has("Content-Type") && init.jsonBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const { jsonBody, ...rest } = init;
  const res = await fetch(workflowUrl(opts.workflowBaseUrl ?? DEFAULT_WORKFLOW_BASE, path), {
    ...rest,
    headers,
    body: jsonBody === undefined ? rest.body : JSON.stringify(jsonBody),
    signal: opts.signal,
  });
  const text = await res.text();
  try {
    return { http: res.status, body: JSON.parse(text) as WorkflowEnvelope<T> };
  } catch {
    return { http: res.status, body: { raw: text, httpStatus: res.status } };
  }
}
