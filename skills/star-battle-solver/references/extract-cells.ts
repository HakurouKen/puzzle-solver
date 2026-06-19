#!/usr/bin/env tsx
// 从棋盘截图提取每格特征（颜色 / 边强度 / dHash），输出 JSON 到 stdout。
// regions 聚类不在此处——由模型/用户消化特征后决定。
//
// 用法: tsx extract-cells.ts <image> --rect x,y,w,h --n N

import { extractColor, type ColorFeature } from './features/color.ts';
import { extractAllEdges, type CellEdges } from './features/edges.ts';
import { extractPattern } from './features/pattern.ts';
import sharp from 'sharp';

interface Cell {
  i: number; j: number;
  color: ColorFeature;
  edges: CellEdges;
  pattern: string;
}

function usage(): never {
  console.error('用法: tsx extract-cells.ts <image> --rect x,y,w,h --n N');
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();
const imagePath = args[0];

let rect: [number, number, number, number] | null = null;
let n: number | null = null;
for (let k = 1; k < args.length; k++) {
  const a = args[k];
  if (a === '--rect') {
    const v = args[++k];
    if (!v) usage();
    const parts = v.split(',').map(Number);
    if (parts.length !== 4 || parts.some(x => !Number.isFinite(x))) {
      console.error('错误: --rect 需要 4 个数字: x,y,w,h');
      process.exit(2);
    }
    const [rx, ry, rw, rh] = parts;
    if (rx < 0 || ry < 0 || rw <= 0 || rh <= 0) {
      console.error('错误: --rect 中 x,y 须 ≥0，w,h 须 >0');
      process.exit(2);
    }
    rect = parts as [number, number, number, number];
  } else if (a === '--n') {
    const v = args[++k];
    n = Number(v);
    if (!Number.isInteger(n) || n < 2) {
      console.error('错误: --n 需要 ≥2 的整数');
      process.exit(2);
    }
  } else {
    console.error(`错误: 未知参数 ${a}`);
    usage();
  }
}
if (!rect || !n) usage();

const [x, y, w, h] = rect;

const { data, info } = await sharp(imagePath)
  .extract({ left: x, top: y, width: w, height: h })
  .raw()
  .toBuffer({ resolveWithObject: true });

const buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
const channels = info.channels;
const cw = w / n, ch = h / n;

if (channels < 3) {
  console.error(`警告: 输入是 ${channels} 通道（grayscale/LA），特征模块假设 RGB(A)，输出可能不正确`);
}

if (cw * 0.5 < 4 || ch * 0.5 < 4) {
  console.error(`警告: 单格中心采样窗口过小（cw=${cw}, ch=${ch}），特征质量可能下降`);
}

const allEdges = extractAllEdges(buffer, w, h, channels, n, cw, ch);

const cells: Cell[] = [];
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const cx = (j + 0.5) * cw;
    const cy = (i + 0.5) * ch;
    cells.push({
      i, j,
      color: extractColor(buffer, w, channels, cx, cy, cw, ch),
      edges: allEdges[i][j],
      pattern: extractPattern(buffer, w, channels, cx, cy, cw, ch),
    });
  }
}

console.log(JSON.stringify({
  n,
  rect,
  cellSize: [cw, ch],
  cells,
}, null, 2));
