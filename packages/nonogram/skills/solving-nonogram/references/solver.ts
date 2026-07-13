export type CellState = -1 | 0 | 1;

export interface LineAnalysis {
  feasible: boolean;
  canBeFilled: boolean[];
  canBeEmpty: boolean[];
}

export interface NonogramPuzzle {
  rowClues: number[][];
  columnClues: number[][];
}

export type Step =
  | {
      type: 'line-deduction';
      axis: 'row' | 'column';
      index: number;
      filled: [number, number][];
      emptied: [number, number][];
      detail: string;
    }
  | { type: 'assumption'; cell: [number, number]; value: 0 | 1; detail: string }
  | { type: 'contradiction' | 'backtrack'; detail: string };

export interface SolveResult extends NonogramPuzzle {
  status: 'solved' | 'unsatisfiable' | 'multiple' | 'indeterminate';
  solution: (0 | 1)[][] | null;
  alternateSolution?: (0 | 1)[][];
  partial: CellState[][];
  steps: Step[];
  stats: {
    searchNodes: number;
    propagationRounds: number;
    limitReached: boolean;
    recordedSteps: number;
    omittedSteps: number;
  };
}

export interface SolveOptions {
  maxSearchNodes?: number;
  maxSteps?: number;
}

interface Transition {
  next: string;
  filled: number[];
  emptied: number[];
}

const stateKey = (position: number, clueIndex: number): string => `${position},${clueIndex}`;

export function analyzeLine(
  length: number,
  clues: readonly number[],
  cells: readonly CellState[],
): LineAnalysis {
  const transitions = new Map<string, Transition[]>();

  for (let position = 0; position <= length; position++) {
    for (let clueIndex = 0; clueIndex <= clues.length; clueIndex++) {
      const choices: Transition[] = [];

      if (position < length && cells[position] !== 1) {
        choices.push({
          next: stateKey(position + 1, clueIndex),
          filled: [],
          emptied: [position],
        });
      }

      const runLength = clues[clueIndex];
      if (runLength !== undefined && position + runLength <= length) {
        const end = position + runLength;
        const runFits = cells.slice(position, end).every((cell) => cell !== 0);
        const needsSeparator = clueIndex < clues.length - 1;
        const separatorFits = !needsSeparator || (end < length && cells[end] !== 1);
        if (runFits && separatorFits) {
          choices.push({
            next: stateKey(end + (needsSeparator ? 1 : 0), clueIndex + 1),
            filled: Array.from({ length: runLength }, (_, offset) => position + offset),
            emptied: needsSeparator ? [end] : [],
          });
        }
      }

      transitions.set(stateKey(position, clueIndex), choices);
    }
  }

  const start = stateKey(0, 0);
  const accept = stateKey(length, clues.length);
  const reachable = new Set<string>([start]);
  for (let position = 0; position <= length; position++) {
    for (let clueIndex = 0; clueIndex <= clues.length; clueIndex++) {
      const key = stateKey(position, clueIndex);
      if (!reachable.has(key)) continue;
      for (const transition of transitions.get(key) ?? []) reachable.add(transition.next);
    }
  }

  const canReachAccept = new Map<string, boolean>();
  const visit = (key: string): boolean => {
    if (key === accept) return true;
    const cached = canReachAccept.get(key);
    if (cached !== undefined) return cached;
    const result = (transitions.get(key) ?? []).some((transition) => visit(transition.next));
    canReachAccept.set(key, result);
    return result;
  };

  const feasible = reachable.has(accept) && visit(start);
  const canBeFilled = Array<boolean>(length).fill(false);
  const canBeEmpty = Array<boolean>(length).fill(false);

  if (feasible) {
    for (const [key, choices] of transitions) {
      if (!reachable.has(key)) continue;
      for (const transition of choices) {
        if (!visit(transition.next)) continue;
        for (const index of transition.filled) canBeFilled[index] = true;
        for (const index of transition.emptied) canBeEmpty[index] = true;
      }
    }
  }

  return { feasible, canBeFilled, canBeEmpty };
}

export function validatePuzzle(input: NonogramPuzzle): void {
  if (!Array.isArray(input?.rowClues) || !Array.isArray(input?.columnClues)) {
    throw new Error('rowClues 和 columnClues 必须是二维数组');
  }
  const height = input.rowClues.length;
  const width = input.columnClues.length;
  if (height < 1 || width < 1) throw new Error('棋盘尺寸必须为正数');
  if (height > 100 || width > 100 || height * width > 10_000) {
    throw new Error('棋盘每边最多 100 格且总格数最多 10000');
  }

  const checkLines = (lines: number[][], lineLength: number, label: string): void => {
    for (let index = 0; index < lines.length; index++) {
      const clues = lines[index];
      if (!Array.isArray(clues) || clues.some((value) => !Number.isInteger(value) || value <= 0)) {
        throw new Error(`${label} ${index + 1} 的 clue 必须都是正整数`);
      }
      const required = clues.reduce((sum, value) => sum + value, 0) + Math.max(0, clues.length - 1);
      if (required > lineLength) throw new Error(`${label} ${index + 1} 的 clues 超出线长`);
    }
  };

  checkLines(input.rowClues, width, '行');
  checkLines(input.columnClues, height, '列');
}

class StepRecorder {
  readonly steps: Step[] = [];
  omitted = 0;

  constructor(private readonly limit: number) {}

  push(step: Step): void {
    if (this.steps.length < this.limit) this.steps.push(step);
    else this.omitted++;
  }
}

const cloneBoard = (board: CellState[][]): CellState[][] => board.map((row) => [...row]);

function propagate(
  board: CellState[][],
  puzzle: NonogramPuzzle,
  recorder: StepRecorder,
  stats: { propagationRounds: number },
): boolean {
  const height = puzzle.rowClues.length;
  const width = puzzle.columnClues.length;
  let changed = true;

  while (changed) {
    changed = false;
    stats.propagationRounds++;

    for (let index = 0; index < height + width; index++) {
      const axis = index < height ? 'row' : 'column';
      const lineIndex = axis === 'row' ? index : index - height;
      const cells = axis === 'row'
        ? board[lineIndex]
        : Array.from({ length: height }, (_, row) => board[row][lineIndex]);
      const clues = axis === 'row' ? puzzle.rowClues[lineIndex] : puzzle.columnClues[lineIndex];
      const analysis = analyzeLine(cells.length, clues, cells);
      if (!analysis.feasible) {
        recorder.push({
          type: 'contradiction',
          detail: `${axis === 'row' ? '行' : '列'} ${lineIndex + 1} 无合法排列`,
        });
        return false;
      }

      const filled: [number, number][] = [];
      const emptied: [number, number][] = [];
      for (let offset = 0; offset < cells.length; offset++) {
        const next: CellState | undefined = analysis.canBeFilled[offset] && !analysis.canBeEmpty[offset]
          ? 1
          : analysis.canBeEmpty[offset] && !analysis.canBeFilled[offset]
            ? 0
            : undefined;
        if (next === undefined || cells[offset] === next) continue;
        const row = axis === 'row' ? lineIndex : offset;
        const column = axis === 'row' ? offset : lineIndex;
        board[row][column] = next;
        cells[offset] = next;
        (next === 1 ? filled : emptied).push([row, column]);
        changed = true;
      }

      if (filled.length > 0 || emptied.length > 0) {
        recorder.push({
          type: 'line-deduction',
          axis,
          index: lineIndex,
          filled,
          emptied,
          detail: `${axis === 'row' ? '行' : '列'} ${lineIndex + 1}：确定 ${filled.length} 个黑格、${emptied.length} 个白格`,
        });
      }
    }
  }
  return true;
}

const isComplete = (board: CellState[][]): board is (0 | 1)[][] =>
  board.every((row) => row.every((cell) => cell !== -1));

function selectBranch(board: CellState[][]): [number, number] | undefined {
  const rowUnknown = board.map((row) => row.filter((cell) => cell === -1).length);
  const columnUnknown = board[0].map((_, column) =>
    board.reduce((count, row) => count + (row[column] === -1 ? 1 : 0), 0),
  );
  let best: [number, number] | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let row = 0; row < board.length; row++) {
    for (let column = 0; column < board[row].length; column++) {
      if (board[row][column] !== -1) continue;
      const score = rowUnknown[row] + columnUnknown[column];
      if (score < bestScore) {
        best = [row, column];
        bestScore = score;
      }
    }
  }
  return best;
}

export function solve(input: NonogramPuzzle, options: SolveOptions = {}): SolveResult {
  validatePuzzle(input);
  const puzzle = {
    rowClues: input.rowClues.map((clues) => [...clues]),
    columnClues: input.columnClues.map((clues) => [...clues]),
  };
  const maxSearchNodes = options.maxSearchNodes ?? 100_000;
  const maxSteps = options.maxSteps ?? 10_000;
  if (!Number.isInteger(maxSearchNodes) || maxSearchNodes <= 0) {
    throw new Error('maxSearchNodes 必须是正整数');
  }
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) throw new Error('maxSteps 必须是正整数');

  const recorder = new StepRecorder(maxSteps);
  const counters = { searchNodes: 0, propagationRounds: 0, limitReached: false };
  const initial = Array.from(
    { length: puzzle.rowClues.length },
    () => Array<CellState>(puzzle.columnClues.length).fill(-1),
  );
  const rootFeasible = propagate(initial, puzzle, recorder, counters);
  const partial = cloneBoard(initial);
  const solutions: (0 | 1)[][][] = [];

  const explore = (board: CellState[][]): void => {
    if (solutions.length >= 2 || counters.limitReached) return;
    if (!propagate(board, puzzle, recorder, counters)) return;
    if (isComplete(board)) {
      solutions.push(cloneBoard(board) as (0 | 1)[][]);
      return;
    }

    const branch = selectBranch(board);
    if (!branch) return;

    for (const value of [1, 0] as const) {
      if (counters.searchNodes >= maxSearchNodes) {
        counters.limitReached = true;
        return;
      }
      counters.searchNodes++;
      const child = cloneBoard(board);
      child[branch[0]][branch[1]] = value;
      recorder.push({
        type: 'assumption',
        cell: branch,
        value,
        detail: `假设行 ${branch[0] + 1} 列 ${branch[1] + 1} 为${value === 1 ? '黑格' : '白格'}`,
      });
      const before = solutions.length;
      explore(child);
      if (solutions.length >= 2 || counters.limitReached) return;
      recorder.push({
        type: 'backtrack',
        detail: solutions.length === before
          ? '当前假设不能产生完整解，回溯'
          : '已找到一组解，回溯检查其他分支',
      });
    }
  };

  if (rootFeasible) {
    if (isComplete(initial)) solutions.push(cloneBoard(initial) as (0 | 1)[][]);
    else explore(cloneBoard(initial));
  }

  const status: SolveResult['status'] = counters.limitReached
    ? 'indeterminate'
    : solutions.length >= 2
      ? 'multiple'
      : solutions.length === 1
        ? 'solved'
        : 'unsatisfiable';

  return {
    ...puzzle,
    status,
    solution: solutions[0] ?? null,
    ...(solutions[1] ? { alternateSolution: solutions[1] } : {}),
    partial,
    steps: recorder.steps,
    stats: {
      ...counters,
      recordedSteps: recorder.steps.length,
      omittedSteps: recorder.omitted,
    },
  };
}
