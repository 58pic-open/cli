# 58pic-cli（@58pic/cli）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#english) | 中文

面向 [千图 AI 开放平台](https://ai.58pic.com/) 的命令行工具：本地配置、常用接口快捷命令、通用 `api` 透传。设计风格参考官方 [Lark/Feishu CLI（larksuite/cli）](https://github.com/larksuite/cli) 的分层与使用习惯（如 `config init`、`auth status`、输出格式、dry-run）。

## 为什么用 58pic-cli？

- **分层清晰** — 配置一次后，优先用快捷命令；未封装的接口走 `58pic api`。
- **Agent 友好** — `--format json` 便于管道与脚本；`dry-run` 可预览 URL。
- **凭证灵活** — 配置文件、环境变量、命令行参数优先级明确。
- **MIT** — 与上游开放能力条款以千图平台为准。

## 功能一览

| 领域 | 能力 |
|------|------|
| 配置 | 交互/非交互写入配置、脱敏查看、对齐 `auth status` |
| 搜索 | 关键词搜索、AI 向量搜索、分页与分类参数 |
| 目录 | 素材分类目录 `search-catalog` |
| 模型 | 可用模型列表 `available-models` |
| 下载 | 按 `pid` 取预览与下载临时链（涉及扣点，以平台规则为准） |
| 做同款 | 提交任务、查询状态；复杂 body 可用 `--body-file` |
| 通用 | 任意 `open-platform/` 路由 + JSON 体或 GET 查询参数 |

## 环境要求

- **Node.js** ≥ 18（内置 `fetch`）

## 安装

```bash
# 在仓库内开发
npm install
npm run build

# 全局链接（可选）
npm link
```

发布后也可：

```bash
npm install -g @58pic/cli
```

全局安装后命令名为 **`58pic`**（亦注册 `58pic-cli`，见 `package.json` 的 `bin`）。

## 快速开始

### 1. 配置凭证（一次性）

交互式写入 `~/.config/58pic/config.json`（或 `XDG_CONFIG_HOME/58pic/config.json`）：

```bash
58pic config init
```

非交互：

```bash
58pic config init --api-key "<你的 API Key>"
# 可选
58pic config init --api-key "<key>" --base-url "https://ai.58pic.com/api"
```

默认 **Base URL** 为 `https://ai.58pic.com/api`，一般无需修改。

### 2. 查看状态（对齐 lark-cli 习惯）

```bash
58pic auth status
# 等价信息也可：
58pic config show
```

### 3. 调用接口

```bash
# 关键词搜索
58pic search "海报"

# AI 向量搜索（无关键词时使用 --ai）
58pic search --ai

# 分类目录
58pic catalog

# 模型列表
58pic models

# 按 pid 下载信息（临时链等，以接口返回为准）
58pic download <pid>
```

## 认证与凭证优先级

API Key 解析顺序（后者覆盖前者）：

1. 命令行 `--api-key`
2. 环境变量 `58pic_API_KEY` 或 `58PIC_API_KEY`
3. 配置文件中的 `apiKey`

Base URL 解析顺序：

1. `--base-url`
2. `58pic_BASE_URL`
3. 配置文件 `baseUrl`
4. 默认 `https://ai.58pic.com/api`

## 三层命令体系（对照 lark-cli 思路）

### 1. 快捷命令（常用 Open API）

| 命令 | 说明 |
|------|------|
| `58pic search [keyword]` | `POST` `open-platform/search-images`，支持 `--page`、`--did`、`--kid`、`--ai` |
| `58pic catalog` | `open-platform/search-catalog` |
| `58pic models` | `open-platform/available-models` |
| `58pic download <pid>` | `open-platform/image-download`（查询参数 `pid`） |
| `58pic same-style` | `POST` `open-platform/same-style`，需 `-m/--model`，可选垫图、pid、提示词、`--body-file` |
| `58pic same-style-status <ai_id>` | `open-platform/same-style-status` |

查看某命令参数：

```bash
58pic search --help
58pic same-style --help
```

### 2. 通用 `api`（未封装路由）

指定 **路由片段**（可写 `search-images` 或 `open-platform/search-images`，会自动规范为 `open-platform/...`），以及 JSON 请求体或 GET 查询对象。

```bash
# POST + JSON 字符串
58pic api search-images --body '{"keyword":"咖啡","page":1,"did":0,"kid":0,"ai_search":false}'

# POST + 文件
58pic api same-style --body-file ./payload.json

# GET：将 JSON 对象的键值展开为 query（用于支持 GET 的路由）
58pic api some-route -X GET --body '{"foo":"bar"}'
```

### 3. `dry-run`（不发起请求）

仅打印将要请求的 **Method** 与完整 **URL**（含 `?r=open-platform/...`）：

```bash
58pic dry-run search-images -X POST
```

## 高级用法

### 输出格式

全局选项（适用于多数子命令）：

| 值 | 行为 |
|----|------|
| `--format json` | 单行 JSON；`api`/快捷命令在封装层会输出 `{ http, body }` |
| `--format pretty` | 缩进 JSON |
| `--format table` | 当业务 `code === 200` 且 `data` 含 `list` 数组时，打印 `pid` 与标题简表；否则回退为 JSON |

### 请求 URL 形式

客户端将请求发至：`{baseUrl}/?r=open-platform/<route>`，Header：`Authorization: Bearer <apiKey>`。与 lark-cli 的「按服务拆分命令」不同，本项目与千图开放平台当前路由约定一致。

## 开发

```bash
npm run dev -- --help          # 直接跑 ts
npm run build                  # 编译到 dist/
```

## 安全提示

- **API Key** 等同于账号能力，勿提交到仓库；优先用环境变量或本地配置文件权限控制。
- **下载 / 做同款** 等接口可能产生扣点或计费，请在正式环境前阅读千图开放平台说明并在测试 Key 上验证。
- 将 CLI 交给 AI Agent 使用时，请参考 [lark-cli 安全与风险说明](https://github.com/larksuite/cli#security--risk-warnings-read-before-use) 的思路：限制授权范围、勿在不可信环境暴露 Key。

## 开源协议

MIT。调用千图开放平台接口时，须遵守平台用户协议、隐私政策及开放能力相关约定。

---

## English

**58pic-cli** is a CLI for the Qiantu (58pic) AI Open Platform: `config` / shortcut commands / generic `api` calls. Layering and conventions (e.g. `config init`, `auth status`, `--format`, `dry-run`) are inspired by the official [larksuite/cli](https://github.com/larksuite/cli).

**Install:** Node ≥ 18, `npm install && npm run build`, then use the `58pic` binary.

**Credentials:** `--api-key` → `58pic_API_KEY` / `58PIC_API_KEY` → config file `apiKey`. Base URL: `--base-url` → `58pic_BASE_URL` → config → default `https://ai.58pic.com/api`.

**Quick examples:** `58pic config init`, `58pic auth status`, `58pic search "keyword"`, `58pic api <route> --body '{}'`.

See the Chinese section above for the full command table and options.
