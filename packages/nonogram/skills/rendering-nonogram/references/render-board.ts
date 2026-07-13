#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type CellState = -1 | 0 | 1;
type RenderFormat = 'auto' | 'terminal' | 'svg';

interface RenderInput {
  rowClues: number[][];
  columnClues: number[][];
  status?: 'solved' | 'unsatisfiable' | 'multiple' | 'indeterminate';
  solution?: (0 | 1)[][] | null;
  alternateSolution?: (0 | 1)[][];
  partial?: CellState[][];
  stats?: { omittedSteps?: number };
}

const statusText: Record<NonNullable<RenderInput['status']>, string> = {
  solved: '唯一解',
  unsatisfiable: '无解',
  multiple: '多解',
  indeterminate: '未判定（候选解不代表唯一）',
};

const clueText = (clues: readonly number[]): string => `[${clues.join(', ')}]`;

function assertInput(input: RenderInput): void {
  if (!Array.isArray(input.rowClues) || !Array.isArray(input.columnClues)) {
    throw new Error('rowClues 和 columnClues 必须是二维数组');
  }
}

function emptyBoard(input: RenderInput): CellState[][] {
  return Array.from(
    { length: input.rowClues.length },
    () => Array<CellState>(input.columnClues.length).fill(-1),
  );
}

function displayBoard(input: RenderInput): CellState[][] {
  return input.solution ?? input.partial ?? emptyBoard(input);
}

function cellText(cell: CellState): string {
  if (cell === 1) return '██';
  if (cell === 0) return '× ';
  return '  ';
}

function terminalBoard(input: RenderInput, board: CellState[][], title?: string): string[] {
  const lines: string[] = [];
  if (title) lines.push(title);
  const maxClueWidth = Math.max(2, ...input.rowClues.map((clues) => clueText(clues).length));
  const border = (cell: string, separator: string): string => {
    let result = '';
    for (let column = 0; column < input.columnClues.length; column++) {
      result += cell;
      if ((column + 1) % 5 === 0 && column + 1 < input.columnClues.length) result += separator;
    }
    return result;
  };
  const top = `${' '.repeat(maxClueWidth + 5)}┏${border('━━', '┳')}┓`;
  lines.push(top);
  for (let row = 0; row < input.rowClues.length; row++) {
    const label = clueText(input.rowClues[row]).padStart(maxClueWidth);
    const cells = board[row]
      .map((cell, column) =>
        `${cellText(cell)}${(column + 1) % 5 === 0 && column + 1 < input.columnClues.length ? '┃' : ''}`,
      )
      .join('');
    lines.push(`${String(row + 1).padStart(3)} ${label} ┃${cells}┃`);
    if ((row + 1) % 5 === 0 && row + 1 < input.rowClues.length) {
      lines.push(`${' '.repeat(maxClueWidth + 5)}┣${border('━━', '╋')}┫`);
    }
  }
  lines.push(`${' '.repeat(maxClueWidth + 5)}┗${border('━━', '┻')}┛`);
  return lines;
}

function differences(a: readonly (0 | 1)[][], b: readonly (0 | 1)[][]): [number, number][] {
  const result: [number, number][] = [];
  for (let row = 0; row < a.length; row++) {
    for (let column = 0; column < a[row].length; column++) {
      if (a[row][column] !== b[row]?.[column]) result.push([row, column]);
    }
  }
  return result;
}

export function renderTerminal(input: RenderInput): string {
  assertInput(input);
  const lines = [`尺寸：${input.rowClues.length}×${input.columnClues.length}`];
  if (input.status) lines.push(`状态：${statusText[input.status]}`);
  lines.push('行线索：');
  input.rowClues.forEach((clues, index) => lines.push(`  行 ${index + 1}：${clueText(clues)}`));
  lines.push('列线索：');
  input.columnClues.forEach((clues, index) => lines.push(`  列 ${index + 1}：${clueText(clues)}`));

  if (input.status === 'multiple' && input.solution && input.alternateSolution) {
    lines.push(...terminalBoard(input, input.solution, '解 A：'));
    lines.push(...terminalBoard(input, input.alternateSolution, '解 B：'));
    const changed = differences(input.solution, input.alternateSolution);
    const shown = changed.slice(0, 100).map(([row, column]) => `(${row + 1},${column + 1})`).join(' ');
    lines.push(`差异格（共 ${changed.length} 个）：${shown}${changed.length > 100 ? ' …' : ''}`);
  } else {
    lines.push(...terminalBoard(input, displayBoard(input)));
  }

  const omitted = input.stats?.omittedSteps ?? 0;
  if (omitted > 0) lines.push(`步骤日志已省略 ${omitted} 条。`);
  return `${lines.join('\n')}\n`;
}

function svgEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CELL = 24;
const ROW_CLUE_WIDTH = 120;

function svgBoard(
  input: RenderInput,
  board: CellState[][],
  originX: number,
  originY: number,
  title: string,
  highlighted: ReadonlySet<string>,
): string[] {
  const width = input.columnClues.length;
  const height = input.rowClues.length;
  const maxColumnDepth = Math.max(0, ...input.columnClues.map((clues) => clues.length));
  const clueHeight = Math.max(36, maxColumnDepth * 18 + 12);
  const gridX = originX + ROW_CLUE_WIDTH;
  const gridY = originY + clueHeight;
  const parts = [
    `<text x="${originX}" y="${originY + 16}" font-size="16" font-weight="700">${svgEscape(title)}</text>`,
  ];

  for (let column = 0; column < width; column++) {
    const clues = input.columnClues[column];
    clues.forEach((clue, index) => {
      const y = gridY - (clues.length - index) * 18 + 14;
      parts.push(`<text x="${gridX + column * CELL + CELL / 2}" y="${y}" font-size="13" text-anchor="middle">${clue}</text>`);
    });
  }
  for (let row = 0; row < height; row++) {
    parts.push(
      `<text x="${gridX - 8}" y="${gridY + row * CELL + 17}" font-size="13" text-anchor="end">${svgEscape(input.rowClues[row].join(' '))}</text>`,
    );
    for (let column = 0; column < width; column++) {
      const state = board[row]?.[column] ?? -1;
      const x = gridX + column * CELL;
      const y = gridY + row * CELL;
      const name = state === 1 ? 'filled' : state === 0 ? 'empty' : 'unknown';
      parts.push(`<rect data-cell-state="${name}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${state === 1 ? '#111827' : '#ffffff'}"/>`);
      if (state === 0) {
        parts.push(`<path d="M ${x + 6} ${y + 6} L ${x + CELL - 6} ${y + CELL - 6} M ${x + CELL - 6} ${y + 6} L ${x + 6} ${y + CELL - 6}" stroke="#9ca3af" stroke-width="1.5"/>`);
      }
      if (highlighted.has(`${row},${column}`)) {
        parts.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" fill="none" stroke="#dc2626" stroke-width="3"/>`);
      }
    }
  }

  for (let row = 0; row <= height; row++) {
    const y = gridY + row * CELL;
    const thick = row % 5 === 0 || row === height;
    parts.push(`<line x1="${gridX}" y1="${y}" x2="${gridX + width * CELL}" y2="${y}" stroke="#374151" stroke-width="${thick ? 2.5 : 1}"/>`);
  }
  for (let column = 0; column <= width; column++) {
    const x = gridX + column * CELL;
    const thick = column % 5 === 0 || column === width;
    parts.push(`<line x1="${x}" y1="${gridY}" x2="${x}" y2="${gridY + height * CELL}" stroke="#374151" stroke-width="${thick ? 2.5 : 1}"/>`);
  }
  return parts;
}

export function renderSvg(input: RenderInput): string {
  assertInput(input);
  const multiple = input.status === 'multiple' && input.solution && input.alternateSolution;
  const maxColumnDepth = Math.max(0, ...input.columnClues.map((clues) => clues.length));
  const boardWidth = ROW_CLUE_WIDTH + input.columnClues.length * CELL;
  const boardHeight = Math.max(36, maxColumnDepth * 18 + 12) + input.rowClues.length * CELL;
  const width = multiple ? boardWidth * 2 + 48 : boardWidth + 24;
  const height = boardHeight + 72;
  const title = input.status ? statusText[input.status] : '待确认题面';
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="12" y="24" font-size="18" font-weight="700">Nonogram · ${svgEscape(title)}</text>`,
  ];

  if (multiple && input.solution && input.alternateSolution) {
    const highlighted = new Set(differences(input.solution, input.alternateSolution).map(([row, column]) => `${row},${column}`));
    parts.push(...svgBoard(input, input.solution, 12, 36, '解 A', highlighted));
    parts.push(...svgBoard(input, input.alternateSolution, boardWidth + 36, 36, '解 B', highlighted));
  } else {
    parts.push(...svgBoard(input, displayBoard(input), 12, 36, title, new Set()));
  }
  parts.push('</svg>');
  return parts.join('\n');
}

export function chooseFormat(input: RenderInput, requested: RenderFormat = 'auto'): Exclude<RenderFormat, 'auto'> {
  if (requested !== 'auto') return requested;
  const maxRowClueWidth = Math.max(2, ...input.rowClues.map((clues) => clueText(clues).length));
  const maxColumnDepth = Math.max(0, ...input.columnClues.map((clues) => clues.length));
  const estimatedWidth = maxRowClueWidth + 7 + input.columnClues.length * 2;
  const estimatedHeight = input.rowClues.length + input.columnClues.length + maxColumnDepth + 8;
  return estimatedWidth <= 120 && estimatedHeight <= 60 ? 'terminal' : 'svg';
}

function parseCli(args: string[]): { inputPath?: string; outputPath?: string; format: RenderFormat } {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let format: RenderFormat = 'auto';
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--format') {
      const value = args[++index];
      if (value !== 'auto' && value !== 'terminal' && value !== 'svg') throw new Error('--format 必须是 auto、terminal 或 svg');
      format = value;
    } else if (arg === '--output') {
      outputPath = args[++index];
      if (!outputPath) throw new Error('--output 缺少路径');
    } else if (arg.startsWith('-')) {
      throw new Error(`未知参数：${arg}`);
    } else if (!inputPath) inputPath = arg;
    else throw new Error(`多余参数：${arg}`);
  }
  return { inputPath, outputPath, format };
}

export function main(args = process.argv.slice(2)): number {
  try {
    const options = parseCli(args);
    const raw = options.inputPath ? readFileSync(options.inputPath, 'utf8') : readFileSync(0, 'utf8');
    if (!raw.trim()) throw new Error('输入为空');
    const input = JSON.parse(raw) as RenderInput;
    assertInput(input);
    const format = chooseFormat(input, options.format);
    const output = format === 'terminal' ? renderTerminal(input) : renderSvg(input);
    if (options.outputPath) writeFileSync(options.outputPath, output, 'utf8');
    else process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
    process.stderr.write(`渲染格式：${format}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`错误：${(error as Error).message}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
