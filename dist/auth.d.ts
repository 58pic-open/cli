/**
 * OAuth 2.1 + PKCE 登录流程（RFC 7636 / RFC 8252 / RFC 7591）
 *
 * 流程：
 *   1. 动态客户端注册（/oauth/register）
 *   2. 生成 PKCE code_verifier + code_challenge（S256）
 *   3. 启动本地回调服务器（127.0.0.1:随机端口）
 *   4. 打开浏览器引导用户授权
 *   5. 接收回调，获取 authorization_code
 *   6. 用 code + code_verifier 换取 access_token + refresh_token
 *   7. 持久化 tokens 到配置文件
 *
 * 注意：本文件直接使用 fetch，不依赖 client.ts，避免循环引用。
 */
import { type OAuthTokens } from "./config.js";
export declare function refreshOAuthToken(apiBase: string, refreshToken: string, clientId: string): Promise<Pick<OAuthTokens, "accessToken" | "refreshToken" | "expiresAt">>;
export declare function revokeToken(apiBase: string, token: string): Promise<void>;
export declare function loginWithOAuth(apiBase?: string): Promise<OAuthTokens>;
//# sourceMappingURL=auth.d.ts.map