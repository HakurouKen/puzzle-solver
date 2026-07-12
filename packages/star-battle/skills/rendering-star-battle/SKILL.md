---
name: rendering-star-battle
description: Use when a Star Battle puzzle needs to be rendered to the terminal — either for confirming decoded regions (no solution yet) or for showing the final solved board (with star placement). Invoked by sibling skills decoding-star-battle and solving-star-battle via JSON file path.
---

# Rendering Star Battle

把一份 JSON 渲染成终端 Unicode 棋盘。**职责单一**：读 JSON、画格子、画星（如果有 solution）。不识图、不求解。

## 输入

接受一个 JSON 文件路径（绝对路径或相对当前目录），文件 schema：

```json
{
  "regions": [[0, 0, 1], [0, 2, 1], [2, 2, 1]],
  "k": 1,
  "solution": [[0, 0, 1], [1, 0, 0], [0, 0, 0]]
}
```

- `regions`：n×n 整数方阵，必填
- `k`：每行/列/区星数，正整数，必填
- `solution`：n×n 0/1 方阵，**可选**。有则星格用 ★ 替代 region id。

兄弟 skill 写出的 input.json（无 solution）和 output.json（有 solution）都符合此 schema，rendering 无须区分。

## 用法

```bash
node <repo-root>/scripts/ensure-runtime.mjs star-battle
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts <json-path>
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

## 设计原则

- **黑白 Unicode 盒线**：终端调色板与原图色差会让用户误以为识别错；用粗细线区分区域更可靠
- **粗线分区**：区域边界 / 外框 = `━┃┏` 等粗线；同区单元格之间 = `─│` 等细线
- **单元格中央显示 region id**；提供 solution 时星格用 `*` 替代 id
- 视觉接近正方形：每格 5 字符宽 × 2 行高

## 与兄弟 skill 的关系

- `decoding-star-battle` 写出 input.json 后调用本 skill 让用户确认识别
- `solving-star-battle` 写出 output.json 后调用本 skill 展示带 ★ 的解
- 本 skill **不读** input.json / output.json 之外的状态，**不修改**任何文件

## 红旗 — 立即停止

- 输入 JSON 缺 `regions` 或 `k` → 报错退出（非零退出码）；不要替用户填默认 k
- `solution` 维度与 `regions` 不一致 → 报错退出；不要静默忽略
