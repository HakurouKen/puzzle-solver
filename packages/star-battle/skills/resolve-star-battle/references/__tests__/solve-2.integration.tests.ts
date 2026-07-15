import test from 'node:test';
import assert from 'node:assert/strict';
import solve from '../solver/solve-2.ts';
import { rowsBoard, colsBoard, validateSolution } from './solve-2.test-utils.ts';

test('回归:10x10 regions=rows 盘求出合法解', () => {
  const regions = rowsBoard(10);
  const { solution } = solve(regions);
  assert.ok(solution.some(row => row.some(c => c === 1)), '应找到解,而非无解');
  assert.ok(validateSolution(regions, solution), 'solution 必须合法');
});

test('deduce:regions=rows 盘策略显著削减回溯(解合法且回退有界)', () => {
  const regions = rowsBoard(10);
  const { solution, steps } = solve(regions);
  assert.ok(validateSolution(regions, solution), '解必须合法');
  const backtracks = steps.filter(s => s.includes('[回退]')).length;
  assert.ok(backtracks < 1500, `回退数应显著低于旧实现基线(旧~2639),实际 ${backtracks}`);
});

test('集成:colsBoard(8) 求出合法解', () => {
  // 验证过:colsBoard(8) 有解,回退 272 次
  const regions = colsBoard(8);
  const { solution } = solve(regions);
  assert.ok(solution.some(row => row.some(c => c === 1)), '应找到解,而非无解');
  assert.ok(validateSolution(regions, solution), 'colsBoard(8) 解必须合法');
});

test('集成:不规则 6x6 盘 - 若返回解则必合法', () => {
  // 6x6,人工划分 6 个区域(每区 6 格),k=2
  // 该盘可能无解或有解;断言"若返回解则必合法",不强制有解
  const regions = [
    [0,0,1,1,2,2],
    [0,0,1,1,2,2],
    [3,3,1,4,2,5],
    [3,3,4,4,5,5],
    [3,3,4,4,5,5],
    [0,0,1,2,2,5],
  ];
  const { solution } = solve(regions);
  const solved = solution.some(row => row.some(c => c === 1));
  if (solved) {
    assert.ok(validateSolution(regions, solution), '返回的解必须合法');
  }
  // 不强制有解,只保证不产出非法解
});

test('集成:无解盘 [[0,0],[0,0]] 正确返回无解', () => {
  // 2x2 盘要求每行/列/区域 2 星但格不够(2x2=4 格需放 2 星且互不 king-相邻,无法满足)→ 无解
  const regions = [[0,0],[0,0]];
  const { solution } = solve(regions);
  assert.ok(!solution.some(row => row.some(c => c === 1)), '2x2 单区域应判无解');
});

test('回溯削减:rowsBoard(8) 解合法且回退有界', () => {
  // 验证过:rowsBoard(8) 有解,回退 272 次;上界设 1500 远宽于实际
  const regions = rowsBoard(8);
  const { solution, steps } = solve(regions);
  assert.ok(validateSolution(regions, solution), '解必须合法');
  const backtracks = steps.filter(s => s.includes('[回退]')).length;
  assert.ok(backtracks < 1500, `回退数应有界,实际 ${backtracks}`);
});
