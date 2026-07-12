#!/usr/bin/env python3
"""Decode a Killer Sudoku image into a candidate JSON + composite tile images.

Pipeline:
  1. Detect the 9x9 grid bounding box via dark-line scanning.
  2. Detect cage barriers (dashed lines) between adjacent cells by inset scan.
  3. Flood-fill cells into cages using the barrier map.
  4. Crop per-cell label tile (top-left corner) and digit tile (center).
  5. Assemble two composite PNGs:
       - labels_grid.png : one tile per cage anchor (sums to fill in)
       - digits_grid.png : 9x9 grid (digits to fill in)
  6. Emit candidate.json with cage cell lists (sums = null) and puzzle
     matrix (all zeros) for the agent to fill in.

Usage:
    python3 decode-image.py <image_path> [--outdir DIR]

Outputs (in outdir, defaults to /tmp/killer-sudoku-decode):
    candidate.json
    labels_grid.png
    digits_grid.png
    debug/*.png (individual crops)

Dependencies: only Pillow (PIL), installed in the package-local uv environment.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import deque
from pathlib import Path

from PIL import Image


DARK_THRESHOLD = 130  # grayscale value below which a pixel counts as "ink"
CAGE_DASH_RATIO = 0.30  # inset dark ratio above which we treat edge as cage barrier


def gray(px, x, y):
    r, g, b = px[x, y]
    return (r + g + b) // 3


def detect_grid_bounds(img: Image.Image) -> tuple[int, int, int, int]:
    """Return (x0, x1, y0, y1) of the outer solid grid frame."""
    w, h = img.size
    px = img.load()

    # Row-scan: rows where >=35% of x-samples are dark are grid lines.
    row_dark = [
        sum(1 for x in range(0, w, 2) if gray(px, x, y) < DARK_THRESHOLD)
        for y in range(h)
    ]
    row_thresh = w * 0.5 * 0.35  # samples * 0.35
    row_peaks = [y for y in range(h) if row_dark[y] > row_thresh]

    col_dark = [
        sum(1 for y in range(0, h, 2) if gray(px, x, y) < DARK_THRESHOLD)
        for x in range(w)
    ]
    col_thresh = h * 0.5 * 0.35
    col_peaks = [x for x in range(w) if col_dark[x] > col_thresh]

    if not row_peaks or not col_peaks:
        raise RuntimeError("Could not detect grid frame")

    return col_peaks[0], col_peaks[-1], row_peaks[0], row_peaks[-1]


def edge_has_cage_barrier(px, xs: range, ys: range, orientation: str,
                           edge_pos: int) -> bool:
    """Detect a dashed cage line offset ~5-10px inside adjacent cells.

    orientation: 'h' (horizontal edge, edge_pos is y) or 'v' (edge_pos is x).
    Returns True if either side of the edge shows dashed dark density.
    """
    hits_a = hits_b = 0
    total = 0
    if orientation == "h":
        for x in xs:
            band_a = min(gray(px, x, y) for y in range(edge_pos - 11, edge_pos - 4))
            band_b = min(gray(px, x, y) for y in range(edge_pos + 5, edge_pos + 12))
            if band_a < DARK_THRESHOLD:
                hits_a += 1
            if band_b < DARK_THRESHOLD:
                hits_b += 1
            total += 1
    else:  # 'v'
        for y in ys:
            band_a = min(gray(px, x, y) for x in range(edge_pos - 11, edge_pos - 4))
            band_b = min(gray(px, x, y) for x in range(edge_pos + 5, edge_pos + 12))
            if band_a < DARK_THRESHOLD:
                hits_a += 1
            if band_b < DARK_THRESHOLD:
                hits_b += 1
            total += 1
    return max(hits_a, hits_b) / total > CAGE_DASH_RATIO


def build_barriers(img: Image.Image, x0: int, y0: int, cw: float, ch: float):
    """Compute two barrier maps.

    horiz[r][c] = True when there is a cage line between row r and r+1 at column c.
    vert[r][c]  = True when there is a cage line between col c and c+1 at row r.
    """
    px = img.load()
    horiz = [[False] * 9 for _ in range(8)]
    vert = [[False] * 8 for _ in range(9)]

    inset = 12  # skip the corners (avoid solid grid intersections)

    for r in range(8):
        y_edge = int(y0 + (r + 1) * ch)
        for c in range(9):
            xa = int(x0 + c * cw + inset)
            xb = int(x0 + (c + 1) * cw - inset)
            if xb - xa < 5:
                continue
            horiz[r][c] = edge_has_cage_barrier(
                px, range(xa, xb), range(0), "h", y_edge
            )

    for r in range(9):
        ya = int(y0 + r * ch + inset)
        yb = int(y0 + (r + 1) * ch - inset)
        for c in range(8):
            x_edge = int(x0 + (c + 1) * cw)
            if yb - ya < 5:
                continue
            vert[r][c] = edge_has_cage_barrier(
                px, range(0), range(ya, yb), "v", x_edge
            )

    return horiz, vert


def flood_fill_cages(horiz, vert):
    """Flood-fill 9x9 cells into cages using barrier maps."""
    cage_id = [[-1] * 9 for _ in range(9)]
    next_id = 0
    for sr in range(9):
        for sc in range(9):
            if cage_id[sr][sc] != -1:
                continue
            cage_id[sr][sc] = next_id
            q = deque([(sr, sc)])
            while q:
                r, c = q.popleft()
                # up
                if r > 0 and not horiz[r - 1][c] and cage_id[r - 1][c] == -1:
                    cage_id[r - 1][c] = next_id
                    q.append((r - 1, c))
                # down
                if r < 8 and not horiz[r][c] and cage_id[r + 1][c] == -1:
                    cage_id[r + 1][c] = next_id
                    q.append((r + 1, c))
                # left
                if c > 0 and not vert[r][c - 1] and cage_id[r][c - 1] == -1:
                    cage_id[r][c - 1] = next_id
                    q.append((r, c - 1))
                # right
                if c < 8 and not vert[r][c] and cage_id[r][c + 1] == -1:
                    cage_id[r][c + 1] = next_id
                    q.append((r, c + 1))
            next_id += 1
    return cage_id, next_id


def crop_label_tile(img, x0, y0, cw, ch, r, c):
    """Top-left region containing the cage sum label."""
    lx = int(x0 + c * cw + 3)
    ly = int(y0 + r * ch + 3)
    box = (lx - 3, ly - 3, lx + 55, ly + 45)
    tile = img.crop(box)
    return tile.resize((tile.width * 6, tile.height * 6), Image.LANCZOS)


def crop_digit_tile(img, x0, y0, cw, ch, r, c):
    """Center region containing the given digit (or blank)."""
    lx = int(x0 + c * cw + int(cw * 0.30))
    ly = int(y0 + r * ch + int(ch * 0.20))
    w2 = int(cw * 0.55)
    h2 = int(ch * 0.65)
    tile = img.crop((lx, ly, lx + w2, ly + h2))
    return tile.resize((tile.width * 4, tile.height * 4), Image.LANCZOS)


def assemble_composite(tiles: list[tuple[int, int, Image.Image]],
                        cell_w: int, cell_h: int, cols: int) -> Image.Image:
    """Lay tiles out on a grid; each tile is annotated with an r,c label."""
    from PIL import ImageDraw

    n = len(tiles)
    rows = (n + cols - 1) // cols
    gap = 4
    W = cols * cell_w + (cols + 1) * gap
    H = rows * cell_h + (rows + 1) * gap
    canvas = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(canvas)
    for i, (r, c, tile) in enumerate(tiles):
        gr = i // cols
        gc = i % cols
        x = gap + gc * (cell_w + gap)
        y = gap + gr * (cell_h + gap)
        canvas.paste(tile.resize((cell_w, cell_h)), (x, y))
        draw.text((x + 4, y + 4), f"({r},{c})", fill="red")
    return canvas


def build_candidate(cage_id, num_cages: int) -> dict:
    """Emit puzzle (all zeros) + cages (with null sums)."""
    puzzle = [[0] * 9 for _ in range(9)]
    cages_cells: list[list[list[int]]] = [[] for _ in range(num_cages)]
    for r in range(9):
        for c in range(9):
            cages_cells[cage_id[r][c]].append([r, c])
    # Order by anchor (row, col) ascending.
    ordered = sorted(cages_cells, key=lambda cs: (cs[0][0], cs[0][1]))
    cages = [{"cells": cs, "sum": None} for cs in ordered]
    return {"puzzle": puzzle, "cages": cages}


def anchor_of(cells):
    return min((r, c) for r, c in cells)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", help="Path to Killer Sudoku puzzle image")
    ap.add_argument("--outdir", default="/tmp/killer-sudoku-decode",
                    help="Output directory (default: /tmp/killer-sudoku-decode)")
    ap.add_argument("--label-cols", type=int, default=6,
                    help="Columns in labels_grid.png composite")
    args = ap.parse_args()

    src = Path(args.image)
    if not src.exists():
        print(f"error: {src} not found", file=sys.stderr)
        return 2

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    debug = outdir / "debug"
    debug.mkdir(exist_ok=True)

    img = Image.open(src).convert("RGB")
    x0, x1, y0, y1 = detect_grid_bounds(img)
    cw = (x1 - x0) / 9
    ch = (y1 - y0) / 9
    print(f"grid bounds: x=[{x0},{x1}] y=[{y0},{y1}] cell={cw:.1f}x{ch:.1f}")

    horiz, vert = build_barriers(img, x0, y0, cw, ch)
    cage_id, num_cages = flood_fill_cages(horiz, vert)
    print(f"detected {num_cages} cages")

    candidate = build_candidate(cage_id, num_cages)
    (outdir / "candidate.json").write_text(
        json.dumps(candidate, indent=2, ensure_ascii=False)
    )

    # Label composite: one tile per cage anchor.
    label_tiles = []
    for cage in candidate["cages"]:
        r, c = anchor_of(cage["cells"])
        tile = crop_label_tile(img, x0, y0, cw, ch, r, c)
        tile.save(debug / f"label_{r}_{c}.png")
        label_tiles.append((r, c, tile))
    labels_composite = assemble_composite(label_tiles, 260, 220, args.label_cols)
    labels_composite.save(outdir / "labels_grid.png")

    # Digit composite: 9x9.
    digit_tiles = []
    for r in range(9):
        for c in range(9):
            tile = crop_digit_tile(img, x0, y0, cw, ch, r, c)
            tile.save(debug / f"digit_{r}_{c}.png")
            digit_tiles.append((r, c, tile))
    digits_composite = assemble_composite(digit_tiles, 100, 100, 9)
    digits_composite.save(outdir / "digits_grid.png")

    print(f"outputs in {outdir}/")
    print(f"  candidate.json  ({num_cages} cages, sums=null; puzzle=all-zero)")
    print(f"  labels_grid.png ({num_cages} anchor labels)")
    print(f"  digits_grid.png (9x9 digits)")

    # Sanity hint about ∑sum = 405.
    print()
    print(f"After filling sums: assert sum == 405 (= 45 * 9).")
    print(f"After filling puzzle: agent renders and asks user to confirm.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
