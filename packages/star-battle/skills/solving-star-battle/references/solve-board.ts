#!/usr/bin/env tsx
// 调用同目录 solver/，按 k 路由：
//   k = 1 → solve.ts (含 hiddenLineGroup)
//   k = 2 → solve-2.ts (含 regionShapeEnum / forcedChain)
//   其他  → solve-k.ts (通用)
//
// 求解后写 output.json: { regions, k, solution, steps }
// 不修改 input.json，不调用渲染——展示由 rendering-star-battle skill 负责。
//
// 用法: tsx solve-board.ts <input.json> [output.json]
//   input.json:  { regions: number[][], k: number }   (k 必填)
//   output.json: 默认 /tmp/sb-output.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const solverDir = join(here, 'solver');

interface Input { regions: number[][]; k?: number }

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? '/tmp/sb-output.json';

if (!inputPath) {
  console.error('用法: tsx solve-board.ts <input.json> [output.json]');
  process.exit(2);
}

if (!existsSync(join(solverDir, 'solve-k.ts'))) {
  console.error(`错误: 找不到 solver 目录: ${solverDir}`);
  process.exit(1);
}

const { regions, k } = JSON.parse(readFileSync(inputPath, 'utf8')) as Input;
if (typeof k !== 'number' || !Number.isInteger(k) || k < 1) {
  console.error('错误: 输入缺少有效的 k(每行/列/区星数,正整数)。先向用户询问 k,再求解。');
  process.exit(1);
}
const n = regions.length;

let solverPath: string;
if (k === 1) solverPath = join(solverDir, 'solve.ts');
else if (k === 2) solverPath = join(solverDir, 'solve-2.ts');
else solverPath = join(solverDir, 'solve-k.ts');

if (!existsSync(solverPath)) {
  console.error(`错误: 求解器不存在: ${solverPath}`);
  process.exit(1);
}

const mod = await import(solverPath);
const solve = mod.default ?? mod.solve;
if (typeof solve !== 'function') {
  console.error(`错误: ${solverPath} 没有可调用的默认导出`);
  process.exit(1);
}

const t0 = process.hrtime.bigint();
const result: { solution: number[][]; steps: string[] } = solve(regions, k);
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;

console.log(`求解器: ${solverPath.split('/').pop()}, 棋盘 ${n}×${n}, k=${k}`);
console.log(`耗时: ${ms.toFixed(2)} ms`);
console.log(`步骤数: ${result.steps.length}`);
console.log('');
console.log('===== 推导步骤 =====');
for (const s of result.steps) console.log(s);

const hasSolution = result.solution.some(row => row.some(v => v === 1));
if (!hasSolution) {
  console.log('');
  console.log('===== 结果: 无解 =====');
  process.exit(0);
}

writeFileSync(
  outputPath,
  JSON.stringify({ regions, k, solution: result.solution, steps: result.steps }, null, 2),
);

console.log('');
console.log(`已写解到 ${outputPath}，请调用 rendering-star-battle 展示。`);
