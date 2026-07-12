#!/usr/bin/env tsx
// Render a sudoku board as an ASCII table to stdout.
//
// Uniform rendering — same for puzzle (no solution) and solved board:
//   - filled cell  => " N "
//   - empty cell   => "   "
// No reasoning markers; the solver's step log is ignored for visual output.
//
// Layout: 3×3 box grid (thick borders) with thin horizontal/vertical
// separators between cells inside each box, so the printed table is
// visually closer to a square in a standard terminal.
//
// Usage: tsx render-board.ts <json-path>

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Step {
  type: 'eliminate' | 'assign' | 'search';
  cell: string;
  digit: string;
  detail: string;
}

interface Output {
  puzzle?: number[][];
  solution?: number[][] | null;
  steps?: Step[];
}

/* ------------------------------------------------------------------ */
/*  formatCell — single cell text (3 chars wide)                      */
/* ------------------------------------------------------------------ */

export function formatCell(digit: number): string {
  if (digit < 1 || digit > 9) return '   ';
  return ' ' + digit + ' ';
}

/* ------------------------------------------------------------------ */
/*  renderBoard — main entry point, returns the full ASCII string     */
/* ------------------------------------------------------------------ */

export function renderBoard(output: Output): string {
  const sol = output.solution ?? null;
  const puzzle = output.puzzle ?? [];

  if (sol === null && puzzle.length === 0) {
    return 'No solution found.\n';
  }

  // Pick which matrix to display: solution if present, else the puzzle.
  const grid: number[][] = sol ?? puzzle;

  // Each box segment holds 3 cells (3 chars each) separated by thin verticals.
  // Width = 3 + 1 + 3 + 1 + 3 = 11 characters. The separator chars between
  // cells differ per row kind so the vertical thin lines stay visually
  // connected across the horizontal separator rows.
  const TOP_SEG   = '━━━┯━━━┯━━━';   // thick horizontal, thin vert ticks
  const BOT_SEG   = '━━━┷━━━┷━━━';
  const THICK_SEG = '━━━┿━━━┿━━━';   // thick horizontal crossed by thin vert
  const THIN_SEG  = '───┼───┼───';   // thin horizontal crossed by thin vert

  const lines: string[] = [];

  // Top border (thick)
  lines.push('┏' + TOP_SEG + '┳' + TOP_SEG + '┳' + TOP_SEG + '┓');

  for (let r = 0; r < 9; r++) {
    const cells: string[] = [];
    for (let c = 0; c < 9; c++) {
      const digit = grid[r]?.[c] ?? 0;
      cells.push(formatCell(digit));
    }

    // Row: thick outer bars, thin inner bars between cells inside each box,
    // thick bars between boxes.
    const box = (i: number) =>
      cells[i * 3] + '│' + cells[i * 3 + 1] + '│' + cells[i * 3 + 2];
    lines.push('┃' + box(0) + '┃' + box(1) + '┃' + box(2) + '┃');

    if (r === 8) continue;
    if (r === 2 || r === 5) {
      // Thick mid-separator between 3×3 boxes
      lines.push('┣' + THICK_SEG + '╋' + THICK_SEG + '╋' + THICK_SEG + '┫');
    } else {
      // Thin separator between cell rows inside a box
      lines.push('┠' + THIN_SEG + '╂' + THIN_SEG + '╂' + THIN_SEG + '┨');
    }
  }

  // Bottom border (thick)
  lines.push('┗' + BOT_SEG + '┻' + BOT_SEG + '┻' + BOT_SEG + '┛');

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  CLI entry point                                                   */
/* ------------------------------------------------------------------ */

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('用法: tsx render-board.ts <json-path>');
    process.exit(2);
  }
  if (!existsSync(filePath)) {
    console.error(`错误: 找不到文件: ${filePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Output;
  process.stdout.write(renderBoard(raw));
}
