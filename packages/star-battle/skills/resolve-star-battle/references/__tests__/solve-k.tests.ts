import test from 'node:test';
import assert from 'node:assert/strict';
import solve, {
  cellKey, getCounts, validateCounts, deriveCandidates,
  uniqueRegion, uniqueRow, saturationClear, rowColRegionLock, generalizedPair,
  GENERIC_STRATEGIES,
} from '../solver/solve-k.ts';
import type { BoardState, SolveContext } from '../solver/solve-k.ts';

type Cell = [number, number];

function ctxFromRegions(regions: number[][], k: number): SolveContext {
  const n = regions.length;
  const regionCells: Record<number, Cell[]> = {};
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) (regionCells[regions[i][j]] ??= []).push([i, j]);
  return { n, k, regionCells, numRegions: new Set(regions.flat()).size };
}

function rowsBoard(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, () => i));
}

function validateSolution(regions: number[][], solution: number[][], k: number): boolean {
  const n = regions.length;
  const stars: Cell[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (solution[r][c] === 1) stars.push([r, c]);
  const rowCount = new Array(n).fill(0), colCount = new Array(n).fill(0);
  const regCount: Record<number, number> = {};
  for (const [r, c] of stars) {
    rowCount[r]++; colCount[c]++;
    regCount[regions[r][c]] = (regCount[regions[r][c]] || 0) + 1;
  }
  if (rowCount.some(x => x !== k) || colCount.some(x => x !== k)) return false;
  for (const rid of new Set(regions.flat())) if ((regCount[rid] || 0) !== k) return false;
  for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
    const [r1, c1] = stars[i], [r2, c2] = stars[j];
    if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return false;
  }
  return true;
}

// ---------- 接口契约 ----------

test('solve-k:接口为 { solution, steps },签名 (regions, k)', () => {
  const { solution, steps } = solve(rowsBoard(5), 1);
  assert.ok(Array.isArray(solution) && Array.isArray(steps));
  assert.ok(steps.length > 0);
});

test('solve-k:k 默认 = 2', () => {
  // 不传 k 时按 k=2 求解
  const regions = rowsBoard(8);
  const { solution } = solve(regions);
  assert.ok(validateSolution(regions, solution, 2));
});

test('solve-k:n=0 空盘返回 { solution: [], steps }', () => {
  const { solution, steps } = solve([], 2);
  assert.deepEqual(solution, []);
  assert.ok(steps.length > 0);
});

// ---------- 通用辅助 ----------

test('solve-k:cellKey / getCounts / validateCounts / deriveCandidates 在任意 k 下工作', () => {
  const regions = [[0,0,0],[0,0,0],[0,0,0]];
  const ctx = ctxFromRegions(regions, 2);
  assert.equal(cellKey(2, 3), '2,3');
  // getCounts
  const { rowCount, colCount, regionCount } = getCounts([[0,0],[2,2]], ctx);
  assert.equal(rowCount[0], 1);
  assert.equal(colCount[2], 1);
  assert.equal(regionCount[0], 2);
  // validateCounts
  assert.equal(validateCounts({ stars: [[0,0],[0,1]], excluded: new Set() }, ctx), false);
  assert.equal(validateCounts({ stars: [[0,0],[2,2]], excluded: new Set() }, ctx), true);
  // deriveCandidates 排除星邻 / 已是星 / excluded
  const cand = deriveCandidates({ stars: [[0,0]], excluded: new Set([cellKey(2,2)]) }, ctx)[0];
  const keys = new Set(cand.map(([r,c]) => cellKey(r,c)));
  assert.ok(!keys.has('0,1') && !keys.has('1,0') && !keys.has('1,1'));
  assert.ok(!keys.has('0,0') && !keys.has('2,2'));
  assert.ok(keys.has('1,2') && keys.has('2,1'));
});

// ---------- 通用策略 ----------

test('uniqueRegion(任意 k):候选数 == need 时全部定星', () => {
  // k=2:区域 0 含 4 格,放 (0,0) 后 need=1,候选只剩 (0,2) → 定 1 颗
  const regions = [[0,0,0,0],[1,1,1,1],[2,2,2,2],[3,3,3,3]];
  const ctx = ctxFromRegions(regions, 2);
  const state: BoardState = { stars: [[0,0]], excluded: new Set([cellKey(0,3)]) };
  const res = uniqueRegion.run(state, ctx);
  assert.ok(res?.newStars && res.newStars.length === 1);
  assert.deepEqual(res!.newStars![0], [0, 2]);
});

test('uniqueRegion(k=3):候选数 = 3 = need → 三颗全定', () => {
  // 区域 0 = 行 0 整行(7 格),candidates 经 excluded 限定为 (0,0)(0,3)(0,6) 三格,
  // 互不 king-相邻 → 3 颗全定。
  const regions = Array.from({ length: 7 }, (_, i) => Array.from({ length: 7 }, () => i));
  const ctx = ctxFromRegions(regions, 3);
  const ex = new Set<string>();
  // 排除区域 0 中除 (0,0)(0,3)(0,6) 外的所有格
  for (let c = 0; c < 7; c++) if (![0,3,6].includes(c)) ex.add(cellKey(0, c));
  const state: BoardState = { stars: [], excluded: ex };
  const res = uniqueRegion.run(state, ctx);
  assert.ok(res?.newStars);
  const starKeys = new Set(res!.newStars!.map(([r,c]) => cellKey(r,c)));
  assert.ok(starKeys.has('0,0') && starKeys.has('0,3') && starKeys.has('0,6'));
});

test('uniqueRow(任意 k):行候选数 = need → 全部定星', () => {
  // 行 0 候选恰 2 个 = k → 全定
  const regions = [[0,1,1,0],[2,2,2,2],[3,3,3,3],[4,4,4,4]];
  const ctx = ctxFromRegions(regions, 2);
  // 行 0 中只剩 (0,0)(0,3) 两个候选(已 excluded 中间)
  const state: BoardState = { stars: [], excluded: new Set([cellKey(0,1), cellKey(0,2)]) };
  const res = uniqueRow.run(state, ctx);
  assert.ok(res?.newStars && res.newStars.length === 2);
});

test('saturationClear(任意 k):星 8 邻 + 满线/区 划 X', () => {
  const regions = [[0,0,0],[0,0,0],[0,0,0]];
  const ctx = ctxFromRegions(regions, 2);
  const state: BoardState = { stars: [[0,0]], excluded: new Set() };
  const res = saturationClear.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,1') && ex.has('1,0') && ex.has('1,1'));
});

test('rowColRegionLock:区域候选全在一行 → 该行他区格 X', () => {
  const regions = [[0,0,1],[1,1,1],[2,2,2]];
  const ctx = ctxFromRegions(regions, 2);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = rowColRegionLock.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,2'));
});

test('rowColRegionLock 保解:区域已放线外星不锁定', () => {
  // k=2 复用既有保解回归(修复 2 等价)
  const regions = [
    [0, 0, 1, 1],
    [3, 3, 3, 3],
    [0, 1, 1, 1],
    [2, 2, 2, 2],
  ];
  const ctx = ctxFromRegions(regions, 2);
  const state: BoardState = { stars: [[2, 0]], excluded: new Set() };
  const res = rowColRegionLock.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r, c]) => cellKey(r, c)));
  assert.ok(!ex.has('0,2') && !ex.has('0,3'));
});

test('generalizedPair:k 区域恰占 k 条线 → 他区格划 X', () => {
  const regions = [
    [0,0,3,3],
    [1,1,3,3],
    [2,2,2,2],
    [4,4,4,4],
  ];
  const ctx = ctxFromRegions(regions, 2);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = generalizedPair.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,2') && ex.has('0,3') && ex.has('1,2') && ex.has('1,3'));
});

// ---------- 端到端:多 k ----------

test('solve-k(k=2):rowsBoard(8) 求出合法解(纯通用策略 + 回溯)', () => {
  // rowsBoard(n) k=2 在 n>=8 才有解(数学约束)
  const regions = rowsBoard(8);
  const { solution } = solve(regions, 2);
  assert.ok(validateSolution(regions, solution, 2));
});

test('solve-k(k=1):rowsBoard(5) 求出合法解', () => {
  const regions = rowsBoard(5);
  const { solution } = solve(regions, 1);
  assert.ok(validateSolution(regions, solution, 1));
});

test('solve-k(k=3):接口契约 + 不产出非法解', () => {
  // k=3 端到端有解的 rowsBoard 需 n 很大(实测 n<=11 无解,n=11 已 ~190 秒),
  // 不适合作为快速测试盘。这里仅验证:k=3 下入口接口稳定、若有解则合法。
  // (k=3 通用性主要由 uniqueRegion(k=3) 单元测试覆盖。)
  const regions = rowsBoard(7);
  const { solution, steps } = solve(regions, 3);
  assert.ok(Array.isArray(solution) && Array.isArray(steps));
  const solved = solution.some(row => row.some(c => c === 1));
  if (solved) assert.ok(validateSolution(regions, solution, 3));
});

test('solve-k:无解盘 [[0,0],[0,0]] k=2 返回无解', () => {
  const { solution } = solve([[0,0],[0,0]], 2);
  assert.ok(!solution.some(row => row.some(c => c === 1)));
});

// ---------- 顺序守卫 ----------

test('GENERIC_STRATEGIES 名字顺序固定', () => {
  assert.deepEqual(
    GENERIC_STRATEGIES.map(s => s.name),
    ['uniqueRegion','uniqueRow','uniqueCol','saturationClear','rowColRegionLock','generalizedPair']
  );
});
