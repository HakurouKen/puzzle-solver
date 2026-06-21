import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBoard, formatCell, classifySteps } from '../render-board.ts';
import { HARD_PUZZLE, HARD_SOLUTION } from '../../../solving-sudoku/references/__tests__/fixtures.ts';

test('formatCell: given -> plain', () => {
  assert.equal(formatCell('5', 'given'), ' 5 ');
});

test('formatCell: deduced -> asterisk prefix', () => {
  assert.equal(formatCell('5', 'deduced'), '*5 ');
});

test('formatCell: searched -> brackets', () => {
  assert.equal(formatCell('5', 'searched'), '(5)');
});

test('classifySteps: single assign -> deduced', () => {
  const steps = [
    { type: 'assign' as const, cell: 'A1', digit: '5', detail: 'A1 = 5' },
  ];
  const cls = classifySteps(steps);
  assert.equal(cls.get('A1'), 'deduced');
});

test('classifySteps: search step then assign -> searched', () => {
  const steps = [
    { type: 'search' as const, cell: 'C3', digit: '4', detail: 'try C3 = 4' },
    { type: 'assign' as const, cell: 'C3', digit: '4', detail: 'C3 = 4' },
  ];
  const cls = classifySteps(steps);
  assert.equal(cls.get('C3'), 'searched');
});

test('renderBoard: 9 rows + box separators', () => {
  const out = renderBoard({
    puzzle: HARD_PUZZLE.map(row => row.join('')).join(''),
    solution: HARD_SOLUTION as unknown as number[][],
    steps: [],
  });
  const lines = out.split('\n');
  // bottom border (└─┴─┘) is followed by empty line + legend
  assert.ok(lines.length >= 15, `line count >= 15, got ${lines.length}`);
  assert.match(lines[0], /┌/);
  assert.ok(lines.some(l => l.includes('└')));
  assert.ok(lines.some(l => l.includes('├')));
});

test('renderBoard: null solution -> friendly message', () => {
  const out = renderBoard({ puzzle: HARD_PUZZLE.map(row => row.join('')).join(''), solution: null, steps: [] });
  assert.match(out, /无解|No solution/i);
});
