#!/usr/bin/env tsx
// 渲染 Star Battle 棋盘到终端:每个区域有独立颜色,粗线分隔区域,
// 细线分隔同区单元格。可叠加 solution 显示星位。
//
// 用法: tsx render-board.ts <input.json>
// 输入: { "regions": number[][], "k": number, "solution"?: number[][] }
//   - k 必填(每行/列/区星数),不再有默认值。

import { readFileSync } from 'node:fs';

interface Input {
  regions: number[][];
  k?: number;
  solution?: number[][];
}

const path = process.argv[2];
if (!path) {
  console.error('用法: tsx render-board.ts <input.json>');
  process.exit(2);
}

const raw = JSON.parse(readFileSync(path, 'utf8')) as Input;
const { regions, k, solution } = raw;
if (typeof k !== 'number' || !Number.isInteger(k) || k < 1) {
  console.error('错误: 输入缺少有效的 k(每行/列/区星数,正整数)。请向用户询问 k 后再渲染。');
  process.exit(1);
}
const n = regions.length;

if (n === 0) {
  console.log('(空盘)');
  process.exit(0);
}
for (const row of regions) {
  if (row.length !== n) {
    console.error(`错误: 非方阵 (期待 ${n} 列, 实际 ${row.length} 列)`);
    process.exit(1);
  }
}
if (solution && (solution.length !== n || solution.some(r => r.length !== n))) {
  console.error('错误: solution 维度与 regions 不一致');
  process.exit(1);
}

// ---- 调色板 ----
// 从 ANSI 256 6x6x6 立方筛选高饱和、中上亮度的色块作候选,然后以黄金角(137.5°)
// 步长在色环上贪心选取最近未用候选 → 相邻调色板索引的色相距离 ≈ 137°,
// 远大于均匀分布。
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6 * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max / 5];
}

const candidates: { code: number; h: number }[] = [];
for (let r = 0; r <= 5; r++) {
  for (let g = 0; g <= 5; g++) {
    for (let b = 0; b <= 5; b++) {
      const [h, s, v] = rgbToHsv(r, g, b);
      if (s < 0.55 || v < 0.65) continue; // 排除灰、过暗
      candidates.push({ code: 16 + 36 * r + 6 * g + b, h });
    }
  }
}

const GOLDEN = 137.50776405003785;
const used = new Set<number>();
const PALETTE: number[] = [];
for (let i = 0; i < candidates.length; i++) {
  const target = (i * GOLDEN) % 360;
  let bestIdx = -1, bestDist = Infinity;
  for (let j = 0; j < candidates.length; j++) {
    if (used.has(j)) continue;
    const raw = Math.abs(candidates[j].h - target);
    const dist = Math.min(raw, 360 - raw);
    if (dist < bestDist) { bestDist = dist; bestIdx = j; }
  }
  used.add(bestIdx);
  PALETTE.push(candidates[bestIdx].code);
}

const ridList = Array.from(new Set(regions.flat())).sort((a, b) => a - b);
const colorOf = (rid: number) => PALETTE[ridList.indexOf(rid) % PALETTE.length];

const colorize = (s: string, fg?: number, bg?: number) => {
  let p = '';
  if (bg !== undefined) p += `\x1b[48;5;${bg}m`;
  if (fg !== undefined) p += `\x1b[38;5;${fg}m`;
  return p ? p + s + '\x1b[0m' : s;
};

// 单元格内容(3 字符宽,带颜色)
function cellGlyph(i: number, j: number): string {
  const isStar = solution?.[i]?.[j] === 1;
  const text = isStar ? ' ★ ' : ' · ';
  return colorize(text, isStar ? 0 : 232, colorOf(regions[i][j]));
}

// 角点字符表:四臂(top/right/bottom/left)各自粗细。完整匹配 Unicode 盒线字符。
function corner(
  arms: { t: boolean; r: boolean; b: boolean; l: boolean },
  thick: { t: boolean; r: boolean; b: boolean; l: boolean },
): string {
  const a = arms;
  const tt = a.t && thick.t, rt = a.r && thick.r, bt = a.b && thick.b, lt = a.l && thick.l;
  const vThick = tt || bt; // 垂直臂任一粗
  const hThick = lt || rt; // 水平臂任一粗
  const cnt = (a.t ? 1 : 0) + (a.r ? 1 : 0) + (a.b ? 1 : 0) + (a.l ? 1 : 0);

  if (cnt === 4) {
    if (vThick && hThick) return '╋';
    if (hThick) return '┿';
    if (vThick) return '╂';
    return '┼';
  }
  if (cnt === 3) {
    if (!a.t) { // ┳/┯/┰/┬
      if (hThick && bt) return '┳';
      if (hThick) return '┯';
      if (bt) return '┰';
      return '┬';
    }
    if (!a.b) { // ┻/┷/┸/┴
      if (hThick && tt) return '┻';
      if (hThick) return '┷';
      if (tt) return '┸';
      return '┴';
    }
    if (!a.l) { // ┣/┠/┝/├
      if (vThick && rt) return '┣';
      if (vThick) return '┠';
      if (rt) return '┝';
      return '├';
    }
    if (!a.r) { // ┫/┨/┥/┤
      if (vThick && lt) return '┫';
      if (vThick) return '┨';
      if (lt) return '┥';
      return '┤';
    }
  }
  if (cnt === 2) {
    if (a.t && a.b) return vThick ? '┃' : '│';
    if (a.l && a.r) return hThick ? '━' : '─';
    if (a.b && a.r) {
      if (bt && rt) return '┏';
      if (rt) return '┍';
      if (bt) return '┎';
      return '┌';
    }
    if (a.b && a.l) {
      if (bt && lt) return '┓';
      if (lt) return '┑';
      if (bt) return '┒';
      return '┐';
    }
    if (a.t && a.r) {
      if (tt && rt) return '┗';
      if (rt) return '┕';
      if (tt) return '┖';
      return '└';
    }
    if (a.t && a.l) {
      if (tt && lt) return '┛';
      if (lt) return '┙';
      if (tt) return '┚';
      return '┘';
    }
  }
  return ' ';
}

// 角点 (i, j),范围 i ∈ [0..n], j ∈ [0..n]。
function cornerAt(i: number, j: number): string {
  const arms = { t: i > 0, r: j < n, b: i < n, l: j > 0 };
  // 外边框总是粗;内部边框依据两侧 cell 是否同区。
  const tThick = arms.t && (j === 0 || j === n || regions[i - 1][j - 1] !== regions[i - 1][j]);
  const bThick = arms.b && (j === 0 || j === n || regions[i][j - 1] !== regions[i][j]);
  const lThick = arms.l && (i === 0 || i === n || regions[i - 1][j - 1] !== regions[i][j - 1]);
  const rThick = arms.r && (i === 0 || i === n || regions[i - 1][j] !== regions[i][j]);
  return corner(arms, { t: tThick, r: rThick, b: bThick, l: lThick });
}

// 水平线(在角点 (i, j) 与 (i, j+1) 之间)
function hLine(i: number, j: number): string {
  // 该段位于第 i 行(在 cell row i-1 与 cell row i 之间,或外边)
  const thick = i === 0 || i === n || regions[i - 1][j] !== regions[i][j];
  return (thick ? '━' : '─').repeat(3);
}
// 竖线(在角点 (i, j) 与 (i+1, j) 之间)
function vLine(i: number, j: number): string {
  const thick = j === 0 || j === n || regions[i][j - 1] !== regions[i][j];
  return thick ? '┃' : '│';
}

const lines: string[] = [];

// 顶边
{
  let line = '';
  for (let j = 0; j <= n; j++) {
    line += cornerAt(0, j);
    if (j < n) line += hLine(0, j);
  }
  lines.push(line);
}

for (let i = 0; i < n; i++) {
  // cell 行
  let cellLine = '';
  for (let j = 0; j < n; j++) {
    cellLine += vLine(i, j);
    cellLine += cellGlyph(i, j);
  }
  cellLine += vLine(i, n);
  lines.push(cellLine);

  // 行下分隔线 (角点行 i+1)
  let sepLine = '';
  for (let j = 0; j <= n; j++) {
    sepLine += cornerAt(i + 1, j);
    if (j < n) sepLine += hLine(i + 1, j);
  }
  lines.push(sepLine);
}

console.log(`棋盘 ${n}×${n}, ${ridList.length} 个区域, k=${k}`);
console.log('');
console.log(lines.join('\n'));
console.log('');
console.log('区域图例:');
const legendCols = Math.min(8, ridList.length);
for (let i = 0; i < ridList.length; i += legendCols) {
  let row = '  ';
  for (let j = i; j < Math.min(i + legendCols, ridList.length); j++) {
    const rid = ridList[j];
    row += colorize(` ${String(rid).padStart(2)} `, 232, colorOf(rid)) + ' ';
  }
  console.log(row);
}
