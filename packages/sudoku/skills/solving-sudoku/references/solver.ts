// Norvig Sudoku solver — TypeScript port
// See http://norvig.com/sudoku.html

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
export const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export type Cell = string;  // "A1" - "I9"
export type Grid = Map<Cell, string>;  // 候选数字集合，如 "123456789"
export type Digit = string;  // "1" - "9"

export interface Step {
  type: 'eliminate' | 'assign' | 'search';
  cell: Cell;
  digit: Digit;
  detail: string;
}

export interface SolveResult {
  solution: number[][];
  steps: Step[];
}

export function cross(A: readonly string[], B: readonly string[]): string[] {
  const result: string[] = [];
  for (const a of A) for (const b of B) result.push(a + b);
  return result;
}

// 81 个格子
export const squares: readonly string[] = cross(ROWS, COLS);

// 27 个 unit：9 行 + 9 列 + 9 宫
export const unitList: string[][] = [
  // 9 行
  ...ROWS.map(r => cross([r], COLS)),
  // 9 列
  ...COLS.map(c => cross(ROWS, [c])),
  // 9 宫
  ...(['ABC', 'DEF', 'GHI'] as const).flatMap(rs =>
    (['123', '456', '789'] as const).map(cs => cross(rs.split(''), cs.split('')))
  ),
];

// 索引：每个格子所在的所有 unit
export const units: Map<string, string[][]> = new Map();
for (const s of squares) {
  units.set(s, unitList.filter(u => u.includes(s)));
}

// 索引：每个格子的同伴（所在所有 unit 的并集去重去自身）
export const peers: Map<string, string[]> = new Map();
for (const s of squares) {
  const set = new Set<string>();
  for (const u of units.get(s)!) {
    for (const p of u) if (p !== s) set.add(p);
  }
  peers.set(s, [...set]);
}

export const DIGITS = '123456789';

// 解析 9×9 二维数组题面为 Grid。返回 false 表示有冲突或形状错误。
// 0 = 空格, 1-9 = 已知数。行优先（puzzle[0] 是第 1 行）。
export function parseGrid(input: number[][]): Grid | false {
  // 严格 9×9 形状校验
  if (!Array.isArray(input) || input.length !== 9) return false;
  for (const row of input) {
    if (!Array.isArray(row) || row.length !== 9) return false;
    for (const v of row) {
      if (!Number.isInteger(v) || v < 0 || v > 9) return false;
    }
  }
  // 构造 Grid：每格先填满候选，对已知数字格 assign
  const grid: Grid = new Map();
  for (const s of squares) grid.set(s, DIGITS);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = input[r][c];
      if (v === 0) continue;  // 0 = 空格
      const s = squares[r * 9 + c];
      const ok = assign(grid, s, String(v), []);
      if (ok === false) return false;
    }
  }
  return grid;
}

// 把格子 s 确定为数字 d：从 s 候选中删除所有 ≠ d 的值；从 s 的同伴中删除 d。
// 任一操作使候选变空则返回 false。
export function assign(grid: Grid, s: Cell, d: Digit, steps: Step[]): Grid | false {
  const candidates = grid.get(s)!;
  // 如果 s 已经是 d，重复 assign：直接成功，不记录步骤
  if (candidates === d) return grid;
  // d 不在候选中 → 冲突（之前已被同伴消除）
  if (!candidates.includes(d)) return false;
  // 从 s 候选中删除所有 ≠ d 的值
  const otherValues = candidates.replace(d, '');
  for (const d2 of otherValues) {
    const ok = eliminate(grid, s, d2, steps);
    if (ok === false) return false;
  }
  // 此时 grid.get(s) === d
  steps.push({ type: 'assign', cell: s, digit: d, detail: `${s} = ${d}` });
  return grid;
}

// 从 s 的候选中删除数字 d；若 s 只剩一个候选，从所有同伴中消除该值。
// Task 6 扩展为完整约束传播。
export function eliminate(grid: Grid, s: Cell, d: Digit, steps: Step[]): Grid | false {
  // d 已不在候选中：no-op
  if (!grid.get(s)!.includes(d)) return grid;

  // 更新候选
  const newVals = grid.get(s)!.replace(d, '');
  grid.set(s, newVals);

  // 启发式 1a：候选变空 → 冲突
  if (newVals.length === 0) return false;

  // 启发式 1b：候选只剩一个值 → 对同伴 eliminate 这个值
  if (newVals.length === 1) {
    const d2 = newVals;
    for (const p of peers.get(s)!) {
      const ok = eliminate(grid, p, d2, steps);
      if (ok === false) return false;
    }
  }

  // 启发式 2：对于 s 所在的每个 unit，检查数字 d 是否只剩一个格子可放
  for (const u of units.get(s)!) {
    const dPlaces: Cell[] = [];
    for (const cell of u) {
      if (grid.get(cell)!.includes(d)) dPlaces.push(cell);
    }
    if (dPlaces.length === 0) {
      // d 在该 unit 中无处可放 → 冲突
      return false;
    }
    if (dPlaces.length === 1) {
      // d 在该 unit 中仅出现于 dPlaces[0] → 该格必为 d
      const ok = assign(grid, dPlaces[0], d, steps);
      if (ok === false) return false;
    }
  }

  return grid;
}

// ─── search / solve ───────────────────────────────────────

// 把 Grid 转换为 9×9 数字矩阵（每格候选应已收敛到单值）
function gridToMatrix(grid: Grid): number[][] {
  return ROWS.map(r => COLS.map(c => Number(grid.get(r + c))));
}

// 把 Grid 序列化为可深拷贝的形式（用对象）
function gridToObject(grid: Grid): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of grid) obj[k] = v;
  return obj;
}

function objectToGrid(obj: Record<string, string>): Grid {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, obj[s]);
  return g;
}

// 回溯搜索：从候选数最少（>1）的格子分支
export function search(grid: Grid, steps: Step[]): Grid | false {
  // 检查所有格子是否都已确定（候选长度 1）
  let unsolved: Cell | null = null;
  let minCount = 10;
  for (const s of squares) {
    const len = grid.get(s)!.length;
    if (len > 1 && len < minCount) {
      minCount = len;
      unsolved = s;
    }
  }
  if (unsolved === null) {
    // 全部确定
    return grid;
  }
  // 分支：在 unsolved 候选中逐值尝试
  const snapshot = gridToObject(grid);
  for (const d of grid.get(unsolved)!) {
    steps.push({
      type: 'search',
      cell: unsolved,
      digit: d,
      detail: `try ${unsolved} = ${d}`,
    });
    const copy = objectToGrid(snapshot);
    const assigned = assign(copy, unsolved, d, steps);
    if (assigned !== false) {
      const result = search(assigned, steps);
      if (result !== false) return result;
    }
  }
  return false;
}

// 入口：解析 + 约束传播 + 搜索。返回 { solution, steps } 或 null。
export function solve(input: number[][]): SolveResult | null {
  const grid = parseGrid(input);
  if (grid === false) return null;
  const steps: Step[] = [];
  const result = search(grid, steps);
  if (result === false) return null;
  return {
    solution: gridToMatrix(result),
    steps,
  };
}

