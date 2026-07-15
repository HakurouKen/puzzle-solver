---
name: solve-nonogram
description: 当用户要求解数织题（图片、截图或已结构化 JSON）时使用；负责串联 decoding-nonogram、rendering-nonogram、resolve-nonogram、rendering-nonogram。
---

# Solve Nonogram（解数织）

这是 Nonogram / 数织的显式编排入口。用户自然说“解这道数织”、上传截图，或给出 `{rowClues, columnClues}` JSON 并要求完整解题流程时，使用本 skill。

底层阶段职责保持解耦：

- `decoding-nonogram`：只把视觉输入解码成 `{rowClues, columnClues}`。
- `rendering-nonogram`：只渲染题面、局部状态、唯一解、多解或候选解。
- `resolve-nonogram`：只解析已确认的 `{rowClues, columnClues}`，输出结构化状态。

## 工作流

### 图片输入

1. 调用 `decoding-nonogram`，从图片得到 `{rowClues, columnClues}`。
2. 调用 `rendering-nonogram` 展示空白题面和完整线索。
3. 询问用户：“识别为以上数织及行列线索，是否正确？如有错误，请指出具体行或列及正确 clue，例如 `第 8 行应为 [2, 4]`。”
4. 用户确认前禁止调用 `resolve-nonogram`。
5. 用户给出明确、局部、可验证的纠正时，直接更新 `{rowClues, columnClues}`，重新调用 `rendering-nonogram` 并再次确认。
6. 用户给出模糊纠正时，回到 `decoding-nonogram` 或要求用户给出精确信息。
7. 用户确认后，调用 `resolve-nonogram`。
8. 把求解结果交给 `rendering-nonogram` 展示最终状态。

### JSON 输入

1. 如果用户直接给出 `{rowClues, columnClues}`，跳过 `decoding-nonogram`。
2. 调用 `rendering-nonogram` 展示题面并等待确认。
3. 确认后调用 `resolve-nonogram`。
4. 调用 `rendering-nonogram` 展示最终状态。

## 数据契约

```json
{
  "rowClues": [[1], [3], [5], [3], [1]],
  "columnClues": [[1], [3], [5], [3], [1]]
}
```

- `rowClues`：逐行线索。
- `columnClues`：逐列线索。
- 空线统一写 `[]`。

## 红旗

- 不要绕过确认直接求解图片识别结果。
- 不要用 solver 反推或修复线索。
- 不要让 `resolve-nonogram` 负责渲染；最终展示由本编排入口调用 `rendering-nonogram`。
