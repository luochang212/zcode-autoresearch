// Windows regression: runCommand's timeout must actually kill the tree.
// Evidence (2026-10-26, Windows 11 / Node 24): process.kill(-pid, SIGTERM)
// fails with ESRCH on win32, the empty catch swallows it, and the sleeping
// child survives — the tool call then hangs until the benchmark ends
// naturally. Kill path: taskkill /T /F via lib/bash.ts killTree; spawn
// target: lib/bash.ts resolveBash (System32's WSL launcher excluded).
// The timeout assertion is cross-platform: POSIX group-kill already
// satisfies it, so CI (ubuntu) keeps covering the POSIX path too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBash, killTree } from "../mcp/lib/bash.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVER = join(ROOT, "mcp", "server.ts");

test(
  "resolveBash: posix shortcut",
  { skip: process.platform === "win32" },
  () => {
    assert.equal(resolveBash(), "bash");
  },
);

test(
  "resolveBash: excludes System32/WindowsApps WSL launcher",
  { skip: process.platform !== "win32" },
  () => {
    const bash = resolveBash();
    assert.match(bash, /bash\.exe$/i);
    assert.doesNotMatch(bash, /\\Windows\\(System32|SysWOW64|WindowsApps)\\/i);
  },
);

test(
  "killTree reports whether the tree was alive",
  { skip: process.platform !== "win32" },
  () => {
    const sleeper = spawn("ping", ["-n", "30", "127.0.0.1"], {
      stdio: "ignore",
    });
    assert.equal(killTree(sleeper.pid!), true, "live tree must be killable");
    assert.equal(killTree(sleeper.pid!), false, "dead tree must report gone");
  },
);

// End-to-end on the real server: a hanging benchmark + 2s timeout must come
// back killed well before the benchmark's own 60s elapse. Before the fix
// this test went red on Windows (close only fired at ~60s, ESRCH swallowed).
test("run_experiment timeout kills the benchmark tree promptly", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "ar-kill-"));
  execFileSync("git", ["init", "-q"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@t"], {
    cwd,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "t"], { cwd, stdio: "ignore" });
  mkdirSync(join(cwd, ".auto"), { recursive: true });
  writeFileSync(
    join(cwd, ".auto", "measure.sh"),
    "#!/usr/bin/env bash\necho 'METRIC m=1'\nsleep 60\n",
  );
  writeFileSync(join(cwd, "code.js"), "v1\n");
  execFileSync("git", ["add", "-A"], { cwd, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "init"], { cwd, stdio: "ignore" });

  const proc = spawn(process.execPath, [SERVER], {
    cwd,
    env: { ...process.env, AR_BENCHMARK_TIMEOUT_MS: "2000" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stdout.setEncoding("utf8");
  let id = 0;
  let buf = "";
  const pending = new Map<number, (msg: Record<string, unknown>) => void>();
  proc.stdout.on("data", (d: string) => {
    buf += d;
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      try {
        const m = JSON.parse(line) as { id?: number; result?: unknown };
        if (m.id != null && pending.has(m.id)) {
          const cb = pending.get(m.id)!;
          pending.delete(m.id);
          cb(m);
        }
      } catch {}
    }
  });
  const tool = (name: string, args: Record<string, unknown>) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const i = id++;
      pending.set(i, resolve);
      proc.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: i,
          method: "tools/call",
          params: { name, arguments: args },
        }) + "\n",
      );
      setTimeout(
        () => reject(new Error("tool call hung (kill path broken)")),
        30_000,
      );
    });

  try {
    const started = Date.now();
    await tool("init_experiment", {
      name: "kill-regression",
      metric_name: "m",
      direction: "lower",
    });
    await tool("run_experiment", { command: "bash .auto/measure.sh" });
    const elapsed = Date.now() - started;
    // measure.sh sleeps 60s; a working kill path returns in seconds.
    assert.ok(
      elapsed < 20_000,
      `init+run took ${elapsed}ms — timeout kill is not working`,
    );
  } finally {
    proc.kill();
    // Windows: the killed server may still hold the cwd for a moment.
    await new Promise((r) => setTimeout(r, 500));
    try {
      rmSync(cwd, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup; temp dir is disposable */
    }
  }
});
