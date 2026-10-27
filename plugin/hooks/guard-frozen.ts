#!/usr/bin/env node
// PreToolUse hook: deny writes to frozen session files — the benchmark
// scripts (.auto/measure.sh, .auto/checks.sh), the deep-goal record
// (.auto/goal.md) and the user-agreed scope boundary (.auto/scope.md).
// The matcher limits this to Write|Edit|ApplyPatch; path filtering happens
// here, per zcode docs.
import { resolve, relative } from "node:path";
import { existsSync } from "node:fs";
import { resolveWorkCwd } from "../mcp/lib/paths.ts";
import { FROZEN_FILES, FROZEN_REASONS, frozenKey } from "../mcp/lib/frozen.ts";

interface PreToolUseInput {
  tool_input?: { file_path?: string; path?: string };
  toolInput?: { file_path?: string; path?: string };
}

const cwd = resolveWorkCwd(process.argv[2] || process.cwd());

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin as AsyncIterable<string>) raw += chunk;

let input: PreToolUseInput = {};
try {
  input = raw.trim() ? (JSON.parse(raw) as PreToolUseInput) : {};
} catch {
  process.exit(0); // fail open
}

const ti = input.tool_input || input.toolInput || {};
const fp = ti.file_path || ti.path || "";
if (!fp) process.exit(0);

let rel: string;
try {
  rel = frozenKey(relative(cwd, resolve(cwd, fp)));
} catch {
  process.exit(0);
}
if (!FROZEN_FILES.has(rel)) process.exit(0);
// Frozen means "immutable once recorded", not "never written": setup creates
// these files (goal/scope verbatim from the user) before any segment exists.
// What the guard blocks is rewriting a record already on disk.
if (!existsSync(resolve(cwd, rel))) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `[autoresearch] ${rel} is frozen: ${
        FROZEN_REASONS[rel] ?? "frozen session file."
      }`,
    },
  }),
);
