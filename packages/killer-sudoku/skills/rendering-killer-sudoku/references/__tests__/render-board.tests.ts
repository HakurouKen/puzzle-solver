// 单元测试：渲染器

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBoard, renderCages } from '../render-board.ts';

test('renderBoard: 输出包含完整的边框', () => {
  const input = {
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: [
      { cells: [[0, 0]], sum: 1 },
      ...Array.from({ length: 80 }, (_, i) => ({
        cells: [[Math.floor((i + 1) / 9), (i + 1) % 9]] as [number, number][],
        sum: 1,
      })),
    ],
  };

  const output = renderBoard(input);
  const lines = output.split('\n');

  // 11 行：顶部边框 + 9 行棋盘 + 底部边框
  // 加上行间分隔（8 个分隔）
  assert.ok(lines.length >= 11);

  // 第一行是顶部边框
  assert.ok(lines[0].startsWith('┏'));
  assert.ok(lines[0].endsWith('┓'));
});

test('renderBoard: 显示已填数字', () => {
  const input = {
    puzzle: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      ...Array(8).fill(null).map(() => Array(9).fill(0)),
    ],
    cages: [
      { cells: [[0, 0]], sum: 1 },
      ...Array.from({ length: 80 }, (_, i) => ({
        cells: [[Math.floor((i + 1) / 9), (i + 1) % 9]] as [number, number][],
        sum: 1,
      })),
    ],
  };

  const output = renderBoard(input);
  assert.ok(output.includes(' 1 '));
});

test('renderBoard: 优先显示 solution', () => {
  const input = {
    puzzle: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      ...Array(8).fill(null).map(() => Array(9).fill(0)),
    ],
    solution: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      ...Array(8).fill(null).map(() => Array(9).fill(0)),
    ],
    cages: [
      { cells: [[0, 0]], sum: 1 },
      ...Array.from({ length: 80 }, (_, i) => ({
        cells: [[Math.floor((i + 1) / 9), (i + 1) % 9]] as [number, number][],
        sum: 1,
      })),
    ],
  };

  const output = renderBoard(input);
  assert.ok(output.includes(' 1 '));
  assert.ok(output.includes(' 2 '));
  assert.ok(output.includes(' 9 '));
});

test('renderCages: 显示笼列表', () => {
  const input = {
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: [
      { cells: [[0, 0], [0, 1]], sum: 3 },
      { cells: [[0, 2]], sum: 5 },
    ],
  };

  const output = renderCages(input);
  assert.ok(output.includes('Cage 0'));
  assert.ok(output.includes('Cage 1'));
  assert.ok(output.includes('A1,A2'));
  assert.ok(output.includes('A3'));
  assert.ok(output.includes('sum=3'));
  assert.ok(output.includes('sum=5'));
});
