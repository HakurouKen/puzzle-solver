# puzzle-solver

面向 Codex 与 Claude Code 的项目级解谜 skills。进入本仓库后，智能体可完成 **图像识别 → 可视化确认 → 分步求解** 的完整流程；离开仓库后不会加载这些 skills。

> 本仓库不是插件或 marketplace，不会向用户级配置安装任何内容。

## Puzzles

| Package                                      | 说明                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------- |
| [`star-battle`](./packages/star-battle)      | Star Battle：识别区域矩阵与 k 值，渲染棋盘，按策略分步求解           |
| [`sudoku`](./packages/sudoku)                | 数独：识别 9×9 网格，终端渲染，分步求解                              |
| [`killer-sudoku`](./packages/killer-sudoku)  | 杀手数独：识别网格 + cage，渲染 cage 边界与 SVG，约束传播 + 分步求解 |
| [`nonogram`](./packages/nonogram)            | 数织：模型识别任意矩形黑白线索，终端/SVG 渲染，DP 传播并判定唯一性   |

每个 package 提供四个 skills：

- `solve-*` — 自然语言“解题”入口，显式编排 `decoding → rendering 确认 → resolve → rendering 结果`
- `decoding-*` — 仅从图片解码，输出结构化 JSON，不负责确认或求解
- `rendering-*` — 仅渲染结构化 JSON，不识图、不求解、不修改输入
- `resolve-*` — 仅拿已确认的结构化输入产出结构化结果，输出 solution/status + 推理步骤，不负责渲染

旧的 `solving-*` 入口已更名为 `resolve-*`；不要新增 `solving-*` symlink，避免和 `solve-*` 混淆。

## 用法

先安装系统前置工具：Node.js、pnpm、uv。不要全局安装项目依赖，也不要使用系统 `pip`。

用 Codex 或 Claude Code 打开本仓库：

- Codex 从 [`.agents/skills`](./.agents/skills) 发现 16 个项目级 skills。
- Claude Code 通过 [`.claude/skills`](./.claude/skills) 读取同一组 skills。
- 两个入口都是指向 `packages/*/skills/*` 的仓库内相对符号链接，仅支持 macOS/Linux。

首次执行某类谜题时，skill 会调用 `scripts/ensure-runtime.ts`。它只在依赖缺失或版本不匹配时运行锁定安装：Node 依赖进入项目 `node_modules/`，Pillow 由 uv 安装到 `packages/killer-sudoku/.venv/`。

典型对话流程：

```
用户: 帮我解这道数独 [附图]
  → solve-sudoku 编排 decoding-sudoku 识别 → rendering-sudoku 渲染确认
  → 用户确认无误
  → resolve-sudoku 产出结构化结果 → rendering-sudoku 展示解
```

自然语言“帮我解这题”优先触发 `solve-*`。只有用户明确要求单阶段操作时，才使用 `decoding-*`、`resolve-*` 或 `rendering-*`。

## 开发

```bash
pnpm install --frozen-lockfile                       # 安装 workspace Node 依赖
uv sync --project packages/killer-sudoku --frozen   # 安装项目隔离的 Pillow
pnpm test                                             # 检查 skill 入口并运行全部测试
pnpm type-check                                      # 根脚本 + 子包类型检查
pnpm run runtime:check                               # 检查全部运行环境
pnpm run docs:diagrams                               # 重新生成策略文档 SVG 示意图
```

约定：

- 仅使用 pnpm workspace，禁用其他包管理器
- Python 依赖仅使用 uv 管理的项目 `.venv`
- 强制中文交流，代码标识符保持英文
