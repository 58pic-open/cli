export declare const DEFAULT_BASE = "https://ai.58pic.com/api";
export declare const DEFAULT_WORKFLOW_BASE = "https://workflow-api.58pic.com/api";
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
    /** 工作流 API 根地址；通常无需修改。 */
    workflowBaseUrl?: string;
    /** OAuth 登录后写入，优先级高于 apiKey */
    oauth?: OAuthTokens;
};
export declare function configPath(): string;
export declare function loadConfig(): Promise<Pic58Config>;
export declare function saveConfig(partial: Pic58Config): Promise<void>;
/** 删除已存储的 OAuth tokens（保留 apiKey / baseUrl） */
export declare function clearOAuth(): Promise<void>;
export declare function maskKey(key: string | undefined): string;
//# sourceMappingURL=config.d.ts.map