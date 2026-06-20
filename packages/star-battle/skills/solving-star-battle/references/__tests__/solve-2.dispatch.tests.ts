import test from 'node:test';
import assert from 'node:assert/strict';
import solve, { STRATEGIES } from '../solver/solve-2.ts';
import { rowsBoard } from './solve-2.test-utils.ts';

test('solve:接口仍为 { solution, steps } 且 steps 非空', () => {
  const { solution, steps } = solve(rowsBoard(6));
  assert.ok(Array.isArray(solution) && Array.isArray(steps));
  assert.ok(steps.length > 0);
});

test('策略顺序守卫:STRATEGIES 名字顺序恰为预期', () => {
  // 若将来增删策略或打乱顺序,此测试会捕获
  assert.deepEqual(
    STRATEGIES.map(s => s.name),
    ['uniqueRegion','uniqueRow','uniqueCol','saturationClear','regionShapeEnum','rowColRegionLock','generalizedPair','forcedChain']
  );
});
