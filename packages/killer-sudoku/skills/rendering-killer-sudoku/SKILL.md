---
name: rendering-killer-sudoku
description: 当用户明确要求渲染 Killer Sudoku 题面或解答 JSON 时使用；默认输出 SVG，也支持终端文本，不负责解码、确认或求解。
---

# Rendering Killer Sudoku（渲染 Killer Sudoku）

把 `{puzzle, cages, solution?}` 数据渲染成图像或文本。默认输出 SVG：内缩虚线笼框、嵌入左上角的小字 sum、粗线分宫；同时保留终端 Unicode 文本输出（`--text`）。职责单一：接收数据、画棋盘和笼边界。不识图、不确认、不求解。

## 输入

数据对象：

```json
{
  "puzzle": [[0, 0, 0, 0, 0, 0, 0, 0, 0]],
  "cages": [
    { "cells": [[0, 0], [0, 1]], "sum": 10 }
  ],
  "solution": [[1, 2, 3, 4, 5, 6, 7, 8, 9]]
}
```

- `puzzle`：9×9 `number[][]`，`0` = 空格。
- `cages`：笼定义（用于绘制笼边界和笼列表）。
- `solution`：可选 9×9 数字矩阵，存在则优先渲染。
- 其他字段（如 `steps`）会被忽略。
- `puzzle` 与 `solution` 都没有 → 友好显示 `No solution found`。

## 用法

CLI（通过 stdin 传输 JSON 数据）：

```bash
pnpm --dir <repo-root> run runtime:check -- killer-sudoku
# 指定输出路径
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts -o "$BOARD_SVG" < "$DATA_JSON"
# 终端文本渲染
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts --text < "$DATA_JSON"
# heredoc 直接内嵌数据
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts <<'JSON'
{ "puzzle": [...], "cages": [...], "solution": [...] }
JSON
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

程序化：

```ts
import { renderSvg, renderBoard, renderCages } from './render-board.ts'
const svg = renderSvg({ puzzle, cages, solution })
const board = renderBoard({ puzzle, cages, solution })
const cageList = renderCages({ puzzle, cages })
```

macOS 下可用 `qlmanage -t -s 580 -o <dir> board.svg` 把 SVG 转成 PNG 预览。

## 输出格式

### SVG（默认）

- 内缩虚线笼框：笼边界向格内偏移 `PAD` 像素绘制，浮在格子内部、比实线网格小一圈。
- 嵌入式 sum：sum 小字移到笼框左上角点，笼框 top 边右移、left 边下移留出缺口。
- 数字：格子居中。
- 粗线（width 3）：3×3 宫边界 + 外框；细线（width 1）：单格网格。
- 配色 `#344861`（深）/ `#cdd5e0`（浅网格）/ `#5b6b84`（虚线笼框）。

### 终端文本（--text）

每格占 2 行 × 5 字符：上行左上角放笼 sum（仅锚点格），下行居中放数字。

笼列表（`renderCages`）：

```text
Cages:
  Cage 0: A1,A2 (2 cells, sum=3)
  Cage 1: A3,B3 (2 cells, sum=15)
```

## 边框约定

SVG：实线网格（细线单格 / 粗线分宫）与内缩虚线笼框分层绘制，互不重叠；sum 嵌在笼框左上角缺口。

终端文本（--text）：

- 粗线（━ ┃ ┏ ┓ ┳ ┻ ┣ ┫）：3×3 宫边界。
- 虚线（╌ ╎）：笼边界。
- 细线（─ │）：同一笼内部相邻格之间。
- 交叉点（┼ ╂ ┿ ╋）：粗细只取决于是否落在宫行/列上。

## 锚点格约定

笼的 sum 标注在「锚点格」：该笼中行列字典序最小（最左上）的格子。SVG 嵌在其笼框左上角，终端文本放其格左上角。

## 边界

- 本 skill 不读传入数据之外的状态，不修改输入数据。
- 本 skill 不识图、不确认、不求解。
- 可由任意编排入口调用，但不依赖调用方是谁。

## 常见错误

| 错误 | 修正 |
|------|------|
| puzzle 和 solution 都没有 | 友好显示 `No solution found`。 |
| JSON 解析失败 | 报错非零退出。 |
| 笼边界检测遗漏 | 验证所有相邻格对的笼归属。 |
| 直接 import solver 的函数 | 本 skill 只渲染，求解归 solving。 |

## 红旗

- 输入 JSON 既无 `puzzle` 也无 `solution` → 友好显示 `No solution found`，不要崩溃。
- 尝试自己求解 → 停。本 skill 只渲染。
- 尝试识图或修改数据 → 停。本 skill 只渲染。
