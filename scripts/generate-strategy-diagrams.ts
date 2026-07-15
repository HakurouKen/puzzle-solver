#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

interface Diagram {
  path: string;
  svg: string;
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <style>
    text { font-family: Inter, Arial, sans-serif; fill: #1f2937; }
    .small { font-size: 13px; }
    .label { font-size: 15px; font-weight: 600; }
    .title { font-size: 18px; font-weight: 700; }
    .cell { fill: #ffffff; stroke: #111827; stroke-width: 1.4; }
    .given { fill: #e0f2fe; }
    .mark { fill: #fef3c7; }
    .blocked { fill: #fee2e2; }
    .filled { fill: #111827; }
    .empty { fill: #ffffff; }
    .accent { fill: #dcfce7; }
    .line { stroke: #374151; stroke-width: 2; fill: none; }
    .dash { stroke: #ef4444; stroke-width: 2; stroke-dasharray: 6 5; fill: none; }
  </style>
${body}
</svg>
`;
}

function grid(x: number, y: number, rows: number, cols: number, size: number, fill: (r: number, c: number) => string, text?: (r: number, c: number) => string): string {
  const parts: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      parts.push(`<rect class="cell ${fill(r, c)}" x="${x + c * size}" y="${y + r * size}" width="${size}" height="${size}" />`);
      const value = text?.(r, c);
      if (value) {
        parts.push(`<text class="label" x="${x + c * size + size / 2}" y="${y + r * size + size / 2 + 5}" text-anchor="middle">${value}</text>`);
      }
    }
  }
  return parts.join("\n");
}

const diagrams: Diagram[] = [
  {
    path: "packages/sudoku/docs/assets/sudoku-hidden-single.svg",
    svg: svg(620, 220, `
  <text class="title" x="28" y="34">隐藏单数：数字 5 在这一行只剩一个位置</text>
  ${grid(38, 62, 1, 9, 46, (_r, c) => c === 5 ? "mark" : c === 0 || c === 3 ? "given" : "", (_r, c) => {
    if (c === 0) return "8";
    if (c === 3) return "2";
    if (c === 5) return "5";
    return "";
  })}
  <text class="small" x="38" y="136">同一行、列、宫内排除后，5 只能落在黄色格。</text>
  <path class="line" d="M314 62 L314 108" />
  <text class="small" x="345" y="91">assign(格, 5)</text>
`),
  },
  {
    path: "packages/killer-sudoku/docs/assets/killer-cage-combo.svg",
    svg: svg(620, 270, `
  <text class="title" x="28" y="34">笼组合：3 格总和 15</text>
  ${grid(48, 66, 2, 3, 54, (r, c) => (r === 0 && c < 2) || (r === 1 && c === 0) ? "mark" : "", (r, c) => {
    if (r === 0 && c === 0) return "15";
    return "";
  })}
  <path class="dash" d="M48 66 H156 V174 H48 Z" />
  <text class="small" x="235" y="85">合法数字组合：</text>
  <text class="label" x="235" y="115">1+5+9, 1+6+8, 2+4+9, 2+5+8, 2+6+7, 3+4+8, 3+5+7, 4+5+6</text>
  <text class="small" x="235" y="152">不在任何合法组合中的候选会被删除。</text>
  <text class="small" x="48" y="218">applyCageCombinations 会反复过滤笼内候选。</text>
`),
  },
  {
    path: "packages/nonogram/docs/assets/nonogram-overlap.svg",
    svg: svg(680, 250, `
  <text class="title" x="28" y="34">重叠法：长度 7 的线索 [4]</text>
  ${grid(54, 68, 1, 7, 48, (_r, c) => c >= 0 && c <= 3 ? "accent" : "", () => "")}
  <text class="small" x="54" y="55">最靠左放法</text>
  ${grid(54, 150, 1, 7, 48, (_r, c) => c >= 3 && c <= 6 ? "accent" : "", () => "")}
  <text class="small" x="54" y="137">最靠右放法</text>
  <rect class="cell filled" x="198" y="109" width="48" height="48" />
  <text class="small" x="288" y="139">所有合法放法都覆盖的格子必为黑格。</text>
`),
  },
  {
    path: "packages/star-battle/docs/assets/star-region-lock.svg",
    svg: svg(620, 300, `
  <text class="title" x="28" y="34">区域锁定：候选都在同一行</text>
  ${grid(58, 62, 4, 4, 52, (r, c) => r === 1 && c <= 2 ? "mark" : r === 1 ? "blocked" : "", (r, c) => {
    if (r === 1 && c <= 2) return "R";
    if (r === 1 && c === 3) return "X";
    return "";
  })}
  <path class="dash" d="M58 114 H214 V166 H58 Z" />
  <text class="small" x="300" y="97">某区域的候选全在第 2 行。</text>
  <text class="small" x="300" y="129">该行需要的星会由这个区域贡献。</text>
  <text class="small" x="300" y="161">同一行其他区域格可划 X。</text>
  <text class="small" x="58" y="286">rowColRegionLock 处理这类排他。</text>
`),
  },
];

for (const diagram of diagrams) {
  const output = join(repoRoot, diagram.path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, diagram.svg);
  console.log(`wrote ${diagram.path}`);
}
