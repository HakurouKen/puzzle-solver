// Killer Sudoku 求解器
// 基于 Norvig 经典数独算法 + 笼约束传播 + MRV 回溯搜索

// ── 类型定义 ──────────────────────────────────────────────────────────────

export interface Cage {
  cells: number[][];  // [[row, col], ...]
  sum: number;        // 目标和
}

export interface KillerSudokuInput {
  puzzle: number[][];    // 9×9，0 = 空
  cages: Cage[];
}

export interface SolveResult {
  solution: number[][];
  steps: Step[];
}

export type Step =
  | { type: 'eliminate'; cell: string; digit: string; detail: string }
  | { type: 'assign'; cell: string; digit: string; detail: string }
  | { type: 'cage-combo'; cage: number; detail: string }
  | { type: 'rule-of-45'; cell: string; digit: string; detail: string }
  | { type: 'search'; detail: string };

type Cell = string;                    // "A1"–"I9"
type Grid = Map<Cell, string>;         // 候选数（数字字符串）
type Digit = string;                   // "1"–"9"
type CageMap = Map<Cell, number>;      // 格 → 笼索引
type ComboTable = Map<string, number[][]>;  // "size-sum" → 组合列表（每个组合是数字数组）

// ── 常量 ─────────────────────────────────────────────────────────────────

const ROWS = 'ABCDEFGHI';
const COLS = '123456789';
const DIGITS = '123456789';

// 所有格
const CELLS: Cell[] = [];
for (const r of ROWS) {
  for (const c of COLS) {
    CELLS.push(r + c);
  }
}

// 单元（行/列/宫）
const UNITS = new Map<Cell, Cell[][]>();
const PEERS = new Map<Cell, Cell[]>();

// 初始化单元
for (const s of CELLS) {
  const row = s[0];
  const col = s[1];
  const boxRow = Math.floor((ROWS.indexOf(row)) / 3) * 3;
  const boxCol = Math.floor((COLS.indexOf(col)) / 3) * 3;

  const rowUnit = CELLS.filter(c => c[0] === row);
  const colUnit = CELLS.filter(c => c[1] === col);
  const boxUnit = CELLS.filter(c => {
    const r = ROWS.indexOf(c[0]);
    const colIdx = COLS.indexOf(c[1]);
    return Math.floor(r / 3) * 3 === boxRow && Math.floor(colIdx / 3) * 3 === boxCol;
  });

  UNITS.set(s, [rowUnit, colUnit, boxUnit]);

  const peerSet = new Set<Cell>();
  for (const unit of [rowUnit, colUnit, boxUnit]) {
    for (const c of unit) {
      if (c !== s) peerSet.add(c);
    }
  }
  PEERS.set(s, Array.from(peerSet));
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function cellKey(row: number, col: number): Cell {
  return ROWS[row] + COLS[col];
}

function cellToCoord(cell: Cell): [number, number] {
  return [ROWS.indexOf(cell[0]), COLS.indexOf(cell[1])];
}

function buildCageMap(cages: Cage[]): CageMap {
  const map = new Map<Cell, number>();
  for (let i = 0; i < cages.length; i++) {
    for (const [r, c] of cages[i].cells) {
      map.set(cellKey(r, c), i);
    }
  }
  return map;
}

function cloneGrid(grid: Grid): Grid {
  return new Map(grid);
}

// ── 组合表 ───────────────────────────────────────────────────────────────

function enumerateCombinations(size: number, sum: number, min = 1): number[][] {
  if (size === 0) return sum === 0 ? [[]] : [];
  if (sum < min || sum > size * 9) return [];

  const result: number[][] = [];
  for (let d = min; d <= 9; d++) {
    for (const rest of enumerateCombinations(size - 1, sum - d, d + 1)) {
      result.push([d, ...rest]);
    }
  }
  return result;
}

function buildComboTable(): ComboTable {
  const table = new Map<string, number[][]>();

  for (let size = 1; size <= 9; size++) {
    for (let sum = size; sum <= size * 9; sum++) {
      const combos = enumerateCombinations(size, sum);
      if (combos.length > 0) {
        table.set(`${size}-${sum}`, combos);
      }
    }
  }

  return table;
}

// 检查组合是否可以分配到笼的格子上（至少存在一个合法排列）
function hasValidAssignment(combo: number[], cells: number[][], grid: Grid): boolean {
  const used = new Array(combo.length).fill(false);

  function backtrack(idx: number): boolean {
    if (idx === combo.length) return true;

    const cell = cellKey(cells[idx][0], cells[idx][1]);
    const candidates = grid.get(cell)!;

    // 如果该格已被赋值（candidates 长度为 1），则该位置必须是该值
    if (candidates.length === 1) {
      const v = candidates[0];
      // 在 combo 中找到 v 的位置
      for (let i = 0; i < combo.length; i++) {
        if (!used[i] && String(combo[i]) === v) {
          used[i] = true;
          if (backtrack(idx + 1)) return true;
          used[i] = false;
          return false;  // 只能匹配一个位置
        }
      }
      return false;  // 已赋值但 combo 中无此值
    }

    for (let i = 0; i < combo.length; i++) {
      if (used[i]) continue;

      const d = String(combo[i]);

      if (candidates.includes(d)) {
        used[i] = true;
        if (backtrack(idx + 1)) return true;
        used[i] = false;
      }
    }
    return false;
  }

  return backtrack(0);
}

// ── 约束传播 ─────────────────────────────────────────────────────────────

function eliminate(grid: Grid, s: Cell, d: Digit, steps: Step[]): Grid | false {
  const candidates = grid.get(s);
  if (!candidates || !candidates.includes(d)) {
    return grid;  // 已经消除
  }

  const newCandidates = candidates.replace(d, '');
  grid.set(s, newCandidates);
  steps.push({ type: 'eliminate', cell: s, digit: d, detail: `消除 ${s}=${d}` });

  // 检查冲突
  if (newCandidates.length === 0) {
    return false;
  }

  // Naked Single: 候选数缩减到 1，对所有 peer 消除该数字
  if (newCandidates.length === 1) {
    const d2 = newCandidates[0];
    for (const peer of PEERS.get(s)!) {
      const result = eliminate(grid, peer, d2, steps);
      if (!result) return false;
    }
  }

  // Hidden Single: 对每个 unit，若 d 只在一个格中，assign 该格
  for (const unit of UNITS.get(s)!) {
    const places = unit.filter(c => grid.get(c)!.includes(d));
    if (places.length === 0) {
      return false;  // d 无位置 → 冲突
    }
    if (places.length === 1) {
      const result = assign(grid, places[0], d, steps);
      if (!result) return false;
    }
  }

  return grid;
}

function assign(grid: Grid, s: Cell, d: Digit, steps: Step[]): Grid | false {
  const candidates = grid.get(s);
  if (!candidates) return false;

  // 对 s 消除 ≠d 的所有数字
  for (const d2 of candidates) {
    if (d2 !== d) {
      const result = eliminate(grid, s, d2, steps);
      if (!result) return false;
    }
  }

  steps.push({ type: 'assign', cell: s, digit: d, detail: `赋值 ${s}=${d}` });
  return grid;
}

// ── Killer 特有约束 ──────────────────────────────────────────────────────

function applyCageCombinations(
  grid: Grid,
  cages: Cage[],
  cageMap: CageMap,
  comboTable: ComboTable,
  steps: Step[]
): Grid | false {
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 0; i < cages.length; i++) {
      const cage = cages[i];
      const combos = comboTable.get(`${cage.cells.length}-${cage.sum}`);
      if (!combos) return false;  // 无合法组合 → 冲突

      // 过滤：组合中每个数字必须是对应格的候选之一
      const valid = combos.filter(combo =>
        hasValidAssignment(combo, cage.cells, grid)
      );

      if (valid.length === 0) return false;  // 无合法组合 → 冲突

      // 所有合法组合的并集
      const union = new Set<string>();
      for (const combo of valid) {
        for (const v of combo) {
          union.add(String(v));
        }
      }

      // 收集需要消除的候选（先收集，再执行，避免修改迭代中的数据）
      const toEliminate: { cell: string; d: string }[] = [];
      for (const [r, c] of cage.cells) {
        const cell = cellKey(r, c);
        const candidates = grid.get(cell)!;
        for (const d of candidates) {
          if (!union.has(d)) {
            toEliminate.push({ cell, d });
          }
        }
      }

      // 执行消除
      for (const { cell, d } of toEliminate) {
        const result = eliminate(grid, cell, d, steps);
        if (!result) return false;
        steps.push({
          type: 'cage-combo',
          cage: i,
          detail: `笼 ${i} 组合过滤 → 消除 ${cell}=${d}`
        });
        changed = true;
      }
    }
  }

  return grid;
}

function applyRuleOf45(
  grid: Grid,
  cages: Cage[],
  cageMap: CageMap,
  steps: Step[]
): Grid | false {
  // 对每个 house（行/列/宫）应用 45 法则
  const houses: Cell[][] = [];

  // 行
  for (const r of ROWS) {
    houses.push(CELLS.filter(c => c[0] === r));
  }

  // 列
  for (const c of COLS) {
    houses.push(CELLS.filter(cell => cell[1] === c));
  }

  // 宫
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      houses.push(CELLS.filter(cell => {
        const r = ROWS.indexOf(cell[0]);
        const c = COLS.indexOf(cell[1]);
        return Math.floor(r / 3) * 3 === boxRow && Math.floor(c / 3) * 3 === boxCol;
      }));
    }
  }

  for (const house of houses) {
    // 找到完全在该 house 内的笼
    const inHouseCages: number[] = [];
    const partialCages: { idx: number; inCells: [number, number][]; outCells: [number, number][] }[] = [];

    for (let i = 0; i < cages.length; i++) {
      const cage = cages[i];
      const inCells: [number, number][] = [];
      const outCells: [number, number][] = [];

      for (const [r, c] of cage.cells) {
        const cell = cellKey(r, c);
        if (house.includes(cell)) {
          inCells.push([r, c]);
        } else {
          outCells.push([r, c]);
        }
      }

      if (outCells.length === 0) {
        inHouseCages.push(i);
      } else if (inCells.length > 0) {
        partialCages.push({ idx: i, inCells, outCells });
      }
    }

    // 计算完全在 house 内的笼和值总和
    const inHouseSum = inHouseCages.reduce((sum, i) => sum + cages[i].sum, 0);

    // 对每个 partial cage，检查其他 partial cages 的 in-house cells 是否都已赋值
    for (const { idx, inCells, outCells } of partialCages) {
      // 若笼在 house 内只有 1 格，可推导该格的值
      if (inCells.length === 1) {
        // 检查其他 partial cages 的 in-house cells 是否都已赋值
        let allOthersAssigned = true;
        let othersSum = 0;
        for (const other of partialCages) {
          if (other.idx === idx) continue;
          for (const [r, c] of other.inCells) {
            const cell = cellKey(r, c);
            const cands = grid.get(cell)!;
            if (cands.length > 1) {
              allOthersAssigned = false;
              break;
            }
            othersSum += Number(cands[0]);
          }
          if (!allOthersAssigned) break;
        }

        if (!allOthersAssigned) continue;

        // overflow = (45 - inHouseSum) - othersSum
        // 因为：所有 partial cages 的 in-house cells 之和 = 45 - inHouseSum
        // 而：本笼的 in-house cell = 总和 - 其他笼的 in-house cells 之和
        const overflow = (45 - inHouseSum) - othersSum;

        if (overflow < 1 || overflow > 9) {
          return false;  // 非法值 → 冲突
        }

        const [r, c] = inCells[0];
        const cell = cellKey(r, c);
        const candidates = grid.get(cell)!;

        if (!candidates.includes(String(overflow))) {
          return false;  // 候选中无该值 → 冲突
        }

        if (candidates.length > 1) {
          const result = assign(grid, cell, String(overflow), steps);
          if (!result) return false;
          steps.push({
            type: 'rule-of-45',
            cell,
            digit: String(overflow),
            detail: `45 法则：笼 ${idx} 跨出 1 格 → ${cell}=${overflow}`
          });
        }
      }
    }
  }

  return grid;
}

// ── 搜索 ─────────────────────────────────────────────────────────────────

function search(
  grid: Grid,
  cages: Cage[],
  cageMap: CageMap,
  comboTable: ComboTable,
  steps: Step[]
): Grid | false {
  // 检查是否已解
  if (Array.from(grid.values()).every(c => c.length === 1)) {
    return grid;
  }

  // 选择候选最少的格（MRV 启发式）
  let minCell: Cell | null = null;
  let minCandidates = 10;

  for (const s of CELLS) {
    const len = grid.get(s)!.length;
    if (len > 1 && len < minCandidates) {
      minCandidates = len;
      minCell = s;
    }
  }

  if (!minCell) return false;

  steps.push({ type: 'search', detail: `搜索 ${minCell}（${minCandidates} 候选）` });

  const candidates = grid.get(minCell)!;

  for (const d of candidates) {
    const gridCopy = cloneGrid(grid);
    const stepsCopy = [...steps];

    const result = assign(gridCopy, minCell, d, stepsCopy);
    if (!result) continue;

    const result2 = applyCageCombinations(gridCopy, cages, cageMap, comboTable, stepsCopy);
    if (!result2) continue;

    const result3 = applyRuleOf45(gridCopy, cages, cageMap, stepsCopy);
    if (!result3) continue;

    const solved = search(gridCopy, cages, cageMap, comboTable, stepsCopy);
    if (solved) {
      steps.length = 0;
      steps.push(...stepsCopy);
      return solved;
    }
  }

  return false;
}

// ── 主入口 ───────────────────────────────────────────────────────────────

function parse(input: KillerSudokuInput): Grid | false {
  // 验证输入
  if (input.puzzle.length !== 9) return false;
  for (const row of input.puzzle) {
    if (row.length !== 9) return false;
    for (const v of row) {
      if (!Number.isInteger(v) || v < 0 || v > 9) return false;
    }
  }

  // 验证笼覆盖所有格
  const covered = new Set<Cell>();
  for (const cage of input.cages) {
    for (const [r, c] of cage.cells) {
      if (r < 0 || r >= 9 || c < 0 || c >= 9) return false;
      const cell = cellKey(r, c);
      if (covered.has(cell)) return false;  // 重复覆盖
      covered.add(cell);
    }
  }
  if (covered.size !== 81) return false;

  // 初始化 Grid
  const grid: Grid = new Map();
  for (const s of CELLS) {
    grid.set(s, DIGITS);
  }

  // 对预填线索调用 assign
  const steps: Step[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = input.puzzle[r][c];
      if (v !== 0) {
        const cell = cellKey(r, c);
        const result = assign(grid, cell, String(v), steps);
        if (!result) return false;
      }
    }
  }

  // 处理单格笼（1-cell cage = prefilled value）
  for (const cage of input.cages) {
    if (cage.cells.length === 1) {
      const [r, c] = cage.cells[0];
      const cell = cellKey(r, c);
      const v = cage.sum;
      if (v < 1 || v > 9) return false;
      const result = assign(grid, cell, String(v), steps);
      if (!result) return false;
    }
  }

  return grid;
}

function gridToSolution(grid: Grid): number[][] {
  const solution: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      const cell = cellKey(r, c);
      row.push(Number(grid.get(cell)));
    }
    solution.push(row);
  }
  return solution;
}

export function solve(input: KillerSudokuInput): SolveResult | null {
  const comboTable = buildComboTable();
  const cageMap = buildCageMap(input.cages);
  const steps: Step[] = [];

  const grid = parse(input);
  if (!grid) return null;

  // 初始约束传播
  let result = applyCageCombinations(grid, input.cages, cageMap, comboTable, steps);
  if (!result) return null;

  result = applyRuleOf45(grid, input.cages, cageMap, steps);
  if (!result) return null;

  // 搜索
  const solved = search(grid, input.cages, cageMap, comboTable, steps);
  if (!solved) return null;

  return {
    solution: gridToSolution(solved),
    steps,
  };
}
