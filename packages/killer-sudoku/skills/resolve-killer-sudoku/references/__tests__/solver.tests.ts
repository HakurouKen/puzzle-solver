// 单元测试：Killer Sudoku 求解器

import test from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../solver.ts';
import {
  EASY_PUZZLE,
  MEDIUM_PUZZLE,
  UNSOLVABLE_PUZZLE,
  validateSolution,
  SOLUTION_ARRAY,
} from './fixtures.ts';

// ── 基础求解 ─────────────────────────────────────────────────────────

test('solve: 简单谜题能正确求解', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result, 'should return a result');
  assert.ok(result.solution, 'should have a solution');
  assert.equal(result.solution.length, 9);
  for (const row of result.solution) {
    assert.equal(row.length, 9);
  }
  assert.ok(validateSolution(EASY_PUZZLE, result.solution));
});

test('solve: 中等谜题能正确求解', () => {
  const result = solve(MEDIUM_PUZZLE);
  assert.ok(result, 'should return a result');
  assert.ok(result.solution, 'should have a solution');
  assert.ok(validateSolution(MEDIUM_PUZZLE, result.solution));
});

test('solve: 不可解谜题返回 null', () => {
  const result = solve(UNSOLVABLE_PUZZLE);
  assert.equal(result, null);
});

// ── 输入验证 ─────────────────────────────────────────────────────────

test('parse: 错误尺寸的 puzzle 返回 null', () => {
  const result = solve({
    puzzle: Array(8).fill(null).map(() => Array(9).fill(0)),
    cages: EASY_PUZZLE.cages,
  });
  assert.equal(result, null);
});

test('parse: 非 9×9 的 cage grid 返回 null', () => {
  const result = solve({
    puzzle: Array(9).fill(null).map(() => Array(8).fill(0)),
    cages: EASY_PUZZLE.cages,
  });
  assert.equal(result, null);
});

test('parse: 无效数字（非 0-9）返回 null', () => {
  const result = solve({
    puzzle: Array(9).fill(null).map(() => Array(9).fill(10)),
    cages: EASY_PUZZLE.cages,
  });
  assert.equal(result, null);
});

test('parse: 笼未覆盖所有格返回 null', () => {
  // 创建一个只覆盖部分格的笼列表
  const partialCages = EASY_PUZZLE.cages.slice(0, 10);
  const result = solve({
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: partialCages,
  });
  assert.equal(result, null);
});

test('parse: 笼重复覆盖同一格返回 null', () => {
  // 创建一个有重复覆盖的笼列表
  const duplicateCages = [
    ...EASY_PUZZLE.cages.slice(0, -1),
    { cells: [[0, 0], [0, 1]], sum: 5 },  // 重复覆盖
  ];
  const result = solve({
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: duplicateCages,
  });
  assert.equal(result, null);
});

// ── 约束验证 ─────────────────────────────────────────────────────────

test('solution: 满足行不重复', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result);
  for (const row of result.solution) {
    assert.equal(new Set(row).size, 9);
  }
});

test('solution: 满足列不重复', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result);
  for (let c = 0; c < 9; c++) {
    const col: number[] = result.solution.map((row: number[]) => row[c]);
    assert.equal(new Set(col).size, 9);
  }
});

test('solution: 满足宫不重复', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result);
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const box: number[] = [];
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          box.push(result.solution[r][c]);
        }
      }
      assert.equal(new Set(box).size, 9);
    }
  }
});

test('solution: 满足笼和值', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result);
  for (const cage of EASY_PUZZLE.cages) {
    let sum = 0;
    for (const cell of cage.cells) {
      const r = cell[0];
      const c = cell[1];
      sum += result.solution[r][c];
    }
    assert.equal(sum, cage.sum, `cage sum mismatch for ${JSON.stringify(cage)}`);
  }
});

test('solution: 笼内不重复', () => {
  const result = solve(MEDIUM_PUZZLE);
  assert.ok(result);
  for (const cage of MEDIUM_PUZZLE.cages) {
    const digits: number[] = [];
    for (const cell of cage.cells) {
      digits.push(result.solution[cell[0]][cell[1]]);
    }
    assert.equal(new Set(digits).size, digits.length);
  }
});

// ── 预填线索 ─────────────────────────────────────────────────────────

test('solve: 尊重预填线索', () => {
  const puzzle = Array(9).fill(null).map(() => Array(9).fill(0));
  puzzle[0][0] = 1;
  puzzle[1][1] = 5;

  const result = solve({
    puzzle,
    cages: EASY_PUZZLE.cages,
  });

  assert.ok(result);
  assert.equal(result.solution[0][0], 1);
  assert.equal(result.solution[1][1], 5);
});

test('solve: 预填线索冲突时返回 null', () => {
  const puzzle = Array(9).fill(null).map(() => Array(9).fill(0));
  puzzle[0][0] = 1;
  puzzle[0][1] = 1;  // 同行重复

  const result = solve({
    puzzle,
    cages: EASY_PUZZLE.cages,
  });

  assert.equal(result, null);
});

// ── 步骤日志 ─────────────────────────────────────────────────────────

test('steps: 包含消除和赋值操作', () => {
  const result = solve(EASY_PUZZLE);
  assert.ok(result);
  assert.ok(result.steps.length > 0);

  const hasAssign = result.steps.some(s => s.type === 'assign');
  const hasEliminate = result.steps.some(s => s.type === 'eliminate');
  assert.ok(hasAssign || hasEliminate, 'should have at least some constraint propagation steps');
});

test('steps: 步骤格式正确', () => {
  const result = solve(MEDIUM_PUZZLE);
  assert.ok(result);

  for (const step of result.steps) {
    if (step.type === 'eliminate' || step.type === 'assign' || step.type === 'rule-of-45') {
      assert.ok(typeof step.cell === 'string');
      assert.ok(typeof step.digit === 'string');
    }
    assert.ok(typeof step.detail === 'string');
  }
});
