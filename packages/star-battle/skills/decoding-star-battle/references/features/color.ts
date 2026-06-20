// 颜色特征：以格中心 50%×50% 区域采样，输出 mean / median RGB。

export interface ColorFeature {
  meanRGB: [number, number, number];
  medianRGB: [number, number, number];
}

export function extractColor(
  buffer: Uint8Array,
  width: number,
  channels: number,
  cx: number, cy: number,
  cw: number, ch: number,
): ColorFeature {
  const halfW = Math.max(2, Math.round((cw * 0.5) / 2));
  const halfH = Math.max(2, Math.round((ch * 0.5) / 2));
  const x0 = Math.round(cx) - halfW;
  const x1 = Math.round(cx) + halfW;
  const y0 = Math.round(cy) - halfH;
  const y1 = Math.round(cy) + halfH;

  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  let sumR = 0, sumG = 0, sumB = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
      rs.push(r); gs.push(g); bs.push(b);
      sumR += r; sumG += g; sumB += b;
    }
  }
  const n = rs.length;
  rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
  const mid = n >> 1;
  return {
    meanRGB: [Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n)],
    medianRGB: [rs[mid], gs[mid], bs[mid]],
  };
}
