#!/usr/bin/env tsx
// 调用与 skill 同目录的 solver/,打印步骤与最终带星位棋盘。
//
// 用法: tsx solve-board.ts <input.json>
// 输入: { "regions": number[][], "k": number }   (k 必填)
//
// 路由(同目录 solver/ 下):
//   k = 1 → solve.ts (含 hiddenLineGroup 隐藏线对偶)
//   k = 2 → solve-2.ts (含 regionShapeEnum / forcedChain)
//   其他  → solve-k.ts (通用,只用通用策略)

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const solverDir = join(here, 'solver');

interface Input { regions: number[][]; k?: number }

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('用法: tsx solve-board.ts <input.json>');
  process.exit(2);
}

if (!existsSync(join(solverDir, 'solve-k.ts'))) {
  console.error(`错误: 找不到 solver 目录: ${solverDir}`);
  console.error('skill 应自带 references/solver/;若是从仓库 dev,先运行 pnpm sync-solver。');
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
console.log('');
if (!hasSolution) {
  console.log('===== 结果: 无解 =====');
  process.exit(0);
}

console.log('===== 解 =====');

const tmpFile = resolve(tmpdir(), `sb-solution-${process.pid}.json`);
writeFileSync(tmpFile, JSON.stringify({ regions, k, solution: result.solution }));

// 邻居 skill decoding-star-battle 的 render-board.ts:重写 argv 后 dynamic import,
// 共享同一 tsx loader。render-board 跨 skill 复用,因为同一份渲染逻辑既用于
// decoding 末尾的"识别确认"也用于 solving 末尾的"展示解"。
const renderScript = resolve(here, '..', '..', 'decoding-star-battle', 'references', 'render-board.ts');
if (!existsSync(renderScript)) {
  console.error(`错误: 找不到 render-board: ${renderScript}`);
  console.error('skill 应自带邻居 decoding-star-battle/references/render-board.ts。');
  process.exit(1);
}
process.argv = [process.argv[0], renderScript, tmpFile];
await import(renderScript);
