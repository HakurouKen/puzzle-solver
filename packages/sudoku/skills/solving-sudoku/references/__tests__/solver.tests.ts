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

import { parseGrid, DIGITS } from '../solver.ts';
import { EASY_PUZZLE, HARD_PUZZLE, UNSOLVABLE_PUZZLE } from './fixtures.ts';

test('DIGITS: 9 个数字字符', () => {
  assert.equal(DIGITS, '123456789');
});

test('parseGrid: 合法题 → 81 格 Map', () => {
  const g = parseGrid(EASY_PUZZLE);
  assert.ok(g !== false);
  assert.equal(g!.size, 81);
  // 已知数字 A1=4, 候选 = "4"
  assert.equal(g!.get('A1'), '4');
  // 空格经约束传播后候选减少
  assert.ok(!g!.get('A2')!.includes('4'));  // A1=4 同行消除
  assert.ok(!g!.get('B1')!.includes('4'));  // A1=4 同列消除
  assert.ok(!g!.get('B2')!.includes('4'));  // A1=4 同宫消除
});

test('parseGrid: "0" 与 "." 都视为空格', () => {
  const g1 = parseGrid('0'.repeat(81));
  const g2 = parseGrid('.'.repeat(81));
  assert.ok(g1 !== false && g2 !== false);
  for (const s of ['A1', 'E5', 'I9']) {
    assert.equal(g1!.get(s), DIGITS);
    assert.equal(g2!.get(s), DIGITS);
  }
});

test('parseGrid: 长度 ≠ 81 返回 false', () => {
  assert.equal(parseGrid('123'), false);
  assert.equal(parseGrid('1'.repeat(80)), false);
  assert.equal(parseGrid('1'.repeat(82)), false);
});

test('parseGrid: 含非法字符返回 false', () => {
  assert.equal(parseGrid('1'.repeat(80) + 'X'), false);
});

test('parseGrid: 含冲突的已知数字 → 拒绝', () => {
  // HARD_PUZZLE 第一行 "53..7...." 解析应成功
  const ok = parseGrid(HARD_PUZZLE);
  assert.ok(ok !== false);
  // 但同行两个 5 → 冲突
  const conflict = '55' + '.'.repeat(79);
  assert.equal(parseGrid(conflict), false);
});

import { assign, eliminate } from '../solver.ts';
import type { Grid, Step } from '../solver.ts';

test('assign: 把格子收敛到单值 + 同步消除同伴中该值', () => {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  const steps: Step[] = [];
  const ok = assign(g, 'A1', '5', steps);
  assert.ok(ok !== false);
  assert.equal(g.get('A1'), '5');
  // 同伴 A2 不再有 5
  assert.ok(!g.get('A2')!.includes('5'));
  // steps 含 assign 步骤
  assert.ok(steps.some(s => s.type === 'assign' && s.cell === 'A1' && s.digit === '5'));
});

test('assign: 与同伴已知数字冲突 → false', () => {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  // 先把 A1 设为 5
  assign(g, 'A1', '5', []);
  // 再尝试把 A2 设为 5（同行冲突）
  const ok = assign(g, 'A2', '5', []);
  assert.equal(ok, false);
});

test('assign: 候选不变但数字未变 → 不重复记录', () => {
  // 弱断言：assign 一个已经是该值的格子不应崩溃
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  assign(g, 'A1', '5', []);
  const steps: Step[] = [];
  assign(g, 'A1', '5', steps);
  // 重复 assign 不应产出新步骤（候选已收敛）
  assert.equal(steps.length, 0);
});

test('parseGrid: UNSOLVABLE_PUZZLE 无解析期冲突，返回 Grid', () => {
  const g = parseGrid(UNSOLVABLE_PUZZLE);
  assert.ok(g !== false);
  assert.equal(g!.size, 81);
});
