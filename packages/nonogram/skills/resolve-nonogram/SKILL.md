---
name: resolve-nonogram
description: 当用户明确要求只解析一份已确认的数织 {rowClues, columnClues} JSON 为结构化状态时使用；输出结构化状态，不负责解码、确认或渲染。
---

# Resolve Nonogram（解析数织结果）

入口是一份调用方保证已确认的 `{rowClues, columnClues}`。本 skill 负责校验、求解并输出结构化状态；展示由 `solve-nonogram` 或调用方负责。

## 解析

先解析真实绝对路径，再运行：

```bash
pnpm --dir <repo-root> run runtime:check -- nonogram
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/solve-board.ts [input.json] [output.json] \
  [--max-search-nodes 100000] [--max-steps 10000]
```

- 没有 `input.json` 时从 stdin 读取。
- 没有输出路径时 JSON 写 stdout；诊断只写 stderr。
- 只有显式给出路径时才写文件，不绑定固定文件名或 `/tmp`。
- JSON/schema/clue 校验失败退出码为 1。
- `solved`、`unsatisfiable`、`multiple`、`indeterminate` 都是合法求解结果，退出码为 0。

求解器对每行/列使用动态规划，计算每格是否可为黑/白并循环传播；纯逻辑停滞后明确记录假设和回溯。默认最多探索 100,000 个搜索节点、记录 10,000 条聚合步骤。达到搜索上限时返回 `indeterminate`，不把候选解冒充唯一解。

## 输出契约

```json
{
  "rowClues": [[1], [1]],
  "columnClues": [[1], [1]],
  "status": "multiple",
  "solution": [[1, 0], [0, 1]],
  "alternateSolution": [[0, 1], [1, 0]],
  "partial": [[-1, -1], [-1, -1]],
  "steps": [],
  "stats": {
    "searchNodes": 2,
    "propagationRounds": 5,
    "limitReached": false,
    "recordedSteps": 8,
    "omittedSteps": 0
  }
}
```

- `solution`：找到的第一组完整解。只有 `status: solved` 时已证明唯一；其他状态下仅为候选或多解见证。
- `alternateSolution`：仅在 `multiple` 时存在，作为第二组见证解。
- `partial`：始终存在；`-1` 未知、`0` 确定白格、`1` 黑格。
- `steps` 聚合记录 `line-deduction`、`assumption`、`contradiction`、`backtrack`。
- `stats.limitReached` 只表示搜索节点上限；日志被截断由 `omittedSteps` 表示，不改变求解状态。

## 状态语义

- `solved`：唯一解。
- `multiple`：至少两组解，`alternateSolution` 是第二组见证解。
- `indeterminate`：唯一性未证明，可包含候选或 partial。
- `unsatisfiable`：线索矛盾；不要自动改 clue 或自动重识。

## 红旗

- 对未经用户确认的 clues 求解。
- 找到第一组解就宣称唯一。
- 搜索过程伪装成纯逻辑推导。
- 产出结果后继续渲染。
- solver 报无解后自行修正 clues。
