// Norvig Sudoku solver — TypeScript port
// See http://norvig.com/sudoku.html

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
export const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function cross(A: readonly string[], B: readonly string[]): string[] {
  const result: string[] = [];
  for (const a of A) for (const b of B) result.push(a + b);
  return result;
}
