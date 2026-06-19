import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, uniqueRegion } from '../src/solve-2.ts';
import type { BoardState } from '../src/solve-2.ts';
import { ctxFromRegions } from './solve-2.test-utils.ts';

test('uniqueRegion(k=2):区域已放 1 颗 + 仅剩 1 候选 → 定星', () => {
  // 区域 0 = (0,0)(0,2)。先放 (0,0)(regionCount=1, need=1),
  // 候选只剩 (0,2) 时 length=1=need → 定星。
  const regions = [[0,1,0],[1,1,1],[1,1,1]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [[0, 0]], excluded: new Set() };
  const res = uniqueRegion.run(state, ctx);
  assert.ok(res?.newStars && res.newStars.length === 1);
  assert.deepEqual(res!.newStars![0], [0, 2]);
});

test('uniqueRegion(k=2):未放星 + 候选数 = need = 2 → 全部定星', () => {
  // 区域 0 = (0,0)(0,2)(0,1)。excluded 中点后候选 (0,0)(0,2) 互不相邻,
  // length=2=need=k → 两颗全定星。
  const regions = [[0,0,0],[1,1,1],[1,1,1]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set([cellKey(0, 1)]) };
  const res = uniqueRegion.run(state, ctx);
  assert.ok(res?.newStars && res.newStars.length === 2);
  const keys = new Set(res!.newStars!.map(([r, c]) => cellKey(r, c)));
  assert.ok(keys.has('0,0') && keys.has('0,2'));
});
