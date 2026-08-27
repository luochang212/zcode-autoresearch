// MCP integration tests: spawn the real server and drive the tools over JSON-RPC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVER = join(ROOT, "mcp", "server.mjs");

function tempRepo() {
  const cwd = mkdtempSync(join(tmpdir(), "ar-mcp-"));
  execFileSync("git", ["init", "-q"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@t"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "t"], { cwd, stdio: "ignore" });
  mkdirSync(join(cwd, ".auto"), { recursive: true });
  writeFileSync(join(cwd, ".auto", "measure.sh"), '#!/usr/bin/env bash\necho "METRIC time_ms=42"\n');
  writeFileSync(join(cwd, "code.js"), "v1\n");
  execFileSync("git", ["add", "-A"], { cwd, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "init"], { cwd, stdio: "ignore" });
  return cwd;
}

function connect(cwd) {
  const proc = spawn("node", [SERVER], { cwd });
  let id = 0;
  let buf = "";
  const pending = new Map();
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      try {
        const m = JSON.parse(line);
        if (m.id != null && pending.has(m.id)) {
          pending.get(m.id)(m);
          pending.delete(m.id);
        }
      } catch {}
    }
  });
  const call = (method, params) =>
    new Promise((res) => {
      const i = id++;
      pending.set(i, res);
      proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  const tool = async (name, args) => {
    const m = await call("tools/call", { name, arguments: args });
    return JSON.parse(m.result.content[0].text);
  };
  const close = () => proc.kill();
  return { call, tool, close };
}

async function withServer(cwd, fn) {
  const s = connect(cwd);
  await s.call("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
  try {
    return await fn(s);
  } finally {
    s.close();
  }
}

test("iteration hooks: before runs before benchmark, after after logging, steer returned", async () => {
  const cwd = tempRepo();
  mkdirSync(join(cwd, ".auto", "hooks"), { recursive: true });
  writeFileSync(join(cwd, ".auto", "hooks", "before.sh"), '#!/usr/bin/env bash\ncat > /dev/null\necho "BEFORE-STEER"\n');
  writeFileSync(join(cwd, ".auto", "hooks", "after.sh"), '#!/usr/bin/env bash\necho "AFTER-STEER"\n');
  execFileSync("chmod", ["+x", join(cwd, ".auto", "hooks", "before.sh"), join(cwd, ".auto", "hooks", "after.sh")]);

  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    const run = await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    assert.equal(run.before_steer, "BEFORE-STEER");
    assert.equal(run.metric, 42);
    const log = await s.tool("log_experiment", { status: "keep", metric: 42, description: "x" });
    assert.equal(log.after_steer, "AFTER-STEER");
  });
});

test("iteration hooks: failing or missing hook does not block the loop", async () => {
  const cwd = tempRepo();
  mkdirSync(join(cwd, ".auto", "hooks"), { recursive: true });
  writeFileSync(join(cwd, ".auto", "hooks", "before.sh"), '#!/usr/bin/env bash\nexit 1\n');
  execFileSync("chmod", ["+x", join(cwd, ".auto", "hooks", "before.sh")]);

  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    const run = await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    assert.equal(run.ok, true);
    assert.equal(run.metric, 42);
    assert.equal(run.before_steer, undefined); // failed hook => no steer
  });
});

test("clear_experiments deletes ledger but keeps other .auto files", async () => {
  const cwd = tempRepo();
  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    await s.tool("log_experiment", { status: "keep", metric: 42, description: "x" });
    assert.ok(existsSync(join(cwd, ".auto", "log.jsonl")));
    const res = await s.tool("clear_experiments", {});
    assert.equal(res.ok, true);
    assert.ok(!existsSync(join(cwd, ".auto", "log.jsonl")));
    assert.ok(existsSync(join(cwd, ".auto", "measure.sh")), "measure.sh kept");
  });
});

test("consecutive failure threshold is honored in next_action_hint", async () => {
  const cwd = tempRepo();
  writeFileSync(join(cwd, ".auto", "config.json"), JSON.stringify({ consecutiveFailures: 1 }));
  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    const log = await s.tool("log_experiment", { status: "discard", metric: 42, description: "worse" });
    assert.match(log.next_action_hint, /consecutive failures reached/);
  });
});

test("benchmark drift: changing measure.sh after init warns on next run", async () => {
  const cwd = tempRepo();
  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    // no drift yet
    const r1 = await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    assert.equal(r1.benchmark_drift, undefined);
    // modify the frozen benchmark
    writeFileSync(join(cwd, ".auto", "measure.sh"), '#!/usr/bin/env bash\necho "METRIC time_ms=1"\n');
    const r2 = await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    assert.equal(r2.benchmark_drift, true);
    assert.match(r2.warning, /no longer comparable/);
  });
});

test("secondary metric constraints: keep rejected when a constraint is exceeded", async () => {
  const cwd = tempRepo();
  // measure.sh emits a primary + a secondary metric
  writeFileSync(join(cwd, ".auto", "measure.sh"), '#!/usr/bin/env bash\necho "METRIC time_ms=42"\necho "METRIC memory_mb=100"\n');
  await withServer(cwd, async (s) => {
    await s.tool("init_experiment", { name: "t", metric_name: "time_ms" });
    // first run establishes the ledger (baseline; no constraints yet)
    const r1 = await s.tool("run_experiment", { command: "bash .auto/measure.sh" });
    assert.equal(r1.metrics.memory_mb, 100);
    await s.tool("log_experiment", { status: "keep", metric: 42, description: "baseline", metrics: { memory_mb: 100 } });
    // constraint within band → keep passes (vs baseline memory_mb=100)
    const ok = await s.tool("log_experiment", {
      status: "keep", metric: 41, description: "within band",
      metrics: { memory_mb: 100 },
      constraints: [{ name: "memory_mb", maxPct: 105 }],
    });
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.constraints, [{ name: "memory_mb", status: "pass", value: 100, limit: 105 }]);
    // now a keep that blows the constraint → rejected
    const bad = await s.tool("log_experiment", {
      status: "keep", metric: 40, description: "faster but heavier",
      metrics: { memory_mb: 110 },
      constraints: [{ name: "memory_mb", maxPct: 105 }],
    });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /constraint violation: secondary metric memory_mb=110/);
    // no constraints → no secondary check
    const free = await s.tool("log_experiment", {
      status: "keep", metric: 39, description: "no constraints declared",
      metrics: { memory_mb: 999 },
    });
    assert.equal(free.ok, true);
    assert.equal(free.constraints, undefined);
  });
});
