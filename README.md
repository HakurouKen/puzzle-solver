# puzzle-solver

Claude Code 本地 marketplace，聚合三款「解谜」插件。每款插件通过一组 skills 完成 **图像识别 → 终端渲染 → 分步求解** 的完整流程。

> 使用者：需要在 Claude Code 中直接把一张谜题截图交给 AI，让它自己识别、可视化确认、然后带着推理步骤解出来的人。

## Plugins

| 插件 | 说明 |
|------|------|
| [`star-battle-solver`](./packages/star-battle) | Star Battle：识别区域矩阵与 k 值，渲染棋盘，按策略分步求解 |
| [`sudoku-solver`](./packages/sudoku) | 数独：识别 9×9 网格，终端渲染，分步求解 |
| [`killer-sudoku-solver`](./packages/killer-sudoku) | 杀手数独：识别网格 + cage，渲染 cage 边界与 SVG，约束传播 + 分步求解 |

每个插件遵循同一模式，暴露三个 skills：

- `decoding-*` — 从图片解码，先渲染出确认视图，用户 OK 后再产出结构化 JSON
- `rendering-*` — 独立渲染 skill，供解码/求解链路调用
- `solving-*` — 拿已确认的结构化输入求解，输出 solution + 推理步骤，末尾调用渲染

## 用法

在 Claude Code 中把当前目录作为 marketplace 加载即可。三个插件会作为 skills 出现，命名如 `sudoku-solver:solving-sudoku` 等。

典型对话流程：

```
用户: 帮我解这道数独 [附图]
  → decoding-sudoku 识别 → 渲染确认
  → 用户确认无误
  → solving-sudoku 求解 → rendering-sudoku 展示解
```

## 开发

```bash
pnpm install          # 装依赖
pnpm -r test          # 递归跑所有 package 测试
pnpm -r type-check    # 递归类型检查
```

约定：

- 仅使用 pnpm workspace，禁用其他包管理器
- 强制中文交流，代码标识符保持英文
- Superpowers 输出目录 `.claude/superpowers/`（不使用 `docs/superpowers/`）

## License

MIT © Hakurouken
