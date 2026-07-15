---
name: solving-sudoku
description: Use when a Sudoku puzzle (as a 9×9 number[][] array) has passed through decoding-sudoku and rendering-sudoku and is confirmed by the user, and now needs to be solved with step-by-step reasoning.
---

# Solving Sudoku

入口：一份经过 `decoding-sudoku → rendering-sudoku` 且**已被用户确认**的 `{puzzle}` 数据对象。传输方式可由调用方选择，不要求固定文件名或目录。

## 工作流（必须按顺序）

```dot
digraph flow {
    "拿到已确认 {puzzle}" [shape=doublecircle];
    "求解并返回 {puzzle, solution, steps}" [shape=box];
    "按需调用 rendering-sudoku 展示解" [shape=box];
    "拿到已确认 {puzzle}" -> "求解并返回 {puzzle, solution, steps}"
        -> "按需调用 rendering-sudoku 展示解";
}
```

**前置**：本 skill 假定 `puzzle` **已经由 rendering-sudoku 展示并被用户确认**。

## 步骤详解

### 1. 求解

```bash
pnpm --dir <repo-root> run runtime:check -- sudoku
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/solve-board.ts path/to/input.json
# 如需持久化，再显式传入调用方选择的输出路径：
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/solve-board.ts path/to/input.json path/to/output.json
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

`solve-board.ts` 调 `solver.ts` 中的 `solve()`：
- 解析 9×9 数字数组为候选数 Grid（Map<Cell, string>）
- 约束传播：assign + eliminate + 两个传播启发式
- 回溯搜索：候选最少格子分支

输出 schema：

```json
{
  "puzzle": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0]
  ],
  "solution": [[5,3,4,6,7,8,9,1,2], ...],
  "steps": [
    { "type": "assign", "cell": "A1", "digit": "5", "detail": "A1 = 5" },
    { "type": "search", "cell": "C3", "digit": "4", "detail": "try C3 = 4" }
  ]
}
```

`puzzle` 字段与 `solution` 字段同型 `number[][]`（输入输出对称）。

`solve-board` **不修改**输入。未指定输出路径时把结果 JSON 写到 stdout；指定路径时才写文件。skill 契约只约束结果 schema，不约束存储位置。

### 2. 渲染解

需要展示最终解时，调用项目级 `rendering-sudoku` skill，并传入 `{puzzle, solution, steps}` 数据；不要要求中间结果先写到固定文件。

## 输入格式约定

```json
{
  "puzzle": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ]
}
```

- `puzzle`：9×9 二维数字数组，`number[][]`
- `0` 表示空格，`1-9` 表示已知数
- 行优先（`puzzle[0]` 是第 1 行）

如果 `puzzle` 不是 9×9 数组或含越界值，`solve-board.ts` 会以非零退出码报错；这时回到 decoding 重新生成数据。

## 常见错误

| 错误 | 修正 |
|------|------|
| 直接对未确认的 puzzle 求解 | puzzle 错求解就废。让调用方（或 decoding）先做识别确认。 |
| 自己脑补修复 puzzle 字段 | **不可**。回 decoding 重新生成。 |
| 自己跑 render-board 显示解 | **不可**。调用 rendering-sudoku，并传递求解结果数据。 |

## 红旗 — 立即停止

- "用户没确认我先 solve 一下省得来回" → **不可**，那是 decoding 的职责，让它先确认
- "我顺手 import 一下 rendering 的 render-board.ts" → **不可**，跨 skill 必须调用 skill；数据传输方式不作强制
