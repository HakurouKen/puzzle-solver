// 终端渲染器：将 Killer Sudoku 棋盘和笼渲染为 Unicode 字符

import { readFileSync, writeFileSync } from 'node:fs';
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

// ── cage sum 锚点 ────────────────────────────────────────────────────

// 每个 cage 的 sum 标注在其「锚点格」（行列字典序最小，即最左上格）
function getCageAnchors(cages: Cage[]): Map<string, number> {
  const anchors = new Map<string, number>();
  for (const cage of cages) {
    let best: number[] | null = null;
    for (const [r, c] of cage.cells) {
      if (best === null || r * 9 + c < best[0] * 9 + best[1]) {
        best = [r, c];
      }
    }
    if (best) anchors.set(`${best[0]},${best[1]}`, cage.sum);
  }
  return anchors;
}

// ── 线型字符 ─────────────────────────────────────────────────────────
//
// 三种线型：
//   粗线（box）  ：━ ┃，3×3 宫边界
//   虚线（cage） ：╌ ╎，笼边界
//   细线（inner）：─ │，同笼内部相邻格
//
// 交叉点用实线交叉符（┼ ╂ ┿ ╋），粗细只由 box 行列决定，
// 与 cage 边界无关——虚线在交点处视觉上连续，与参考图一致。

const CELL_W = 5; // 每格内容宽度

const isBoxCol = (c: number): boolean => c === 2 || c === 5;
const isBoxRow = (r: number): boolean => r === 2 || r === 5;

// 内部交叉点：heavyV 竖向是否粗，heavyH 横向是否粗
function crossChar(heavyV: boolean, heavyH: boolean): string {
  if (heavyV && heavyH) return '╋';
  if (heavyV) return '╂';
  if (heavyH) return '┿';
  return '┼';
}

// ── 渲染函数 ─────────────────────────────────────────────────────────

export function renderBoard(input: RenderInput): string {
  const { horizontal, vertical } = getCageBoundaries(input.cages);
  const anchors = getCageAnchors(input.cages);
  const grid = input.solution || input.puzzle;

  // 列间竖向分隔符（单元行内，c 与 c+1 之间，由左右相邻对决定）
  const vsep = (r: number, c: number): string => {
    if (isBoxCol(c)) return '┃';
    if (horizontal.has(`${r},${c}`)) return '╎';
    return '│';
  };

  // 行间水平线段（r 与 r+1 之间，第 c 格下方，由上下相邻对决定，CELL_W 宽）
  const hseg = (r: number, c: number): string => {
    const ch = isBoxRow(r) ? '━' : vertical.has(`${r},${c}`) ? '╌' : '─';
    return ch.repeat(CELL_W);
  };

  // 一格的 sum 行内容（仅锚点格显示，左对齐贴左上角）
  const sumCell = (r: number, c: number): string => {
    const sum = anchors.get(`${r},${c}`);
    return sum === undefined ? ' '.repeat(CELL_W) : String(sum).padEnd(CELL_W);
  };

  // 一格的数字行内容（居中）
  const numCell = (r: number, c: number): string => {
    const v = grid[r][c];
    return v === 0 ? ' '.repeat(CELL_W) : `  ${v}  `;
  };

  const lines: string[] = [];

  // 顶部边框
  let top = '┏';
  for (let c = 0; c < 9; c++) {
    top += '━'.repeat(CELL_W);
    if (c < 8) top += isBoxCol(c) ? '┳' : '┯';
  }
  lines.push(top + '┓');

  // 棋盘内容
  for (let r = 0; r < 9; r++) {
    // sum 行
    let sumLine = '┃';
    let numLine = '┃';
    for (let c = 0; c < 9; c++) {
      sumLine += sumCell(r, c);
      numLine += numCell(r, c);
      if (c < 8) {
        const sep = vsep(r, c);
        sumLine += sep;
        numLine += sep;
      }
    }
    lines.push(sumLine + '┃');
    lines.push(numLine + '┃');

    // 行间分隔
    if (r < 8) {
      let mid = isBoxRow(r) ? '┣' : '┠';
      for (let c = 0; c < 9; c++) {
        mid += hseg(r, c);
        if (c < 8) mid += crossChar(isBoxCol(c), isBoxRow(r));
      }
      lines.push(mid + (isBoxRow(r) ? '┫' : '┨'));
    }
  }

  // 底部边框
  let bottom = '┗';
  for (let c = 0; c < 9; c++) {
    bottom += '━'.repeat(CELL_W);
    if (c < 8) bottom += isBoxCol(c) ? '┻' : '┷';
  }
  lines.push(bottom + '┛');

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

// ── SVG 渲染 ─────────────────────────────────────────────────────────
//
// 与终端渲染不同：cage 虚线框「内缩」绘制——每格的每条笼边界向格内
// 偏移 PAD 像素，因此虚线浮在格子内部、比实线网格小一圈，两者分层、
// 互不重叠，复刻参考图的图形效果。

const S = 64;        // 格边长（px）
const PAD = 7;       // cage 虚线内缩边距
const MARGIN = 2;    // 画布外边距

function svgEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSvg(input: RenderInput): string {
  const grid = input.solution || input.puzzle;
  const anchors = getCageAnchors(input.cages);

  const cellToCage = new Map<string, number>();
  for (let i = 0; i < input.cages.length; i++) {
    for (const [r, c] of input.cages[i].cells) cellToCage.set(`${r},${c}`, i);
  }
  const inCage = (r: number, c: number, i: number): boolean =>
    r >= 0 && r < 9 && c >= 0 && c < 9 && cellToCage.get(`${r},${c}`) === i;

  const size = 9 * S;
  const W = size + MARGIN * 2;
  const O = MARGIN;
  const p: string[] = [];

  p.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" ` +
    `viewBox="0 0 ${W} ${W}" font-family="Helvetica, Arial, sans-serif">`
  );
  p.push(`<rect width="${W}" height="${W}" fill="#ffffff"/>`);

  // 细网格线（每格）
  for (let i = 0; i <= 9; i++) {
    const t = O + i * S;
    p.push(`<line x1="${O}" y1="${t}" x2="${O + size}" y2="${t}" stroke="#cdd5e0" stroke-width="1"/>`);
    p.push(`<line x1="${t}" y1="${O}" x2="${t}" y2="${O + size}" stroke="#cdd5e0" stroke-width="1"/>`);
  }
  // 粗线（3×3 宫 + 外框）
  for (let i = 0; i <= 9; i += 3) {
    const t = O + i * S;
    p.push(`<line x1="${O}" y1="${t}" x2="${O + size}" y2="${t}" stroke="#344861" stroke-width="3"/>`);
    p.push(`<line x1="${t}" y1="${O}" x2="${t}" y2="${O + size}" stroke="#344861" stroke-width="3"/>`);
  }

  // cage 内缩虚线框：逐格画四条内缩边。
  // 仅当某方向是笼边界时画该边；相邻格的同侧边重合时由两格各画一半，
  // 用 stroke-dasharray 保证视觉连续。
  // 锚点格的左上角为 sum 小字留出缺口（top 边右移、left 边下移），
  // 使数字嵌在虚线断口处、与虚线重叠。
  const dash = `stroke="#5b6b84" stroke-width="1.6" stroke-dasharray="5 3" fill="none"`;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const i = cellToCage.get(`${r},${c}`)!;
      const x0 = O + c * S, y0 = O + r * S;
      const xL = x0 + PAD, xR = x0 + S - PAD;
      const yT = y0 + PAD, yB = y0 + S - PAD;

      const top = !inCage(r - 1, c, i);
      const bottom = !inCage(r + 1, c, i);
      const left = !inCage(r, c - 1, i);
      const right = !inCage(r, c + 1, i);

      // 角点向内/外延伸：边界处用内缩点，非边界处贴格线让虚线穿过
      const lx = left ? xL : x0, rx = right ? xR : x0 + S;
      const ty = top ? yT : y0, by = bottom ? yB : y0 + S;

      // 锚点格左上角缺口（锚点格的 top/left 必为笼边界）
      const sum = anchors.get(`${r},${c}`);
      const gapW = sum !== undefined ? String(sum).length * 8 + 5 : 0;
      const gapH = sum !== undefined ? 15 : 0;

      if (top) p.push(`<line x1="${lx + gapW}" y1="${yT}" x2="${rx}" y2="${yT}" ${dash}/>`);
      if (bottom) p.push(`<line x1="${lx}" y1="${yB}" x2="${rx}" y2="${yB}" ${dash}/>`);
      if (left) p.push(`<line x1="${xL}" y1="${ty + gapH}" x2="${xL}" y2="${by}" ${dash}/>`);
      if (right) p.push(`<line x1="${xR}" y1="${ty}" x2="${xR}" y2="${by}" ${dash}/>`);
    }
  }

  // sum 小字：嵌在锚点格左上角缺口处，与虚线框重叠
  for (const [key, sum] of anchors) {
    const [r, c] = key.split(',').map(Number);
    const x = O + c * S + PAD - 1;
    const y = O + r * S + PAD + 1;
    p.push(
      `<text x="${x}" y="${y}" font-size="14" fill="#344861" ` +
      `text-anchor="start" dominant-baseline="central">${svgEsc(String(sum))}</text>`
    );
  }

  // 数字（格子居中）
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      const x = O + c * S + S / 2;
      const y = O + r * S + S / 2;
      p.push(
        `<text x="${x}" y="${y}" font-size="34" fill="#344861" ` +
        `text-anchor="middle" dominant-baseline="central">${v}</text>`
      );
    }
  }

  p.push('</svg>');
  return p.join('\n');
}



function main(): number {
  const args = process.argv.slice(2);
  const textMode = args.includes('--text');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (positional.length === 0) {
    process.stderr.write('Usage: render-board <input.json> [--text] [-o out.svg]\n');
    return 1;
  }

  const inputPath = positional[0];
  try {
    const raw = readFileSync(inputPath, 'utf-8');
    const input: RenderInput = JSON.parse(raw);

    if (textMode) {
      // 终端文本渲染（旧行为）
      process.stdout.write(renderBoard(input) + '\n');
      process.stdout.write(renderCages(input) + '\n');
      return 0;
    }

    // SVG 渲染（默认）：写文件并报告路径
    const oIdx = args.indexOf('-o');
    const outPath =
      oIdx >= 0 && args[oIdx + 1]
        ? args[oIdx + 1]
        : inputPath.replace(/\.json$/i, '') + '.svg';
    writeFileSync(outPath, renderSvg(input), 'utf-8');
    process.stdout.write(`SVG written to ${outPath}\n`);
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
