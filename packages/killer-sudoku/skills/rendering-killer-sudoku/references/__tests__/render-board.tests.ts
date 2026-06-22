// 单元测试：渲染器

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBoard, renderCages, renderSvg } from '../render-board.ts';

// 81 个单格 cage（每格一笼），便于构造完整棋盘
function singletonCages(): { cells: [number, number][]; sum: number }[] {
  return Array.from({ length: 81 }, (_, i) => ({
    cells: [[Math.floor(i / 9), i % 9]] as [number, number][],
    sum: 1,
  }));
}

test('renderBoard: 输出包含完整的边框', () => {
  const input = {
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: singletonCages(),
  };

  const output = renderBoard(input);
  const lines = output.split('\n');

  // 双行格：顶框 + (9 格 × 2 行 + 8 行间分隔) + 底框 = 1 + 26 + 1 = 28
  assert.equal(lines.length, 28);

  // 第一行是顶部边框
  assert.ok(lines[0].startsWith('┏'));
  assert.ok(lines[0].endsWith('┓'));
  // 最后一行是底部边框
  assert.ok(lines[lines.length - 1].startsWith('┗'));
  assert.ok(lines[lines.length - 1].endsWith('┛'));
});

test('renderBoard: 显示已填数字（5 字符宽居中）', () => {
  const input = {
    puzzle: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      ...Array(8).fill(null).map(() => Array(9).fill(0)),
    ],
    cages: singletonCages(),
  };

  const output = renderBoard(input);
  assert.ok(output.includes('  1  '));
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
    cages: singletonCages(),
  };

  const output = renderBoard(input);
  assert.ok(output.includes('  1  '));
  assert.ok(output.includes('  2  '));
  assert.ok(output.includes('  9  '));
});

test('renderBoard: cage sum 标注在锚点格左上角', () => {
  // 一个跨多格的 cage，锚点应为最左上格 (0,0)
  const cages: { cells: [number, number][]; sum: number }[] = [
    { cells: [[0, 0], [0, 1], [1, 0]], sum: 16 },
  ];
  const used = new Set(cages.flatMap((c) => c.cells.map(([r, cc]) => `${r},${cc}`)));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!used.has(`${r},${c}`)) cages.push({ cells: [[r, c]], sum: 1 });
    }
  }

  const input = { puzzle: Array(9).fill(null).map(() => Array(9).fill(0)), cages };
  const output = renderBoard(input);
  const lines = output.split('\n');

  // sum 行是第 2 行（index 1），16 左对齐贴在首格内
  assert.ok(lines[1].includes('16'));
  assert.ok(lines[1].startsWith('┃16'));
});

test('renderBoard: cage 边界用虚线，内部用细线', () => {
  // cage 0 = 竖向两格 (0,0)(1,0)；其内部下边界应为细线
  const cages: { cells: [number, number][]; sum: number }[] = [
    { cells: [[0, 0], [1, 0]], sum: 5 },
  ];
  const used = new Set(cages.flatMap((c) => c.cells.map(([r, cc]) => `${r},${cc}`)));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!used.has(`${r},${c}`)) cages.push({ cells: [[r, c]], sum: 1 });
    }
  }

  const input = { puzzle: Array(9).fill(null).map(() => Array(9).fill(0)), cages };
  const output = renderBoard(input);

  // 整体应含有虚线字符（cage 边界）
  assert.ok(output.includes('╎'), '应包含竖向虚线');
  assert.ok(output.includes('╌'), '应包含横向虚线');
  // 同 cage 内部应含细实线分隔
  assert.ok(output.includes('─') || output.includes('│'), '应包含细线');
});

test('renderSvg: 输出合法 SVG 骨架', () => {
  const input = {
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: singletonCages(),
  };
  const svg = renderSvg(input);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('</svg>'));
  // 含虚线 cage 框
  assert.ok(svg.includes('stroke-dasharray'));
});

test('renderSvg: cage sum 出现在输出中', () => {
  const cages: { cells: [number, number][]; sum: number }[] = [
    { cells: [[0, 0], [0, 1], [1, 0]], sum: 16 },
  ];
  const used = new Set(cages.flatMap((c) => c.cells.map(([r, cc]) => `${r},${cc}`)));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!used.has(`${r},${c}`)) cages.push({ cells: [[r, c]], sum: 1 });
    }
  }
  const svg = renderSvg({ puzzle: Array(9).fill(null).map(() => Array(9).fill(0)), cages });
  assert.ok(svg.includes('>16</text>'));
});

test('renderSvg: 优先渲染 solution 数字', () => {
  const svg = renderSvg({
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    solution: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      ...Array(8).fill(null).map(() => Array(9).fill(0)),
    ],
    cages: singletonCages(),
  });
  assert.ok(svg.includes('>9</text>'));
});

test('renderCages: 显示笼列表', () => {
  const input = {
    puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
    cages: [
      { cells: [[0, 0], [0, 1]] as [number, number][], sum: 3 },
      { cells: [[0, 2]] as [number, number][], sum: 5 },
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
