#!/usr/bin/env node
// PreToolUse hook: deny writes to frozen session files — the benchmark
// scripts (.auto/measure.sh, .auto/checks.sh) and the deep-goal record
// (.auto/goal.md). The matcher limits this to Write|Edit|ApplyPatch; path
// filtering happens here, per zcode docs.
import { resolve, relative } from "node:path";
import { resolveWorkCwd } from "../mcp/lib/paths.ts";

interface PreToolUseInput {
  tool_input?: { file_path?: string; path?: string };
  toolInput?: { file_path?: string; path?: string };
}

const cwd = resolveWorkCwd(process.argv[2] || process.cwd());
const FROZEN = new Set([
  ".auto/measure.sh",
  ".auto/checks.sh",
  ".auto/goal.md",
]);
const FROZEN_REASON: Record<string, string> = {
  ".auto/measure.sh":
    "the benchmark metric must not change during the loop. If you really need a new metric, start over: init_experiment with a new target.",
  ".auto/checks.sh": "the correctness gate must not change during the loop.",
  ".auto/goal.md":
    "the deep goal is the root the loop serves; it was recorded verbatim from the user and cannot be rewritten. Surface-goal wording is revisable via the harness-edit step's editable surfaces, or a new segment via init_experiment.",
};

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
  rel = relative(cwd, resolve(cwd, fp));
} catch {
  process.exit(0);
}
if (!FROZEN.has(rel)) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `[autoresearch] ${rel} is frozen: ${
        FROZEN_REASON[rel] ?? "frozen session file."
      }`,
    },
  }),
);
