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

test('eliminate: 删除候选中的一个数字', () => {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  const steps: Step[] = [];
  const ok = eliminate(g, 'A1', '5', steps);
  assert.ok(ok !== false);
  assert.equal(g.get('A1'), '12346789');
  // 9 → 8 不算缩到 1，eliminate 不记录步骤（由 assign 链式调用记录）
  assert.equal(steps.length, 0);
});

test('eliminate: 候选缩到 1 → 触发 assign 传播', () => {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  // 一步步消直到 A1 剩 5
  for (const d of '12346789'.split('')) {
    eliminate(g, 'A1', d, []);
  }
  const steps: Step[] = [];
  // 现在 A1 = 5，再消除任一不存在的数字：no-op
  eliminate(g, 'A1', '9', steps);
  // 验证 A1 还是 5
  assert.equal(g.get('A1'), '5');
  // 验证同伴 A2..A9 都没有 5
  for (const c of COLS.slice(1)) {
    assert.ok(!g.get('A' + c)!.includes('5'), `A${c} should not have 5`);
  }
});

test('eliminate: 候选变空 → false', () => {
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  // 把 A1 确定为 5
  assign(g, 'A1', '5', []);
  // 把 B1 也确定为 5 → 触发冲突（B1 与 A1 同行）
  const ok = assign(g, 'B1', '5', []);
  assert.equal(ok, false);
});

test('eliminate: unit 唯一性启发式 — 某 unit 中某数字仅在 1 格出现 → 该格赋此值', () => {
  // 构造场景：第 1 行 A1..A9 中，手动从 A1 移除 5（不用 assign，避免同伴传播），
  // 然后逐格从 A9..A3 消去 5。当消去 A3 的 5 后，第 1 行只剩下 A2 有 5，
  // 此时启发式 2 应触发 assign(A2, '5')
  const g: Grid = new Map();
  for (const s of squares) g.set(s, DIGITS);
  // 手动从 A1 候选中删除 5（非 assign 方式）
  g.set('A1', g.get('A1')!.replace('5', ''));
  // 逐格消去第 1 行 5 的候选（A9 → A3）
  for (const c of ['9', '8', '7', '6', '5', '4', '3']) {
    eliminate(g, 'A' + c, '5', []);
  }
  // 第 1 行中 5 仅在 A2 出现 → 启发式 2 触发 assign(A2, '5')
  assert.equal(g.get('A2'), '5');
});
