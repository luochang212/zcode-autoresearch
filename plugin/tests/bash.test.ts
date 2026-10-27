// Shell quoting for values interpolated into `bash -c` command strings.
// Round-trips through a real bash so the assertion is shell semantics, not a
// string comparison against our own escaping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolveBash, quoteShellArg } from "../mcp/lib/bash.ts";

function expand(value: string): string {
  return execFileSync(
    resolveBash(),
    ["-c", `printf '%s' ${quoteShellArg(value)}`],
    { encoding: "utf8" },
  );
}

test("quoteShellArg round-trips paths literally through bash -c", () => {
  for (const value of [
    "/tmp/plain/.auto/checks.sh",
    "project/.auto/checks.sh",
    "/tmp/with space/.auto/checks.sh",
    "/tmp/Alex's project/.auto/checks.sh",
    "/tmp/$HOME/`id`/.auto/checks.sh",
    '/tmp/double"quote/.auto/checks.sh',
    "/tmp/x'; echo pwned; '/.auto/checks.sh",
  ]) {
    assert.equal(expand(value), value);
  }
});
