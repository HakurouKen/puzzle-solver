#!/usr/bin/env tsx
// Render a sudoku solution as an ASCII table to stdout.
//
// Cell kinds:
//   - given    (from puzzle)    => " N "  (plain)
//   - deduced  (propagation)    => "*N "  (asterisk prefix)
//   - searched (backtracking)   => "(N)"  (brackets)
//
// Usage: tsx render-board.ts <output.json>

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
  puzzle?: string;
  solution?: number[][] | null;
  steps?: Step[];
}

type CellKind = 'given' | 'deduced' | 'searched';

/* ------------------------------------------------------------------ */
/*  classifySteps — determine each cell's kind from the step log      */
/* ------------------------------------------------------------------ */

export function classifySteps(steps: Step[]): Map<string, CellKind> {
  const result = new Map<string, CellKind>();
  let lastWasSearch = false;
  for (const s of steps) {
    if (s.type === 'search') {
      lastWasSearch = true;
    } else if (s.type === 'assign') {
      result.set(s.cell, lastWasSearch ? 'searched' : 'deduced');
      lastWasSearch = false;
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  formatCell — single cell text (3 chars wide)                      */
/* ------------------------------------------------------------------ */

export function formatCell(digit: string, kind: CellKind): string {
  switch (kind) {
    case 'given':    return ' ' + digit + ' ';   // " N "
    case 'deduced':  return '*' + digit + ' ';   // "*N "
    case 'searched': return '(' + digit + ')';   // "(N)"
  }
}

/* ------------------------------------------------------------------ */
/*  renderBoard — main entry point, returns the full ASCII string     */
/* ------------------------------------------------------------------ */

export function renderBoard(output: Output): string {
  if (output.solution === null || output.solution === undefined) {
    return 'No solution found.\n';
  }

  const sol = output.solution;
  const puzzle = output.puzzle ?? '';
  const givenSet = new Set<string>();

  // Mark cells that were provided in the original puzzle
  for (let i = 0; i < puzzle.length && i < 81; i++) {
    const ch = puzzle[i];
    if (ch !== '.' && ch !== '0') {
      const row = String.fromCharCode('A'.charCodeAt(0) + Math.floor(i / 9));
      const col = String(i % 9 + 1);
      givenSet.add(row + col);
    }
  }

  const classified = classifySteps(output.steps ?? []);

  const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const lines: string[] = [];

  // Top border
  lines.push('┌───────┬───────┬───────┐');

  for (let r = 0; r < 9; r++) {
    // Build the three cell-groups for this row
    const cells: string[] = [];
    for (let c = 0; c < 9; c++) {
      const cell = ROWS[r] + COLS[c];
      const kind: CellKind = givenSet.has(cell)
        ? 'given'
        : (classified.get(cell) ?? 'deduced');
      cells.push(formatCell(String(sol[r][c]), kind));
    }

    const line = '│ ' + cells.slice(0, 3).join(' ') + ' │ ' +
                       cells.slice(3, 6).join(' ') + ' │ ' +
                       cells.slice(6, 9).join(' ') + ' │';
    lines.push(line);

    // Thick box-separator after rows 2 and 5 (i.e. after the 3rd and 6th rows)
    if (r === 2 || r === 5) {
      lines.push('├───────┼───────┼───────┤');
    } else if (r < 8) {
      // Lighter row separator between rows within a box
      lines.push('│───────│───────│───────│');
    }
  }

  // Bottom border
  lines.push('└───────┴───────┴───────┘');

  // Legend
  lines.push('');
  lines.push('图例: 原题=空  推理=*N  搜索=(N)');

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  CLI entry point                                                   */
/* ------------------------------------------------------------------ */

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('用法: tsx render-board.ts <output.json>');
    process.exit(2);
  }
  if (!existsSync(filePath)) {
    console.error(`错误: 找不到文件: ${filePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Output;
  process.stdout.write(renderBoard(raw));
}
