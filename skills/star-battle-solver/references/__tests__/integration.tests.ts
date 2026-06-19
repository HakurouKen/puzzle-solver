import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { extractColor } from '../features/color.ts';
import { extractAllEdges } from '../features/edges.ts';
import { extractPattern } from '../features/pattern.ts';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, 'fixtures/level-27.jpg');

// Step 1 实测得到的 RECT：4 个 corner cells 均为彩色（非 [240+,240+,240+] 白底）
// 0,0=[239,129,112] 0,8=[188,174,209] 8,0=[250,212,175] 8,8=[244,180,196]
const RECT: [number, number, number, number] = [148, 1076, 1142, 1142];
const N = 9;

async function loadBoard() {
  const [x, y, w, h] = RECT;
  const { data, info } = await sharp(FIXTURE)
    .extract({ left: x, top: y, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return { buffer, w, h, channels: info.channels, cw: w / N, ch: h / N };
}

test('集成: fixture 图能产出 81 格特征', async () => {
  const { buffer, w, h, channels, cw, ch } = await loadBoard();

  const edges = extractAllEdges(buffer, w, h, channels, N, cw, ch);
  const allInternal: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (edges[i][j].right  != null) allInternal.push(edges[i][j].right!);
      if (edges[i][j].bottom != null) allInternal.push(edges[i][j].bottom!);
    }
  }
  // 粗线棋盘：至少有 90% 的内部边响应 > 0.3
  const strong = allInternal.filter(v => v > 0.3).length;
  assert.ok(strong / allInternal.length > 0.9,
    `强边占比=${(strong / allInternal.length).toFixed(2)}`);
});

test('集成: 颜色簇散开 — 81 格 meanRGB 中有任意两格距离 > 80', async () => {
  const { buffer, w, channels, cw, ch } = await loadBoard();
  const colors: [number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cx = (j + 0.5) * cw;
      const cy = (i + 0.5) * ch;
      colors.push(extractColor(buffer, w, channels, cx, cy, cw, ch).meanRGB);
    }
  }
  let maxD = 0;
  for (let a = 0; a < colors.length; a++) {
    for (let b = a + 1; b < colors.length; b++) {
      const dr = colors[a][0] - colors[b][0];
      const dg = colors[a][1] - colors[b][1];
      const db = colors[a][2] - colors[b][2];
      const d = Math.sqrt(dr * dr + dg * dg + db * db);
      if (d > maxD) maxD = d;
    }
  }
  assert.ok(maxD > 150, `maxD=${maxD.toFixed(1)}`);
});

test('集成: dHash 对所有 81 格都返回 16 hex', async () => {
  const { buffer, w, channels, cw, ch } = await loadBoard();
  const hashes = new Set<string>();
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cx = (j + 0.5) * cw;
      const cy = (i + 0.5) * ch;
      const hash = extractPattern(buffer, w, channels, cx, cy, cw, ch);
      assert.equal(hash.length, 16, `(${i},${j}) hash=${hash}`);
      assert.match(hash, /^[0-9a-f]{16}$/);
      hashes.add(hash);
    }
  }
  // 9 色棋盘上至少有 5 种不同 dHash（不同色块产生的纹理边沿不同）
  assert.ok(hashes.size >= 5, `unique dHash count=${hashes.size}`);
});
