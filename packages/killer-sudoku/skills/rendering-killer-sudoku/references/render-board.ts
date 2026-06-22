// 终端渲染器：将 Killer Sudoku 棋盘和笼渲染为 Unicode 字符

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Cage } from '../../solving-killer-sudoku/references/solver.ts';

// ── 类型 ─────────────────────────────────────────────────────────────

interface RenderInput {
  puzzle: number[][];
  cages: Cage[];
  solution?: number[][];
}

// ── 边界检测 ─────────────────────────────────────────────────────────

function getCageBoundaries(cages: Cage[]): {
  horizontal: Set<string>;  // "r,c" 表示 (r,c) 和 (r,c+1) 之间
  vertical: Set<string>;    // "r,c" 表示 (r,c) 和 (r+1,c) 之间
} {
  const horizontal = new Set<string>();
  const vertical = new Set<string>();

  // 创建 cell → cage 映射
  const cellToCage = new Map<string, number>();
  for (let i = 0; i < cages.length; i++) {
    for (const [r, c] of cages[i].cells) {
      cellToCage.set(`${r},${c}`, i);
    }
  }

  // 检查所有相邻格对
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const myCage = cellToCage.get(`${r},${c}`)!;

      // 右邻居
      if (c < 8) {
        const rightCage = cellToCage.get(`${r},${c + 1}`)!;
        if (myCage !== rightCage) {
          horizontal.add(`${r},${c}`);
        }
      }

      // 下邻居
      if (r < 8) {
        const downCage = cellToCage.get(`${r + 1},${c}`)!;
        if (myCage !== downCage) {
          vertical.add(`${r},${c}`);
        }
      }
    }
  }

  return { horizontal, vertical };
}

// ── 渲染函数 ─────────────────────────────────────────────────────────

export function renderBoard(input: RenderInput): string {
  const { horizontal, vertical } = getCageBoundaries(input.cages);
  const grid = input.solution || input.puzzle;

  const lines: string[] = [];

  // 顶部边框
  let topBorder = '┏';
  for (let c = 0; c < 9; c++) {
    topBorder += '━━━';
    if (c < 8) {
      const isCageBoundary = horizontal.has(`0,${c}`);
      const isBoxBoundary = c === 2 || c === 5;
      if (isCageBoundary && isBoxBoundary) {
        topBorder += '┳';
      } else if (isCageBoundary) {
        topBorder += '┯';
      } else if (isBoxBoundary) {
        topBorder += '┯';
      } else {
        topBorder += '━';
      }
    }
  }
  topBorder += '┓';
  lines.push(topBorder);

  // 棋盘内容
  for (let r = 0; r < 9; r++) {
    let rowLine = '┃';
    for (let c = 0; c < 9; c++) {
      const value = grid[r][c] === 0 ? ' ' : String(grid[r][c]);
      rowLine += ` ${value} `;
      if (c < 8) {
        const isCageBoundary = vertical.has(`${r},${c}`);
        const isBoxBoundary = c === 2 || c === 5;
        if (isCageBoundary && isBoxBoundary) {
          rowLine += '╋';
        } else if (isCageBoundary) {
          rowLine += '┿';
        } else if (isBoxBoundary) {
          rowLine += '┿';
        } else {
          rowLine += '│';
        }
      }
    }
    rowLine += '┃';
    lines.push(rowLine);

    // 行间分隔
    if (r < 8) {
      let midBorder = '┃';
      for (let c = 0; c < 9; c++) {
        midBorder += '━━━';
        if (c < 8) {
          const isCageBoundary = vertical.has(`${r},${c}`) || horizontal.has(`${r},${c}`) || horizontal.has(`${r},${c + 1}`);
          const isBoxBoundary = c === 2 || c === 5;
          if (isCageBoundary && isBoxBoundary) {
            midBorder += '╋';
          } else if (isCageBoundary) {
            midBorder += '┿';
          } else if (isBoxBoundary) {
            midBorder += '┿';
          } else {
            midBorder += '─';
          }
        }
      }
      midBorder += '┃';
      lines.push(midBorder);
    }
  }

  // 底部边框
  let bottomBorder = '┗';
  for (let c = 0; c < 9; c++) {
    bottomBorder += '━━━';
    if (c < 8) {
      const isCageBoundary = horizontal.has(`8,${c}`);
      const isBoxBoundary = c === 2 || c === 5;
      if (isCageBoundary && isBoxBoundary) {
        bottomBorder += '┻';
      } else if (isCageBoundary) {
        bottomBorder += '┷';
      } else if (isBoxBoundary) {
        bottomBorder += '┷';
      } else {
        bottomBorder += '━';
      }
    }
  }
  bottomBorder += '┛';
  lines.push(bottomBorder);

  return lines.join('\n');
}

export function renderCages(input: RenderInput): string {
  const lines: string[] = [];
  lines.push('\nCages:');

  for (let i = 0; i < input.cages.length; i++) {
    const cage = input.cages[i];
    const cellList = cage.cells
      .map(([r, c]) => `${String.fromCharCode(65 + r)}${c + 1}`)
      .join(',');
    const size = cage.cells.length === 1 ? '1 cell' : `${cage.cells.length} cells`;
    lines.push(`  Cage ${i}: ${cellList} (${size}, sum=${cage.sum})`);
  }

  return lines.join('\n');
}

// ── CLI 入口 ─────────────────────────────────────────────────────────

function main(): number {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    process.stderr.write('Usage: render-board <input.json>\n');
    return 1;
  }

  const inputPath = args[0];
  try {
    const raw = readFileSync(inputPath, 'utf-8');
    const input: RenderInput = JSON.parse(raw);

    process.stdout.write(renderBoard(input) + '\n');
    process.stdout.write(renderCages(input) + '\n');
    return 0;
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

export { main };
