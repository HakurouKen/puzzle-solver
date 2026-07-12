#!/usr/bin/env node
// CLI 入口：从 stdin 读取 JSON 数据，调用求解器，输出 JSON 结果
//
// 用法:
//   echo '{"puzzle":[...],"cages":[...]}' | \
//     node --import tsx solve-board.ts [output.json]
// 省略 output.json 时，结果 JSON 写到 stdout。

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { solve } from './solver.ts';

// ── 工具函数 ─────────────────────────────────────────────────────────

function printUsage() {
  process.stderr.write(`
Usage: solve-board [output.json] < input.json

Input (stdin, JSON):
{
  "puzzle": [[0,0,...], ...],  // 9×9, 0 = empty
  "cages": [
    { "cells": [[r,c], ...], "sum": N },
    ...
  ]
}

Output: writes JSON to stdout, or to output.json when explicitly provided
`);
}

function readStdinSync(): string {
  return readFileSync(0, 'utf-8');
}

// ── 主逻辑 ───────────────────────────────────────────────────────────

function main(): number {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return 0;
  }

  const outputPath = args[0];

  // 读取 stdin
  let input: any;
  try {
    const raw = readStdinSync();
    if (!raw.trim()) {
      process.stderr.write('Error: stdin is empty; pipe JSON data in.\n');
      printUsage();
      return 1;
    }
    input = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Error reading stdin: ${(err as Error).message}\n`);
    return 1;
  }

  // 求解
  const result = solve(input);

  // 输出
  const output = {
    puzzle: input.puzzle,
    cages: input.cages,
    solution: result?.solution ?? null,
    steps: result?.steps ?? [],
  };

  const serialized = JSON.stringify(output, null, 2);
  if (outputPath) writeFileSync(outputPath, serialized);
  else process.stdout.write(`${serialized}\n`);

  // 打印步骤日志
  if (result) {
    process.stderr.write(`✓ Solved in ${result.steps.length} steps\n\n`);
    for (const step of result.steps) {
      process.stderr.write(`  ${step.detail}\n`);
    }
    if (outputPath) process.stderr.write(`\nOutput written to: ${outputPath}\n`);
  } else {
    process.stderr.write('✗ No solution found\n');
    if (outputPath) process.stderr.write(`Output written to: ${outputPath}\n`);
  }

  return 0;
}

// ── CLI 入口 ─────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

export { main };
