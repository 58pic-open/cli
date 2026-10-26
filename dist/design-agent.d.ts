/**
 * 千图智能设计 Agent（design-agent.58pic.com）客户端。
 *
 * 一轮：open-platform/same-style（model=4719, generate_mode=1）建平台任务 →
 *      首轮 POST /api/conversations 建会话 → POST /api/chat/stream（detach=true，可带 mode_key）。
 * CLI 等到 --wait 秒后断开；detach 让 Agent 在后台继续，之后用 `58pic agent status` 查询。
 */
export declare const DEFAULT_DESIGN_AGENT_BASE = "https://design-agent.58pic.com";
export declare const SMART_DESIGN_MODEL_ID = 4719;
export declare const GENERAL_DESIGN_AGENT_KEY = "omni";
export type DesignAgentParam = {
    key: string;
    type?: string;
    required?: boolean;
    options?: string[];
};
export type DesignAgentMode = {
    name: string;
    params: DesignAgentParam[];
    placeholder_prompt?: string;
};
export type DesignAgent = {
    key: string;
    name: string;
    subtitle?: string;
    second_modes?: DesignAgentMode[];
};
export type AgentCtx = {
    apiKey: string;
    baseUrl: string;
    agentBaseUrl: string;
};
export declare function listDesignAgents(ctx: AgentCtx): Promise<{
    http: number;
    body: Record<string, unknown>;
}>;
/** 与站点 composeDesignAgentMessage 同格式 */
export declare function composeMessage(agent: DesignAgent, mode: DesignAgentMode, values: Record<string, string | string[]>, extra: string): string;
export declare function submitTask(ctx: AgentCtx, prompt: string): Promise<{
    aiId: string;
    aiAppId: string;
}>;
export declare function createSession(ctx: AgentCtx, title: string, aiId: string, aiAppId: string): Promise<string>;
export type TurnResult = {
    session_id: string;
    task_id?: string;
    status: "running" | "succeeded" | "awaiting_user" | "failed";
    images: string[];
    agent_message?: string;
    ask_user?: unknown;
    suggested_actions?: string[];
    error?: string;
    queued?: boolean;
};
export declare function streamTurn(ctx: AgentCtx, input: {
    sessionId: string;
    aiId: string;
    aiAppId: string;
    message: string;
    modeKey?: string;
    imageUrls?: string[];
    waitSec: number;
}, onEvent?: (line: string) => void): Promise<TurnResult>;
/** 状态取 run-status（history 会把助手消息统一改写为 completed），内容取 history 最新一轮 */
export declare function turnStatus(ctx: AgentCtx, sessionId: string): Promise<TurnResult>;
//# sourceMappingURL=design-agent.d.ts.map