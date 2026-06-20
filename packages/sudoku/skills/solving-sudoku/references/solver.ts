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

// 解析 81 字符题面为 Grid。返回 false 表示有冲突或格式错误。
export function parseGrid(input: string): Grid | false {
  // 长度必须为 81
  if (input.length !== 81) return false;

  // 把 ".0" 都视为空
  const normalized = input.replace(/0/g, '.');

  // 字符集校验
  for (const ch of normalized) {
    if (ch !== '.' && !DIGITS.includes(ch)) return false;
  }

  // 构造 Grid：每格先填满候选，再对已知数字格做 assign
  const grid: Grid = new Map();
  for (const s of squares) grid.set(s, DIGITS);

  for (const [i, ch] of [...normalized].entries()) {
    if (ch === '.') continue;
    const s = squares[i];
    const ok = assign(grid, s, ch, []);
    if (ok === false) return false;
  }
  return grid;
}

// 临时 stub，Task 5 完整实现（仅设置格子值，不检测冲突）
function assign(grid: Grid, s: Cell, d: Digit, _steps: Step[]): Grid | false {
  grid.set(s, d);
  return grid;
}

