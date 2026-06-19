import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, saturationClear } from '../src/solve-2.ts';
import type { BoardState } from '../src/solve-2.ts';
import { ctxFromRegions } from './solve-2.test-utils.ts';

test('saturationClear:放星后邻格进 excluded(且仅报告未知格)', () => {
  const regions = [[0,0,0],[0,0,0],[0,0,0]];
  const ctx = ctxFromRegions(regions);
  const state: BoardState = { stars: [[0,0]], excluded: new Set() };
  const res = saturationClear.run(state, ctx);
  const ex = new Set((res?.newExcluded ?? []).map(([r,c]) => cellKey(r,c)));
  assert.ok(ex.has('0,1') && ex.has('1,0') && ex.has('1,1'), '邻格应被排除');
  assert.ok(!ex.has('0,0'), '星本身不算排除格');
  // 幂等:已全部 excluded 时返回 null(无新进展)
  const state2: BoardState = { stars: [[0,0]], excluded: new Set(['0,1','1,0','1,1']) };
  assert.equal(saturationClear.run(state2, ctx), null);
});
