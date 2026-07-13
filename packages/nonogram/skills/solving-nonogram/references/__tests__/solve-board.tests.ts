import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = join(import.meta.dirname, '..', 'solve-board.ts');
const puzzle = {
  rowClues: [[1], [1]],
  columnClues: [[1], [1]],
};

function run(args: string[], input?: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: join(import.meta.dirname, '../../../..'),
    input,
    encoding: 'utf8',
  });
}

test('solve-board: stdin 输入、stdout JSON 输出且诊断写 stderr', () => {
  const result = run([], JSON.stringify(puzzle));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'multiple');
  assert.match(result.stderr, /搜索节点/);
});

test('solve-board: 显式输出路径写文件', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nonogram-'));
  const outputPath = join(directory, 'output.json');
  const result = run(['--output', outputPath], JSON.stringify(puzzle));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).status, 'multiple');
});

test('solve-board: 非法 clue 返回退出码 1', () => {
  const result = run([], JSON.stringify({ rowClues: [[0]], columnClues: [[]] }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /正整数/);
});
