// run-node.sh resolver tests: stub node binaries with controlled versions,
// sandboxed PATH/NVM_DIR/AUTORESEARCH_NODE_BIN per branch, plus one real-node
// integration pass. These protect the launch path shared by the MCP server
// and every hook (not exercised by headless CLI).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RUN_NODE = join(ROOT, "scripts", "run-node.sh");

// run-node.sh needs a POSIX shell; the launch contract is unix-only for now.
const skipWin = process.platform === "win32" ? "needs a POSIX shell" : false;

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `ar-run-node-${prefix}-`));
}

// A fake node: reports the given version to the `-p` probe, echoes its
// arguments otherwise (so exec passthrough is observable on stdout).
function stubNode(dir: string, version: string): string {
  const bin = join(dir, "node");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    bin,
    `#!/bin/sh\nif [ "\${1:-}" = "-p" ]; then echo "${version}"; exit 0; fi\nfor arg in "$@"; do echo "$arg"; done\n`,
  );
  chmodSync(bin, 0o755);
  return bin;
}

function runNode(
  args: string[],
  env: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("sh", [RUN_NODE, ...args], {
      input: "",
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? -1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
    };
  }
}

test(
  "override wins and passes arguments through exec",
  { skip: skipWin },
  () => {
    const dir = tempDir("override");
    const bin = stubNode(dir, "26.1.0");
    const resolved = runNode(["--resolve"], { AUTORESEARCH_NODE_BIN: bin });
    assert.equal(resolved.status, 0);
    assert.match(
      resolved.stdout,
      new RegExp(`^node=${bin.replace(/\//g, "\\/")}$`, "m"),
    );
    assert.match(resolved.stdout, /^version=26\.1\.0$/m);

    // The stub echoes its arguments and nothing else, so an exact stdout match
    // also proves the wrapper itself writes no stdout before exec.
    const exec = runNode(["alpha", "beta"], { AUTORESEARCH_NODE_BIN: bin });
    assert.equal(exec.status, 0);
    assert.equal(exec.stdout, "alpha\nbeta\n");
  },
);

test(
  "override is authoritative: missing binary is a hard error",
  { skip: skipWin },
  () => {
    const missing = join(tempDir("missing"), "node");
    const out = runNode(["--resolve"], { AUTORESEARCH_NODE_BIN: missing });
    assert.equal(out.status, 127);
    assert.match(out.stderr, /is not an executable file/);
  },
);

test(
  "override is authoritative: too old is a hard error, no fallback",
  { skip: skipWin },
  () => {
    const dir = tempDir("old-override");
    const bin = stubNode(dir, "18.19.0");
    const out = runNode(["--resolve"], { AUTORESEARCH_NODE_BIN: bin });
    assert.equal(out.status, 127);
    assert.match(out.stderr, /Node >= 24 is required/);
    assert.match(out.stderr, /18\.19\.0/);
  },
);

test("PATH node is used when suitable", { skip: skipWin }, () => {
  const pathDir = tempDir("path-dir");
  const bin = stubNode(pathDir, "24.3.0");
  const resolved = runNode(["--resolve"], {
    PATH: `${pathDir}:/bin`,
    NVM_DIR: tempDir("empty-nvm"),
    AUTORESEARCH_NODE_BIN: "",
  });
  assert.equal(resolved.status, 0);
  assert.match(
    resolved.stdout,
    new RegExp(`^node=${bin.replace(/\//g, "\\/")}$`, "m"),
  );
});

test(
  "too-old PATH node falls through to a suitable nvm node",
  { skip: skipWin },
  () => {
    const pathDir = tempDir("old-path");
    stubNode(pathDir, "18.0.0");
    const nvmDir = tempDir("nvm");
    const bin = stubNode(
      join(nvmDir, "versions", "node", "v24.5.0", "bin"),
      "24.5.0",
    );
    const resolved = runNode(["--resolve"], {
      PATH: `${pathDir}:/bin`,
      NVM_DIR: nvmDir,
      AUTORESEARCH_NODE_BIN: "",
    });
    assert.equal(resolved.status, 0);
    assert.match(
      resolved.stdout,
      new RegExp(`^node=${bin.replace(/\//g, "\\/")}$`, "m"),
    );
  },
);

const hostFallbackNode =
  existsSync("/opt/homebrew/bin/node") || existsSync("/usr/local/bin/node");

// When the host ships node in the unconditional fallback locations the search
// space cannot be emptied from the test sandbox; the exhaust branch then only
// runs where those paths are absent (e.g. the Linux CI runner).
test(
  "nothing found anywhere exits 127 with a remedy on stderr",
  { skip: skipWin || hostFallbackNode },
  () => {
    const out = runNode(["--resolve"], {
      PATH: `${tempDir("empty-path")}:/bin`,
      NVM_DIR: tempDir("empty-nvm"),
      AUTORESEARCH_NODE_BIN: "",
    });
    assert.equal(out.status, 127);
    assert.match(out.stderr, /no Node >= 24 found/);
    assert.match(out.stderr, /AUTORESEARCH_NODE_BIN/);
  },
);

test("real node: exit code passes through exec", { skip: skipWin }, () => {
  const out = runNode(["-e", "process.exit(7)"]);
  assert.equal(out.status, 7);
});

test(
  "real node: --resolve reports the resolved binary and version",
  { skip: skipWin },
  () => {
    const out = runNode(["--resolve"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /^node=.+\nversion=\d+\.\d+\.\d+\n$/);
  },
);
