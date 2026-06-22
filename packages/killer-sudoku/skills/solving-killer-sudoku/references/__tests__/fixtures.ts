// 测试数据和验证函数

import type { Cage, KillerSudokuInput } from '../solver.ts';

// ── 已知解（用于生成测试用例）─────────────────────────────────────────

const SOLUTION = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 1, 5, 6, 4, 8, 9, 7],
  [5, 6, 4, 8, 9, 7, 2, 3, 1],
  [8, 9, 7, 2, 3, 1, 5, 6, 4],
  [3, 1, 2, 6, 4, 5, 9, 7, 8],
  [6, 4, 5, 9, 7, 8, 3, 1, 2],
  [9, 7, 8, 3, 1, 2, 6, 4, 5],
] as const;

// ── 笼定义（覆盖所有 81 格）──────────────────────────────────────────

// 简单谜题：许多单格笼（直接给出数字）
const EASY_CAGES: Cage[] = [
  // 单格笼（直接给出）
  { cells: [[0, 0]], sum: 1 },
  { cells: [[0, 1]], sum: 2 },
  { cells: [[0, 2]], sum: 3 },
  { cells: [[1, 0]], sum: 4 },
  { cells: [[1, 1]], sum: 5 },
  { cells: [[2, 0]], sum: 7 },
  { cells: [[2, 1]], sum: 8 },
  { cells: [[2, 2]], sum: 9 },
  { cells: [[3, 0]], sum: 2 },
  { cells: [[4, 0]], sum: 5 },
  { cells: [[5, 0]], sum: 8 },
  { cells: [[6, 0]], sum: 3 },
  { cells: [[7, 0]], sum: 6 },
  { cells: [[8, 0]], sum: 9 },

  // 2 格笼
  { cells: [[0, 3], [0, 4]], sum: 9 },        // 4+5
  { cells: [[0, 5], [1, 5]], sum: 15 },       // 6+9
  { cells: [[0, 6], [1, 6]], sum: 8 },        // 7+1
  { cells: [[0, 7], [1, 7]], sum: 10 },       // 8+2
  { cells: [[0, 8], [1, 8]], sum: 12 },       // 9+3
  { cells: [[1, 2], [1, 3]], sum: 13 },       // 6+7
  { cells: [[1, 4], [2, 4]], sum: 10 },       // 8+2
  { cells: [[2, 3], [2, 5]], sum: 4 },        // 1+3
  { cells: [[2, 6], [2, 7]], sum: 9 },        // 4+5
  { cells: [[2, 8], [3, 8]], sum: 13 },       // 6+7
  { cells: [[3, 1], [3, 2]], sum: 4 },        // 3+1
  { cells: [[3, 3], [3, 4]], sum: 11 },       // 5+6
  { cells: [[3, 5], [3, 6]], sum: 12 },       // 4+8
  { cells: [[3, 7], [4, 7]], sum: 12 },       // 9+3
  { cells: [[4, 1], [4, 2]], sum: 10 },       // 6+4
  { cells: [[4, 3], [4, 4]], sum: 17 },       // 8+9
  { cells: [[4, 5], [4, 6]], sum: 9 },        // 7+2
  { cells: [[4, 8], [5, 8]], sum: 5 },        // 1+4
  { cells: [[5, 1], [5, 2]], sum: 16 },       // 9+7
  { cells: [[5, 3], [5, 4]], sum: 5 },        // 2+3
  { cells: [[5, 5], [5, 6]], sum: 6 },        // 1+5
  { cells: [[5, 7], [6, 7]], sum: 13 },       // 6+7
  { cells: [[6, 1], [6, 2]], sum: 3 },        // 1+2
  { cells: [[6, 3], [6, 4]], sum: 10 },       // 6+4
  { cells: [[6, 5], [6, 6]], sum: 14 },       // 5+9
  { cells: [[6, 8], [7, 8]], sum: 10 },       // 8+2
  { cells: [[7, 1], [7, 2]], sum: 9 },        // 4+5
  { cells: [[7, 3], [7, 4]], sum: 16 },       // 9+7
  { cells: [[7, 5], [7, 6]], sum: 11 },       // 8+3
  { cells: [[7, 7], [8, 7]], sum: 5 },        // 1+4
  { cells: [[8, 1], [8, 2]], sum: 15 },       // 7+8
  { cells: [[8, 3], [8, 4]], sum: 4 },        // 3+1
  { cells: [[8, 5], [8, 6]], sum: 8 },        // 2+6
  { cells: [[8, 8]], sum: 5 },
];

// 中等谜题：更多 2-3 格笼
const MEDIUM_CAGES: Cage[] = [
  // 第一宫
  { cells: [[0, 0], [0, 1]], sum: 3 },        // 1+2
  { cells: [[0, 2], [1, 2]], sum: 9 },        // 3+6
  { cells: [[1, 0], [1, 1]], sum: 9 },        // 4+5
  { cells: [[2, 0], [2, 1], [2, 2]], sum: 24 }, // 7+8+9

  // 第二宫
  { cells: [[0, 3], [0, 4], [0, 5]], sum: 15 }, // 4+5+6
  { cells: [[1, 3], [1, 4]], sum: 15 },       // 7+8
  { cells: [[1, 5], [2, 5]], sum: 12 },       // 9+3
  { cells: [[2, 3], [2, 4]], sum: 3 },        // 1+2

  // 第三宫
  { cells: [[0, 6], [0, 7]], sum: 15 },       // 7+8
  { cells: [[0, 8], [1, 8], [2, 8]], sum: 18 }, // 9+3+6
  { cells: [[1, 6], [1, 7]], sum: 3 },        // 1+2
  { cells: [[2, 6], [2, 7]], sum: 9 },        // 4+5

  // 第四宫
  { cells: [[3, 0], [3, 1]], sum: 5 },        // 2+3
  { cells: [[3, 2], [4, 2]], sum: 5 },        // 1+4
  { cells: [[4, 0], [4, 1]], sum: 11 },       // 5+6
  { cells: [[5, 0], [5, 1], [5, 2]], sum: 24 }, // 8+9+7

  // 第五宫
  { cells: [[3, 3], [3, 4], [3, 5]], sum: 15 }, // 5+6+4
  { cells: [[4, 3], [4, 4]], sum: 17 },       // 8+9
  { cells: [[4, 5], [5, 5]], sum: 8 },        // 7+1
  { cells: [[5, 3], [5, 4]], sum: 5 },        // 2+3

  // 第六宫
  { cells: [[3, 6], [3, 7]], sum: 17 },       // 8+9
  { cells: [[3, 8], [4, 8], [5, 8]], sum: 12 }, // 7+1+4
  { cells: [[4, 6], [4, 7]], sum: 5 },        // 2+3
  { cells: [[5, 6], [5, 7]], sum: 11 },       // 5+6

  // 第七宫
  { cells: [[6, 0], [6, 1]], sum: 4 },        // 3+1
  { cells: [[6, 2], [7, 2]], sum: 7 },        // 2+5
  { cells: [[7, 0], [7, 1]], sum: 10 },       // 6+4
  { cells: [[8, 0], [8, 1], [8, 2]], sum: 24 }, // 9+7+8

  // 第八宫
  { cells: [[6, 3], [6, 4], [6, 5]], sum: 15 }, // 6+4+5
  { cells: [[7, 3], [7, 4]], sum: 16 },       // 9+7
  { cells: [[7, 5], [8, 5]], sum: 10 },       // 8+2
  { cells: [[8, 3], [8, 4]], sum: 4 },        // 3+1

  // 第九宫
  { cells: [[6, 6], [6, 7]], sum: 16 },       // 9+7
  { cells: [[6, 8], [7, 8], [8, 8]], sum: 15 }, // 8+2+5
  { cells: [[7, 6], [7, 7]], sum: 4 },        // 3+1
  { cells: [[8, 6], [8, 7]], sum: 10 },       // 6+4
];

// ── 测试输入 ─────────────────────────────────────────────────────────

export const EASY_PUZZLE: KillerSudokuInput = {
  puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
  cages: EASY_CAGES,
};

export const MEDIUM_PUZZLE: KillerSudokuInput = {
  puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
  cages: MEDIUM_CAGES,
};

// 不可解谜题：笼和值与解不匹配
export const UNSOLVABLE_PUZZLE: KillerSudokuInput = {
  puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
  cages: [
    // 故意制造冲突：2 格笼和值 = 3（只能 {1,2}）
    // 但放在同一行，会与行约束冲突
    { cells: [[0, 0], [0, 1]], sum: 17 },     // 8+9，但与下面冲突
    { cells: [[0, 2], [0, 3]], sum: 17 },     // 8+9，同一行不能有两个 8 和 9
    // 填充剩余格（使用无效和值）
    ...Array.from({ length: 77 }, (_, i) => ({
      cells: [[Math.floor((i + 4) / 9), (i + 4) % 9]] as [number, number][],
      sum: 1,
    })),
  ],
};

// ── 验证函数 ─────────────────────────────────────────────────────────

export function validateSolution(
  input: KillerSudokuInput,
  solution: number[][]
): boolean {
  // 检查尺寸
  if (solution.length !== 9) return false;
  for (const row of solution) {
    if (row.length !== 9) return false;
    for (const v of row) {
      if (!Number.isInteger(v) || v < 1 || v > 9) return false;
    }
  }

  // 检查行不重复
  for (let r = 0; r < 9; r++) {
    const row = solution[r];
    if (new Set(row).size !== 9) return false;
  }

  // 检查列不重复
  for (let c = 0; c < 9; c++) {
    const col = solution.map(row => row[c]);
    if (new Set(col).size !== 9) return false;
  }

  // 检查宫不重复
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const box: number[] = [];
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          box.push(solution[r][c]);
        }
      }
      if (new Set(box).size !== 9) return false;
    }
  }

  // 检查笼和值
  for (const cage of input.cages) {
    let sum = 0;
    const digits = new Set<number>();
    for (const [r, c] of cage.cells) {
      const v = solution[r][c];
      sum += v;
      digits.add(v);
    }
    if (sum !== cage.sum) return false;
    // 检查笼内不重复
    if (digits.size !== cage.cells.length) return false;
  }

  // 检查与预填线索一致
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (input.puzzle[r][c] !== 0 && input.puzzle[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }

  return true;
}

export function puzzleToString(puzzle: number[][]): string {
  return puzzle.map(row => row.join(' ')).join('\n');
}

export const SOLUTION_ARRAY = SOLUTION.map(row => [...row]);
