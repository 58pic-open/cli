import { DEFAULT_BASE } from "./config.js";
function normalizeBase(url) {
    return url.replace(/\/+$/, "");
}
export function routeUrl(base, route) {
    const b = normalizeBase(base);
    const r = route.startsWith("open-platform/")
        ? route
        : `open-platform/${route}`;
    const root = b.endsWith("/api") ? `${b}/` : `${b}/`;
    return `${root}?r=${r}`;
}
export async function pic58Request(opts, route, init = {}) {
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
        body: jsonBody !== undefined
            ? JSON.stringify(jsonBody)
            : rest.body,
        signal: opts.signal,
    });
    const text = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        parsed = { raw: text, httpStatus: res.status };
    }
    return { http: res.status, body: parsed };
}
export function resolveCredentials(flags, file) {
    const apiKey = flags.apiKey ?? process.env["58PIC_API_KEY"] ?? file.apiKey;
    if (!apiKey) {
        throw new Error("缺少 API Key：设置环境变量 58PIC_API_KEY，或执行 58pic config init，或使用 --api-key");
    }
    const baseUrl = flags.baseUrl ??
        process.env["58PIC_BASE_URL"] ??
        file.baseUrl ??
        DEFAULT_BASE;
    return { apiKey, baseUrl };
}
//# sourceMappingURL=client.js.map