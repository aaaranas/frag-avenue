#!/usr/bin/env node
// PreToolUse safety hook. Blocks obviously destructive shell invocations.
// Reads a JSON payload on stdin: { tool_name, tool_input: { command } }.
// Exit 2 with a stderr reason to block; exit 0 to allow.

import { readFileSync } from "node:fs";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const tool = payload?.tool_name;
if (tool !== "Bash" && tool !== "PowerShell") process.exit(0);

const command = String(payload?.tool_input?.command ?? "");
if (!command) process.exit(0);

// Normalise for matching: collapse whitespace, lowercase for keyword checks.
const c = command.replace(/\s+/g, " ").trim();
const lower = c.toLowerCase();

const denies = [
  {
    re: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i,
    why: "Recursive force delete (rm -rf) is blocked. Delete specific files instead.",
  },
  {
    re: /\bremove-item\b[^|;]*-recurse[^|;]*-force/i,
    why: "Remove-Item -Recurse -Force is blocked. Delete specific files instead.",
  },
  {
    re: /\bgit\s+reset\s+--hard\b/i,
    why: "git reset --hard is blocked (destroys working tree). Use git stash or targeted checkout.",
  },
  {
    re: /\bgit\s+clean\s+-[a-z]*f[a-z]*d?\b/i,
    why: "git clean -fd is blocked (destroys untracked work).",
  },
  {
    re: /\bgit\s+push\b[^|;]*(--force\b|--force-with-lease\b|-f\b)/i,
    why: "Force push is blocked. Ask the user before rewriting remote history.",
  },
  { re: /\bgit\s+branch\s+-D\b/i, why: "git branch -D is blocked. Ask before deleting branches." },
  {
    re: /\bprisma\s+migrate\s+reset\b/i,
    why: "prisma migrate reset is blocked (drops the database).",
  },
  {
    re: /\bprisma\s+db\s+push\b[^|;]*--force-reset/i,
    why: "prisma db push --force-reset is blocked.",
  },
  { re: /\bdrop\s+database\b/i, why: "DROP DATABASE is blocked." },
  { re: /\bdrop\s+schema\b/i, why: "DROP SCHEMA is blocked." },
  { re: /\btruncate\s+table\b/i, why: "TRUNCATE TABLE is blocked. Delete specific rows or ask." },
  {
    re: /\bdocker\s+compose\s+down\b[^|;]*(-v\b|--volumes\b)/i,
    why: "docker compose down -v is blocked (wipes Postgres volume).",
  },
  {
    re: /\bdocker\s+volume\s+rm\b/i,
    why: "docker volume rm is blocked (may wipe local database).",
  },
];

for (const { re, why } of denies) {
  if (re.test(lower)) {
    process.stderr.write(`Blocked by pre-tool-safety hook: ${why}\n`);
    process.exit(2);
  }
}

process.exit(0);
