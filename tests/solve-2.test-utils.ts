import { cellKey } from '../src/solve-2.ts';
import type { SolveContext } from '../src/solve-2.ts';

export type Cell = [number, number];

export function ctxFromRegions(regions: number[][], k = 2): SolveContext {
  const n = regions.length;
  const regionCells: Record<number, [number, number][]> = {};
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) (regionCells[regions[i][j]] ??= []).push([i, j]);
  return { n, k, regionCells, numRegions: new Set(regions.flat()).size };
}

// regions[i][j] = i:每个区域就是第 i 行(区域约束 = 行约束),保证可解。
export function rowsBoard(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, () => i));
}

// colsBoard: regions[i][j] = j,每列一个区域
export function colsBoard(n: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, (_, j) => j));
}

// 校验 solution 是否为合法解:每行/列/区域恰 k 星,无两星 king-相邻。
export function validateSolution(regions: number[][], solution: number[][], k = 2): boolean {
  const n = regions.length;
  const stars: Cell[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (solution[r][c] === 1) stars.push([r, c]);
  const rowCount = new Array(n).fill(0), colCount = new Array(n).fill(0);
  const regCount: Record<number, number> = {};
  for (const [r, c] of stars) { rowCount[r]++; colCount[c]++; regCount[regions[r][c]] = (regCount[regions[r][c]] || 0) + 1; }
  if (rowCount.some(x => x !== k) || colCount.some(x => x !== k)) return false;
  for (const rid of new Set(regions.flat())) if ((regCount[rid] || 0) !== k) return false;
  for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
    const [r1, c1] = stars[i], [r2, c2] = stars[j];
    if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return false;
  }
  return true;
}

// 构造 excluded:排除 keep 之外的所有格(用于精确塑形候选集)
export function excludeAllExcept(n: number, keep: [number, number][]): Set<string> {
  const keepSet = new Set(keep.map(([r, c]) => cellKey(r, c)));
  const ex = new Set<string>();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!keepSet.has(cellKey(r, c))) ex.add(cellKey(r, c));
  }
  return ex;
}
