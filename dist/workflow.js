import { DEFAULT_WORKFLOW_BASE } from "./config.js";
function normalizeBase(url) {
    return url.replace(/\/+$/, "");
}
export function workflowUrl(base, path = "") {
    const suffix = path === "" ? "" : path.startsWith("/") || path.startsWith("?") ? path : `/${path}`;
    return `${normalizeBase(base)}/v1/workflows${suffix}`;
}
export async function workflowRequest(opts, path, init = {}) {
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
        return { http: res.status, body: JSON.parse(text) };
    }
    catch {
        return { http: res.status, body: { raw: text, httpStatus: res.status } };
    }
}
//# sourceMappingURL=workflow.js.map