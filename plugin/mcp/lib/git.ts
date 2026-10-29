// Git operations for the experiment loop (ADR-2 semantics):
// keep → commit with `experiment:` prefix + structured Result JSON.
// discard/crash/checks_failed → drop working-tree changes, exempt session state
// (`.auto/` and the generated dashboard).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { DASHBOARD_FILE } from "./ledger.ts";

// Standard install locations a slim GUI PATH can hide. On macOS the
// launchd-default PATH still contains /usr/bin, whose git (the CLT shim)
// covers most GUI launches — but homebrew-only machines without the CLT are
// left with git at /opt/homebrew/bin, invisible to a GUI-launched server.
// On Windows a GUI PATH can miss Git for Windows entirely; its installer
// default is the cmd\git.exe shim under Program Files.
const GIT_CANDIDATES =
  process.platform === "win32"
    ? [
        "C:\\Program Files\\Git\\cmd\\git.exe",
        "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
      ]
    : [
        "/opt/homebrew/bin/git",
        "/usr/local/bin/git",
        "/usr/bin/git",
        "/bin/git",
      ];

function probeGit(path: string): boolean {
  try {
    execFileSync(path, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

let cachedGit: string | null = null;

/**
 * Resolve the git binary: PATH first (one probe, then cached), falling back
 * to the standard install locations. Injected candidates (tests) bypass the
 * PATH probe and the cache. Throws with a loud message when nothing
 * resolves — every spawn in this module goes through here, so a missing git
 * surfaces as one clear error instead of per-call ENOENT.
 */
export function resolveGit(candidates?: string[]): string {
  if (candidates === undefined) {
    if (cachedGit) return cachedGit;
    if (probeGit("git")) {
      cachedGit = "git";
      return "git";
    }
    for (const path of GIT_CANDIDATES) {
      if (existsSync(path) && probeGit(path)) {
        cachedGit = path;
        return path;
      }
    }
  } else {
    for (const path of candidates) {
      if (probeGit(path)) return path;
    }
  }
  throw new Error(
    "no usable git on PATH or standard install locations; install git or make sure it is on the server's PATH",
  );
}

export function git(cwd: string, args: string[]): string {
  return execFileSync(resolveGit(), args, { cwd, encoding: "utf8" }).trim();
}

export function isGitRepo(cwd: string): boolean {
  // resolveGit() throws when no git exists at all — that is a different
  // failure from "this directory is not a repository" and callers must be
  // able to tell them apart. Only the rev-parse failure maps to false.
  const gitBin = resolveGit();
  try {
    execFileSync(gitBin, ["rev-parse", "--git-dir"], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Whether the repository has at least one commit (HEAD resolves). */
export function hasCommit(cwd: string): boolean {
  try {
    execFileSync(resolveGit(), ["rev-parse", "--verify", "HEAD"], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether the working tree has real changes (session state excluded). Ledger,
 * config and dashboard writes must not count: e.g. the crash-unresolved gate
 * would otherwise block forever right after logging the crash itself.
 */
export function isDirty(cwd: string): boolean {
  try {
    return (
      git(cwd, [
        "status",
        "--porcelain",
        "--",
        ".",
        ":(exclude).auto",
        `:(exclude)${DASHBOARD_FILE}`,
      ]).length > 0
    );
  } catch {
    return false;
  }
}

export function shortHash(cwd: string): string {
  return git(cwd, ["rev-parse", "--short=7", "HEAD"]);
}

/** Short HEAD hash for the dashboard footer pin; null outside a repo / on failure. */
export function safeShortHash(cwd: string): string | null {
  try {
    return isGitRepo(cwd) ? shortHash(cwd) : null;
  } catch {
    return null;
  }
}

/**
 * Commit all tracked+untracked changes as one experiment, excluding session
 * state (`.auto/` plus the generated dashboard): a keep with only session-file
 * changes must hit the "nothing to commit" path.
 * Returns the short hash, or null when there is nothing to commit.
 */
export function commitExperiment(
  cwd: string,
  { description, result }: { description: string; result: unknown },
): string | null {
  // Excluding paths from add does not remove files already in the index.
  // Reset only session paths to HEAD; preserve their working-tree contents.
  git(cwd, ["reset", "-q", "HEAD", "--", ".auto", DASHBOARD_FILE]);
  git(cwd, [
    "add",
    "-A",
    "--",
    ".",
    ":(exclude).auto",
    `:(exclude)${DASHBOARD_FILE}`,
  ]);
  // git diff --cached --quiet exits 0 when there are no staged changes.
  const hasStaged = (() => {
    try {
      execFileSync(resolveGit(), ["diff", "--cached", "--quiet"], {
        cwd,
        stdio: "ignore",
      });
      return false;
    } catch {
      return true;
    }
  })();
  if (!hasStaged) return null;
  const body = `experiment: ${description}\n\nResult: ${JSON.stringify(result)}`;
  execFileSync(resolveGit(), ["commit", "-m", body], { cwd, stdio: "ignore" });
  return shortHash(cwd);
}

/**
 * Discard every working-tree + index change while keeping session state
 * (`.auto/` and the generated dashboard) intact. Uses `checkout HEAD` (not
 * `checkout --`) so staged-but-uncommitted experiment changes are reverted too.
 */
export function rollbackWorkingTree(cwd: string): void {
  execFileSync(
    resolveGit(),
    [
      "checkout",
      "HEAD",
      "--",
      ".",
      ":(exclude,glob)**/.auto/**",
      `:(exclude)${DASHBOARD_FILE}`,
    ],
    { cwd, stdio: "ignore" },
  );
  // Unstage anything (e.g. accidentally staged .auto content) without touching files.
  execFileSync(resolveGit(), ["reset", "-q"], { cwd, stdio: "ignore" });
  execFileSync(
    resolveGit(),
    [
      "clean",
      "-fd",
      "-e",
      ".auto",
      "-e",
      ".auto/",
      "-e",
      "autoresearch-dashboard.html",
    ],
    { cwd, stdio: "ignore" },
  );
}

export function currentBranch(cwd: string): string {
  try {
    return git(cwd, ["branch", "--show-current"]);
  } catch {
    return "";
  }
}
