#!/usr/bin/env tsx

import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skills = [
  ["solve-star-battle", "packages/star-battle/skills/solve-star-battle"],
  ["decoding-star-battle", "packages/star-battle/skills/decoding-star-battle"],
  ["rendering-star-battle", "packages/star-battle/skills/rendering-star-battle"],
  ["resolve-star-battle", "packages/star-battle/skills/resolve-star-battle"],
  ["solve-sudoku", "packages/sudoku/skills/solve-sudoku"],
  ["decoding-sudoku", "packages/sudoku/skills/decoding-sudoku"],
  ["rendering-sudoku", "packages/sudoku/skills/rendering-sudoku"],
  ["resolve-sudoku", "packages/sudoku/skills/resolve-sudoku"],
  ["solve-killer-sudoku", "packages/killer-sudoku/skills/solve-killer-sudoku"],
  ["decoding-killer-sudoku", "packages/killer-sudoku/skills/decoding-killer-sudoku"],
  ["rendering-killer-sudoku", "packages/killer-sudoku/skills/rendering-killer-sudoku"],
  ["resolve-killer-sudoku", "packages/killer-sudoku/skills/resolve-killer-sudoku"],
  ["solve-nonogram", "packages/nonogram/skills/solve-nonogram"],
  ["decoding-nonogram", "packages/nonogram/skills/decoding-nonogram"],
  ["rendering-nonogram", "packages/nonogram/skills/rendering-nonogram"],
  ["resolve-nonogram", "packages/nonogram/skills/resolve-nonogram"],
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const claudeLink = join(repoRoot, ".claude/skills");
assert(lstatSync(claudeLink).isSymbolicLink(), ".claude/skills 必须是相对符号链接");
assert(
  realpathSync(claudeLink) === realpathSync(join(repoRoot, ".agents/skills")),
  ".claude/skills 必须指向 .agents/skills",
);

for (const [name, expectedRelative] of skills) {
  const discoveryPath = join(repoRoot, ".agents/skills", name);
  const expectedPath = join(repoRoot, expectedRelative);
  assert(lstatSync(discoveryPath).isSymbolicLink(), `${name} 必须通过符号链接发现`);
  assert(realpathSync(discoveryPath) === realpathSync(expectedPath), `${name} 链接目标错误`);

  const skillText = readFileSync(join(discoveryPath, "SKILL.md"), "utf8");
  assert(skillText.startsWith("---\n"), `${name}/SKILL.md 缺少 frontmatter`);
  assert(skillText.includes(`\nname: ${name}\n`), `${name}/SKILL.md 的 name 不匹配`);
}

console.log(`skills discovery OK: ${skills.length} 个项目级 skills`);
