// Shared test fixtures: Sudoku puzzles and expected solutions

// Norvig's classic hard puzzle:
// 53..7.... 6..195... .98....6. 8...6...3 4..8.3..1 7...2...6 6....28.. ..419..5. ...8..79
export const HARD_PUZZLE: number[][] = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

// Expected solution for the hard puzzle
export const HARD_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
] as const;

// Easy puzzle: constraint propagation only, no backtracking
// 4.....8.5 .3....... ...7..... .2.....6. ....8.4.. ....1.... ...6.3.7. 5..2..... 1.4......
export const EASY_PUZZLE: number[][] = [
  [4, 0, 0, 0, 0, 0, 8, 0, 5],
  [0, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 7, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 6, 0],
  [0, 0, 0, 0, 8, 0, 4, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 6, 0, 3, 0, 7, 0],
  [5, 0, 0, 2, 0, 0, 0, 0, 0],
  [1, 0, 4, 0, 0, 0, 0, 0, 0],
];

// Arto Inkala "AI Escargot" (2006), once called the hardest sudoku in the world
// Replaced the corrupted 77-char string with the valid 81-char "AI Escargot" grid
// 800000000 003600000 070090200 050007000 000045700 000100030 001000068 008500010 090000400
export const INKALA_PUZZLE: number[][] = [
  [8, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 6, 0, 0, 0, 0, 0],
  [0, 7, 0, 0, 9, 0, 2, 0, 0],
  [0, 5, 0, 0, 0, 7, 0, 0, 0],
  [0, 0, 0, 0, 4, 5, 7, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 3, 0],
  [0, 0, 1, 0, 0, 0, 0, 6, 8],
  [0, 0, 8, 5, 0, 0, 0, 1, 0],
  [0, 9, 0, 0, 0, 0, 4, 0, 0],
];

// Unsolvable puzzle: no parse-time conflict, but search reveals no solution
// EASY_PUZZLE 的 A2 由 0 改为 9（无解但解析期无冲突）
export const UNSOLVABLE_PUZZLE: number[][] = [
  [4, 9, 0, 0, 0, 0, 8, 0, 5],
  [0, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 7, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 6, 0],
  [0, 0, 0, 0, 8, 0, 4, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 6, 0, 3, 0, 7, 0],
  [5, 0, 0, 2, 0, 0, 0, 0, 0],
  [1, 0, 4, 0, 0, 0, 0, 0, 0],
];

// Validate a sudoku solution (each row/col/box has digits 1-9 exactly once)
export function validateSolution(sol: number[][]): boolean {
  if (sol.length !== 9) return false;
  for (const row of sol) {
    if (row.length !== 9) return false;
    const s = new Set(row);
    if (s.size !== 9 || [...s].some(v => v < 1 || v > 9)) return false;
  }
  for (let c = 0; c < 9; c++) {
    const s = new Set(sol.map(r => r[c]));
    if (s.size !== 9) return false;
  }
  for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
    const s = new Set<number>();
    for (let r = br * 3; r < br * 3 + 3; r++)
      for (let c = bc * 3; c < bc * 3 + 3; c++)
        s.add(sol[r][c]);
    if (s.size !== 9) return false;
  }
  return true;
}

// 调试工具：把 2D 数组还原为 81 字符字符串。空格为 . 。
export function puzzleToString(p: number[][]): string {
  return p.map(row =>
    row.map(v => v === 0 ? '.' : String(v)).join('')
  ).join('');
}
