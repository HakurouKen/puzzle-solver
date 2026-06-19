// dHash 图案指纹：取格中心 50% 区域 → 双线性下采样到 9×8 灰度
// → 按行比较相邻像素 → 64 bit → 16 hex 字符。

function bilinearGray(
  buffer: Uint8Array, width: number, channels: number,
  x: number, y: number,
): number {
  const x0 = Math.floor(x), x1 = x0 + 1;
  const y0 = Math.floor(y), y1 = y0 + 1;
  const fx = x - x0, fy = y - y0;
  const sample = (px: number, py: number) => {
    const i = (py * width + px) * channels;
    return 0.299 * buffer[i] + 0.587 * buffer[i + 1] + 0.114 * buffer[i + 2];
  };
  const v00 = sample(x0, y0);
  const v10 = sample(x1, y0);
  const v01 = sample(x0, y1);
  const v11 = sample(x1, y1);
  return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10
       + (1 - fx) *      fy  * v01 + fx *      fy  * v11;
}

export function extractPattern(
  buffer: Uint8Array,
  width: number, channels: number,
  cx: number, cy: number,
  cw: number, ch: number,
): string {
  // 中心 50% 窗口
  const winW = cw * 0.5, winH = ch * 0.5;
  const x0 = cx - winW / 2, y0 = cy - winH / 2;

  // 9×8 网格采样
  const cols = 9, rows = 8;
  const samples = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = x0 + ((c + 0.5) / cols) * winW;
      const sy = y0 + ((r + 0.5) / rows) * winH;
      samples[r * cols + c] = bilinearGray(buffer, width, channels, sx, sy);
    }
  }

  // 按行比较相邻像素：bit = (samples[r][c+1] > samples[r][c])
  // 8 行 × 8 比较 = 64 bit
  let hex = '';
  for (let r = 0; r < rows; r++) {
    let byte = 0;
    for (let c = 0; c < 8; c++) {
      const bit = samples[r * cols + c + 1] > samples[r * cols + c] ? 1 : 0;
      byte = (byte << 1) | bit;
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
