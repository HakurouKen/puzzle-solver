---
name: rendering-killer-sudoku
description: Use when a Killer Sudoku puzzle or solution needs to be rendered as an image (SVG) or terminal text. Invoked by sibling skills decoding-killer-sudoku and solving-killer-sudoku.
---

# Rendering Killer Sudoku（渲染 Killer Sudoku）

把 `{puzzle, cages, solution?}` 数据渲染成图像或文本。**默认输出 SVG**——精确复刻 Killer Sudoku 图形样式：内缩虚线笼框、嵌入左上角的小字 sum、粗线分宫；同时保留终端 Unicode 文本输出（`--text`）。职责单一：接收数据、画棋盘和笼边界。不识图、不求解。

## 输入

数据对象：

```json
{
  "puzzle": [[0, 0, ...], ...],
  "cages": [
    { "cells": [[0, 0], [0, 1]], "sum": 10 },
    ...
  ],
  "solution": [[1, 2, 3, ...], ...]
}
```

- `puzzle`：9×9 `number[][]`，`0` = 空格
- `cages`：笼定义（用于绘制笼边界和笼列表）
- `solution`：可选 9×9 数字矩阵，存在则优先渲染
- 其他字段（如 `steps`）会被忽略
- `puzzle` 与 `solution` 都没有 → 友好显示 "No solution found"

## 用法

CLI（通过 stdin 传输 JSON 数据）：

```bash
pnpm --dir <repo-root> run runtime:check -- killer-sudoku
# 指定输出路径
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts -o "$BOARD_SVG" < "$DATA_JSON"
# 终端文本渲染（旧行为）
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
const svg = renderSvg({ puzzle, cages, solution })   // SVG 字符串
const board = renderBoard({ puzzle, cages, solution })// 终端文本
const cageList = renderCages({ puzzle, cages })       // 笼列表文本
```

macOS 下可用 `qlmanage -t -s 580 -o <dir> board.svg` 把 SVG 转成 PNG 预览。

## 输出格式

### SVG（默认）

矢量绘制，纯字符串拼接、无外部依赖：

- **内缩虚线笼框**：笼边界向格内偏移 `PAD` 像素绘制，浮在格子内部、比实线网格小一圈，两者分层互不重叠
- **嵌入式 sum**：sum 小字移到笼框左上角点，笼框 top 边右移、left 边下移留出缺口，数字嵌在虚线断口处、与虚线重叠（复刻参考图）。缺口宽度随 sum 位数自适应
- **数字**：格子居中
- **粗线**（width 3）：3×3 宫边界 + 外框；**细线**（width 1）：单格网格
- 配色 `#344861`（深）/ `#cdd5e0`（浅网格）/ `#5b6b84`（虚线笼框）

### 终端文本（--text）

每格占 **2 行 × 5 字符**：上行左上角放笼 sum（仅锚点格），下行居中放数字。

```
┏━━━━━┯━━━━━┯━━━━━┳━━━━━┯ ...
┃16   ╎18   │     ┃11   ╎ ...   ← sum 行（左上角小字）
┃  9  ╎  6  │  4  ┃  2  ╎ ...   ← 数字行（居中）
┠─────┼─────┼╌╌╌╌╌╂╌╌╌╌╌┼ ...   ← 行间分隔
...
┗━━━━━┷━━━━━┷━━━━━┻━━━━━┷ ...
```

笼列表（`renderCages`）：

```
Cages:
  Cage 0: A1,A2 (2 cells, sum=3)
  Cage 1: A3,B3 (2 cells, sum=15)
  ...
```

## 边框约定

**SVG**：实线网格（细线单格 / 粗线分宫）与内缩虚线笼框分层绘制，互不重叠；sum 嵌在笼框左上角缺口。

**终端文本（--text）**：
- **粗线**（━ ┃ ┏ ┓ ┳ ┻ ┣ ┫）：3×3 宫边界
- **虚线**（╌ ╎）：笼边界
- **细线**（─ │）：同一笼内部相邻格之间
- **交叉点**（┼ ╂ ┿ ╋）：粗细只取决于是否落在宫行/列上

## 锚点格约定

笼的 sum 标注在「锚点格」——即该笼中行列字典序最小（最左上）的格子。SVG 嵌在其笼框左上角，终端文本放其格左上角。

## 设计原则

- 默认 SVG 输出：矢量绘制、纯字符串拼接、无外部依赖（与 sudoku/star-battle 一致的"无 native 库"原则）
- SVG 用分层绘制实现"内缩虚线笼框 + 嵌入式 sum"，复刻 Killer Sudoku 图形样式
- 终端文本（--text）纯 Unicode、无 ANSI 颜色（终端调色板差异会误导）
- 笼列表用标准坐标 A1-I9（A=第 0 行，1=第 0 列）

## 与兄弟 skill 的关系

- `decoding-killer-sudoku` 把 `{puzzle, cages}` 交给本 skill，让用户确认识别后再进入 solving
- `solving-killer-sudoku` 可把 `{puzzle, cages, solution, steps}` 交给本 skill 展示解
- 本 skill **不读**传入数据之外的状态，**不修改**输入数据

## 常见错误

| 错误 | 修正 |
|------|------|
| puzzle 和 solution 都没有 | 友好显示 "No solution found" |
| JSON 解析失败 | 报错非零退出 |
| 笼边界检测遗漏 | 验证所有相邻格对的笼归属 |
| 直接 import solver 的函数 | 本 skill 只渲染，求解归 solving |

## 红旗 — 立即停止

- 输入 JSON 既无 `puzzle` 也无 `solution` → 友好显示 "No solution found"，不要崩溃
- 尝试自己求解 → 求解归 solving-killer-sudoku，调用该 skill
- 尝试识图或修改数据 → 本 skill 只渲染，不修改
