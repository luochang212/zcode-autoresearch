// Windows process semantics for the two spawn sites in server.ts.
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

let cachedBash: string | null = null;

// System32/SysWOW64 hosts the WSL launcher, WindowsApps a store stub —
// neither accepts Git-Bash-style scripts with predictable path semantics.
function isWslOrStub(path: string): boolean {
  return /\\Windows\\(System32|SysWOW64|WindowsApps)\\/i.test(path);
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
      "no usable bash.exe on PATH (install Git for Windows; the WSL launcher in System32 is excluded)",
    );
  }
  cachedBash = resolved;
  return resolved;
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
