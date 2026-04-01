#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  maskKey,
  configPath,
  DEFAULT_BASE,
  type Pic58Config,
} from "./config.js";
import { pic58Request, resolveCredentials, routeUrl } from "./client.js";
import { printEnvelope, type OutputFormat } from "./output.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string; name: string };

function addGlobalOpts(cmd: Command): Command {
  return cmd
    .option("--api-key <key>", "API Key（或环境变量 58PIC_API_KEY）")
    .option("--base-url <url>", `API 根地址，默认 ${DEFAULT_BASE}`)
    .option(
      "-f, --format <fmt>",
      "输出：json | pretty | table",
      "pretty"
    ) as Command;
}

function fmtOf(s: string): OutputFormat {
  if (s === "json" || s === "pretty" || s === "table") return s;
  return "pretty";
}

async function getCtx(
  opts: { apiKey?: string; baseUrl?: string },
  file: Pic58Config
) {
  return resolveCredentials(opts, file);
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("58pic")
    .description("千图 AI 开放平台 CLI（分层：配置 / 快捷命令 / 通用 api 调用）")
    .version(pkg.version);

  const configCmd = program
    .command("config")
    .description("本地凭证与 Base URL");

  configCmd
    .command("init")
    .description("交互式写入 ~/.config/58pic/config.json（或 XDG_CONFIG_HOME）")
    .option("--api-key <key>", "非交互：直接写入 Key")
    .option("--base-url <url>", `默认 ${DEFAULT_BASE}`)
    .action(async (o: { apiKey?: string; baseUrl?: string }) => {
      let apiKey = o.apiKey;
      let baseUrl = o.baseUrl ?? DEFAULT_BASE;
      if (!apiKey) {
        const rl = createInterface({ input, output });
        const k = await rl.question("API Key: ");
        apiKey = k.trim();
        const b = await rl.question(`Base URL [${DEFAULT_BASE}]: `);
        if (b.trim()) baseUrl = b.trim();
        rl.close();
      }
      if (!apiKey) {
        console.error("未提供 API Key");
        process.exitCode = 1;
        return;
      }
      await saveConfig({ apiKey, baseUrl });
      console.error(`已写入 ${configPath()}`);
    });

  configCmd
    .command("show")
    .description("查看当前配置文件中的 Key（脱敏）与 Base URL")
    .action(async () => {
      const c = await loadConfig();
      console.log(
        JSON.stringify(
          {
            configPath: configPath(),
            apiKey: maskKey(c.apiKey),
            baseUrl: c.baseUrl ?? DEFAULT_BASE,
          },
          null,
          2
        )
      );
    });

  program
    .command("auth")
    .description("别名：查看配置与凭证状态（类似常见 CLI 的 auth status）")
    .command("status")
    .description("等价于 58pic config show")
    .action(async () => {
      const c = await loadConfig();
      const has = Boolean(
        c.apiKey ?? process.env["58PIC_API_KEY"]
      );
      console.log(
        JSON.stringify(
          {
            loggedIn: has,
            apiKey: maskKey(
              c.apiKey ?? process.env["58PIC_API_KEY"]
            ),
            baseUrl: c.baseUrl ?? process.env["58PIC_BASE_URL"] ?? DEFAULT_BASE,
            configPath: configPath(),
          },
          null,
          2
        )
      );
    });

  const search = program
    .command("search")
    .description("快捷：POST open-platform/search-images")
    .argument("[keyword]", "关键词（非 AI 搜索时必填）");
  addGlobalOpts(search);
  search
    .option("-p, --page <n>", "页码 1-100", "1")
    .option("--did <n>", "一级分类 did，0 不限", "0")
    .option("--kid <n>", "兼容 kid，默认 0", "0")
    .option("--ai", "AI 向量搜索", false)
    .action(
      async (
        keyword: string | undefined,
        opts: {
          apiKey?: string;
          baseUrl?: string;
          format: string;
          page: string;
          did: string;
          kid: string;
          ai: boolean;
        }
      ) => {
        const file = await loadConfig();
        const ctx = await getCtx(opts, file);
        if (!opts.ai && (!keyword || !keyword.trim())) {
          console.error("非 AI 搜索请提供关键词，或使用 --ai 做向量搜索");
          process.exitCode = 1;
          return;
        }
        const { http, body } = await pic58Request(ctx, "search-images", {
          method: "POST",
          jsonBody: {
            keyword: keyword ?? "",
            page: Number(opts.page) || 1,
            did: Number(opts.did) || 0,
            kid: Number(opts.kid) || 0,
            ai_search: Boolean(opts.ai),
          },
        });
        printEnvelope(fmtOf(opts.format), http, body, true);
      }
    );

  const catalog = program
    .command("catalog")
    .description("快捷：GET/POST open-platform/search-catalog");
  addGlobalOpts(catalog);
  catalog.action(
    async (opts: { apiKey?: string; baseUrl?: string; format: string }) => {
      const file = await loadConfig();
      const ctx = await getCtx(opts, file);
      const { http, body } = await pic58Request(ctx, "search-catalog", {
        method: "GET",
      });
      printEnvelope(fmtOf(opts.format), http, body, true);
    }
  );

  const models = program
    .command("models")
    .description("快捷：open-platform/available-models");
  addGlobalOpts(models);
  models.action(
    async (opts: { apiKey?: string; baseUrl?: string; format: string }) => {
      const file = await loadConfig();
      const ctx = await getCtx(opts, file);
      const { http, body } = await pic58Request(ctx, "available-models", {
        method: "GET",
      });
      printEnvelope(fmtOf(opts.format), http, body, true);
    }
  );

  const download = program
    .command("download")
    .description("快捷：按 pid 获取预览与下载临时链（扣点）")
    .argument("<pid>", "素材 pid");
  addGlobalOpts(download);
  download.action(
    async (
      pid: string,
      opts: { apiKey?: string; baseUrl?: string; format: string }
    ) => {
      const file = await loadConfig();
      const ctx = await getCtx(opts, file);
      const url = `${routeUrl(ctx.baseUrl, "image-download")}&pid=${encodeURIComponent(pid)}`;
      const headers = new Headers();
      headers.set("Authorization", `Bearer ${ctx.apiKey}`);
      const res = await fetch(url, { headers });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      printEnvelope(fmtOf(opts.format), res.status, parsed, true);
    }
  );

  const sameStyle = program
    .command("same-style")
    .description("快捷：提交做同款任务（复杂参数请用 --body-file）");
  addGlobalOpts(sameStyle);
  sameStyle
    .requiredOption("-m, --model <id>", "模型 ID（可先 58pic models）")
    .option("--reference-url <url>", "单张垫图 URL")
    .option("--picid <pid>", "素材 pid（可选）")
    .option("--prompt <text>", "描述词 / ai_title")
    .option("--nums <n>", "生成张数 1-16", "1")
    .option(
      "--body-file <path>",
      "JSON 文件，若指定则与其它体字段合并（文件优先覆盖同名键）"
    )
    .action(
      async (opts: {
        apiKey?: string;
        baseUrl?: string;
        format: string;
        model: string;
        referenceUrl?: string;
        picid?: string;
        prompt?: string;
        nums: string;
        bodyFile?: string;
      }) => {
        const file = await loadConfig();
        const ctx = await getCtx(opts, file);
        let extra: Record<string, unknown> = {};
        if (opts.bodyFile) {
          const raw = await readFile(opts.bodyFile, "utf8");
          extra = JSON.parse(raw) as Record<string, unknown>;
        }
        const body: Record<string, unknown> = {
          media_type: "image",
          model: /^\d+$/.test(opts.model) ? Number(opts.model) : opts.model,
          generate_nums: Number(opts.nums) || 1,
        };
        Object.assign(body, extra);
        if (opts.referenceUrl) body.reference_image_url = opts.referenceUrl;
        if (opts.picid) body.picid = opts.picid;
        if (opts.prompt) {
          body.ai_title = opts.prompt;
          body.prompt = opts.prompt;
        }
        const { http, body: resp } = await pic58Request(ctx, "same-style", {
          method: "POST",
          jsonBody: body,
        });
        printEnvelope(fmtOf(opts.format), http, resp, true);
      }
    );

  const status = program
    .command("same-style-status")
    .description("快捷：查询做同款任务状态")
    .argument("<ai_id>", "任务 ai_id");
  addGlobalOpts(status);
  status.action(
    async (
      aiId: string,
      opts: { apiKey?: string; baseUrl?: string; format: string }
    ) => {
      const file = await loadConfig();
      const ctx = await getCtx(opts, file);
      const url = `${routeUrl(ctx.baseUrl, "same-style-status")}&ai_id=${encodeURIComponent(aiId)}`;
      const headers = new Headers();
      headers.set("Authorization", `Bearer ${ctx.apiKey}`);
      const res = await fetch(url, { headers });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      printEnvelope(fmtOf(opts.format), res.status, parsed, true);
    }
  );

  const apiCmd = program
    .command("api")
    .description(
      "通用调用：指定路由名（含或不含 open-platform/ 前缀）与 JSON 请求体"
    )
    .argument("<route>", "例如 search-images 或 open-platform/search-images")
    .option("-X, --method <m>", "HTTP 方法", "POST")
    .option("--body <json>", "请求 JSON 字符串")
    .option("--body-file <path>", "从文件读 JSON");
  addGlobalOpts(apiCmd);
  apiCmd.action(
    async (
      route: string,
      opts: {
        apiKey?: string;
        baseUrl?: string;
        format: string;
        method: string;
        body?: string;
        bodyFile?: string;
      }
    ) => {
      const file = await loadConfig();
      const ctx = await getCtx(opts, file);
      const method = opts.method.toUpperCase();
      let jsonBody: unknown = undefined;
      if (opts.bodyFile) {
        jsonBody = JSON.parse(await readFile(opts.bodyFile, "utf8"));
      } else if (opts.body) {
        jsonBody = JSON.parse(opts.body);
      }
      const r = route.replace(/^open-platform\//, "");
      if (method === "GET" || method === "HEAD") {
        const u = new URL(routeUrl(ctx.baseUrl, r));
        if (jsonBody && typeof jsonBody === "object") {
          for (const [k, v] of Object.entries(
            jsonBody as Record<string, string>
          )) {
            u.searchParams.set(k, String(v));
          }
        }
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${ctx.apiKey}`);
        const res = await fetch(u, { method, headers });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        printEnvelope(fmtOf(opts.format), res.status, parsed, true);
        return;
      }
      const { http, body } = await pic58Request(ctx, r, {
        method,
        jsonBody,
      });
      printEnvelope(fmtOf(opts.format), http, body, true);
    }
  );

  program
    .command("dry-run")
    .description("仅打印将要请求的 URL 与 Method（不发起网络请求）")
    .argument("<route>", "路由片段，如 search-images")
    .option("-X, --method <m>", "HTTP 方法", "POST")
    .option("--base-url <url>", `默认 ${DEFAULT_BASE}`, DEFAULT_BASE)
    .action((route: string, o: { method: string; baseUrl: string }) => {
      const url = routeUrl(o.baseUrl ?? DEFAULT_BASE, route);
      console.log(
        JSON.stringify({ method: o.method.toUpperCase(), url }, null, 2)
      );
    });

  await program.parseAsync(process.argv);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
