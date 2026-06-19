// Star Battle 通用求解器骨架（任意 k）
//
// 提供 solve-k 风格的"通用结构 + 通用策略集合 + 调度 / 回溯"，由各 k 特化求解器
// （solve-2.ts、solve.ts）复用。特化策略（regionShapeEnum / forcedChain /
// hiddenLineGroup 等）在各自文件中实现并通过 strategies 注入。

export interface SolveResult {
  solution: number[][];
  steps: string[];
}

export type Cell = [number, number];

export interface BoardState {
  stars: Cell[];
  excluded: Set<string>;
}

export interface SolveContext {
  n: number;
  k: number;
  regionCells: Record<number, Cell[]>;
  numRegions: number;
}

export interface StrategyResult {
  newStars?: Cell[];
  newExcluded?: Cell[];
  step: string;
}

export interface Strategy {
  name: string;
  run: (state: BoardState, ctx: SolveContext) => StrategyResult | null;
}

// ---------- 公共辅助 ----------

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

// 由 ctx.regionCells 反查 (r,c) 所属区域 id
function regionAt(ctx: SolveContext, r: number, c: number): number {
  for (const [ridStr, cells] of Object.entries(ctx.regionCells)) {
    if (cells.some(([cr, cc]) => cr === r && cc === c)) return Number(ridStr);
  }
  return -1;
}

export function getCounts(stars: Cell[], ctx: SolveContext) {
  const rowCount = new Array(ctx.n).fill(0);
  const colCount = new Array(ctx.n).fill(0);
  const regionCount: Record<number, number> = {};
  for (const [r, c] of stars) {
    rowCount[r]++;
    colCount[c]++;
    const rid = regionAt(ctx, r, c);
    regionCount[rid] = (regionCount[rid] || 0) + 1;
  }
  return { rowCount, colCount, regionCount };
}

export function validateCounts(state: BoardState, ctx: SolveContext): boolean {
  const { rowCount, colCount, regionCount } = getCounts(state.stars, ctx);
  if (rowCount.some(x => x > ctx.k) || colCount.some(x => x > ctx.k)) return false;
  for (const ridStr of Object.keys(ctx.regionCells)) {
    if ((regionCount[Number(ridStr)] || 0) > ctx.k) return false;
  }
  for (let i = 0; i < state.stars.length; i++) {
    for (let j = i + 1; j < state.stars.length; j++) {
      const [r1, c1] = state.stars[i], [r2, c2] = state.stars[j];
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return false;
    }
  }
  return true;
}

export function deriveCandidates(state: BoardState, ctx: SolveContext): Record<number, Cell[]> {
  const { rowCount, colCount, regionCount } = getCounts(state.stars, ctx);
  const result: Record<number, Cell[]> = {};
  for (const [ridStr, cells] of Object.entries(ctx.regionCells)) {
    const rid = Number(ridStr);
    if ((regionCount[rid] || 0) >= ctx.k) continue;
    const valid: Cell[] = [];
    for (const [r, c] of cells) {
      if (state.excluded.has(cellKey(r, c))) continue;
      if (state.stars.some(([sr, sc]) => sr === r && sc === c)) continue;
      if (rowCount[r] >= ctx.k || colCount[c] >= ctx.k) continue;
      if (state.stars.some(([sr, sc]) => Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
      valid.push([r, c]);
    }
    result[rid] = valid;
  }
  return result;
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
}

// 从 cells 选 need 个互不 king-相邻的合法放法
export function enumeratePlacements(cells: Cell[], need: number): Cell[][] {
  const out: Cell[][] = [];
  const pick = (start: number, chosen: Cell[]) => {
    if (chosen.length === need) { out.push([...chosen]); return; }
    for (let i = start; i < cells.length; i++) {
      if (chosen.some(p => isAdjacent(p, cells[i]))) continue;
      chosen.push(cells[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  return out;
}

export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(combo => [first, ...combo]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// ---------- 通用策略（任意 k） ----------

// 区域候选数恰等于剩余需放数 → 全部定星。need=1 时退化为"区域仅 1 候选"。
export const uniqueRegion: Strategy = {
  name: 'uniqueRegion',
  run(state, ctx) {
    const cand = deriveCandidates(state, ctx);
    const { regionCount } = getCounts(state.stars, ctx);
    for (const [ridStr, cells] of Object.entries(cand)) {
      const rid = Number(ridStr);
      const need = ctx.k - (regionCount[rid] || 0);
      if (need <= 0) continue;
      if (cells.length === need) {
        return {
          newStars: cells.map(([r, c]) => [r, c] as Cell),
          step: need === 1
            ? `[唯一] 区域 ${ridStr} 仅剩候选 (${cells[0][0]},${cells[0][1]}) → 定星`
            : `[唯一] 区域 ${ridStr} 候选数 ${need} 等于剩余需放数 → 全部定星 ${cells.map(([r, c]) => `(${r},${c})`).join('')}`,
        };
      }
    }
    return null;
  },
};

function uniqueLine(axis: 'row' | 'col'): Strategy {
  return {
    name: axis === 'row' ? 'uniqueRow' : 'uniqueCol',
    run(state, ctx) {
      const cand = deriveCandidates(state, ctx);
      const { rowCount, colCount } = getCounts(state.stars, ctx);
      for (let i = 0; i < ctx.n; i++) {
        const used = (axis === 'row' ? rowCount : colCount)[i];
        const need = ctx.k - used;
        if (need <= 0) continue;
        const hits: Cell[] = [];
        for (const cells of Object.values(cand)) {
          for (const [r, c] of cells) if ((axis === 'row' ? r : c) === i) hits.push([r, c]);
        }
        if (hits.length === need) {
          const label = axis === 'row' ? '行' : '列';
          return {
            newStars: hits.map(([r, c]) => [r, c] as Cell),
            step: need === 1
              ? `[唯一] ${label} ${i} 仅剩候选 (${hits[0][0]},${hits[0][1]}) → 定星`
              : `[唯一] ${label} ${i} 候选数 ${need} 等于剩余需放数 → 全部定星 ${hits.map(([r, c]) => `(${r},${c})`).join('')}`,
          };
        }
      }
      return null;
    },
  };
}

export const uniqueRow = uniqueLine('row');
export const uniqueCol = uniqueLine('col');

export const saturationClear: Strategy = {
  name: 'saturationClear',
  run(state, ctx) {
    const newExcluded: Cell[] = [];
    const seen = new Set<string>();
    const add = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= ctx.n || c >= ctx.n) return;
      const key = cellKey(r, c);
      if (state.excluded.has(key)) return;
      if (state.stars.some(([sr, sc]) => sr === r && sc === c)) return;
      if (seen.has(key)) return;
      seen.add(key);
      newExcluded.push([r, c]);
    };
    // 1. 星的 8 邻格
    for (const [sr, sc] of state.stars) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        add(sr + dr, sc + dc);
      }
    }
    // 2. 已满 k 星的行 / 列 / 区域,其余格
    const { rowCount, colCount, regionCount } = getCounts(state.stars, ctx);
    for (let r = 0; r < ctx.n; r++) if (rowCount[r] >= ctx.k) for (let c = 0; c < ctx.n; c++) add(r, c);
    for (let c = 0; c < ctx.n; c++) if (colCount[c] >= ctx.k) for (let r = 0; r < ctx.n; r++) add(r, c);
    for (const [ridStr, cells] of Object.entries(ctx.regionCells)) {
      if ((regionCount[Number(ridStr)] || 0) >= ctx.k) for (const [r, c] of cells) add(r, c);
    }
    if (newExcluded.length === 0) return null;
    return { newExcluded, step: `[清除] 根据星与满约束,划 X ${newExcluded.length} 格: ${newExcluded.map(([r, c]) => `(${r},${c})`).join(' ')}` };
  },
};

export const rowColRegionLock: Strategy = {
  name: 'rowColRegionLock',
  run(state, ctx) {
    const cand = deriveCandidates(state, ctx);
    const { regionCount } = getCounts(state.stars, ctx);
    for (const axis of ['row', 'col'] as const) {
      for (const [ridStr, cells] of Object.entries(cand)) {
        if (cells.length === 0) continue;
        // 区域已放星:剩余只需 (k - regionCount) < k 颗,无法独占整条线
        if ((regionCount[Number(ridStr)] || 0) !== 0) continue;
        const lines = new Set(cells.map(([r, c]) => (axis === 'row' ? r : c)));
        if (lines.size !== 1) continue;
        const line = [...lines][0];
        const newExcluded: Cell[] = [];
        for (let i = 0; i < ctx.n; i++) {
          const r = axis === 'row' ? line : i;
          const c = axis === 'row' ? i : line;
          if (state.excluded.has(cellKey(r, c))) continue;
          if (state.stars.some(([sr, sc]) => sr === r && sc === c)) continue;
          const belongsThis = ctx.regionCells[Number(ridStr)].some(([cr, cc]) => cr === r && cc === c);
          if (belongsThis) continue;
          newExcluded.push([r, c]);
        }
        if (newExcluded.length > 0) {
          const label = axis === 'row' ? '行' : '列';
          return { newExcluded, step: `[互锁] 区域 ${ridStr} 候选全在${label} ${line} → 该${label}他区格划 X ${newExcluded.length} 个` };
        }
      }
    }
    return null;
  },
};

export const generalizedPair: Strategy = {
  name: 'generalizedPair',
  run(state, ctx) {
    const cand = deriveCandidates(state, ctx);
    const { regionCount } = getCounts(state.stars, ctx);
    // 仅未放星区域参与 combo,排他才 sound
    const rids = Object.keys(cand).map(Number).filter(rid => cand[rid].length > 0 && (regionCount[rid] || 0) === 0);
    for (const axis of ['row', 'col'] as const) {
      const lineSets: Record<number, Set<number>> = {};
      for (const rid of rids) lineSets[rid] = new Set(cand[rid].map(([r, c]) => (axis === 'row' ? r : c)));
      const allExcluded: Cell[] = [];
      const seen = new Set<string>();
      for (let sz = 2; sz <= rids.length; sz++) {
        for (const combo of combinations(rids, sz)) {
          const union = new Set<number>();
          for (const rid of combo) for (const l of lineSets[rid]) union.add(l);
          if (union.size !== sz) continue;
          if (!combo.every(rid => [...lineSets[rid]].every(l => union.has(l)))) continue;
          for (const line of union) {
            for (let i = 0; i < ctx.n; i++) {
              const r = axis === 'row' ? line : i;
              const c = axis === 'row' ? i : line;
              if (state.excluded.has(cellKey(r, c))) continue;
              if (state.stars.some(([sr, sc]) => sr === r && sc === c)) continue;
              const inCombo = combo.some(rid => ctx.regionCells[rid].some(([cr, cc]) => cr === r && cc === c));
              if (inCombo) continue;
              const k = cellKey(r, c);
              if (seen.has(k)) continue;
              seen.add(k);
              allExcluded.push([r, c]);
            }
          }
        }
      }
      if (allExcluded.length > 0) {
        const label = axis === 'row' ? '行' : '列';
        return { newExcluded: allExcluded, step: `[广义对] ${label}广义对约束 → 划 X ${allExcluded.length} 个` };
      }
    }
    return null;
  },
};

// 通用策略集合(不含特化策略)。各 k 求解器自行拼接 / 插入特化策略。
export const GENERIC_STRATEGIES: Strategy[] = [
  uniqueRegion, uniqueRow, uniqueCol,
  saturationClear,
  rowColRegionLock, generalizedPair,
];

// ---------- 参数化策略工厂(供各 k 特化版按需注入) ----------

// 强制链工厂:试放本区域候选 (r,c),若令任一他区无合法候选 → 划 X(致死)。
// canCoexist((or,oc), (r,c)) 决定他区候选与试放点能否共存:
//   k=2: 仅 !isAdjacent(...)(同行/列不相邻可共存)
//   k=1: !isAdjacent && or!==r && oc!==c(同行/列必排他)
export function makeForcedChain(
  canCoexist: (other: Cell, candidate: Cell) => boolean,
): Strategy {
  return {
    name: 'forcedChain',
    run(state, ctx) {
      const cand = deriveCandidates(state, ctx);
      for (const [ridStr, cells] of Object.entries(cand)) {
        if (cells.length < 2 || cells.length > 3) continue;
        const viable: Cell[] = [];
        for (const [r, c] of cells) {
          let allOk = true;
          for (const [oid, ocells] of Object.entries(cand)) {
            if (oid === ridStr) continue;
            const hasValid = ocells.some(([or, oc]) =>
              !(or === r && oc === c) && canCoexist([or, oc], [r, c]));
            if (!hasValid) { allOk = false; break; }
          }
          if (allOk) viable.push([r, c]);
        }
        if (viable.length === cells.length) continue;
        const dead = cells.filter(([r, c]) => !viable.some(([vr, vc]) => vr === r && vc === c));
        if (viable.length === 1) {
          const [r, c] = viable[0];
          return { newStars: [[r, c]], step: `[强制链] 区域 ${ridStr} 其余候选致他区无解,唯一可行 (${r},${c}) → 定星` };
        }
        if (dead.length > 0) {
          return { newExcluded: dead, step: `[强制链] 区域 ${ridStr} 候选 ${dead.map(([r, c]) => `(${r},${c})`).join('')} 致他区无解 → 划 X` };
        }
      }
      return null;
    },
  };
}

// 区域形状枚举工厂:候选数 ≤ maxCells 的区域,枚举所有 need 颗互不 king-相邻放法,
// 取交集 → 必含格定星;取补集 → 不参与任何放法的候选定 X。
// maxCells 防爆炸:k=2 调出 6;更大 k / 更复杂区域可上调。
export function makeRegionShapeEnum({ maxCells = 6 }: { maxCells?: number } = {}): Strategy {
  return {
    name: 'regionShapeEnum',
    run(state, ctx) {
      const cand = deriveCandidates(state, ctx);
      const { regionCount } = getCounts(state.stars, ctx);
      for (const [ridStr, cells] of Object.entries(cand)) {
        const rid = Number(ridStr);
        if (cells.length === 0 || cells.length > maxCells) continue;
        const need = ctx.k - (regionCount[rid] || 0);
        if (need <= 0 || need > cells.length) continue;
        const placements = enumeratePlacements(cells, need);
        if (placements.length === 0) continue;
        const keyset = cells.map(([r, c]) => cellKey(r, c));
        const inAll = (k: string) => placements.every(pl => pl.some(([r, c]) => cellKey(r, c) === k));
        const inAny = (k: string) => placements.some(pl => pl.some(([r, c]) => cellKey(r, c) === k));
        const newStars: Cell[] = [];
        for (const k of keyset) if (inAll(k)) { const [r, c] = k.split(',').map(Number); newStars.push([r, c]); }
        if (newStars.length > 0) {
          return { newStars, step: `[形状] 区域 ${ridStr} 的 ${need} 星在所有合法放法中都含 ${newStars.map(([r, c]) => `(${r},${c})`).join('')} → 定星` };
        }
        const newExcluded: Cell[] = [];
        for (const k of keyset) if (!inAny(k)) { const [r, c] = k.split(',').map(Number); newExcluded.push([r, c]); }
        if (newExcluded.length > 0) {
          return { newExcluded, step: `[形状] 区域 ${ridStr} 的候选 ${newExcluded.map(([r, c]) => `(${r},${c})`).join('')} 无法参与任何合法放法 → 划 X` };
        }
      }
      return null;
    },
  };
}

// 隐藏对偶(线 → 区域)工厂:若 sz 行(或列)的候选区域并集恰为 sz 个区域,
// 则这 sz 个区域必把星放在这 sz 行(或列)内 → 区域在线外的候选全部划 X。
// 仅在 k=1 下天然成立(sz 行 ↔ sz 区域一一对应);k>=2 下 sz 行的 k·sz 颗星
// 可由更多区域贡献,对偶不成立,不要注入。
export function makeHiddenLineGroup(axis: 'row' | 'col'): Strategy {
  return {
    name: axis === 'row' ? 'hiddenRowGroup' : 'hiddenColGroup',
    run(state, ctx) {
      const cand = deriveCandidates(state, ctx);
      const lineToRids: Record<number, Set<number>> = {};
      for (const [ridStr, cells] of Object.entries(cand)) {
        if (cells.length === 0) continue;
        for (const [r, c] of cells) {
          const line = axis === 'row' ? r : c;
          (lineToRids[line] ??= new Set()).add(Number(ridStr));
        }
      }
      const linesWithCand = Object.keys(lineToRids).map(Number);
      for (let sz = 1; sz <= linesWithCand.length; sz++) {
        for (const combo of combinations(linesWithCand, sz)) {
          const ridsUnion = new Set<number>();
          for (const line of combo) for (const rid of lineToRids[line]) ridsUnion.add(rid);
          if (ridsUnion.size !== sz) continue;
          const comboSet = new Set(combo);
          const newExcluded: Cell[] = [];
          for (const rid of ridsUnion) {
            for (const [r, c] of cand[rid]) {
              const line = axis === 'row' ? r : c;
              if (!comboSet.has(line)) newExcluded.push([r, c]);
            }
          }
          if (newExcluded.length > 0) {
            const label = axis === 'row' ? '行' : '列';
            return {
              newExcluded,
              step: `[隐藏对偶] ${label} ${combo.join(',')} 仅由区域 ${[...ridsUnion].join(',')} 贡献星 → 这些区域${label}外候选划 X ${newExcluded.length} 个`,
            };
          }
        }
      }
      return null;
    },
  };
}

// ---------- 调度 + 回溯 ----------

export function applyResult(state: BoardState, res: StrategyResult): void {
  if (res.newStars) for (const [r, c] of res.newStars) {
    if (!state.stars.some(([sr, sc]) => sr === r && sc === c)) state.stars.push([r, c]);
  }
  if (res.newExcluded) for (const [r, c] of res.newExcluded) state.excluded.add(cellKey(r, c));
}

export function deduce(
  state: BoardState,
  ctx: SolveContext,
  steps: string[],
  strategies: Strategy[],
): { candidates: Record<number, Cell[]> } | null {
  while (true) {
    if (!validateCounts(state, ctx)) { steps.push(`[推导] 约束违规,失败`); return null; }
    const cand = deriveCandidates(state, ctx);
    for (const [ridStr, cells] of Object.entries(cand)) {
      if (cells.length === 0) { steps.push(`[推导] 区域 ${ridStr} 无有效候选,失败`); return null; }
    }
    let changed = false;
    for (const strat of strategies) {
      const res = strat.run(state, ctx);
      if (res) {
        applyResult(state, res);
        steps.push(res.step);
        if (!validateCounts(state, ctx)) { steps.push(`[推导] 放置后约束违规,失败`); return null; }
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return { candidates: deriveCandidates(state, ctx) };
}

export function cloneState(state: BoardState): BoardState {
  return { stars: state.stars.map(([r, c]) => [r, c] as Cell), excluded: new Set(state.excluded) };
}

export function search(
  state: BoardState,
  ctx: SolveContext,
  board: number[][],
  steps: string[],
  strategies: Strategy[],
): boolean {
  const d = deduce(state, ctx, steps, strategies);
  if (d === null) return false;
  const { candidates } = d;

  if (state.stars.length === ctx.k * ctx.numRegions) {
    for (const [r, c] of state.stars) board[r][c] = 1;
    steps.push(`[完成] 找到解: ${state.stars.map(([r, c]) => `(${r},${c})`).join(' ')}`);
    return true;
  }

  const rids = Object.keys(candidates).filter(rid => candidates[Number(rid)].length > 0);
  if (rids.length === 0) return false;
  const bestRid = rids.reduce((a, b) => candidates[Number(a)].length <= candidates[Number(b)].length ? a : b);
  const bestCells = candidates[Number(bestRid)];
  steps.push(`[搜索] 区域 ${bestRid} 有 ${bestCells.length} 个候选: ${bestCells.map(([r, c]) => `(${r},${c})`).join(' ')}`);

  for (const [r, c] of bestCells) {
    steps.push(`[搜索] 尝试区域 ${bestRid} → (${r},${c})`);
    const branch = cloneState(state);
    branch.stars.push([r, c]);
    if (search(branch, ctx, board, steps, strategies)) return true;
    steps.push(`[回退] 区域 ${bestRid} → (${r},${c}) 失败,回退`);
  }
  return false;
}

// ---------- 入口 ----------

// 通用入口:strategies 决定策略集,k 决定每行/列/区星数。各 k 特化求解器透传。
export function solveWith(regions: number[][], k: number, strategies: Strategy[]): SolveResult {
  const n = regions.length;
  const steps: string[] = [];
  const numRegions = new Set(regions.flat()).size;
  steps.push(`[初始] 棋盘 ${n}x${n},${numRegions} 个区域,每行/列/区域需 ${k} 颗星`);
  if (n === 0) return { solution: [], steps };

  const regionCells: Record<number, Cell[]> = {};
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) (regionCells[regions[i][j]] ??= []).push([i, j]);

  const ctx: SolveContext = { n, k, regionCells, numRegions };
  const board: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const state: BoardState = { stars: [], excluded: new Set() };

  search(state, ctx, board, steps, strategies);

  if (board.some(row => row.some(cell => cell === 1))) {
    steps.push(`[总结] 共 ${steps.length} 步,成功找到解`);
  } else {
    steps.push(`[总结] 无解`);
  }
  return { solution: board, steps };
}

// 默认入口:任意 k,只用通用策略集(无 regionShapeEnum / forcedChain / hiddenLineGroup)。
function solve(regions: number[][], k = 2): SolveResult {
  return solveWith(regions, k, GENERIC_STRATEGIES);
}

export { solve };
export default solve;
