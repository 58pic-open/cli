/**
 * 千图智能设计 Agent（design-agent.58pic.com）客户端。
 *
 * 一轮：open-platform/same-style（model=4719, generate_mode=1）建平台任务 →
 *      首轮 POST /api/conversations 建会话 → POST /api/chat/stream（detach=true，可带 mode_key）。
 * CLI 等到 --wait 秒后断开；detach 让 Agent 在后台继续，之后用 `58pic agent status` 查询。
 */

import { pic58Request } from "./client.js";

export const DEFAULT_DESIGN_AGENT_BASE = "https://design-agent.58pic.com";
export const SMART_DESIGN_MODEL_ID = 4719;
export const GENERAL_DESIGN_AGENT_KEY = "omni";

export type DesignAgentParam = {
  key: string;
  type?: string;
  required?: boolean;
  options?: string[];
};
export type DesignAgentMode = { name: string; params: DesignAgentParam[]; placeholder_prompt?: string };
export type DesignAgent = { key: string; name: string; subtitle?: string; second_modes?: DesignAgentMode[] };

export type AgentCtx = { apiKey: string; baseUrl: string; agentBaseUrl: string };

function base(url: string): string {
  return url.replace(/\/+$/, "");
}

function headers(ctx: AgentCtx, extra: Record<string, string> = {}): Headers {
  const h = new Headers(extra);
  h.set("Authorization", `Bearer ${ctx.apiKey}`);
  return h;
}

async function getJson(ctx: AgentCtx, path: string): Promise<{ http: number; body: Record<string, unknown> }> {
  const res = await fetch(`${base(ctx.agentBaseUrl)}${path}`, { headers: headers(ctx, { Accept: "application/json" }) });
  const text = await res.text();
  try {
    return { http: res.status, body: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { http: res.status, body: { raw: text } };
  }
}

export async function listDesignAgents(ctx: AgentCtx): Promise<{ http: number; body: Record<string, unknown> }> {
  return getJson(ctx, "/api/design-agents");
}

/** 与站点 composeDesignAgentMessage 同格式 */
export function composeMessage(
  agent: DesignAgent,
  mode: DesignAgentMode,
  values: Record<string, string | string[]>,
  extra: string
): string {
  const lines = [`请按「${agent.name} · ${mode.name}」帮我设计。`];
  for (const p of mode.params ?? []) {
    const v = values[p.key];
    const text = Array.isArray(v) ? v.filter(Boolean).join("、") : String(v ?? "").trim();
    if (text) lines.push(`${p.key}：${text}`);
  }
  if (extra.trim()) lines.push(extra.trim());
  return lines.join("\n");
}

export async function submitTask(ctx: AgentCtx, prompt: string): Promise<{ aiId: string; aiAppId: string }> {
  const { http, body } = await pic58Request(ctx, "same-style", {
    method: "POST",
    jsonBody: {
      media_type: "image",
      model: SMART_DESIGN_MODEL_ID,
      generate_mode: 1,
      generate_nums: 1,
      ai_title: prompt.slice(0, 1000),
      prompt: prompt.slice(0, 1000),
    },
  });
  const b = body as { code?: number; msg?: string; data?: unknown };
  if (http < 200 || http >= 300 || (b.code !== 200 && b.code !== 1)) {
    throw new Error(`提交智能设计任务失败（HTTP ${http}）：${b.msg ?? JSON.stringify(body).slice(0, 200)}`);
  }
  const d = (Array.isArray(b.data) ? b.data[0] : b.data) as Record<string, unknown> | undefined;
  const aiId = String(d?.ai_id ?? d?.aiId ?? "");
  if (!aiId) throw new Error("same-style 未返回 ai_id");
  return { aiId, aiAppId: String(d?.task_id ?? "") };
}

export async function createSession(ctx: AgentCtx, title: string, aiId: string, aiAppId: string): Promise<string> {
  const res = await fetch(`${base(ctx.agentBaseUrl)}/api/conversations`, {
    method: "POST",
    headers: headers(ctx, { "Content-Type": "application/json" }),
    body: JSON.stringify({ title: title.slice(0, 100), ai_id: aiId, ...(aiAppId ? { ai_app_id: aiAppId } : {}) }),
  });
  const j = (await res.json().catch(() => ({}))) as { session_id?: string; detail?: unknown };
  if (!res.ok || !j.session_id) throw new Error(`创建会话失败（HTTP ${res.status}）：${JSON.stringify(j).slice(0, 200)}`);
  return j.session_id;
}

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

function collectImages(ev: Record<string, unknown>, out: string[]): void {
  const push = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//.test(v)) out.push(v);
  };
  const list = (v: unknown) => (Array.isArray(v) ? v.forEach(push) : push(v));
  list(ev.image_urls);
  for (const k of ["result", "output_data"]) {
    const r = ev[k] as Record<string, unknown> | undefined;
    if (r && typeof r === "object") {
      list(r.image_urls);
      push(r.image_url);
    }
  }
}

export async function streamTurn(
  ctx: AgentCtx,
  input: { sessionId: string; aiId: string; aiAppId: string; message: string; modeKey?: string; imageUrls?: string[]; waitSec: number },
  onEvent?: (line: string) => void
): Promise<TurnResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), input.waitSec * 1000);
  const r: TurnResult = { session_id: input.sessionId, task_id: input.aiId, status: "running", images: [] };
  try {
    const res = await fetch(`${base(ctx.agentBaseUrl)}/api/chat/stream`, {
      method: "POST",
      headers: headers(ctx, { "Content-Type": "application/json", Accept: "text/event-stream" }),
      body: JSON.stringify({
        session_id: input.sessionId,
        message: input.message,
        ai_id: input.aiId,
        ...(input.aiAppId ? { ai_app_id: input.aiAppId } : {}),
        ...(input.modeKey ? { mode_key: input.modeKey } : {}),
        ...(input.imageUrls?.length ? { image_urls: input.imageUrls } : {}),
        detach: true,
      }),
      signal: ac.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Agent 流 HTTP ${res.status}：${(await res.text().catch(() => "")).slice(0, 200)}`);
    }
    if ((res.headers.get("content-type") ?? "").includes("application/json")) {
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ...r, queued: j.queued === true, agent_message: String(j.msg ?? "") };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(line.slice(6)) as Record<string, unknown>;
        } catch {
          continue;
        }
        const t = String(ev.type ?? "");
        if (t === "agent_thinking") onEvent?.(`… ${String(ev.content ?? "").slice(0, 60)}`);
        else if (t === "tool_start") onEvent?.(`▶ ${String(ev.tool_name_cn ?? ev.tool_name ?? "")}`);
        else if (t === "tool_complete" || t === "sub_agent_tool_complete") {
          if (ev.tool_name === "ask_user_options") r.ask_user = ev.result ?? ev.metadata;
          else collectImages(ev, r.images);
        } else if (t === "agent_message" && typeof ev.content === "string" && ev.content) r.agent_message = ev.content;
        else if (t === "suggested_actions" && Array.isArray(ev.actions)) {
          r.suggested_actions = ev.actions.map((a) => (typeof a === "string" ? a : String((a as Record<string, unknown>)?.label ?? ""))).filter(Boolean);
        } else if (t === "error") {
          r.status = "failed";
          r.error = String(ev.message ?? ev.error ?? "Agent 返回错误");
          break outer;
        } else if (t === "end") {
          if (ev.error) {
            r.status = "failed";
            r.error = String(ev.error);
          } else {
            r.status = String(ev.reason ?? "").startsWith("awaiting_user") || r.ask_user ? "awaiting_user" : "succeeded";
          }
          break outer;
        }
      }
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") throw e;
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
  r.images = [...new Set(r.images)];
  return r;
}

/** 状态取 run-status（history 会把助手消息统一改写为 completed），内容取 history 最新一轮 */
export async function turnStatus(ctx: AgentCtx, sessionId: string): Promise<TurnResult> {
  const sid = encodeURIComponent(sessionId);
  const [rs, hist] = await Promise.all([
    getJson(ctx, `/api/conversations/${sid}/run-status`),
    getJson(ctx, `/api/conversations/${sid}/history?page=1&page_size=4&order_by=${encodeURIComponent("created_at DESC")}`),
  ]);
  if (rs.http === 404 || hist.http === 404) throw new Error(`会话不存在或无权访问：${sessionId}`);
  if (rs.http >= 400) throw new Error(`查询运行状态失败 HTTP ${rs.http}：${JSON.stringify(rs.body).slice(0, 200)}`);
  const items = (Array.isArray(hist.body.history) ? hist.body.history : []) as Array<Record<string, unknown>>;
  const tid = String(rs.body.latest_turn_id ?? "");
  const latest =
    (tid && items.find((i) => String(i.turn_id ?? "") === tid)) ||
    [...items].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
  const r: TurnResult = { session_id: sessionId, status: "running", images: [] };
  if (latest) {
    for (const img of Array.isArray(latest.images) ? latest.images : []) {
      const u = typeof img === "string" ? img : String((img as Record<string, unknown>)?.image_url ?? "");
      if (/^https?:\/\//.test(u)) r.images.push(u);
    }
    for (const tc of [...(Array.isArray(latest.tool_calls) ? latest.tool_calls : []), ...(Array.isArray(latest.events) ? latest.events : [])]) {
      const t = tc as Record<string, unknown>;
      if (t.tool_name === "ask_user_options") r.ask_user = t.result ?? t.metadata;
      else collectImages(t, r.images);
    }
    r.images = [...new Set(r.images)];
    r.agent_message = String(latest.assistant_response ?? "") || undefined;
  }
  const raw = String(rs.body.latest_status ?? "").toLowerCase();
  if (rs.body.running === true || raw === "processing") r.status = "running";
  else if (["cancelled", "interrupted", "failed", "error"].includes(raw)) {
    r.status = "failed";
    r.error = String(rs.body.interrupt_reason ?? raw);
  } else if (raw || r.agent_message || r.images.length) r.status = r.ask_user ? "awaiting_user" : "succeeded";
  return r;
}
