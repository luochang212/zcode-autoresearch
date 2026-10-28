// Shell quoting for values interpolated into `bash -c` command strings.
// Round-trips through a real bash so the assertion is shell semantics, not a
// string comparison against our own escaping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  resolveBash,
  quoteShellArg,
  unixToolsPathEntry,
  spawnEnv,
} from "../mcp/lib/bash.ts";

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

test("unixToolsPathEntry only trusts the usr/bin bash layout", (t) => {
  if (process.platform !== "win32") return t.skip("win32-only behavior");
  assert.equal(
    unixToolsPathEntry("C:\\Program Files\\Git\\usr\\bin\\bash.exe"),
    "C:\\Program Files\\Git\\usr\\bin",
  );
  // Git's cmd wrapper directory and arbitrary install roots carry no coreutils.
  assert.equal(
    unixToolsPathEntry("C:\\Program Files\\Git\\cmd\\bash.exe"),
    null,
  );
  assert.equal(unixToolsPathEntry("D:\\tools\\bin\\bash.exe"), null);
});

test("spawnEnv restores coreutils a slim GUI PATH takes away", (t) => {
  if (process.platform !== "win32") return t.skip("win32-only behavior");
  const bashPath = resolveBash();
  const entry = unixToolsPathEntry(bashPath);
  assert.ok(entry, `resolved bash ${bashPath} should live under usr\\bin`);
  // Stand-in for a GUI-launched server env: System32 present, Git coreutils not.
  // Build the slim PATH under the env block's real key casing — a literal
  // `PATH:` on a `Path`-keyed env would coexist as a second, distinct key.
  const pathKey =
    Object.keys(process.env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  const slim = { ...process.env, [pathKey]: "C:\\Windows\\System32" };
  const without = execFileSync(bashPath, ["-c", "command -v head || true"], {
    encoding: "utf8",
    env: slim,
  }).trim();
  assert.equal(without, "", "premise: slim PATH cannot resolve head");
  const patched = spawnEnv(bashPath, slim);
  const patchedPath = patched[pathKey] ?? "";
  assert.ok(patchedPath.startsWith(`${entry};`));
  assert.ok(patchedPath.includes("C:\\Windows\\System32"));
  const found = execFileSync(bashPath, ["-c", "command -v head"], {
    encoding: "utf8",
    env: patched,
  }).trim();
  assert.match(found, /head(\.exe)?$/i);
});
