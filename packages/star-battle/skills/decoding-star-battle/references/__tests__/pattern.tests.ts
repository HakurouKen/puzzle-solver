import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPattern } from '../features/pattern.ts';

function makeSolid(w: number, h: number, rgb: [number, number, number]): Uint8Array {
  const buf = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    buf[i * 3] = rgb[0]; buf[i * 3 + 1] = rgb[1]; buf[i * 3 + 2] = rgb[2];
  }
  return buf;
}

test('extractPattern: 纯色格子 dHash 全 0', () => {
  const buf = makeSolid(40, 40, [128, 64, 200]);
  const hash = extractPattern(buf, 40, 3, 20, 20, 40, 40);
  assert.equal(hash.length, 16);
  assert.equal(hash, '0000000000000000');
});

test('extractPattern: 横向 0→255 渐变 → 每行 8 比较都是「右更亮」=1，dHash=ffffffffffffffff', () => {
  const W = 40, H = 40;
  const buf = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.round((x / (W - 1)) * 255);
      const i = (y * W + x) * 3;
      buf[i] = v; buf[i + 1] = v; buf[i + 2] = v;
    }
  }
  const hash = extractPattern(buf, W, 3, 20, 20, 40, 40);
  assert.equal(hash, 'ffffffffffffffff');
});

test('extractPattern: 横向渐变 vs 纵向渐变 hash 不同（不抗旋转，预期）', () => {
  const W = 40, H = 40;
  const horiz = new Uint8Array(W * H * 3);
  const vert  = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const hv = Math.round((x / (W - 1)) * 255);
      const vv = Math.round((y / (H - 1)) * 255);
      horiz[i] = hv; horiz[i + 1] = hv; horiz[i + 2] = hv;
      vert [i] = vv; vert [i + 1] = vv; vert [i + 2] = vv;
    }
  }
  const h1 = extractPattern(horiz, W, 3, 20, 20, 40, 40);
  const h2 = extractPattern(vert,  W, 3, 20, 20, 40, 40);
  assert.notEqual(h1, h2);
});

test('extractPattern: RGBA buffer (channels=4) 步长正确', () => {
  const W = 40, H = 40;
  const buf = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const v = Math.round((x / (W - 1)) * 255);
      buf[i] = v; buf[i + 1] = v; buf[i + 2] = v; buf[i + 3] = 255;
    }
  }
  const hash = extractPattern(buf, W, 4, 20, 20, 40, 40);
  assert.equal(hash, 'ffffffffffffffff');
});

test('extractPattern: 非方格 (cw=40, ch=20) 横向渐变 → ffff...', () => {
  const W = 80, H = 40;
  const buf = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.round((x / (W - 1)) * 255);
      const i = (y * W + x) * 3;
      buf[i] = v; buf[i + 1] = v; buf[i + 2] = v;
    }
  }
  // cell 中心 (40, 20)，cell 尺寸 40×20
  const hash = extractPattern(buf, W, 3, 40, 20, 40, 20);
  assert.equal(hash, 'ffffffffffffffff');
});

test('extractPattern: 浮点中心 (19.7, 20.3) 与整数中心 (20, 20) 在缓变图上 Hamming 距离 ≤ 2', () => {
  const W = 40, H = 40;
  const buf = new Uint8Array(W * H * 3);
  // 缓变：用平滑梯度而非阶跃
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const v = Math.round(((x + y) / ((W - 1) + (H - 1))) * 255);
      buf[i] = v; buf[i + 1] = v; buf[i + 2] = v;
    }
  }
  const hi = extractPattern(buf, W, 3, 20, 20, 40, 40);
  const hf = extractPattern(buf, W, 3, 19.7, 20.3, 40, 40);
  // 计算 Hamming distance
  const ai = BigInt('0x' + hi);
  const af = BigInt('0x' + hf);
  let xor = ai ^ af;
  let dist = 0;
  while (xor > 0n) { dist += Number(xor & 1n); xor >>= 1n; }
  assert.ok(dist <= 2, `Hamming dist=${dist}, hi=${hi}, hf=${hf}`);
});
