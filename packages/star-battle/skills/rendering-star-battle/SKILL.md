---
name: rendering-star-battle
description: 当用户明确要求渲染 Star Battle 题面或解答 JSON 时使用；只把 {regions, k, solution?} 渲染到终端，不负责解码、确认或求解。
---

# Rendering Star Battle（渲染 Star Battle）

把一份 JSON 渲染成终端 Unicode 棋盘。职责单一：读 JSON、画格子、画星（如果有 solution）。不识图、不确认、不求解。

## 输入

接受以下 schema 的 JSON 数据对象。传输方式由调用方决定；CLI 可使用 JSON 文件路径，但 skill 间交接不绑定文件名或目录：

```json
{
  "regions": [[0, 0, 1], [0, 2, 1], [2, 2, 1]],
  "k": 1,
  "solution": [[0, 0, 1], [1, 0, 0], [0, 0, 0]]
}
```

- `regions`：n×n 整数方阵，必填。
- `k`：每行/列/区星数，正整数，必填。
- `solution`：n×n 0/1 方阵，可选。有则星格用 `*` 替代 region id。

无 `solution` 的题面数据和有 `solution` 的求解结果都符合此 schema，rendering 无须区分。

## 用法

```bash
pnpm --dir <repo-root> run runtime:check -- star-battle
pnpm --dir <package-root> exec node --import tsx <skill-dir>/references/render-board.ts <json-path>
```

`<repo-root>`、`<package-root>` 和 `<skill-dir>` 必须解析为真实绝对路径，不依赖当前工作目录。

## 设计原则

- 黑白 Unicode 盒线：终端调色板与原图色差会让用户误以为识别错；用粗细线区分区域更可靠。
- 粗线分区：区域边界 / 外框 = `━┃┏` 等粗线；同区单元格之间 = `─│` 等细线。
- 单元格中央显示 region id；提供 solution 时星格用 `*` 替代 id。
- 视觉接近正方形：每格 5 字符宽 × 2 行高。

## 边界

- 本 skill 不读传入数据之外的状态，不修改输入数据。
- 本 skill 不识图、不确认、不求解。
- 可由任意编排入口调用，但不依赖调用方是谁。

## 红旗

- 输入 JSON 缺 `regions` 或 `k` → 报错退出（非零退出码）；不要替用户填默认 k。
- `solution` 维度与 `regions` 不一致 → 报错退出；不要静默忽略。
