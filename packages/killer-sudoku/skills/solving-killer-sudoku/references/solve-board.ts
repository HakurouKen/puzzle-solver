#!/usr/bin/env node
// CLI 入口：从 stdin 读取 JSON 数据，调用求解器，输出 JSON 结果
//
// 用法:
//   echo '{"puzzle":[...],"cages":[...]}' | \
//     node --import tsx solve-board.ts [output.json]
//
// output.json 默认 /tmp/killer-sudoku-output.json

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

Output: writes result to output.json (default /tmp/killer-sudoku-output.json)
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

  const outputPath = args[0] ?? '/tmp/killer-sudoku-output.json';

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

  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // 打印步骤日志
  if (result) {
    process.stdout.write(`✓ Solved in ${result.steps.length} steps\n\n`);
    for (const step of result.steps) {
      process.stdout.write(`  ${step.detail}\n`);
    }
    process.stdout.write(`\nOutput written to: ${outputPath}\n`);
  } else {
    process.stdout.write(`✗ No solution found\n`);
    process.stdout.write(`Output written to: ${outputPath}\n`);
  }

  return 0;
}

// ── CLI 入口 ─────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

export { main };
