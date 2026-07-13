#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { solve } from './solver.ts';
import type { NonogramPuzzle } from './solver.ts';

interface CliOptions {
  inputPath?: string;
  outputPath?: string;
  maxSearchNodes?: number;
  maxSteps?: number;
}

function positiveInteger(value: string | undefined, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} 必须是正整数`);
  return parsed;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  const positional: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--output') {
      options.outputPath = args[++index];
      if (!options.outputPath) throw new Error('--output 缺少路径');
    } else if (arg === '--max-search-nodes') {
      options.maxSearchNodes = positiveInteger(args[++index], '--max-search-nodes');
    } else if (arg === '--max-steps') {
      options.maxSteps = positiveInteger(args[++index], '--max-steps');
    } else if (arg.startsWith('-')) {
      throw new Error(`未知参数：${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 2) throw new Error('位置参数最多为 input.json 和 output.json');
  options.inputPath = positional[0];
  options.outputPath ??= positional[1];
  return options;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const options = parseArgs(args);
    const raw = options.inputPath ? readFileSync(options.inputPath, 'utf8') : readFileSync(0, 'utf8');
    if (!raw.trim()) throw new Error('输入为空');
    const input = JSON.parse(raw) as NonogramPuzzle;
    const result = solve(input, {
      maxSearchNodes: options.maxSearchNodes,
      maxSteps: options.maxSteps,
    });
    const serialized = JSON.stringify(result, null, 2);
    if (options.outputPath) writeFileSync(options.outputPath, serialized, 'utf8');
    else process.stdout.write(`${serialized}\n`);
    process.stderr.write(`状态：${result.status}\n`);
    process.stderr.write(`搜索节点：${result.stats.searchNodes}\n`);
    process.stderr.write(`传播轮次：${result.stats.propagationRounds}\n`);
    process.stderr.write(`记录步骤：${result.stats.recordedSteps}，省略：${result.stats.omittedSteps}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`错误：${(error as Error).message}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
