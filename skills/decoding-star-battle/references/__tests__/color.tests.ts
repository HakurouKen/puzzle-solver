import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractColor } from '../features/color.ts';

function makeSolidBuffer(w: number, h: number, ch: number, rgb: [number, number, number]): Uint8Array {
  const buf = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      buf[i] = rgb[0]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[2];
      if (ch === 4) buf[i + 3] = 255;
    }
  }
  return buf;
}

test('extractColor: 全红格子 mean/median 都是 (255,0,0)', () => {
  const buf = makeSolidBuffer(20, 20, 3, [255, 0, 0]);
  const f = extractColor(buf, 20, 3, 10, 10, 20, 20);
  assert.deepEqual(f.meanRGB, [255, 0, 0]);
  assert.deepEqual(f.medianRGB, [255, 0, 0]);
});

test('extractColor: 半红半蓝 mean ≈ (128,0,128)', () => {
  // 20×20，左半红 右半蓝
  const buf = new Uint8Array(20 * 20 * 3);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 3;
      if (x < 10) { buf[i] = 255; buf[i + 1] = 0; buf[i + 2] = 0; }
      else        { buf[i] = 0;   buf[i + 1] = 0; buf[i + 2] = 255; }
    }
  }
  const f = extractColor(buf, 20, 3, 10, 10, 20, 20);
  // 中心 50%（x ∈ [5,15)）：左半 5 列红 + 右半 5 列蓝 → R≈128, B≈128
  assert.ok(Math.abs(f.meanRGB[0] - 128) < 5, `meanR=${f.meanRGB[0]}`);
  assert.equal(f.meanRGB[1], 0);
  assert.ok(Math.abs(f.meanRGB[2] - 128) < 5, `meanB=${f.meanRGB[2]}`);
});

test('extractColor: 横向 0→255 渐变 R，median ≈ 中间值', () => {
  const buf = new Uint8Array(20 * 20 * 3);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 3;
      buf[i] = Math.round((x / 19) * 255);
    }
  }
  const f = extractColor(buf, 20, 3, 10, 10, 20, 20);
  // 中心区域 x ∈ [5,15)，渐变中点附近，median 落在 ~110-145
  assert.ok(f.medianRGB[0] >= 110 && f.medianRGB[0] <= 145, `medianR=${f.medianRGB[0]}`);
});

test('extractColor: RGBA buffer (channels=4) 步长正确', () => {
  // 构造 20×20 RGBA buffer：左半红 (255,0,0,255)，右半蓝 (0,0,255,255)
  // 验证 channels=4 时跨像素步长用 4 而非 3
  const buf = new Uint8Array(20 * 20 * 4);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 4;
      if (x < 10) { buf[i] = 255; buf[i + 1] = 0; buf[i + 2] = 0; }
      else        { buf[i] = 0;   buf[i + 1] = 0; buf[i + 2] = 255; }
      buf[i + 3] = 255;
    }
  }
  const f = extractColor(buf, 20, 4, 10, 10, 20, 20);
  assert.ok(Math.abs(f.meanRGB[0] - 128) < 5, `meanR=${f.meanRGB[0]}`);
  assert.equal(f.meanRGB[1], 0);
  assert.ok(Math.abs(f.meanRGB[2] - 128) < 5, `meanB=${f.meanRGB[2]}`);
});
