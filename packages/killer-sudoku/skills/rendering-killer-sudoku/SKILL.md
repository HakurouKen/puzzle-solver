---
name: rendering-killer-sudoku
description: Use when a Killer Sudoku puzzle or solution needs to be rendered as an image (SVG) or terminal text.
---

# Rendering Killer Sudoku

把 Killer Sudoku 题面/解渲染为图像。默认输出 **SVG**（精确复刻图形样式：内缩虚线 cage 框 + 左上角小字 sum），也保留终端 Unicode 文本输出。

## Input Format

```json
{
  "puzzle": [...],
  "cages": [...],
  "solution": [[1, 2, 3, ...], ...]  // optional, falls back to puzzle
}
```

## Usage

```bash
# CLI — 默认渲染 SVG，写到输入 json 同目录（.svg），并打印路径
node --experimental-strip-types render-board.ts /tmp/killer-sudoku-output.json
# 指定输出路径
node --experimental-strip-types render-board.ts input.json -o /tmp/board.svg
# 终端文本渲染（旧行为）
node --experimental-strip-types render-board.ts input.json --text

# Programmatic
import { renderSvg, renderBoard, renderCages } from './render-board.ts';
const svg = renderSvg(input);      // SVG 字符串
const board = renderBoard(input);  // 终端文本
const cages = renderCages(input);  // 笼列表文本
```

macOS 下可用 `qlmanage -t -s 580 -o <dir> board.svg` 把 SVG 转成 PNG 预览。

## SVG 样式

- **内缩虚线框**：cage 边界向格内偏移 PAD 像素绘制，浮在格子内部、比实线网格小一圈，两者分层互不重叠（复刻参考样式）
- **sum 小字**：标注在 cage「锚点格」（行列字典序最小、最左上的格子）的左上角
- **数字**：格子居中
- **粗线**（width 3）：3×3 宫边界 + 外框；**细线**（width 1）：单格网格
- 配色 `#344861`（深）/`#cdd5e0`（浅）/`#5b6b84`（虚线）

## 终端文本样式（--text）

每格占 **2 行 × 5 字符**：上行左上角放 cage 的 sum（仅锚点格），下行居中放数字。

```
┏━━━━━┯━━━━━┯━━━━━┳━━━━━┯ ...
┃16   ╎18   │     ┃11   ╎ ...   ← sum 行（左上角小字）
┃  9  ╎  6  │  4  ┃  2  ╎ ...   ← 数字行（居中）
┠─────┼─────┼╌╌╌╌╌╂╌╌╌╌╌┼ ...   ← 行间分隔
...
┗━━━━━┷━━━━━┷━━━━━┻━━━━━┷ ...
```

- **粗线**（━ ┃ ┏ ┓ ┳ ┻ ┣ ┫）：3×3 宫边界
- **虚线**（╌ ╎）：cage 笼边界
- **细线**（─ │）：同一 cage 内部相邻格之间
- **交叉点**（┼ ╂ ┿ ╋）：粗细只取决于是否落在宫行/列上

## Design Notes

- SVG 用矢量绘制，无外部依赖；纯字符串拼接生成
- cage 的 sum 标注在「锚点格」——即该笼中行列字典序最小（最左上）的格子
- 终端文本无 ANSI 颜色（终端调色板差异会造成困惑），纯 Unicode 保证兼容性
- Cage list shows cell coordinates in standard notation (A1-I9)
