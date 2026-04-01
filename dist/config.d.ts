export declare const DEFAULT_BASE = "https://ai.58pic.com/api";
export type Pic58Config = {
    apiKey?: string;
    baseUrl?: string;
};
export declare function configPath(): string;
export declare function loadConfig(): Promise<Pic58Config>;
export declare function saveConfig(partial: Pic58Config): Promise<void>;
export declare function maskKey(key: string | undefined): string;
//# sourceMappingURL=config.d.ts.map