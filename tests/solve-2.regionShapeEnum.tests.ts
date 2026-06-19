import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, regionShapeEnum } from '../src/solve-2.ts';
import type { BoardState } from '../src/solve-2.ts';
import { ctxFromRegions } from './solve-2.test-utils.ts';

test('例1:1x3 直线区域,2 星必在两端 → 交集定星', () => {
  // 顶行 3 格为区域 0;其余格属区域 1,使区域 0 必须放满 2 星
  const regions = [[0,0,0],[1,1,1],[1,1,1]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = regionShapeEnum.run(state, ctx);
  const stars = new Set((res?.newStars ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(stars.has('0,0') && stars.has('0,2'), '两端必为星');
  assert.ok(!stars.has('0,1'), '中点不应被定星');
});

test('例2:2x3 矩形区域,中列两格放不下 → 补集定 X', () => {
  // 区域 0 占据 (0,0..2) 与 (1,0..2) 共 2x3;放 2 颗互不相邻星时第 1 列(中列)永远空
  const regions = [
    [0,0,0,2,2],
    [0,0,0,2,2],
    [1,1,1,3,3],
    [1,1,1,3,3],
    [4,4,4,4,4],
  ];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set() };
  const res = regionShapeEnum.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,1') && ex.has('1,1'), '2x3 中列两格应被划 X');
});
