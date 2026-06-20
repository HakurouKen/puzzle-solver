import test from 'node:test';
import assert from 'node:assert/strict';
import { cross, ROWS, COLS } from '../solver.ts';

test('cross: 笛卡尔积返回所有组合', () => {
  assert.deepEqual(cross(['A', 'B'], ['1', '2']), ['A1', 'A2', 'B1', 'B2']);
});

test('ROWS + COLS: 9 行 9 列', () => {
  assert.equal(ROWS.length, 9);
  assert.equal(COLS.length, 9);
  assert.deepEqual(ROWS, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  assert.deepEqual(COLS, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
});

import { squares, unitList, units, peers } from '../solver.ts';

test('squares: 81 个格子名 A1..I9', () => {
  assert.equal(squares.length, 81);
  assert.equal(squares[0], 'A1');
  assert.equal(squares[80], 'I9');
});

test('unitList: 27 个 unit（9 行 + 9 列 + 9 宫）', () => {
  assert.equal(unitList.length, 27);
  // 第一个 unit = 第 1 行 A1..A9
  assert.deepEqual(unitList[0], ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']);
  // 最后一个 unit = 第 9 宫 GHI×789
  assert.deepEqual(unitList[26], ['G7', 'G8', 'G9', 'H7', 'H8', 'H9', 'I7', 'I8', 'I9']);
});

test('units: A1 在 3 个 unit（行/列/宫）', () => {
  assert.equal(units.get('A1')?.length, 3);
  const u = units.get('A1')!;
  assert.ok(u.some(unit => unit.includes('A2') && unit.includes('A9')));
  assert.ok(u.some(unit => unit.includes('B1') && unit.includes('I1')));
  assert.ok(u.some(unit => unit.includes('B2') && unit.includes('C3')));
});

test('peers: A1 有 20 个同伴（行 8 + 列 8 + 宫 4）', () => {
  const p = peers.get('A1')!;
  assert.equal(p.length, 20);
  // A1 的同伴不应该包含 A1 自身
  assert.ok(!p.includes('A1'));
  // 同宫的 B2/B3/C2/C3 都在
  assert.ok(p.includes('B2') && p.includes('B3') && p.includes('C2') && p.includes('C3'));
});

test('peers: 中心格 E5 有 20 个同伴', () => {
  assert.equal(peers.get('E5')!.length, 20);
});
