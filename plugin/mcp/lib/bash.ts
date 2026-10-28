// Bash invocation details shared by the two spawn sites in server.ts:
// shell-argument quoting and Windows process semantics.
//
// Two facts make a naive `spawn("bash", …)` wrong on Windows:
// 1. Two unrelated bash.exe ship on a typical Windows box — Git Bash's
//    usr\bin\bash.exe and the WSL launcher at System32\bash.exe. Which one
//    PATH yields depends on the caller's environment (an MCP server started
//    from a GUI gets a different PATH than a terminal), so commands can
//    silently execute in WSL with different path semantics.
// 2. runCommand kills benchmarks via negative-pid process groups
//    (process.kill(-pid)); Windows has no such addressing — every call
//    fails with ESRCH and the tree survives the timeout, hanging the tool
//    call until the benchmark finishes naturally.
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

let cachedBash: string | null = null;

// WSL's launcher masquerades as bash.exe in three places: the system copies
// (System32/SysWOW64) and the store's app-execution aliases — machine-wide
// (C:\Windows\WindowsApps) and per-user (%LOCALAPPDATA%\Microsoft\WindowsApps,
// on every default Windows user PATH). None accept Git-Bash-style scripts:
// handing one a repo path fails with "/bin/bash: <path>: No such file or
// directory" (exit 127), and a benchmark command would silently run under
// WSL path semantics instead.
function isWslOrStub(path: string): boolean {
  return /(\\Windows\\(System32|SysWOW64|WindowsApps)|\\Microsoft\\WindowsApps)\\/i.test(
    path,
  );
}

export function resolveBash(): string {
  if (process.platform !== "win32") return "bash";
  if (cachedBash) return cachedBash;
  let hits: string[] = [];
  try {
    // where.exe reads the Windows PATH directly, no shell in the middle.
    hits = execFileSync("where.exe", ["bash"], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    hits = [];
  }
  const usable = hits.filter((p) => !isWslOrStub(p));
  // Git for Windows installs bash at <root>\usr\bin\bash.exe — prefer it so
  // the outer shell matches what measure.sh authors expect.
  const gitBash = usable.find((p) => /\\usr\\bin\\bash\.exe$/i.test(p));
  const resolved = gitBash ?? usable[0];
  if (!resolved) {
    throw new Error(
      "no usable bash.exe on PATH (install Git for Windows; the WSL launchers in System32 and the WindowsApps aliases are excluded)",
    );
  }
  cachedBash = resolved;
  return resolved;
}

// Single-quote a value for `bash -c`. Paths reach runCommand inside a shell
// string, where an unquoted apostrophe (e.g. "Alex's project") ends the
// quoting early and the command dies with a syntax error; the checks gate
// would read that nonzero exit as "checks failed". Inside single quotes bash
// treats every character literally, so only the quote itself needs escaping.
export function quoteShellArg(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

// Windows equivalent of killing the process group: taskkill /T walks the
// child tree, /F forces termination. Returns false when the tree was
// already gone. On POSIX callers keep their own group-kill semantics.
export function killTree(pid: number): boolean {
  if (process.platform !== "win32") return false;
  try {
    execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

// Kill the wrapper when the tree walk fails. A failed taskkill means the
// child tree outlives the timeout and the caller waits for an "exit" that may
// never come; killing the wrapper is the lesser failure.
export function killTreeOrWrapper(
  pid: number | undefined,
  killWrapper: () => void,
  treeKiller: (pid: number) => boolean = killTree,
): void {
  if (pid == null || treeKiller(pid)) return;
  try {
    killWrapper();
  } catch {
    /* already gone */
  }
}

// Git for Windows keeps its coreutils (head, grep, date…) next to bash.exe
// in <root>\usr\bin; prepend that directory to spawned shells so benchmark
// and hook scripts keep coreutils. No-op under plain PATH semantics —
// usr\bin must already be on the server's PATH for resolveBash to land
// there — kept as cheap defense for hosts that curate child environments.
export function unixToolsPathEntry(bashPath: string): string | null {
  if (process.platform !== "win32") return null;
  const dir = dirname(bashPath);
  return /usr[\\/]bin$/i.test(dir) ? dir : null;
}

export function spawnEnv(
  bashPath: string,
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const entry = unixToolsPathEntry(bashPath);
  if (!entry) return base;
  // Windows env keys are case-insensitive in spirit but plain objects are
  // not; reuse the existing key so we never emit both PATH and Path.
  const pathKey =
    Object.keys(base).find((key) => key.toLowerCase() === "path") ?? "PATH";
  return { ...base, [pathKey]: `${entry};${base[pathKey] ?? ""}` };
}
