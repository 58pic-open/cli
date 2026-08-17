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
export declare function workflowUrl(base: string, path?: string): string;
export declare function workflowRequest<T = unknown>(opts: WorkflowClientOptions, path: string, init?: RequestInit & {
    jsonBody?: unknown;
}): Promise<{
    http: number;
    body: WorkflowEnvelope<T> | Record<string, unknown>;
}>;
//# sourceMappingURL=workflow.d.ts.map