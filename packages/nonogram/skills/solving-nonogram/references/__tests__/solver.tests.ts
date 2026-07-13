import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeLine, solve } from '../solver.ts';

test('analyzeLine: clue [3] 在长度 5 的空线上确定中心格', () => {
  assert.deepEqual(analyzeLine(5, [3], [-1, -1, -1, -1, -1]), {
    feasible: true,
    canBeFilled: [true, true, true, true, true],
    canBeEmpty: [true, true, false, true, true],
  });
});

test('solve: 返回 5×5 十字题的唯一解', () => {
  const clues = [[1], [3], [5], [3], [1]];
  const result = solve({ rowClues: clues, columnClues: clues });

  assert.equal(result.status, 'solved');
  assert.deepEqual(result.solution, [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ]);
  assert.equal(result.alternateSolution, undefined);
  assert.equal(result.stats.limitReached, false);
  assert.ok(result.steps.some((step) => step.type === 'line-deduction'));
});

test('solve: 返回两组见证解证明题目多解', () => {
  const result = solve({
    rowClues: [[1], [1]],
    columnClues: [[1], [1]],
  });

  assert.equal(result.status, 'multiple');
  assert.ok(result.solution);
  assert.ok(result.alternateSolution);
  assert.notDeepEqual(result.solution, result.alternateSolution);
});

test('solve: 矛盾线索返回 unsatisfiable', () => {
  const result = solve({
    rowClues: [[2]],
    columnClues: [[], []],
  });

  assert.equal(result.status, 'unsatisfiable');
  assert.equal(result.solution, null);
  assert.ok(result.steps.some((step) => step.type === 'contradiction'));
});

test('solve: 达到搜索节点上限时返回 indeterminate 和候选解', () => {
  const result = solve(
    { rowClues: [[1], [1]], columnClues: [[1], [1]] },
    { maxSearchNodes: 1 },
  );

  assert.equal(result.status, 'indeterminate');
  assert.ok(result.solution);
  assert.equal(result.alternateSolution, undefined);
  assert.equal(result.stats.limitReached, true);
  assert.equal(result.stats.searchNodes, 1);
});

test('solve: 不修改输入并按上限截断步骤日志', () => {
  const puzzle = { rowClues: [[1], [1]], columnClues: [[1], [1]] };
  const snapshot = structuredClone(puzzle);
  const result = solve(puzzle, { maxSteps: 1 });

  assert.deepEqual(puzzle, snapshot);
  assert.equal(result.steps.length, 1);
  assert.ok(result.stats.omittedSteps > 0);
});

function cluesForLine(line: readonly number[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const cell of [...line, 0]) {
    if (cell === 1) run++;
    else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  return clues;
}

test('solve: 固定种子的随机小盘返回解均满足原始 clues', () => {
  let seed = 0x5eed;
  const randomBit = (): 0 | 1 => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 31) as 0 | 1;
  };

  for (let example = 0; example < 12; example++) {
    const source = Array.from({ length: 4 }, () => Array.from({ length: 4 }, randomBit));
    const rowClues = source.map(cluesForLine);
    const columnClues = Array.from({ length: 4 }, (_, column) =>
      cluesForLine(source.map((row) => row[column])),
    );
    const result = solve({ rowClues, columnClues });

    assert.notEqual(result.status, 'unsatisfiable');
    assert.ok(result.solution);
    assert.deepEqual(result.solution.map(cluesForLine), rowClues);
    assert.deepEqual(
      Array.from({ length: 4 }, (_, column) => cluesForLine(result.solution!.map((row) => row[column]))),
      columnClues,
    );
  }
});
