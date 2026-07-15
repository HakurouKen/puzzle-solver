#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
interface PackageConfig {
  root: string;
  nodeDependencies: string[];
  pythonDependency?: string;
}

interface PackageManifest {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const packages: Record<string, PackageConfig> = {
  "star-battle": {
    root: join(repoRoot, "packages/star-battle"),
    nodeDependencies: ["tsx", "sharp"],
  },
  sudoku: {
    root: join(repoRoot, "packages/sudoku"),
    nodeDependencies: ["tsx"],
  },
  "killer-sudoku": {
    root: join(repoRoot, "packages/killer-sudoku"),
    nodeDependencies: ["tsx"],
    pythonDependency: "Pillow",
  },
  nonogram: {
    root: join(repoRoot, "packages/nonogram"),
    nodeDependencies: ["tsx"],
  },
};

function fail(message: string): never {
  console.error(`运行环境初始化失败：${message}`);
  process.exit(1);
}

function run(command: string, args: string[], cwd = repoRoot, capture = false): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  const spawnError = result.error as NodeJS.ErrnoException | undefined;
  if (spawnError?.code === "ENOENT") {
    fail(`缺少系统前置命令 ${command}，请先安装后重试。`);
  }
  if (result.status !== 0) {
    if (capture && result.stderr) console.error(result.stderr.trim());
    fail(`${command} ${args.join(" ")} 执行失败（退出码 ${result.status ?? "unknown"}）。`);
  }
  return capture ? result.stdout.trim() : "";
}

function packageJson(path: string): PackageManifest {
  return JSON.parse(readFileSync(path, "utf8")) as PackageManifest;
}

function expectedNodeVersion(packageRoot: string, dependency: string): string | undefined {
  const manifest = packageJson(join(packageRoot, "package.json"));
  return manifest.dependencies?.[dependency] ?? manifest.devDependencies?.[dependency];
}

function installedNodeVersion(packageRoot: string, dependency: string): string | null {
  const manifestPath = join(packageRoot, "node_modules", dependency, "package.json");
  if (!existsSync(manifestPath)) return null;
  return packageJson(manifestPath).version ?? null;
}

function nodeRuntimeReady(config: PackageConfig): boolean {
  return config.nodeDependencies.every(
    (dependency) =>
      installedNodeVersion(config.root, dependency) === expectedNodeVersion(config.root, dependency),
  );
}

function ensureNodeRuntime(config: PackageConfig): void {
  if (nodeRuntimeReady(config)) return;
  run("pnpm", ["install", "--frozen-lockfile"]);
  if (!nodeRuntimeReady(config)) fail("pnpm 安装完成，但局部 Node 依赖版本仍不匹配。");
}

function expectedPillowVersion(packageRoot: string): string {
  const pyproject = readFileSync(join(packageRoot, "pyproject.toml"), "utf8");
  const match = pyproject.match(/Pillow==([^"\]]+)/);
  if (!match) fail("pyproject.toml 未精确锁定 Pillow 版本。");
  return match[1];
}

function installedPillowVersion(packageRoot: string): string | null {
  const python = join(packageRoot, ".venv/bin/python");
  if (!existsSync(python)) return null;
  const result = spawnSync(
    python,
    ["-c", "from importlib.metadata import version; print(version('Pillow'))"],
    { cwd: packageRoot, encoding: "utf8" },
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function ensurePythonRuntime(config: PackageConfig): void {
  if (!config.pythonDependency) return;
  const expected = expectedPillowVersion(config.root);
  if (installedPillowVersion(config.root) === expected) return;
  run("uv", ["sync", "--project", config.root, "--frozen"], config.root);
  if (installedPillowVersion(config.root) !== expected) {
    fail("uv 安装完成，但项目 .venv 中的 Pillow 版本仍不匹配。");
  }
}

const requested = process.argv.slice(2).filter((arg) => arg !== "--");
const targets = requested.length ? requested : Object.keys(packages);

for (const name of targets) {
  const config = packages[name];
  if (!config) fail(`未知 package：${name}。可选值：${Object.keys(packages).join(", ")}。`);
  ensureNodeRuntime(config);
  ensurePythonRuntime(config);
  console.log(`运行环境已就绪：${name}`);
}
