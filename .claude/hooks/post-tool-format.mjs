#!/usr/bin/env node
// PostToolUse formatter. Runs prettier on the single edited/written file only.
// Never runs a full-project format or lint — that belongs in explicit commands / CI.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, resolve } from "node:path";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!filePath) process.exit(0);

const ext = extname(filePath).toLowerCase();
const supported = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
]);
if (!supported.has(ext)) process.exit(0);

const abs = resolve(filePath);
if (!existsSync(abs)) process.exit(0);

// Only run if prettier is installed locally.
const prettierBin =
  process.platform === "win32"
    ? resolve("node_modules/.bin/prettier.cmd")
    : resolve("node_modules/.bin/prettier");
if (!existsSync(prettierBin)) process.exit(0);

const res = spawnSync(prettierBin, ["--write", "--log-level", "warn", abs], {
  stdio: "ignore",
  shell: false,
});
// Never fail the tool call because of formatting.
process.exit(res.status === 0 ? 0 : 0);
