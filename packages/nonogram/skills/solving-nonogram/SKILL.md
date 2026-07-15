---
name: solving-nonogram
description: Use when a black-and-white Nonogram's rowClues and columnClues have been decoded, rendered, and confirmed by the user and now need a complete, explainable solution with uniqueness detection.
---

# Solving Nonogram（求解数织）

入口是一份已经过 `decoding-nonogram → rendering-nonogram` 且由用户确认的 `{rowClues, columnClues}`。本 skill 负责校验、求解、输出结构化步骤，并调用项目级 `rendering-nonogram` 展示结果。

## 求解

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

## 状态处理

- `solved`：唯一解，调用 rendering 展示。
- `multiple`：把两组解都交给 rendering；必须显示差异格。
- `indeterminate`：可以展示候选或 partial，但必须明确“唯一性未证明”。
- `unsatisfiable`：展示原始 clues 和矛盾状态，提醒用户复查相关线索；不要自动改 clue 或自动重识。只有用户同意后才回 decoding。

## 红旗

- 对未经用户确认的 clues 求解。
- 找到第一组解就宣称唯一。
- 搜索过程伪装成纯逻辑推导。
- 直接导入兄弟 rendering 的实现；跨 skill 必须调用 skill。
- solver 报无解后自行修正 clues。
