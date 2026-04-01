# 58pic-cli（@58pic/cli）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#english) | 中文

面向 [千图 AI 开放平台](https://ai.58pic.com/) 的命令行工具：本地配置、常用接口快捷命令、通用 `api` 透传。支持 `config init`、`auth status`、`--format`、`dry-run` 等与常见开放平台 CLI 相近的用法。**Agent Skills** 通过开源 [**skills** CLI](https://github.com/vercel-labs/skills)（`npx skills add …`）从本仓库 `skills/` 安装到 Cursor、Claude Code 等，步骤见下文 [安装](#安装) 中的 **CLI 与 Agent Skills 配套安装**。

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

## 快速开始（人类用户）

> **前提：** 本机已能运行 `58pic` 命令。若尚未安装，请先完成下文 [安装](#安装)。

### 1. 配置凭证（一次性）

交互式写入 `~/.config/58pic/config.json`（或 `XDG_CONFIG_HOME/58pic/config.json`）：

> 若你曾使用旧版 `pic58` 命令，配置在 `~/.config/pic58/`，可手动把该目录改名为 `58pic`，或重新执行 `58pic config init`。

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

### 2. 查看状态

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

## 快速开始（AI Agent）

以下步骤面向 AI Agent（Cursor、Claude Code 等）。千图开放平台使用 **API Key** 认证，**无**浏览器 OAuth；Key 若已配置好，可从「验证」一步开始。

> **给 AI 助手：** 先完成「CLI + Skills」两步安装，再配置 Key。详见下文 [安装](#安装) 中的 **CLI 与 Agent Skills 配套安装**。

**第 1 步 — 安装 CLI 与 Skills**

```bash
npm install -g github:58pic-open/cli
# 或（发布后）npm install -g @58pic/cli

npx skills add 58pic-open/cli -y -g
```

**第 2 步 — 配置凭证**

任选其一：

- 交互式（用户在终端完成）：`58pic config init`
- 非交互（适合脚本 / Agent 代跑）：用户已提供 Key 时执行  
  `58pic config init --api-key "<API Key>"`  
  或在支持任意名称的环境注入（Docker、Kubernetes、CI 等）中设置 `58PIC_API_KEY`（见下节；**bash/zsh 的 `export` 不能以数字开头命名变量**，本地终端请优先用配置文件或 `--api-key`）

**第 3 步 — 验证**

```bash
58pic auth status
```

**第 4 步 — 自动化调用习惯**

- 管道与解析：为子命令加 **`--format json`**（默认多为 JSON；显式写出可避免歧义）。
- 预览请求、避免误扣点：对等价 `api` 路由使用 **`58pic dry-run …`**（见下文）。
- 敏感信息：勿把 Key 写进可被提交的仓库；在不可信环境限制 Key 暴露范围，避免日志与截屏泄露。

### Agent Skills 说明

| 项目 | 说明 |
|------|------|
| **安装命令** | `npx skills add 58pic-open/cli -y -g`（见 [安装](#安装) 中的 **CLI 与 Agent Skills 配套安装**）。 |
| **Skill 源文件** | [`skills/58pic/SKILL.md`](skills/58pic/SKILL.md)，frontmatter 中 `name` 为 **`58pic`**（供 `npx skills add … --skill 58pic` 使用）。 |
| **运行时** | Agent 仍通过 **终端执行 `58pic …`** 调开放平台；Skill 只提供结构化指令，不替代 CLI 二进制。 |
| **离线 / 手动** | 若无法使用 `npx skills`，可将 `skills/58pic/` **复制或软链**到 Cursor 的 `.cursor/skills/`（或各 Agent 文档中的 skills 目录）。 |

## 安装

### 从 npm 注册表（发布后）

```bash
npm install -g @58pic/cli
```

### 从 GitHub 远程安装（无需先 `git clone`）

npm 会临时拉取仓库；**`dist/` 已随仓库提交**，安装时不再执行编译，仅需安装运行时依赖（如 `commander`）后链接全局命令：

```bash
# 任选其一（需本机已装 Git）
npm install -g github:58pic-open/cli
# 或
npm install -g https://github.com/58pic-open/cli.git
```

指定分支或 tag：

```bash
npm install -g github:58pic-open/cli#main
npm install -g github:58pic-open/cli#v0.1.0
```

不全局安装、单次使用（会临时拉仓库并 build，首次较慢）：

```bash
npx --package=github:58pic-open/cli 58pic --help
```

### 克隆仓库后本地开发

```bash
git clone https://github.com/58pic-open/cli.git && cd cli
npm install              # 开发依赖；改源码后需 npm run build 更新 dist/
npm run build            # 如需单独编译

# 全局链接（可选）
npm link
```

全局安装后命令名为 **`58pic`**（亦注册 **`58pic-cli`**，见 `package.json` 的 `bin`）。

### CLI 与 Agent Skills 配套安装

推荐顺序：**先全局安装 CLI，再用 `npx skills` 将本仓库中的 Skill 安装到 Agent 环境**。`npx skills` 由 [vercel-labs/skills](https://github.com/vercel-labs/skills) 提供。

```bash
# 1) 安装 CLI（任选一种来源，与本节上文「安装」一致）
npm install -g @58pic/cli
# 或
npm install -g github:58pic-open/cli

# 2) 安装 Agent Skills（建议与 CLI 一并完成）
npx skills add 58pic-open/cli -y -g
```

- **`-g`**：安装到用户级 Agent 目录（如 Cursor 的 `~/.cursor/skills/`）；去掉 `-g` 则默认装到**当前项目**（如 `./.agents/skills/`）。
- **`-y`**：非交互、跳过确认（适合脚本与 AI Agent 代跑）。
- Skill 源码在本仓库 [`skills/`](skills/) 下；发布到 npm 时 `skills/` 已列入 `package.json` 的 `files`，便于与 CLI 版本对照。

常用调试：

```bash
# 仅列出本仓库提供的 Skill，不安装
npx skills add 58pic-open/cli --list

# 只安装名为 58pic 的这一条（与 SKILL.md  frontmatter 中 name 一致）
npx skills add 58pic-open/cli --skill 58pic -y -g

# 指定 Agent（可多选），例如只装到 Cursor
npx skills add 58pic-open/cli --skill 58pic -y -g -a cursor
```

更多参数见 [skills  README](https://github.com/vercel-labs/skills#readme)（`--agent`、`--copy` 等）。

安装后若终端提示找不到 `58pic` / `58pic-cli`，见 [常见问题](#常见问题)。

## 常见问题

### 出现 `zsh: command not found: 58pic-cli`

说明 **npm 的全局 `bin` 目录不在当前 shell 的 `PATH` 里**（常见于 MxSrvs、自定义 Node 安装路径）。

1. **看全局前缀并把 `bin` 加进 PATH**（把输出路径拼上 `/bin`）：

   ```bash
   npm prefix -g
   ```

   在 `~/.zshrc` 里增加一行（按你机器上的实际路径改）：

   ```bash
   export PATH="$(npm prefix -g)/bin:$PATH"
   ```

   保存后执行 `source ~/.zshrc`，再试 `58pic --help`。

2. **仓库内开发**：先 `npm run build`，再在项目根目录执行（不依赖全局 PATH）：

   ```bash
   npm run cli -- --help
   # 或
   npm exec --package=. -- 58pic --help
   ```

3. **已执行过 `npm link` 仍找不到**：同样检查第 1 步；`which npm`、`which node` 应对应同一套安装，避免混用多套 Node。

### `npm install -g github:58pic-open/cli` 安装阶段报错（历史：`tsc` / code 127 / 254）

**当前版本**已将编译产物 **`dist/` 提交到仓库**，并**去掉**安装时的 `prepare` 编译步骤；从 GitHub 全局安装时不再需要本机 TypeScript，一般不再出现与 `tsc` 相关的错误。请先拉取**最新** `main` 再执行：

```bash
npm install -g github:58pic-open/cli
```

若仍失败：检查 Node ≥ 18、网络与 `npm` 缓存；可在克隆后的仓库内执行 `npm install && npm run build && npm link -g` 做本地链接，或换用官方 Node / nvm，避免混用多套 Node（如 MxSrvs 与 nvm 混用）。

## 认证与凭证优先级

API Key 解析顺序（后者覆盖前者）：

1. 命令行 `--api-key`
2. 环境变量 `58PIC_API_KEY`
3. 配置文件中的 `apiKey`

Base URL 解析顺序：

1. `--base-url`
2. `58PIC_BASE_URL`
3. 配置文件 `baseUrl`
4. 默认 `https://ai.58pic.com/api`

> **说明：** `58PIC_API_KEY`、`58PIC_BASE_URL` 在 Node 进程内可读；在交互式 shell 里无法使用 `export 58PIC_API_KEY=…`（非合法标识符）。本地开发请用 `58pic config init` / `--api-key`，CI 与容器可在编排里正常配置上述名称。

## 三层命令体系

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
58pic api search-images --body '{"keyword":"海报","page":1,"did":0,"kid":0,"ai_search":false}'

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

客户端将请求发至：`{baseUrl}/?r=open-platform/<route>`，Header：`Authorization: Bearer <apiKey>`。子命令按千图开放平台当前路由约定组织。

## 开发

```bash
npm run dev -- --help          # 直接跑 ts
npm run build                  # 编译到 dist/（提交前请把 dist 一并 commit，便于 github: 全局安装免编译）
```

发布到 npm 前 `prepublishOnly` 会执行 `npm run build`。

## 安全提示

- **API Key** 等同于账号能力，勿提交到仓库；优先用环境变量或本地配置文件权限控制。
- **下载 / 做同款** 等接口可能产生扣点或计费，请在正式环境前阅读千图开放平台说明并在测试 Key 上验证。
- 将 CLI 交给 AI Agent 使用时：限制 Key 与凭证可见范围，勿在不可信环境暴露；勿让自动化在未经确认时调用可能扣点的接口。

## 开源协议

MIT。调用千图开放平台接口时，须遵守平台用户协议、隐私政策及开放能力相关约定。

---

## English

**58pic-cli** is a CLI for the Qiantu (58pic) AI Open Platform: `config` / shortcut commands / generic `api` calls. Supports familiar patterns such as `config init`, `auth status`, `--format`, and `dry-run`.

**Install (CLI):** Node ≥ 18. From registry: `npm install -g @58pic/cli`. From GitHub: `npm install -g github:58pic-open/cli` (prebuilt `dist/` in repo; no compile at install). Local dev: `git clone`, `npm install`, `npm run build` after TS changes, use `58pic` (also `58pic-cli`).

**Install (Agent Skills):** use [vercel-labs/skills](https://github.com/vercel-labs/skills): `npx skills add 58pic-open/cli -y -g`. List only: `npx skills add 58pic-open/cli --list`. Single skill: `npx skills add 58pic-open/cli --skill 58pic -y -g`. Skills live under [`skills/`](skills/) in this repo and are included in the npm package `files` field.

**Credentials:** `--api-key` → `58PIC_API_KEY` → config file `apiKey`. Base URL: `--base-url` → `58PIC_BASE_URL` → config → default `https://ai.58pic.com/api`.

**Quick examples:** `58pic config init`, `58pic auth status`, `58pic search "keyword"`, `58pic api <route> --body '{}'`.

**Agents:** Install Skills with `npx skills add 58pic-open/cli -y -g`, then run **`58pic` in the terminal** as documented in [`skills/58pic/SKILL.md`](skills/58pic/SKILL.md).

**FAQ:** If you see `command not found: 58pic` / `58pic-cli`, add `$(npm prefix -g)/bin` to `PATH` (see the **常见问题** section in the Chinese part above).

See the Chinese section above for the full command table, Agent flow, and options.
