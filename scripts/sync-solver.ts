#!/usr/bin/env tsx
// 同步根 src/ 下的求解器到 skills/solving-star-battle/references/solver/
// 单一来源真值 = src/(配 tests/),skill 目录是发布时的副本。
//
// 用法:
//   tsx scripts/sync-solver.ts          # 复制(覆写)
//   tsx scripts/sync-solver.ts --check  # 只校验,有 drift 时退出码 1(用于 CI / pre-commit)

import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const srcDir = join(repoRoot, 'src');
const dstDir = join(repoRoot, 'skills', 'solving-star-battle', 'references', 'solver');

const FILES = ['solve.ts', 'solve-2.ts', 'solve-k.ts'];
const checkOnly = process.argv.includes('--check');

let drift = 0;
for (const f of FILES) {
  const sp = join(srcDir, f);
  const dp = join(dstDir, f);
  if (!existsSync(sp)) {
    console.error(`错误: 源文件缺失 ${sp}`);
    process.exit(2);
  }
  if (!existsSync(dp)) {
    if (checkOnly) {
      console.error(`drift: 缺少 ${dp}`);
      drift++;
    } else {
      copyFileSync(sp, dp);
      console.log(`新建 ${f}`);
    }
    continue;
  }
  const a = readFileSync(sp);
  const b = readFileSync(dp);
  if (a.equals(b)) continue;
  if (checkOnly) {
    console.error(`drift: ${f} 不一致 (src ↔ skill solver)`);
    drift++;
  } else {
    copyFileSync(sp, dp);
    console.log(`更新 ${f}`);
  }
}

if (checkOnly) {
  if (drift > 0) {
    console.error(`\n${drift} 个文件存在 drift。运行 \`pnpm sync-solver\` 同步,然后重新提交。`);
    process.exit(1);
  }
  console.log('skill solver 与 src 一致 ✓');
} else {
  console.log('同步完成 ✓');
}
