import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { chooseFormat, renderSvg, renderTerminal } from '../render-board.ts';

const PARTIAL_INPUT = {
  rowClues: [[1], [1]],
  columnClues: [[1], [1]],
  status: 'indeterminate' as const,
  solution: null,
  partial: [[1, 0], [-1, 1]] as (-1 | 0 | 1)[][],
};

test('renderTerminal: 显示编号 clues 并区分黑格、白格和未知格', () => {
  const output = renderTerminal(PARTIAL_INPUT);

  assert.match(output, /尺寸：2×2/);
  assert.match(output, /行 1：\[1\]/);
  assert.match(output, /列 2：\[1\]/);
  assert.match(output, /██/);
  assert.match(output, /× /);
  assert.match(output, /未判定/);
});

test('renderSvg: 生成带三态格和 clues 的 SVG', () => {
  const output = renderSvg(PARTIAL_INPUT);

  assert.match(output, /^<svg /);
  assert.match(output, /data-cell-state="filled"/);
  assert.match(output, /data-cell-state="empty"/);
  assert.match(output, /data-cell-state="unknown"/);
  assert.match(output, />1<\/text>/);
});

test('renderTerminal: 多解时显示两组解和差异坐标', () => {
  const output = renderTerminal({
    ...PARTIAL_INPUT,
    status: 'multiple',
    solution: [[1, 0], [0, 1]],
    alternateSolution: [[0, 1], [1, 0]],
  });

  assert.match(output, /解 A/);
  assert.match(output, /解 B/);
  assert.match(output, /差异格.*\(1,1\)/s);
});

test('chooseFormat: 超过 60 行的布局自动选择 SVG', () => {
  const clues = Array.from({ length: 40 }, () => [] as number[]);
  assert.equal(chooseFormat({ rowClues: clues, columnClues: clues }, 'auto'), 'svg');
  assert.equal(chooseFormat({ rowClues: clues, columnClues: clues }, 'terminal'), 'terminal');
});

test('render-board CLI: stdin 输入、SVG 写 stdout、诊断写 stderr', () => {
  const script = join(import.meta.dirname, '..', 'render-board.ts');
  const result = spawnSync(process.execPath, ['--import', 'tsx', script, '--format', 'svg'], {
    cwd: join(import.meta.dirname, '../../../..'),
    input: JSON.stringify(PARTIAL_INPUT),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^<svg /);
  assert.match(result.stderr, /渲染格式：svg/);
});
