import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, rowColRegionLock } from '../solver/solve-2.ts';
import type { BoardState } from '../solver/solve-2.ts';
import { ctxFromRegions } from './solve-2.test-utils.ts';

test('rowColRegionLock:区域候选全在同一行 → 该行他区格划 X', () => {
  // 区域 0 候选全部落在行 0(其余行的区域0格被 excluded 清掉)
  const regions = [[0,0,1],[1,1,1],[2,2,2]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = rowColRegionLock.run(state, ctx);
  // 区域0候选 = (0,0),(0,1) 都在行0 → 行0属于其他区域的 (0,2) 应划 X
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,2'), '行 0 中他区格 (0,2) 应划 X');
});

test('保解-rowColRegionLock:区域已有线外星时不得锁定该线(修复2)', () => {
  // 4x4:区域0 含 (0,0)(0,1)(2,0)。在 (2,0) 放星(行2,线外),
  // 区域0 剩余候选 (0,0)(0,1) 都在行0,但区域0 只需再放 1 颗(regionCount=1),
  // 行0 的另一颗星可合法来自他区 → 不能锁定行0、排他区格。
  // 修复前:rowColRegionLock 锁定行0 → 误排他区格 (0,2)(0,3)。
  // 修复后:regionCount!==0 跳过该区域 → 不误排。
  const regions = [
    [0, 0, 1, 1],
    [3, 3, 3, 3],
    [0, 1, 1, 1],
    [2, 2, 2, 2],
  ];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [[2, 0]], excluded: new Set() };
  const res = rowColRegionLock.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r, c]) => cellKey(r, c)));
  assert.ok(!ex.has('0,2') && !ex.has('0,3'), '区域0 已有线外星,不得锁定行0 误排他区格');
});
