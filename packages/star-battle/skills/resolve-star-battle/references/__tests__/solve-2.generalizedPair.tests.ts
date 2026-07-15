import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, generalizedPair } from '../solver/solve-2.ts';
import type { BoardState } from '../solver/solve-2.ts';
import { ctxFromRegions, excludeAllExcept } from './solve-2.test-utils.ts';

test('generalizedPair:2 区域恰占 2 行 → 两行他区格划 X', () => {
  // 区域 0 候选都在行0,区域1候选都在行1,合占行{0,1};行0/1里属于其他区域的格划X
  const regions = [
    [0,0,3,3],
    [1,1,3,3],
    [2,2,2,2],
    [4,4,4,4],
  ];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = generalizedPair.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  // 行0的他区格 (0,2)(0,3) 与行1的他区格 (1,2)(1,3) 应划X
  assert.ok(ex.has('0,2') && ex.has('0,3') && ex.has('1,2') && ex.has('1,3'));
});

test('保解-generalizedPair:含已放星区域不参与 combo,不得误排(修复3)', () => {
  // 5x5:区域0(A)星在 (3,0)、剩余候选 (0,0) 行0;区域1(B)候选 (1,0)(1,2) 行1;
  // 区域2(C)候选 (0,2)(1,4)(2,2) 跨行{0,1,2}。
  // 修复前:combo{0,1} 占行{0,1},但 A 已放星只再放 1 颗,行{0,1} 未饱和,
  //         区域C 的 (0,2) 可合法占用行0 余位 → 但被误排。
  // 修复后:regionCount!==0 的区域0 不入 rids → combo{0,1} 不成立 → (0,2) 不被误排。
  const regions = [
    [0, 9, 2, 9, 9],
    [1, 9, 1, 9, 2],
    [9, 9, 2, 9, 9],
    [0, 9, 9, 9, 9],
    [9, 9, 9, 9, 9],
  ];
  const ctx = ctxFromRegions(regions);
  const excluded = excludeAllExcept(5, [
    [0, 0], [3, 0],            // 区域0:候选(0,0) + 星(3,0)
    [1, 0], [1, 2],            // 区域1 候选
    [0, 2], [1, 4], [2, 2],    // 区域2 候选(含待保留的 (0,2))
  ]);
  const state: BoardState = { stars: [[3, 0]], excluded };
  const res = generalizedPair.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r, c]) => cellKey(r, c)));
  assert.ok(!ex.has('0,2'), '区域0 已放星,combo{0,1} 不应成立 → (0,2) 不得被误排');
});
