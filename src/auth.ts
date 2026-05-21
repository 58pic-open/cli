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

import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { saveConfig, type OAuthTokens } from "./config.js";
import { DEFAULT_BASE } from "./config.js";

// ---- OAuth server 端点 ----

interface OAuthEndpoints {
  authorization: string;
  token: string;
  register: string;
  revoke: string;
}

/**
 * 从 API base URL 推导 OAuth 服务器根地址。
 * "https://ai.58pic.com/api" → "https://ai.58pic.com"
 */
function getOAuthBase(apiBase: string): string {
  return apiBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
}

/**
 * 通过 OAuth 服务器元数据发现端点（RFC 8414）。
 * 失败时按约定模式构造 fallback。
 */
async function resolveEndpoints(apiBase: string): Promise<OAuthEndpoints> {
  const oauthBase = getOAuthBase(apiBase);
  try {
    const res = await fetch(
      `${oauthBase}/.well-known/oauth-authorization-server`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const meta = (await res.json()) as Record<string, string>;
      if (meta.authorization_endpoint && meta.token_endpoint) {
        return {
          authorization: meta.authorization_endpoint,
          token: meta.token_endpoint,
          register: meta.registration_endpoint ?? `${oauthBase}/oauth/register`,
          revoke: meta.revocation_endpoint ?? `${oauthBase}/oauth/revoke`,
        };
      }
    }
  } catch {
    /* 忽略，使用 fallback */
  }
  return {
    authorization: `${oauthBase}/oauth/authorize`,
    token: `${oauthBase}/oauth/token`,
    register: `${oauthBase}/oauth/register`,
    revoke: `${oauthBase}/oauth/revoke`,
  };
}

// ---- PKCE ----

interface Pkce {
  verifier: string;
  challenge: string;
}

function generatePkce(): Pkce {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

// ---- 本地回调服务器 ----

interface CallbackServer {
  port: number;
  /** 等待浏览器回调，返回 authorization_code */
  waitForCode: (expectedState: string, timeoutMs?: number) => Promise<string>;
}

function createCallbackServer(): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("无法绑定本地回调端口"));
        return;
      }
      const port = addr.port;

      const waitForCode = (
        expectedState: string,
        timeoutMs = 120_000
      ): Promise<string> =>
        new Promise((res, rej) => {
          const timer = setTimeout(() => {
            server.close();
            rej(new Error("OAuth 授权超时（2 分钟），请重试"));
          }, timeoutMs);

          server.on("request", (req, resp) => {
            try {
              const url = new URL(
                req.url ?? "/",
                `http://127.0.0.1:${port}`
              );
              if (url.pathname !== "/callback") {
                resp.writeHead(404).end();
                return;
              }

              const code = url.searchParams.get("code");
              const returnedState = url.searchParams.get("state");
              const error = url.searchParams.get("error");
              const errorDesc = url.searchParams.get("error_description") ?? "";

              resp.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
              });

              if (error || !code || returnedState !== expectedState) {
                const msg = error
                  ? `授权失败：${error}${errorDesc ? " — " + errorDesc : ""}`
                  : "无效的回调参数";
                resp.end(
                  `<html><body style="font-family:sans-serif;padding:2em">` +
                    `<h2>❌ ${msg}</h2><p>请关闭此窗口，返回终端。</p></body></html>`
                );
                clearTimeout(timer);
                server.close();
                rej(new Error(msg));
                return;
              }

              resp.end(
                `<html><body style="font-family:sans-serif;padding:2em">` +
                  `<h2>✅ 授权成功！</h2>` +
                  `<p>请关闭此窗口，返回终端继续。</p></body></html>`
              );
              clearTimeout(timer);
              server.close();
              res(code);
            } catch (e) {
              resp.writeHead(500).end();
              clearTimeout(timer);
              server.close();
              rej(e);
            }
          });
        });

      resolve({ port, waitForCode });
    });

    server.on("error", reject);
  });
}

// ---- 打开浏览器 ----

function openBrowser(url: string): void {
  try {
    const { platform } = process;
    if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    /* 静默忽略，URL 已打印到终端 */
  }
}

// ---- 动态客户端注册 ----

async function registerDynamicClient(
  registerUrl: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch(registerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "58pic CLI",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "58pic:search 58pic:generate 58pic:download 58pic:credits:read",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`客户端注册失败 HTTP ${res.status}：${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { client_id?: string };
  if (!data.client_id) {
    throw new Error("客户端注册响应中缺少 client_id");
  }
  return data.client_id;
}

// ---- 授权码换 token ----

async function exchangeCode(
  tokenUrl: string,
  code: string,
  clientId: string,
  redirectUri: string,
  verifier: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token 换取失败 HTTP ${res.status}：${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!data.access_token) {
    throw new Error("Token 响应中缺少 access_token");
  }
  const expiresAt = data.expires_in
    ? Math.floor(Date.now() / 1000) + data.expires_in - 30 // 提前 30s 视为过期
    : undefined;
  return {
    clientId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

// ---- 刷新 token（供 client.ts 调用） ----

export async function refreshOAuthToken(
  apiBase: string,
  refreshToken: string,
  clientId: string
): Promise<Pick<OAuthTokens, "accessToken" | "refreshToken" | "expiresAt">> {
  const endpoints = await resolveEndpoints(apiBase);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token 刷新失败 HTTP ${res.status}：${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("Token 刷新响应中缺少 access_token");
  }
  const expiresAt = data.expires_in
    ? Math.floor(Date.now() / 1000) + data.expires_in - 30
    : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // 若服务端未返回新的则复用旧的
    expiresAt,
  };
}

// ---- 撤销 token ----

export async function revokeToken(
  apiBase: string,
  token: string
): Promise<void> {
  const endpoints = await resolveEndpoints(apiBase);
  const body = new URLSearchParams({ token });
  await fetch(endpoints.revoke, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    /* 撤销失败不影响本地退出 */
  });
}

// ---- 完整登录流程 ----

export async function loginWithOAuth(
  apiBase = DEFAULT_BASE
): Promise<OAuthTokens> {
  const endpoints = await resolveEndpoints(apiBase);

  // 1. 启动本地回调服务器，拿到随机端口
  const cbServer = await createCallbackServer();
  const redirectUri = `http://127.0.0.1:${cbServer.port}/callback`;

  // 2. 动态注册 OAuth 客户端
  process.stderr.write("正在注册客户端…\n");
  const clientId = await registerDynamicClient(endpoints.register, redirectUri);

  // 3. 生成 PKCE 和 state
  const pkce = generatePkce();
  const state = randomBytes(16).toString("hex");

  // 4. 构造授权 URL
  const authUrl = new URL(endpoints.authorization);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "58pic:search 58pic:generate 58pic:download 58pic:credits:read"
  );
  authUrl.searchParams.set("code_challenge", pkce.challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  // 5. 打开浏览器
  const urlStr = authUrl.toString();
  process.stderr.write(`\n正在打开浏览器进行授权…\n`);
  process.stderr.write(`若浏览器未自动打开，请手动访问：\n${urlStr}\n\n`);
  openBrowser(urlStr);

  // 6. 等待用户在浏览器中完成授权
  process.stderr.write("等待授权完成（2 分钟超时）…\n");
  const code = await cbServer.waitForCode(state);

  // 7. 用 code 换 token
  process.stderr.write("正在获取 token…\n");
  const tokens = await exchangeCode(
    endpoints.token,
    code,
    clientId,
    redirectUri,
    pkce.verifier
  );

  // 8. 持久化
  await saveConfig({ oauth: tokens });

  return tokens;
}
