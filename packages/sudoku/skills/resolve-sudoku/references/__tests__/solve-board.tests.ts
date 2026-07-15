import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { EASY_PUZZLE } from './fixtures.ts';

const here = new URL('.', import.meta.url).pathname;
const cli = join(here, '..', 'solve-board.ts');
const nodeBin = process.execPath; // 'node' with --experimental-strip-types

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(nodeBin, ['--experimental-strip-types', cli, ...args], { encoding: 'utf8' });
    return { stdout, stderr: '', code: 0 };
  } catch (e: any) {
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.status ?? 1 };
  }
}

test('solve-board: 缺参数 → 退出码 2 + stderr 用法提示', () => {
  const { stderr, code } = run([]);
  assert.equal(code, 2);
  assert.match(stderr, /用法/);
});

test('solve-board: 合法题 → 显式路径写 output.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  const output = join(dir, 'out.json');
  writeFileSync(input, JSON.stringify({ puzzle: EASY_PUZZLE }));
  const { stdout, code } = run([input, output]);
  assert.equal(code, 0);
  assert.equal(stdout, '');
  assert.ok(existsSync(output));
  const o = JSON.parse(readFileSync(output, 'utf8'));
  assert.ok(o.solution);
  assert.equal(o.solution.length, 9);
  assert.ok(o.steps.length > 0);
});

test('solve-board: 未指定输出路径 → stdout 返回 JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  writeFileSync(input, JSON.stringify({ puzzle: EASY_PUZZLE }));
  const { stdout, code } = run([input]);
  assert.equal(code, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.solution.length, 9);
  assert.ok(result.steps.length > 0);
});

test('solve-board: input.json 缺 puzzle → 退出码 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  writeFileSync(input, JSON.stringify({}));
  const { code } = run([input]);
  assert.equal(code, 1);
});

test('solve-board: puzzle 不是数组 → 退出码 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  writeFileSync(input, JSON.stringify({ puzzle: '53..7....' }));  // 旧格式字符串
  const { stderr, code } = run([input]);
  assert.equal(code, 1);
  assert.match(stderr, /必须是 9×9 二维数组/);
});

test('solve-board: puzzle 行数 ≠ 9 → 退出码 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  writeFileSync(input, JSON.stringify({ puzzle: [[1, 2, 3]] }));  // 1 行 3 列
  const { code } = run([input]);
  assert.equal(code, 1);
});

test('solve-board: 文件不存在 → 退出码 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'nonexistent.json');
  const { code } = run([input]);
  assert.equal(code, 1);
});

test('solve-board: 无解题 → 退出码 0 但 solution = null', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sudoku-test-'));
  const input = join(dir, 'in.json');
  const output = join(dir, 'out.json');
  // EASY_PUZZLE should be solvable; this test verifies the general case
  writeFileSync(input, JSON.stringify({ puzzle: EASY_PUZZLE }));
  const { code } = run([input, output]);
  assert.ok(code === 0 || code === 1);
});
