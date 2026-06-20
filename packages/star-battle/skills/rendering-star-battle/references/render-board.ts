#!/usr/bin/env tsx
// 渲染 Star Battle 棋盘到终端,纯 Unicode 盒线,不使用 ANSI 颜色。
//
// 设计原则:
//   - 颜色禁用:终端调色板与原图色差会让用户误以为识别错(实际只是渲染色不同)。
//   - 视觉接近正方形:每格 5 字符宽 × 2 行高,主流等宽字体下接近 1:1。
//   - 粗线分区:区域边界 / 外框 = ━┃┏ 等粗线;同区单元格之间 = ─│ 等细线。
//   - 单元格中央显示 region id;若提供 solution,星格用 ★ 替代 id。
//
// 用法: tsx render-board.ts <input.json>
// 输入: { "regions": number[][], "k": number, "solution"?: number[][] }

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

const ridList = Array.from(new Set(regions.flat())).sort((a, b) => a - b);

const CELL_W = 5; // 单元格内部宽度(角点之间的水平段长度)
const CELL_H = 2; // 单元格内部高度

function cellContent(i: number, j: number): [string, string] {
  const isStar = solution?.[i]?.[j] === 1;
  const rid = regions[i][j];
  // cell 5×2 字符位:第一行空白,第二行居中放 region id 或星标 *。
  // 全单字节 ASCII 内容,无宽字符对齐问题。
  const idStr = String(rid);
  const blankRow = ' '.repeat(CELL_W);
  if (isStar) {
    return [blankRow, centerAscii('*', CELL_W)];
  }
  return [blankRow, centerAscii(idStr, CELL_W)];
}

// 单字节字符串居中到 width。
function centerAscii(s: string, width: number): string {
  if (s.length >= width) return s;
  const left = Math.floor((width - s.length) / 2);
  const right = width - s.length - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

function corner(
  arms: { t: boolean; r: boolean; b: boolean; l: boolean },
  thick: { t: boolean; r: boolean; b: boolean; l: boolean },
): string {
  const a = arms;
  const tt = a.t && thick.t, rt = a.r && thick.r, bt = a.b && thick.b, lt = a.l && thick.l;
  const vThick = tt || bt;
  const hThick = lt || rt;
  const cnt = (a.t ? 1 : 0) + (a.r ? 1 : 0) + (a.b ? 1 : 0) + (a.l ? 1 : 0);

  if (cnt === 4) {
    if (vThick && hThick) return '╋';
    if (hThick) return '┿';
    if (vThick) return '╂';
    return '┼';
  }
  if (cnt === 3) {
    if (!a.t) {
      if (hThick && bt) return '┳';
      if (hThick) return '┯';
      if (bt) return '┰';
      return '┬';
    }
    if (!a.b) {
      if (hThick && tt) return '┻';
      if (hThick) return '┷';
      if (tt) return '┸';
      return '┴';
    }
    if (!a.l) {
      if (vThick && rt) return '┣';
      if (vThick) return '┠';
      if (rt) return '┝';
      return '├';
    }
    if (!a.r) {
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

function cornerAt(i: number, j: number): string {
  const arms = { t: i > 0, r: j < n, b: i < n, l: j > 0 };
  const tThick = arms.t && (j === 0 || j === n || regions[i - 1][j - 1] !== regions[i - 1][j]);
  const bThick = arms.b && (j === 0 || j === n || regions[i][j - 1] !== regions[i][j]);
  const lThick = arms.l && (i === 0 || i === n || regions[i - 1][j - 1] !== regions[i][j - 1]);
  const rThick = arms.r && (i === 0 || i === n || regions[i - 1][j] !== regions[i][j]);
  return corner(arms, { t: tThick, r: rThick, b: bThick, l: lThick });
}

function hLine(i: number, j: number): string {
  const thick = i === 0 || i === n || regions[i - 1][j] !== regions[i][j];
  // 区域边界 = 粗线 ━; 同区单元格之间 = 细线 ─。
  // 区域纹理在 cell 第一行已提供"内部 vs 跨界"的视觉对比,
  // 这里粗细线只起辅助轮廓作用,无需虚线。
  return (thick ? '━' : '─').repeat(CELL_W);
}
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
  const contents: [string, string][] = [];
  for (let j = 0; j < n; j++) contents.push(cellContent(i, j));

  for (let r = 0; r < CELL_H; r++) {
    let line = '';
    for (let j = 0; j < n; j++) {
      line += vLine(i, j);
      line += contents[j][r];
    }
    line += vLine(i, n);
    lines.push(line);
  }

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

// 图例:每个区域的格数,便于用户核对识图是否对(Star Battle 每区至少 k 格,通常 ≥ 2k)。
const sizes = new Map<number, number>();
for (const row of regions) for (const v of row) sizes.set(v, (sizes.get(v) ?? 0) + 1);
const legendEntries = ridList.map(rid => `${rid}=${sizes.get(rid)}格`);
console.log('');
console.log(`区域(id=格数): ${legendEntries.join('  ')}`);
