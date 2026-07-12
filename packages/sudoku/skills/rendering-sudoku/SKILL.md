---
name: rendering-sudoku
description: Use when Sudoku puzzle or solution data needs to be rendered to the terminal. Invoked by sibling skills decoding-sudoku and solving-sudoku as part of their data flow.
---

# Rendering Sudoku

把一份 `{puzzle, solution}` JSON 渲染成终端 ASCII 数独表格。**职责单一**：读 JSON、画 9×9 表格。不识图、不求解、不标注推理来源。

无 `solution` 的解码数据和有 `solution` 的求解结果**走同一渲染**：哪个矩阵存在就画哪个，每个格子要么有数字要么空白，不区分原题/推理/搜索。

## 输入

接受以下 schema 的 JSON 数据对象。传输方式由调用方决定；CLI 可使用 JSON 文件路径，但 skill 间交接不绑定文件名或目录：

```json
{
  "puzzle": [[5,3,0,0,7,0,0,0,0], ...],
  "solution": [[5,3,4,6,7,8,9,1,2], ...]
}
```

- `puzzle`：9×9 `number[][]`，`0` = 空格
- `solution`：9×9 数字矩阵，可选；若存在则优先渲染 solution
- 其他字段（如 `steps`）会被忽略
- `puzzle` 与 `solution` 都没有 → 显示 "No solution found"

## 用法

```bash
node <repo-root>/scripts/ensure-runtime.mjs sudoku
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts <json-path>
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

## 设计原则

- **纯 Unicode 盒线**：不依赖 ANSI 颜色（终端调色板会误导）
- **3×3 宫粗线 + 宫内细线**：宫间用 `┏━┳┓`/`┣╋┫`/`┗┻┛`，宫内 cell 间用 `┠─╂┨` 与 `│`；让 9 行表格在 1:2 字符比例终端下视觉接近正方形
- **对齐**：每个宫段宽度 11 字符（3 cell × 3 + 2 内分隔 `│`），与边框 `━`/`─` 段数严格一致
- **格子内容**：填数 = ` N `（普通），空格 = `   `（三空格）

## 与兄弟 skill 的关系

- `decoding-sudoku` 把 `{puzzle}` 交给本 skill，让用户确认识别后再进入 solving
- `solving-sudoku` 可把 `{puzzle, solution, steps}` 交给本 skill 展示解
- 本 skill **不读**传入数据之外的状态，**不修改**输入数据

## 红旗 — 立即停止

- 输入 JSON 既无 `puzzle` 也无 `solution` → 友好显示 "No solution found"，不要崩
- JSON 解析失败 → 报错退出（非零退出码）
