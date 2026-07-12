# Sudoku Package：数独求解器

**日期**: 2026-06-20
**仓库**: puzzle-solver monorepo
**作用域**: 新增 `packages/sudoku/` 包，含 3 个 skills（decoding / solving / rendering）

## 背景

puzzle-solver monorepo 目前只有 `@puzzle-solver/star-battle` 一个包。用户希望新增数独求解能力，采用与 star-battle 相同的 skills 架构模式（decoding → solving → rendering），通过 JSON 文件交换数据。

核心诉求：**不从零写代码**，移植社区经典方案。

## 目标

在 `packages/sudoku/` 下创建一个完整的数独求解包：

1. **decoding-sudoku**：从图像识别数独盘面（Claude 视觉模型直读 + SKILL.md 指南）
2. **solving-sudoku**：Norvig 约束传播 + 回溯搜索算法（Python 原版移植到 TypeScript），记录推理步骤
3. **rendering-sudoku**：ASCII 终端表格渲染解答

## 非目标

- 不做通用数独教学/提示系统
- 不做变体数独（对角数独、杀手数独等）
- 不做难度评估/分级
- 不做多解检测（只返回第一个解）
- 不做 Web UI / GUI

## 算法选择：Norvig's Sudoku Solver

Peter Norvig 的经典数独解法（2006），核心思想：

1. **Constraint Propagation**（约束传播）
   - 每格维护候选数集合（`"123456789"` 的子集）
   - `assign(grid, cell, digit)`：将某格确定为某值，从同伴中消除
   - `eliminate(grid, cell, digit)`：从某格候选中消除某值，触发连锁传播
   - 两个启发式：
     - 某格候选只剩 1 个 → 向同伴传播消除
     - 某 unit（行/列/宫）中某值只在一个格子的候选中出现 → 该格必为此值

2. **Search**（回溯搜索）
   - 约束传播无法继续时，选候选数最少的格子（MRV 启发）
   - 逐值尝试，递归求解
   - 失败则回溯

3. **Step Recording**（推理步骤记录）
   - 在 `assign` 成功时记录赋值步骤（格子被确定值）
   - 在 `eliminate` 成功时仅当候选数缩减到 1 时记录（避免噪音，只记"有意义的消除"）
   - 在 `search` 分支时记录搜索深度

## 架构

### 包结构

```
packages/sudoku/
├── package.json                          # @puzzle-solver/sudoku
├── .claude-plugin/
│   └── plugin.json                       # Claude Code 插件元数据
└── skills/
    ├── decoding-sudoku/
    │   ├── SKILL.md                      # 图像识别 skill 定义
    │   └── references/
    │       └── __tests__/
    │           └── (fixtures/)           # 测试用图片
    ├── solving-sudoku/
    │   ├── SKILL.md                      # 求解 skill 定义
    │   └── references/
    │       ├── solve-board.ts            # CLI 入口：读 input.json → 求解 → 写 output.json
    │       ├── solver.ts                 # Norvig 算法核心
    │       └── __tests__/
    │           └── solver.tests.ts
    └── rendering-sudoku/
        ├── SKILL.md                      # 渲染 skill 定义
        └── references/
            ├── render-board.ts           # ASCII 终端渲染
            └── __tests__/
                └── render-board.tests.ts
```

### 数据流

```
图片
  ↓ (decoding-sudoku: Claude 视觉识别)
/tmp/sudoku-input.json  { puzzle: "53..7....", n: 9 }
  ↓ 用户确认
  ↓ (solving-sudoku: solve-board.ts)
/tmp/sudoku-output.json { puzzle, solution: [[5,3,4,...],...], steps: [...] }
  ↓ (rendering-sudoku: invoke)
终端 ASCII 表格
```

### Solver 核心类型

```typescript
// 格子坐标："A1"-"I9"
type Cell = string;

// Grid: 每格的候选数字集合（用 string 表示，如 "123456789"）
type Grid = Map<Cell, string>;

// 推理步骤
interface Step {
  type: 'eliminate' | 'assign' | 'search';
  cell: Cell;
  digit: string;
  detail: string;  // 人类可读描述
}

// 求解结果
interface SolveResult {
  solution: number[][];  // 9×9 数字矩阵
  steps: Step[];
}

// 核心函数（Norvig Python 直译）
function cross(A: string[], B: string[]): string[]
function parseGrid(input: string): Grid | false
function eliminate(grid: Grid, s: Cell, d: string, steps: Step[]): Grid | false
function assign(grid: Grid, s: Cell, d: string, steps: Step[]): Grid | false
function search(grid: Grid, steps: Step[]): Grid | false
function solve(input: string): SolveResult | null
```

### 输入/输出格式

**input.json**（decoding 产出）：

```json
{
  "puzzle": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ]
}
```

- `puzzle`：9×9 二维数字数组（`number[][]`）
- `0` = 空格，`1-9` = 已知数
- 行优先（`puzzle[0]` 是第 1 行）
- `puzzle` 与 `output.solution` 同型（输入输出对称）

**output.json**（solving 产出）：

```json
{
  "puzzle": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0]
  ],
  "solution": [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ],
  "steps": [
    { "type": "assign", "cell": "A1", "digit": "5", "detail": "A1 assigned 5" },
    { "type": "eliminate", "cell": "A2", "digit": "5", "detail": "Eliminate 5 from A2 (same row as A1)" }
  ]
}
```

### CLI

```bash
# 求解
node_modules/.bin/tsx packages/sudoku/skills/solving-sudoku/references/solve-board.ts \
    /tmp/sudoku-input.json /tmp/sudoku-output.json

# 渲染（由 rendering-sudoku skill invoke 调用）
node_modules/.bin/tsx packages/sudoku/skills/rendering-sudoku/references/render-board.ts \
    /tmp/sudoku-output.json
```

### Rendering 输出

```
┌───────┬───────┬───────┐
│ 5 3 4 │ 6 7 8 │ 9 1 2 │
│ 6 7 2 │ 1 9 5 │ 3 4 8 │
│ 1 9 8 │ 3 4 2 │ 5 6 7 │
├───────┼───────┼───────┤
│ 8 5 9 │ 7 6 1 │ 4 2 3 │
│ 4 2 6 │ 8 5 3 │ 7 9 1 │
│ 7 1 3 │ 9 2 4 │ 8 5 6 │
├───────┼───────┼───────┤
│ 9 6 1 │ 5 3 7 │ 2 8 4 │
│ 2 8 7 │ 4 1 9 │ 6 3 5 │
│ 3 4 5 │ 2 8 6 │ 1 7 9 │
└───────┴───────┴───────┘
```

- 已知数（原题给定）：普通显示
- 推理数（constraint propagation 推出）：`*5` 星号前缀标记
- 搜索数（backtracking 推出）：`(5)` 括号标记

### Decoding Skill

decoding-sudoku 是纯 SKILL.md 指南，不含 CV 代码。Claude 视觉模型直接读取图像中的数独盘面：

1. 识别 9×9 网格结构
2. 逐行逐列读取已知数字
3. 将空格标记为 `0`
4. 输出 `/tmp/sudoku-input.json`（`puzzle` 为 9×9 二维数字数组）
5. **必须**请用户确认后再交给 solving

## 错误处理

**输入校验**（solve-board.ts 入口）：
- `puzzle` 不是数组 → stderr 报错，exit 1
- `puzzle` 行数 ≠ 9 → exit 1
- 包含越界值（< 0 或 > 9）或非整数 → 由 `parseGrid` 返回 false，CLI 透传为 exit 1
- 输入 JSON 缺 `puzzle` 字段 → exit 1

**求解失败**：
- 无解（约束冲突）→ output.json 中 `solution` 为 `null`，`steps` 记录冲突点
- exit code 0（程序本身无错），由 skill 层面处理

**渲染**：
- output.json 中 `solution` 为 `null` → 显示 "No solution found" + 最后几条 steps

## 测试

**位置**：各 skill 的 `references/__tests__/` 下

**Solver 测试**（核心）：
1. **单元测试**
   - `cross()` 函数正确性
   - `parseGrid()` 解析各种格式
   - `eliminate()` / `assign()` 单步行为
   - 约束传播的两个启发式
2. **集成测试**
   - 简单题（无需搜索，纯约束传播可解）
   - 中等题（需少量搜索）
   - 困难题（需深度搜索）
   - 世界最难数独（Arto Inkala 的 "Everest"）
3. **边界测试**
   - 无解题 → 返回 null
   - 空格全为 0 的空盘 → 正常求解
   - 已完成盘面 → 直接返回

**Rendering 测试**：
- 输出格式正确性（行数、列数、宫分隔线）
- null solution 的处理

**运行**：复用 `pnpm test`，更新 `package.json` 的 test 命令。

## 依赖

新增：
- 无外部依赖（solver 和 renderer 均为纯 TypeScript，无需 sharp 等 native 库）

理由：
- Norvig 算法只需 `Map` / 字符串操作 / 递归
- ASCII 渲染只需 `console.log`
- decoding 由 Claude 视觉模型完成，无需 CV 库
- 与 star-battle 不同，数独不需要图像处理

## 与 star-battle 的异同

| 维度 | star-battle | sudoku |
|------|-------------|--------|
| 求解算法 | 自定义策略集合 + 回溯 | Norvig 约束传播 + 回溯 |
| Decoding | sharp CV 特征提取 + Claude 识别 | Claude 视觉直读 |
| Rendering | 带 ★ 的网格 | ASCII 数字表格 |
| 外部依赖 | sharp | 无 |
| 策略复杂度 | 高（8+ 策略） | 低（2 个核心函数） |

## Skills 工作流

### solving-sudoku

```
拿到已确认的 /tmp/sudoku-input.json
  ↓
调 solve-board.ts → 写 /tmp/sudoku-output.json
  ↓
invoke rendering-sudoku /tmp/sudoku-output.json
```

### rendering-sudoku

```
读 output.json
  ↓
渲染 ASCII 表格到 stdout
```

### decoding-sudoku

```
用户提供数独图像
  ↓
Claude 视觉识别盘面
  ↓
写 /tmp/sudoku-input.json
  ↓
请用户确认
```

## YAGNI 边界（明确不做）

- 变体数独（杀手数独、对角数独、不等数独等）
- 多解检测/枚举所有解
- 难度评估/分级
- 提示系统（逐步引导而非直接给解）
- Web UI / GUI
- 图像自动定位/OCR（decoding 完全依赖 Claude 视觉模型）
- 求解动画/可视化过程
