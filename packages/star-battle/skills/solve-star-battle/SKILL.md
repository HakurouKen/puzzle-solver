---
name: solve-star-battle
description: 当用户要求解 Star Battle 题（图片、截图或已结构化 JSON）时使用；负责串联 decoding-star-battle、rendering-star-battle、resolve-star-battle、rendering-star-battle。
---

# Solve Star Battle（解 Star Battle）

这是 Star Battle 的显式编排入口。用户自然说“解这道 Star Battle / 星星战”、上传截图，或给出 `{regions, k}` JSON 并要求完整解题流程时，使用本 skill。

底层阶段职责保持解耦：

- `decoding-star-battle`：只把图片解码成 `{regions, k}`。
- `rendering-star-battle`：只渲染 `{regions, k}` 或 `{regions, k, solution, steps}`。
- `resolve-star-battle`：只解析已确认的 `{regions, k}`，输出 `{regions, k, solution, steps}`。

## 工作流

### 图片输入

1. 调用 `decoding-star-battle`，从图片得到 `{regions, k}`。
2. 调用 `rendering-star-battle` 展示区域矩阵和 `k`。
3. 询问用户：“识别如上，是否正确？如有错误请指出具体格子的区域归属或正确的 `k`。”
4. 用户确认前禁止调用 `resolve-star-battle`。
5. 用户给出明确、局部、可验证的纠正时，直接更新 `{regions, k}`，重新调用 `rendering-star-battle` 并再次确认。
6. 用户给出模糊纠正时，回到 `decoding-star-battle` 或要求用户给出精确信息。
7. 用户确认后，调用 `resolve-star-battle`。
8. 把求解结果交给 `rendering-star-battle` 展示最终解。

### JSON 输入

1. 如果用户直接给出 `{regions, k}`，跳过 `decoding-star-battle`。
2. 调用 `rendering-star-battle` 展示题面并等待确认。
3. 确认后调用 `resolve-star-battle`。
4. 调用 `rendering-star-battle` 展示最终解。

## 数据契约

```json
{
  "regions": [[0, 0, 1], [0, 2, 1], [2, 2, 1]],
  "k": 1
}
```

- `regions`：`n×n` 整数方阵，每个值是区域 id。
- `k`：每行、每列、每个区域的星数，必填，无默认值。

## 红旗

- 图中或 JSON 中缺 `k` 时，不要默认 `2`；必须询问用户。
- 不要绕过确认直接求解图片识别结果。
- 不要让 `resolve-star-battle` 负责渲染；最终展示由本编排入口调用 `rendering-star-battle`。
