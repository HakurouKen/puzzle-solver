---
name: rendering-nonogram
description: Use when a black-and-white Nonogram puzzle, partial board, unique solution, candidate, or pair of multiple solutions needs terminal or SVG rendering.
---

# Rendering Nonogram（渲染数织）

职责单一：读取 `{rowClues, columnClues}` 及可选求解结果，生成 Unicode 终端文本或 SVG。不识图、不求解、不修改输入。

## 用法

```bash
pnpm --dir <repo-root> run runtime:check -- nonogram
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts \
  [input.json] [--format auto|terminal|svg] [--output path]
```

- 未提供 `input.json` 时从 stdin 读取。
- 默认 `--format auto`：预计不超过 120 字符宽、60 行高则用终端，否则用 SVG。
- `terminal` 和 `svg` 可强制格式，不截断盘面。
- 未提供 `--output` 时写 stdout；仅显式给出路径时写文件。
- 诊断写 stderr；输入或参数错误退出码为 1。

## 视觉语义

| 状态 | 终端 | SVG |
|---|---|---|
| 黑格 `1` | `██` | 黑色实心格 |
| 确定白格 `0` | `× ` | 浅灰叉号 |
| 未知格 `-1` | 两个空格 | 空白格 |

- decoding 的题面没有 solution/partial，全部格子按未知显示。
- 每 5 行、5 列使用粗网格线，尾段正常收边。
- 所有输出显示尺寸与完整 clues；终端额外输出 1-based 行列 clue 清单。
- 根据 `status` 明确标记唯一解、无解、多解或未判定。
- `multiple` 同时展示解 A、解 B：终端顺序展示并列出差异坐标；SVG 左右并排，以红框标出差异。
- 差异坐标最多列前 100 个，同时报告总数。
- `indeterminate` 的完整候选必须标为“候选解，唯一性未证明”。
- `stats.omittedSteps > 0` 时提示省略的步骤数。

## 输入兼容

最小输入：

```json
{
  "rowClues": [[1], [3], [1]],
  "columnClues": [[1], [3], [1]]
}
```

求解输入还可包含 `status`、`solution`、`alternateSolution`、`partial`、`steps`、`stats`；renderer 忽略不参与呈现的字段。

## 红旗

- 把 `-1` 和确定白格画成相同符号。
- 只展示多解中的第一组。
- 将 `indeterminate` 候选标成唯一解。
- 自动写入固定输出路径。
