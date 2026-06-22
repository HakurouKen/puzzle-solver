---
name: rendering-killer-sudoku
description: Use when a Killer Sudoku solution needs to be rendered to the terminal.
---

# Rendering Killer Sudoku

Render a Killer Sudoku solution to the terminal using Unicode box-drawing characters.

## Input Format

```json
{
  "puzzle": [...],
  "cages": [...],
  "solution": [[1, 2, 3, ...], ...]  // optional, falls back to puzzle
}
```

## Usage

```bash
# CLI
node --experimental-strip-types render-board.ts /tmp/killer-sudoku-output.json

# Programmatic
import { renderBoard, renderCages } from './render-board.ts';
const board = renderBoard(input);
const cages = renderCages(input);
```

## Output Format

```
┏━━━┯━━━┯━━━┳━━━┯━━━┯━━━┳━━━┯━━━┯━━━┓
┃ 1 │ 2 │ 3 ┃ 4 │ 5 │ 6 ┃ 7 │ 8 │ 9 ┃
┃───┼───┼───╂───┼───┼───╂───┼───┼───┃
┃ 4 │ 5 │ 6 ┃ 7 │ 8 │ 9 ┃ 1 │ 2 │ 3 ┃
...
┗━━━┷━━━┷━━━┻━━━┷━━━┷━━━┻━━━┷━━━┷━━━┛

Cages:
  Cage 0: A1,A2 (2 cells, sum=3)
  Cage 1: A3,B3 (2 cells, sum=15)
  ...
```

## Border Conventions

- **Thick borders** (━ ┃ ┏ ┓): 3×3 box boundaries
- **Thin borders** (─ │ ━): cage boundaries
- **Mixed borders** (┳ ┷ ┣ ┫): where cage and box boundaries coincide

## Design Notes

- No ANSI color (terminal palette differences would confuse users)
- Pure Unicode for maximum compatibility
- 3-character cell width (1 digit + 2 padding)
- Cage list shows cell coordinates in standard notation (A1-I9)
