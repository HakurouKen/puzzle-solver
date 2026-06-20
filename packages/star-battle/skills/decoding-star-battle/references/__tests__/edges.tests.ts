import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAllEdges } from '../features/edges.ts';

function makeBuffer(w: number, h: number, fill: (x: number, y: number) => [number, number, number]): Uint8Array {
  const buf = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const [r, g, b] = fill(x, y);
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
    }
  }
  return buf;
}

test('extractAllEdges: 中间一条粗黑横线 → cell(0,*).bottom 与 cell(1,*).top 高响应；外框 null', () => {
  // 棋盘 40×40，n=2，cw=ch=20。中间 y∈[18,22) 涂黑（4 行粗线）。
  const W = 40, H = 40, n = 2, cw = 20, ch = 20;
  const buf = makeBuffer(W, H, (_x, y) => (y >= 18 && y < 22) ? [0, 0, 0] : [255, 255, 255]);
  const edges = extractAllEdges(buf, W, H, 3, n, cw, ch);

  for (let j = 0; j < n; j++) {
    assert.ok((edges[0][j].bottom ?? 0) > 0.5, `(0,${j}).bottom=${edges[0][j].bottom}`);
    assert.ok((edges[1][j].top    ?? 0) > 0.5, `(1,${j}).top=${edges[1][j].top}`);
  }
  // 外框
  assert.equal(edges[0][0].top, null);
  assert.equal(edges[0][0].left, null);
  assert.equal(edges[1][n - 1].bottom, null);
  assert.equal(edges[1][n - 1].right, null);
  // 顶行无横线 → 顶行的纵向边（cell(0,j).right）应该比中间横线低
  for (let j = 0; j < n - 1; j++) {
    assert.ok((edges[0][j].right ?? 1) < 0.3, `(0,${j}).right=${edges[0][j].right}`);
  }
});

test('extractAllEdges: 全白棋盘 → 内部边接近 0', () => {
  const W = 40, H = 40, n = 2, cw = 20, ch = 20;
  const buf = makeBuffer(W, H, () => [255, 255, 255]);
  const edges = extractAllEdges(buf, W, H, 3, n, cw, ch);
  assert.ok((edges[0][0].right  ?? 1) < 0.1);
  assert.ok((edges[0][0].bottom ?? 1) < 0.1);
  assert.ok((edges[1][1].top    ?? 1) < 0.1);
});

test('extractAllEdges: 中间纵线 → cell(*, 0).right 与 cell(*, 1).left 高响应', () => {
  const W = 40, H = 40, n = 2, cw = 20, ch = 20;
  const buf = makeBuffer(W, H, (x, _y) => (x >= 18 && x < 22) ? [0, 0, 0] : [255, 255, 255]);
  const edges = extractAllEdges(buf, W, H, 3, n, cw, ch);
  for (let i = 0; i < n; i++) {
    assert.ok((edges[i][0].right ?? 0) > 0.5, `(${i},0).right=${edges[i][0].right}`);
    assert.ok((edges[i][1].left  ?? 0) > 0.5, `(${i},1).left=${edges[i][1].left}`);
  }
});

test('extractAllEdges: RGBA buffer (channels=4) 步长正确', () => {
  // 与 channels=3 横线测试对称，但用 RGBA 验证 toGray 步长
  const W = 40, H = 40, n = 2, cw = 20, ch = 20;
  const buf = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const isLine = y >= 18 && y < 22;
      buf[i] = isLine ? 0 : 255;
      buf[i + 1] = isLine ? 0 : 255;
      buf[i + 2] = isLine ? 0 : 255;
      buf[i + 3] = 255;
    }
  }
  const edges = extractAllEdges(buf, W, H, 4, n, cw, ch);
  for (let j = 0; j < n; j++) {
    assert.ok((edges[0][j].bottom ?? 0) > 0.5, `(0,${j}).bottom=${edges[0][j].bottom}`);
    assert.ok((edges[1][j].top    ?? 0) > 0.5, `(1,${j}).top=${edges[1][j].top}`);
  }
});

test('extractAllEdges: n=3 棋盘 仅 row0/row1 之间有粗线 → row1/row2 之间低响应', () => {
  // 60×60，n=3，cw=ch=20。仅 y∈[18,22) 涂黑（即 row0/row1 之间），row1/row2 之间无粗线。
  const W = 60, H = 60, n = 3, cw = 20, ch = 20;
  const buf = makeBuffer(W, H, (_x, y) => (y >= 18 && y < 22) ? [0, 0, 0] : [255, 255, 255]);
  const edges = extractAllEdges(buf, W, H, 3, n, cw, ch);

  // row0/row1 之间高
  for (let j = 0; j < n; j++) {
    assert.ok((edges[0][j].bottom ?? 0) > 0.5, `(0,${j}).bottom=${edges[0][j].bottom}`);
    assert.ok((edges[1][j].top    ?? 0) > 0.5, `(1,${j}).top=${edges[1][j].top}`);
  }
  // row1/row2 之间应该明显低于 row0/row1（用相对而非绝对阈值更稳）
  for (let j = 0; j < n; j++) {
    const strong = edges[0][j].bottom!;
    const weak   = edges[1][j].bottom!;
    assert.ok(weak < strong * 0.3,
      `(1,${j}).bottom=${weak} 应远小于 (0,${j}).bottom=${strong}`);
  }
  // 外框
  assert.equal(edges[0][1].top, null);
  assert.equal(edges[2][2].bottom, null);
});
