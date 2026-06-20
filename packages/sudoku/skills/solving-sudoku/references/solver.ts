// Norvig Sudoku solver — TypeScript port
// See http://norvig.com/sudoku.html

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
export const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

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
