// 边强度特征：在棋盘整 buffer 上一次跑 Sobel，对每条理论边线取窗口内
// |gradient| 平均。归一化到 [0,1]（按所有内部边线 95 分位数）。
// 棋盘外框边返回 null。

export interface CellEdges {
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
}

function toGray(buffer: Uint8Array, width: number, height: number, channels: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      // ITU-R BT.601 luma
      gray[y * width + x] = 0.299 * buffer[i] + 0.587 * buffer[i + 1] + 0.114 * buffer[i + 2];
    }
  }
  return gray;
}

function sobel(gray: Float32Array, width: number, height: number): Float32Array {
  const mag = new Float32Array(width * height);
  // Sobel kernels:
  //   Gx = [-1 0 1; -2 0 2; -1 0 1]  / Gy = [-1 -2 -1; 0 0 0; 1 2 1]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (xx: number, yy: number) => yy * width + xx;
      const tl = gray[idx(x - 1, y - 1)], tc = gray[idx(x, y - 1)], tr = gray[idx(x + 1, y - 1)];
      const ml = gray[idx(x - 1, y)],     mr = gray[idx(x + 1, y)];
      const bl = gray[idx(x - 1, y + 1)], bc = gray[idx(x, y + 1)], br = gray[idx(x + 1, y + 1)];
      const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
      mag[idx(x, y)] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

// 在 mag 上对一个像素矩形取均值
function rectMean(mag: Float32Array, width: number, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0, count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += mag[y * width + x];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx] || 1;
}

export function extractAllEdges(
  buffer: Uint8Array,
  width: number, height: number, channels: number,
  n: number,
  cw: number, ch: number,
): CellEdges[][] {
  const gray = toGray(buffer, width, height, channels);
  const mag = sobel(gray, width, height);

  // 边采样窗口厚度（垂直于边的方向上）
  const horizThickness = Math.max(2, Math.round(ch * 0.2));
  const vertThickness  = Math.max(2, Math.round(cw * 0.2));

  // 内部横向边：i ∈ [0, n-1)，j ∈ [0, n)，位于 cell(i,*).bottom 与 cell(i+1,*).top
  // 内部纵向边：i ∈ [0, n)，j ∈ [0, n-1)，位于 cell(*, j).right 与 cell(*, j+1).left
  const horizRaw: number[][] = [];   // [n-1][n]
  for (let i = 0; i < n - 1; i++) {
    horizRaw.push([]);
    const yMid = Math.round((i + 1) * ch);
    const y0 = Math.max(0, yMid - Math.floor(horizThickness / 2));
    const y1 = Math.min(height, y0 + horizThickness);
    for (let j = 0; j < n; j++) {
      const x0 = Math.round(j * cw);
      const x1 = Math.round((j + 1) * cw);
      horizRaw[i].push(rectMean(mag, width, x0, y0, x1, y1));
    }
  }
  const vertRaw: number[][] = [];    // [n][n-1]
  for (let i = 0; i < n; i++) {
    vertRaw.push([]);
    const y0 = Math.round(i * ch);
    const y1 = Math.round((i + 1) * ch);
    for (let j = 0; j < n - 1; j++) {
      const xMid = Math.round((j + 1) * cw);
      const x0 = Math.max(0, xMid - Math.floor(vertThickness / 2));
      const x1 = Math.min(width, x0 + vertThickness);
      vertRaw[i].push(rectMean(mag, width, x0, y0, x1, y1));
    }
  }

  const allRaw = horizRaw.flat().concat(vertRaw.flat());
  const norm = percentile(allRaw, 0.95);

  const clip = (v: number) => Math.min(1, v / norm);

  const out: CellEdges[][] = [];
  for (let i = 0; i < n; i++) {
    out.push([]);
    for (let j = 0; j < n; j++) {
      out[i].push({
        top:    i === 0       ? null : clip(horizRaw[i - 1][j]),
        bottom: i === n - 1   ? null : clip(horizRaw[i][j]),
        left:   j === 0       ? null : clip(vertRaw[i][j - 1]),
        right:  j === n - 1   ? null : clip(vertRaw[i][j]),
      });
    }
  }
  return out;
}
