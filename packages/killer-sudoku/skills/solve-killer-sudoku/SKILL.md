---
name: solve-killer-sudoku
description: 当用户要求解 Killer Sudoku 题（图片、截图或已结构化 JSON）时使用；负责串联 decoding-killer-sudoku、rendering-killer-sudoku、resolve-killer-sudoku、rendering-killer-sudoku。
---

# Solve Killer Sudoku（解 Killer Sudoku）

这是 Killer Sudoku 的显式编排入口。用户自然说“解这道 Killer Sudoku / 杀手数独”、上传截图，或给出 `{puzzle, cages}` JSON 并要求完整解题流程时，使用本 skill。

底层阶段职责保持解耦：

- `decoding-killer-sudoku`：只把图片解码成 `{puzzle, cages}`。
- `rendering-killer-sudoku`：只渲染 `{puzzle, cages}` 或 `{puzzle, cages, solution, steps}`。
- `resolve-killer-sudoku`：只解析已确认的 `{puzzle, cages}`，输出 `{puzzle, cages, solution, steps}`。

## 工作流

### 图片输入

1. 调用 `decoding-killer-sudoku`，从图片得到 `{puzzle, cages}`。
2. 调用 `rendering-killer-sudoku` 展示盘面和笼定义。
3. 询问用户：“识别如上盘面和笼定义，是否正确？如有错误请指出具体格子、笼编号、sum 或 cells。”
4. 用户确认前禁止调用 `resolve-killer-sudoku`。
5. 用户给出明确、局部、可验证的纠正时，直接更新 `{puzzle, cages}`，重新调用 `rendering-killer-sudoku` 并再次确认。
6. 用户给出模糊纠正时，回到 `decoding-killer-sudoku` 或要求用户给出精确信息。
7. 用户确认后，调用 `resolve-killer-sudoku`。
8. 把求解结果交给 `rendering-killer-sudoku` 展示最终解。

### JSON 输入

1. 如果用户直接给出 `{puzzle, cages}`，跳过 `decoding-killer-sudoku`。
2. 调用 `rendering-killer-sudoku` 展示题面并等待确认。
3. 确认后调用 `resolve-killer-sudoku`。
4. 调用 `rendering-killer-sudoku` 展示最终解。

## 数据契约

```json
{
  "puzzle": [[0, 0, 0, 0, 0, 0, 0, 0, 0]],
  "cages": [
    { "cells": [[0, 0], [0, 1]], "sum": 3 }
  ]
}
```

- `puzzle`：9×9 `number[][]`，`0` 表示空格。
- `cages`：笼数组，每个笼含 `cells`（0-indexed `[row, col][]`）和 `sum`。

## 红旗

- 不要绕过确认直接求解图片识别结果。
- 不要用 solver 反推或修复笼定义。
- 不要让 `resolve-killer-sudoku` 负责渲染；最终展示由本编排入口调用 `rendering-killer-sudoku`。
