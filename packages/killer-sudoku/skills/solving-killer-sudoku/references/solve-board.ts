#!/usr/bin/env node
// CLI 入口：读取 JSON 输入，调用求解器，输出 JSON 结果

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { solve } from './solver.ts';

// ── 工具函数 ─────────────────────────────────────────────────────────

function printUsage() {
  process.stderr.write(`
Usage: solve-board <input.json>

Input format:
{
  "puzzle": [[0,0,...], ...],  // 9×9, 0 = empty
  "cages": [
    { "cells": [[r,c], ...], "sum": N },
    ...
  ]
}

Output: writes result to /tmp/killer-sudoku-output.json
`);
}

// ── 主逻辑 ───────────────────────────────────────────────────────────

function main(): number {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return 0;
  }

  const inputPath = args[0];

  // 读取输入
  let input: any;
  try {
    const raw = readFileSync(inputPath, 'utf-8');
    input = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Error reading input: ${(err as Error).message}\n`);
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

  const outputPath = '/tmp/killer-sudoku-output.json';
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
