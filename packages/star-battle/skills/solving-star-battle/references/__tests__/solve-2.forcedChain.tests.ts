import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, forcedChain } from '../solver/solve-2.ts';
import type { BoardState } from '../solver/solve-2.ts';
import { ctxFromRegions, excludeAllExcept } from './solve-2.test-utils.ts';

test('forcedChain:某区域的候选会使他区无解 → 排除该候选(定 X 或唯一定星)', () => {
  // 构造区域 A 有 2 候选,其一会让相邻区域 B 无任何合法候选
  // 顶行区域0两候选 (0,0)(0,2);区域1只有 (1,0)(1,1) 两格,
  // 若区域0选(0,0),则(1,0)(1,1)均与(0,0)相邻→区域1无解 ⇒ (0,0) 应被强制链排除
  const regions = [
    [0,0,0],
    [1,1,2],
    [2,2,2],
  ];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [], excluded: new Set([cellKey(0,1)]) }; // 去掉中点,使区域0候选=(0,0)(0,2)
  const res = forcedChain.run(state, ctx);
  assert.ok(res !== null, '应有进展');
  // (0,0) 被排除 → 要么直接定 X,要么区域0唯一候选(0,2)定星
  const starKeys = new Set((res?.newStars ?? []).map(([r,c]) => cellKey(r,c)));
  const exKeys = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(starKeys.has('0,2') || exKeys.has('0,0'), '应排除致死候选(0,0)或定星(0,2)');
});

test('保解-forcedChain:同行不相邻候选可共存,不得误判致死(修复1)', () => {
  // 5x5:区域0 候选 (0,0)(4,0);区域1 候选 (0,3)(0,4)。
  // k=2 时同行不相邻两星可共存:放区域0 的 (0,0) 后,区域1 的 (0,3)
  // 与 (0,0) 同行但列距 3(不相邻),是合法共存候选。
  // 修复前:forcedChain 的 or!==r 条件把同行候选误判无效 → 认为放 (0,0) 致区域1 无解
  //         → 把 (0,0) 当致死、唯一可行 (4,0) 定星(误)。
  // 修复后:识别同行共存合法 → 两候选均可行 → forcedChain 无进展,返回 null。
  const regions = [
    [0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1],
  ];
  const ctx = ctxFromRegions(regions);
  const excluded = excludeAllExcept(5, [[0, 0], [4, 0], [0, 3], [0, 4]]);
  const state: BoardState = { stars: [], excluded };
  const res = forcedChain.run(state, ctx);
  const starKeys = new Set((res?.newStars ?? []).map(([r, c]) => cellKey(r, c)));
  const exKeys = new Set((res?.newExcluded ?? []).map(([r, c]) => cellKey(r, c)));
  assert.ok(!exKeys.has('0,0'), '不得把合法候选 (0,0) 当致死排除');
  assert.ok(!starKeys.has('4,0'), '不得因误判而把 (4,0) 当唯一可行定星(变相排除 0,0)');
});
