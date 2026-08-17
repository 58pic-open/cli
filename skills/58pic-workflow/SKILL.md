---
name: 58pic-workflow
description: >-
  Use the 58pic CLI to list, read, create, save, and run 千图工作流. Use for
  workflow canvas, nodes, edges, customeData, parentId, or group-node requests.
---

# 58pic 工作流 CLI

通过终端执行 `58pic workflow` 管理工作流；不要在对话中暴露 API Key。

## 初始化

```bash
58pic --version || npm install -g @58pic/cli
58pic auth status
```

未认证时，优先执行 `58pic auth login`；自动化可执行 `58pic config init --api-key sk_YOUR_API_KEY`。

## 命令

```bash
58pic workflow list --format json
58pic workflow get <workflow-id> --format json
58pic workflow create "新工作流" --canvas-file ./canvas.json --format json
58pic workflow save <workflow-id> --canvas-file ./canvas.json --format json
58pic workflow run <workflow-id> --input '{"prompt":"春日海报"}' --format json
```

先 `get` 再编辑。完整保存时保留所有 `nodes`、`edges`、`data.customeData`（历史拼写，不能改成 `customData`）、`parentId` 和坐标。组父节点为 `type: "group"`；组内子节点的位置相对父组，不能混用绝对坐标。

`create`、`save`、`run` 会创建、更新或执行工作流，运行还可能消耗积分；先告知用户。完整用法见 [58pic-workflow 教程](https://github.com/58pic-open/skills/tree/main/58pic-workflow)。
