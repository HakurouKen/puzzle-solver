#!/usr/bin/env node
// 入口：读 input.json → solve() → 写 output.json + stdout 元信息
//
// 用法: node --experimental-strip-types solve-board.ts <input.json> [output.json]
//   input.json:  { "puzzle": "53..7....6..195....98..." }
//   output.json: 默认 /tmp/sudoku-output.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { solve } from './solver.ts';

interface Input { puzzle?: string }

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? '/tmp/sudoku-output.json';

if (!inputPath) {
  console.error('用法: node --experimental-strip-types solve-board.ts <input.json> [output.json]');
  process.exit(2);
}
if (!existsSync(inputPath)) {
  console.error(`错误: 找不到输入文件: ${inputPath}`);
  process.exit(1);
}

let parsed: Input;
try {
  parsed = JSON.parse(readFileSync(inputPath, 'utf8')) as Input;
} catch (e) {
  console.error(`错误: 无法解析 JSON: ${(e as Error).message}`);
  process.exit(1);
}
if (typeof parsed.puzzle !== 'string') {
  console.error('错误: 输入 JSON 缺 puzzle 字段');
  process.exit(1);
}
if (parsed.puzzle.length !== 81) {
  console.error(`错误: puzzle 长度必须为 81, 实际 ${parsed.puzzle.length}`);
  process.exit(1);
}

function parseGridString(s: string): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      const ch = s[r * 9 + c];
      row.push(ch === '.' ? 0 : parseInt(ch, 10));
    }
    grid.push(row);
  }
  return grid;
}

const t0 = process.hrtime.bigint();
const result = solve(parseGridString(parsed.puzzle));
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;

if (result === null) {
  console.log(`求解器: Norvig, 9×9, 无解`);
  console.log(`耗时: ${ms.toFixed(2)} ms`);
  writeFileSync(
    outputPath,
    JSON.stringify({ puzzle: parsed.puzzle, solution: null, steps: [] }, null, 2),
  );
  console.log(`已写 (无解) 到 ${outputPath}`);
  process.exit(0);
}

console.log(`求解器: Norvig, 9×9`);
console.log(`耗时: ${ms.toFixed(2)} ms`);
console.log(`步骤数: ${result.steps.length}`);
console.log('');
console.log('===== 推导步骤 =====');
for (const s of result.steps) console.log(`${s.type}: ${s.detail}`);

writeFileSync(
  outputPath,
  JSON.stringify({ puzzle: parsed.puzzle, solution: result.solution, steps: result.steps }, null, 2),
);
console.log('');
console.log(`已写解到 ${outputPath}，invoke rendering-sudoku 展示。`);
