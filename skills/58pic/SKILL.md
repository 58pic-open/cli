---
name: 58pic
description: >-
  千图（58pic）AI 开放平台 CLI：素材搜索、目录、模型列表、按 pid 下载信息、做同款任务、
  智能设计行业 Agent（电商套图 / 详情页 / 海报 / 品牌 / 社媒 / PPT）、MiniApp 风格玩法。
  在用户提到千图/58pic 搜索、生图、文生图、做同款、PID、下载素材、智能设计、电商设计、商品套图、
  风格玩法、MiniApp 时使用；首次使用需完成 config / API Key。
  若无 API Key，引导用户至千图 AI 开放平台页面获取。
---

# 58pic-cli（[千图 AI 开放平台](https://ai.58pic.com/history?openHistory=1&historyType=5)）

本 Skill 与仓库根目录 **README.md** 保持一致；**实际请求由终端中的 `58pic` 命令发出**，Agent 应通过 **执行 shell 命令** 调用，而不是在对话里伪造 HTTP。

## Agent Skills 安装

使用开源 [**skills** CLI](https://github.com/vercel-labs/skills)（`npx skills`）将仓库内 `skills/` 安装到 Cursor、Claude Code、Codex 等 Agent 目录：

```bash
npm install -g @58pic/cli
npx skills add 58pic-open/cli -y -g
```

查看本仓库提供的 Skill 列表（不安装）：`npx skills add 58pic-open/cli --list`  
仅安装本 Skill：`npx skills add 58pic-open/cli --skill 58pic -y -g`  
亦可使用完整仓库地址 `https://github.com/58pic-open/cli`。

**须先安装 `58pic` 可执行文件**（`npm install -g @58pic/cli` 或 `npm install -g github:58pic-open/cli`）；Skill 不会替代 CLI，只指导 Agent 如何调用命令行。

[千图 AI 开放平台](https://ai.58pic.com/history?openHistory=1&historyType=5) 使用 **API Key** 认证，无 OAuth 浏览器流程。CLI 提供 `config init`、`auth status`、`dry-run` 等常用能力。

### 缺少 API Key 时（Agent 必提醒用户）

若 `58pic auth status` 显示未配置、或命令报错提示缺少 API Key：**不要猜测或编造 Key**。

**获取 API Key（须先登录）：** [千图 AI 开放平台](https://ai.58pic.com/history?openHistory=1&historyType=5)

用户取得 Key 后，再执行 `58pic config init --api-key "<用户的 Key>"`（或交互式 `58pic config init`）。勿把 Key 写入可被提交的仓库。

## 调用方式（Agent 必做）

1. 确认已安装：`58pic --help`（失败则按 README 执行 `npm install -g @58pic/cli` 或 `github:58pic-open/cli`）。
2. 确认凭证：`58pic auth status`；**若无 Key，必须先按上文「缺少 API Key 时」引导用户获取**，再 `58pic config init --api-key "<key>"`（勿把 Key 写入可被提交的仓库）。
3. 自动化解析响应时加 **`--format json`**。
4. 可能扣点的接口（下载、做同款等）先用 **`58pic dry-run …`** 或提醒用户确认。

## 常用命令

| 场景 | 命令 |
|------|------|
| 关键词搜索 | `58pic search "关键词" --format json` |
| AI 向量搜索 | `58pic search --ai --format json` |
| 分类目录 | `58pic catalog --format json` |
| 模型列表 | `58pic models --format json` |
| 按 pid 拉取下载信息 | `58pic download <pid> --format json` |
| 生图 / 文生图 / 做同款 | `58pic same-style --help`（需 `-m/--model`；文生图无需垫图，用 `--prompt` 或命令末尾描述词；复杂 body 用 `--body-file`） |
| 任务状态 | `58pic same-style-status <ai_id> --format json` |
| 智能设计行业 Agent 目录 | `58pic agent list --format json` |
| 智能设计发起（扣点） | `58pic agent run "<需求>" -a <agent_key> --mode "<子模式>" -p 参数=值 -i <图URL> --format json` |
| 智能设计查询 | `58pic agent status <session_id> --format json` |
| 回答 Agent 追问 / 改稿（扣点） | `58pic agent reply <session_id> "<回答>" --format json` |
| MiniApp 列表 / 详情 | `58pic miniapp list -k <关键词> --format json`、`58pic miniapp get <miniapp_id> --format json` |
| MiniApp 运行（扣点） | `58pic miniapp run <miniapp_id> "<提示词>" --reference-url <图URL> --format json`，再 `same-style-status <ai_id>` |
| 未封装路由 | `58pic api <route> --body '{...}'` 或 `--body-file` |

### 智能设计 / MiniApp 要点

- `agent run` 先 `agent list` 选 `agent_key` 与 `second_modes[].name`；`-p` 的 select / multi_select 值只能取 `options`；需求文本写在选项前面。
- 返回 `status`：`running` → 隔 20~30 秒 `agent status`；`awaiting_user` → 把 `ask_user` 原样转述给用户，拿到回答再 `agent reply`；`succeeded` → `images` 为成图。`running` 时不要重新 `agent run`（会重复扣点）。
- `miniapp get` 的 `needs_reference_image=true` 时必须给参考图；`prompt_template` 里的 `{槽位}` 替换为用户内容后作为提示词。

凭证优先级与环境变量 **`58PIC_API_KEY`**、**`58PIC_BASE_URL`** 见 README（注意 bash/zsh 无法 `export` 以数字开头的变量名，本地优先配置文件或 `--api-key`）。

## 安全

API Key 等同账号能力：限制暴露范围，勿在不可信环境明文传递；自动化调用可能扣点的接口前须让用户知情或确认。
