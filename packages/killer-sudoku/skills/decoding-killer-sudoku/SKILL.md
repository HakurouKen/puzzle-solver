---
name: decoding-killer-sudoku
description: Use when user provides a Killer Sudoku puzzle image and the puzzle's grid + cages need to be decoded from the image.
---

# Decoding Killer Sudoku

Decode a Killer Sudoku puzzle from an image into structured JSON.

## Input
- An image file containing a Killer Sudoku puzzle
- The puzzle may have:
  - Prefilled digits in some cells
  - Cages (dotted line groups) with sum values in the top-left corner
  - All 81 cells covered by exactly one cage

## Output Format

Write JSON to `/tmp/killer-sudoku-input.json`:

```json
{
  "puzzle": [[0, 0, ...], ...],  // 9×9, 0 = empty, 1-9 = given
  "cages": [
    {
      "cells": [[row, col], ...],  // 0-indexed
      "sum": 10
    }
  ]
}
```

## Process

1. **Extract the 9×9 grid**: For each cell, determine if it contains a prefilled digit (1-9) or is empty (0)
2. **Identify cages**: Detect dotted/dashed line groups (cages) that cover all 81 cells
3. **Extract cage sums**: Read the sum value in the top-left corner of each cage
4. **Validate**: Ensure all 81 cells are covered by exactly one cage

## Validation Checklist
- [ ] Grid is 9×9
- [ ] All values are 0-9
- [ ] All 81 cells are covered by exactly one cage
- [ ] Each cage has a valid sum value
- [ ] Cage cells are within grid bounds

## Next Step
Invoke `solving-killer-sudoku` to solve the puzzle.
