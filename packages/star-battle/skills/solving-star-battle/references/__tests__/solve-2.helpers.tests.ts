import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, validateCounts, deriveCandidates } from '../solver/solve-2.ts';
import type { BoardState } from '../solver/solve-2.ts';
import { ctxFromRegions } from './solve-2.test-utils.ts';

test('cellKey 稳定', () => { assert.equal(cellKey(2, 3), '2,3'); });

test('deriveCandidates 排除 excluded / 星邻格 / 满行列', () => {
  // 3x3 单区域(rid=0)铺满,k=2
  const regions = [[0,0,0],[0,0,0],[0,0,0]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [[0,0]], excluded: new Set([cellKey(2,2)]) };
  const cand = deriveCandidates(state, ctx)[0];
  const keys = new Set(cand.map(([r,c]) => cellKey(r,c)));
  assert.ok(!keys.has('2,2'), '(2,2) 被 excluded');
  assert.ok(!keys.has('0,1') && !keys.has('1,0') && !keys.has('1,1'), '星(0,0)的邻格被排除');
  assert.ok(!keys.has('0,0'), '已是星的格不在候选');
  assert.ok(keys.has('1,2') && keys.has('2,1'), '远离星且未排除的格保留');
});

test('validateCounts 检测超额与相邻', () => {
  const regions = [[0,0,0],[0,0,0],[0,0,0]];
  const ctx = ctxFromRegions(regions);
  assert.equal(validateCounts({ stars: [[0,0],[0,1]], excluded: new Set() }, ctx), false, '两星相邻应判矛盾');
  assert.equal(validateCounts({ stars: [[0,0],[2,2]], excluded: new Set() }, ctx), true, '合法布局通过');
});

test('deriveCandidates 满行排除:行已达 k 星时该行其他格被排除', () => {
  // 5x5 棋盘,两个区域:区域0覆盖行0(列0-4),区域1覆盖行1-4
  // 行0已有2颗星(0,0)和(0,4),使行0达到k=2
  // 区域1的候选格在行1-4,不在行0,因此区域1仍有候选
  // 额外验证:若区域1含行0的格,则那些格被排除
  // 使用自定义区域:区域0=行0全部 + (1,0);区域1包含(0,2)(用于验证)及行1-4其余格
  const regions: number[][] = [
    [0, 0, 1, 0, 0],  // 行0:区域0含(0,0)(0,1)(0,3)(0,4),区域1含(0,2)
    [1, 1, 1, 1, 1],  // 行1-4全属区域1
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ];
  const ctx = ctxFromRegions(regions);
  // stars: (0,0)和(0,4)互不相邻(列距4),行0达到k=2
  const state: BoardState = { stars: [[0,0],[0,4]], excluded: new Set() };
  const cand = deriveCandidates(state, ctx);
  // 区域0已满(2颗星均属区域0),不出现在结果中
  assert.ok(!(1 in cand) || !cand[1].some(([r,c]) => r === 0 && c === 2),
    '行0已满k=2,区域1中的(0,2)应被满行排除');
  // 区域1在行1-4仍有候选
  assert.ok(1 in cand && cand[1].length > 0, '区域1在其他行仍有候选格');
});

test('validateCounts 超额:同行星数 > k 应返回 false', () => {
  // 5x5 单区域,行0放3颗星(互不相邻:列0,2,4),超过k=2
  const regions: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [[0,0],[0,2],[0,4]], excluded: new Set() };
  assert.equal(validateCounts(state, ctx), false, '行0有3颗星(>k=2)应返回false');
});
