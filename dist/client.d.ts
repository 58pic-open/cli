import { type Pic58Config } from "./config.js";
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
export declare function routeUrl(base: string, route: string): string;
export declare function pic58Request<T = unknown>(opts: ClientOptions, route: string, init?: RequestInit & {
    jsonBody?: unknown;
}): Promise<{
    http: number;
    body: ApiEnvelope<T> | Record<string, unknown>;
}>;
export declare function resolveCredentials(flags: {
    apiKey?: string;
    baseUrl?: string;
}, file: Pic58Config): {
    apiKey: string;
    baseUrl: string;
};
//# sourceMappingURL=client.d.ts.map