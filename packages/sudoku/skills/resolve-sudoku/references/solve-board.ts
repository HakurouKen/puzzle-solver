#!/usr/bin/env node
// 入口：读 input.json → solve() → stdout JSON；显式给路径时写文件
//
// 用法: node --import tsx solve-board.ts <input.json> [output.json]
//   input.json:  { "puzzle": "53..7....6..195....98..." }
//   output.json: 可选；省略时结果 JSON 写到 stdout

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { solve } from './solver.ts';

interface Input { puzzle?: number[][] | string }

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error('用法: node --import tsx solve-board.ts <input.json> [output.json]');
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
if (!Array.isArray(parsed.puzzle)) {
  console.error('错误: puzzle 必须是 9×9 二维数组（number[][]），空格为 0');
  process.exit(1);
}
if (parsed.puzzle.length !== 9) {
  console.error(`错误: puzzle 必须有 9 行, 实际 ${parsed.puzzle.length}`);
  process.exit(1);
}

const t0 = process.hrtime.bigint();
const result = solve(parsed.puzzle);
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;

const output = result === null
  ? { puzzle: parsed.puzzle, solution: null, steps: [] }
  : { puzzle: parsed.puzzle, solution: result.solution, steps: result.steps };
const serialized = JSON.stringify(output, null, 2);

console.error(`求解器: Norvig, 9×9${result === null ? ', 无解' : ''}`);
console.error(`耗时: ${ms.toFixed(2)} ms`);
console.error(`步骤数: ${output.steps.length}`);
if (result !== null) {
  console.error('');
  console.error('===== 推导步骤 =====');
  for (const s of result.steps) console.error(`${s.type}: ${s.detail}`);
}

if (outputPath) {
  writeFileSync(outputPath, serialized);
  console.error(`结果已写到 ${outputPath}`);
} else {
  process.stdout.write(`${serialized}\n`);
}
