import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBoard, formatCell } from '../render-board.ts';
// 测试数据内联（禁止跨 skill references 依赖）

const HARD_PUZZLE: number[][] = [
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

const HARD_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

test('formatCell: digit -> padded', () => {
  assert.equal(formatCell(5), ' 5 ');
});

test('formatCell: zero -> three spaces', () => {
  assert.equal(formatCell(0), '   ');
});

test('renderBoard: full grid layout — top, 9 cell rows, 6 thin + 2 thick separators, bottom', () => {
  const out = renderBoard({
    puzzle: HARD_PUZZLE,
    solution: HARD_SOLUTION as unknown as number[][],
    steps: [],
  });
  const lines = out.split('\n');
  // 1 top + 9 cell rows + 2 thick mid + 6 thin mid + 1 bottom = 19, plus trailing '' from final \n
  assert.equal(lines.length, 20, `expected 20 lines, got ${lines.length}`);
  assert.match(lines[0], /^┏/);
  assert.match(lines[18], /^┗/);
  assert.ok(lines.some(l => l.startsWith('┣')), 'expected at least one thick separator (┣)');
  assert.ok(lines.some(l => l.startsWith('┠')), 'expected at least one thin separator (┠)');
});

test('renderBoard: cell rows and border rows have equal visual width', () => {
  const out = renderBoard({
    puzzle: HARD_PUZZLE,
    solution: HARD_SOLUTION as unknown as number[][],
    steps: [],
  });
  const lines = out.split('\n');
  // Top border: count "━" runs separated by ┳, each should equal segment length used in cell rows.
  const top = lines[0];
  const firstCell = lines[1];
  const segs = top.split(/[┏┳┓]/).filter(Boolean);
  assert.equal(segs.length, 3);
  const cellSegs = firstCell.split('┃').filter(s => s.length > 0);
  assert.equal(cellSegs.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(
      [...segs[i]].length,
      [...cellSegs[i]].length,
      `segment ${i}: border width ${[...segs[i]].length} != cell width ${[...cellSegs[i]].length}`,
    );
  }
});

test('renderBoard: thin separator segment width matches cell segment width', () => {
  const out = renderBoard({
    puzzle: HARD_PUZZLE,
    solution: HARD_SOLUTION as unknown as number[][],
    steps: [],
  });
  const lines = out.split('\n');
  const thin = lines.find(l => l.startsWith('┠'))!;
  const cell = lines[1];
  const thinSegs = thin.split(/[┠╂┨]/).filter(Boolean);
  const cellSegs = cell.split('┃').filter(s => s.length > 0);
  assert.equal(thinSegs.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(
      [...thinSegs[i]].length,
      [...cellSegs[i]].length,
      `thin segment ${i}: ${[...thinSegs[i]].length} != cell ${[...cellSegs[i]].length}`,
    );
  }
});

test('renderBoard: solved board uses uniform digit rendering (no * or () markers)', () => {
  const out = renderBoard({
    puzzle: HARD_PUZZLE,
    solution: HARD_SOLUTION as unknown as number[][],
    steps: [
      { type: 'assign', cell: 'A1', digit: '5', detail: 'A1 = 5' },
      { type: 'search', cell: 'C3', digit: '4', detail: 'try C3 = 4' },
      { type: 'assign', cell: 'C3', digit: '4', detail: 'C3 = 4' },
    ],
  });
  const board = out.split('\n').filter(l => l.startsWith('┃')).join('\n');
  assert.ok(!board.includes('*'), 'board should not contain * markers');
  assert.ok(!board.includes('('), 'board should not contain ( markers');
  assert.ok(!board.includes(')'), 'board should not contain ) markers');
});

test('renderBoard: puzzle-only (no solution) renders empty cells as blanks', () => {
  const puzzle: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  puzzle[0][0] = 5;
  puzzle[8][8] = 9;
  const out = renderBoard({ puzzle, steps: [] });
  const board = out.split('\n').filter(l => l.startsWith('┃')).join('\n');
  assert.match(board, / 5 /);
  assert.match(board, / 9 /);
  assert.ok(!board.includes('*'), 'board should not contain * markers');
  assert.ok(!board.includes('('), 'board should not contain ( markers');
  assert.match(out, /┏/);
  assert.match(out, /┗/);
});

test('renderBoard: no puzzle and no solution -> friendly message', () => {
  const out = renderBoard({ solution: null, steps: [] });
  assert.match(out, /无解|No solution/i);
});
