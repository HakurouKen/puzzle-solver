---
name: solve-sudoku
description: 当用户要求解数独题（图片、截图或已结构化 JSON）时使用；负责串联 decoding-sudoku、rendering-sudoku、resolve-sudoku、rendering-sudoku。
---

# Solve Sudoku（解数独）

这是数独的显式编排入口。用户自然说“解这道数独”、上传数独截图，或给出 `{puzzle}` JSON 并要求完整解题流程时，使用本 skill。

底层阶段职责保持解耦：

- `decoding-sudoku`：只把图片解码成 `{puzzle}`。
- `rendering-sudoku`：只渲染 `{puzzle}` 或 `{puzzle, solution, steps}`。
- `resolve-sudoku`：只解析已确认的 `{puzzle}`，输出 `{puzzle, solution, steps}`。

## 工作流

### 图片输入

1. 调用 `decoding-sudoku`，从图片得到 `{puzzle}`。
2. 调用 `rendering-sudoku` 展示 `{puzzle}`。
3. 询问用户：“识别如上 9×9 盘面，是否正确？如有错误请指出哪些格的数字错了（例如 `行 3 列 4 应为 5` 或 `R3C4=5`）。”
4. 用户确认前禁止调用 `resolve-sudoku`。
5. 用户给出明确、局部、可验证的纠正时，直接更新 `{puzzle}`，重新调用 `rendering-sudoku` 并再次确认。
6. 用户给出模糊纠正时，回到 `decoding-sudoku` 或要求用户给出精确信息。
7. 用户确认后，调用 `resolve-sudoku`。
8. 把求解结果交给 `rendering-sudoku` 展示最终解。

### JSON 输入

1. 如果用户直接给出 `{puzzle}`，跳过 `decoding-sudoku`。
2. 调用 `rendering-sudoku` 展示题面并等待确认。
3. 确认后调用 `resolve-sudoku`。
4. 调用 `rendering-sudoku` 展示最终解。

## 数据契约

```json
{
  "puzzle": [[5, 3, 0, 0, 7, 0, 0, 0, 0]]
}
```

- `puzzle`：9×9 `number[][]`
- `0`：空格
- `1-9`：已知数

## 红旗

- 不要绕过确认直接求解图片识别结果。
- 不要把确认、纠正逻辑塞回 `decoding-sudoku`。
- 不要让 `resolve-sudoku` 负责渲染；最终展示由本编排入口调用 `rendering-sudoku`。
