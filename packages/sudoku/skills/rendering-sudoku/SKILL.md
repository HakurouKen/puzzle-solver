---
name: rendering-sudoku
description: 当用户明确要求渲染数独题面或解答 JSON 时使用；只把 {puzzle, solution?} 渲染到终端，不负责解码、确认或求解。
---

# Rendering Sudoku（渲染数独）

把一份 `{puzzle, solution?}` JSON 渲染成终端 ASCII 数独表格。职责单一：读 JSON、画 9×9 表格。不识图、不确认、不求解、不标注推理来源。

无 `solution` 的题面数据和有 `solution` 的求解结果走同一渲染：哪个矩阵存在就画哪个，每个格子要么有数字要么空白，不区分原题/推理/搜索。

## 输入

接受以下 schema 的 JSON 数据对象。传输方式由调用方决定；CLI 可使用 JSON 文件路径，但 skill 间交接不绑定文件名或目录：

```json
{
  "puzzle": [[5, 3, 0, 0, 7, 0, 0, 0, 0]],
  "solution": [[5, 3, 4, 6, 7, 8, 9, 1, 2]]
}
```

- `puzzle`：9×9 `number[][]`，`0` = 空格。
- `solution`：9×9 数字矩阵，可选；若存在则优先渲染 solution。
- 其他字段（如 `steps`）会被忽略。
- `puzzle` 与 `solution` 都没有 → 显示 `No solution found`。

## 用法

```bash
pnpm --dir <repo-root> run runtime:check -- sudoku
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts <json-path>
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

## 设计原则

- 纯 Unicode 盒线，不依赖 ANSI 颜色。
- 3×3 宫粗线 + 宫内细线。
- 每个宫段宽度 11 字符，与边框段数严格一致。
- 填数 = ` N `，空格 = 三个空格。

## 边界

- 本 skill 不读传入数据之外的状态，不修改输入数据。
- 本 skill 不识图、不确认、不求解。
- 可由任意编排入口调用，但不依赖调用方是谁。

## 红旗

- 输入 JSON 既无 `puzzle` 也无 `solution` → 友好显示 `No solution found`，不要崩。
- JSON 解析失败 → 报错退出（非零退出码）。
