---
name: rendering-sudoku
description: Use when a Sudoku solution needs to be rendered to the terminal. Invoked by sibling skills decoding-sudoku and solving-sudoku via JSON file path.
---

# Rendering Sudoku

把一份 `{puzzle, solution, steps}` JSON 渲染成终端 ASCII 数独解答。**职责单一**：读 JSON、画 9×9 表格、标注推理/搜索数。不识图、不求解。

## 输入

接受一个 JSON 文件路径（绝对路径或相对当前目录），文件 schema：

```json
{
  "puzzle": "53..7....6..195....98....6.8...6...34..8.3..1..7...2...6.6....28....419..5....8..79",
  "solution": [[5,3,4,6,7,8,9,1,2], ...],
  "steps": [
    { "type": "assign", "cell": "A1", "digit": "5", "detail": "A1 = 5" }
  ]
}
```

- `solution`：9×9 数字矩阵，可选
- `solution: null` → 显示 "No solution found"
- `puzzle`：可选（提供时原题已知数会用普通显示而非标记）
- `steps`：可选（提供时推理/搜索数会分别用 `*N` / `(N)` 标记）

兄弟 skill 写出的 input.json（无 solution）和 output.json（有 solution）都符合此 schema。

## 用法

```bash
node --experimental-strip-types packages/sudoku/skills/rendering-sudoku/references/render-board.ts <json-path>
```

或在已 install 包后于 plugin 内：

```bash
node --experimental-strip-types skills/rendering-sudoku/references/render-board.ts /tmp/sudoku-output.json
```

## 设计原则

- **纯 ASCII + Unicode 盒线**：不依赖 ANSI 颜色（终端调色板会误导）
- **宫分隔**：每 3 行/列用粗线（`┏━┓┣┫`），宫内细线
- **数字标记**：
  - 原题已知 = 普通
  - 约束传播推理 = `*N` 前缀
  - 回溯搜索 = `(N)` 括号
- **无解时**：清晰提示 "No solution found"

## 与兄弟 skill 的关系

- [[decoding-sudoku]] 写出 input.json 后 invoke 本 skill 让用户确认识别
- [[solving-sudoku]] 写出 output.json 后 invoke 本 skill 展示解
- 本 skill **不读** input.json / output.json 之外的状态，**不修改**任何文件

## 红旗 — 立即停止

- 输入 JSON 缺 `solution` → 友好显示 "No solution found"，不要崩
- JSON 解析失败 → 报错退出（非零退出码）
