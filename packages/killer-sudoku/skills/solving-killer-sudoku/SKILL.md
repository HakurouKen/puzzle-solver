---
name: solving-killer-sudoku
description: Use when a Killer Sudoku puzzle (as a 9×9 grid + cages) is already decoded and needs to be solved.
---

# Solving Killer Sudoku

Solve a Killer Sudoku puzzle using constraint propagation + backtracking.

## Input Format

```json
{
  "puzzle": [[0, 0, ...], ...],  // 9×9, 0 = empty
  "cages": [
    { "cells": [[r, c], ...], "sum": N }
  ]
}
```

## Algorithm

The solver uses:
1. **Constraint propagation** (Norvig-style):
   - Naked singles: cell collapses to one candidate
   - Hidden singles: digit appears in only one cell of a unit
2. **Cage constraints**:
   - Combination filtering: enumerate valid digit combinations for each cage's sum + size
   - 45 rule: leverage that each row/column/box sums to 45
3. **MRV backtracking**: search with minimum remaining values heuristic

## Usage

```bash
# CLI
node --experimental-strip-types solve-board.ts /tmp/killer-sudoku-input.json

# Programmatic
import { solve } from './solver.ts';
const result = solve(input);
// result: { solution: number[][], steps: Step[] } | null
```

## Output

The solver writes to `/tmp/killer-sudoku-output.json`:

```json
{
  "puzzle": [...],
  "cages": [...],
  "solution": [[1, 2, 3, ...], ...] | null,
  "steps": [
    { "type": "assign" | "eliminate" | "cage-combo" | "rule-of-45" | "search", ... }
  ]
}
```

## Step Types

- `assign`: cell assigned a specific digit
- `eliminate`: digit removed from cell's candidates
- `cage-combo`: cage combination filtering triggered
- `rule-of-45`: 45 rule deduction
- `search`: backtracking branch

## Exit Codes
- 0: success (including "no solution found")
- 1: input error

## Next Step
Invoke `rendering-killer-sudoku` to display the solution.
