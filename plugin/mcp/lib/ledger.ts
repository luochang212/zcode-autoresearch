// `.auto/` ledger: append-only JSONL source of truth + segment rebuild.
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { computeConfidence, isBetter, detectPlateau } from "./experiment.ts";
import type {
  Confidence,
  LedgerConfig,
  LedgerEntry,
  LedgerRun,
  SessionConfig,
  SessionState,
} from "./types.ts";

export const AUTO_DIR = ".auto";
export const LOG_FILE = join(AUTO_DIR, "log.jsonl");
export const PROMPT_FILE = join(AUTO_DIR, "prompt.md");
export const MEASURE_FILE = join(AUTO_DIR, "measure.sh");
export const CHECKS_FILE = join(AUTO_DIR, "checks.sh");
export const CONFIG_FILE = join(AUTO_DIR, "config.json");
export const IDEAS_FILE = join(AUTO_DIR, "ideas.md");
export const DASHBOARD_FILE = "autoresearch-dashboard.html";

export function autoPaths(cwd: string): {
  root: string;
  log: string;
  prompt: string;
  measure: string;
  checks: string;
  config: string;
  ideas: string;
  dashboard: string;
} {
  return {
    root: join(cwd, AUTO_DIR),
    log: join(cwd, LOG_FILE),
    prompt: join(cwd, PROMPT_FILE),
    measure: join(cwd, MEASURE_FILE),
    checks: join(cwd, CHECKS_FILE),
    config: join(cwd, CONFIG_FILE),
    ideas: join(cwd, IDEAS_FILE),
    dashboard: join(cwd, DASHBOARD_FILE),
  };
}

export function ensureAutoDir(cwd: string): void {
  mkdirSync(join(cwd, AUTO_DIR), { recursive: true });
}

export function appendLedgerEntry(cwd: string, entry: LedgerEntry): void {
  ensureAutoDir(cwd);
  appendFileSync(join(cwd, LOG_FILE), JSON.stringify(entry) + "\n", "utf8");
}

export function readLedger(cwd: string): LedgerEntry[] {
  const log = join(cwd, LOG_FILE);
  if (!existsSync(log)) return [];
  return readFileSync(log, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l) as LedgerEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is LedgerEntry => e != null);
}

/**
 * Rebuild the session state from the ledger file.
 * - segment advances on every `config` entry.
 * - runs after a config entry belong to that config's segment.
 * - baseline = first run's primary metric in the segment.
 * - best = best kept run's metric in the segment (direction-aware).
 */
export function rebuildState(
  cwd: string,
  options: {
    maxIterations?: number;
    consecutiveFailures?: number;
    plateauWindow?: number;
    plateauMinImprovement?: number;
  } = {},
): SessionState {
  const entries = readLedger(cwd);
  const state: SessionState = {
    config: null,
    segment: 0,
    runs: [],
    baseline: null,
    best: null,
    lastRunChecksFailed: false,
    lastRun: null,
    totalExperiments: 0,
    consecutiveFailures: 0,
    confidence: null,
    plateau: false,
    failureThreshold: 3,
  };
  for (const e of entries) {
    if (e.type === "config") {
      state.config = e;
      state.segment = e.segment ?? state.segment + 1;
      state.runs = [];
      state.baseline = null;
      state.best = null;
      // A config row is a segment boundary: failure streaks, the previous
      // run's hook payload and the checks marker must not leak into the new
      // segment.
      state.consecutiveFailures = 0;
      state.lastRun = null;
      state.lastRunChecksFailed = false;
    } else if (e.type === "run") {
      const run: LedgerRun = {
        ...e,
        segment: state.segment,
        config: state.config,
      };
      state.runs.push(run);
      state.totalExperiments += 1;
      if (state.baseline == null && run.metric != null)
        state.baseline = run.metric;
      if (run.status === "keep" && run.metric != null) {
        const dir = state.config?.direction ?? "lower";
        if (state.best == null || isBetter(run.metric, state.best, dir))
          state.best = run.metric;
      }
      // Consecutive-failure streak (guardrails spec): only real failures
      // count; keep and noop both break the chain.
      if (run.status === "keep" || run.status === "noop")
        state.consecutiveFailures = 0;
      else state.consecutiveFailures += 1;
      // Per-run overwrite (no one-way latch): the flag always describes the
      // latest ledger run. Status alone marks checks failure; the explicit
      // field covers hand-written/legacy rows.
      state.lastRunChecksFailed =
        run.checksFailed === true || run.status === "checks_failed";
      state.lastRun = run;
    }
  }
  // Confidence over the current segment's values.
  const values = state.runs
    .map((r) => r.metric)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (state.config && values.length > 0) {
    state.confidence = computeConfidence({
      values,
      baseline: state.baseline,
      best: state.best,
    });
  } else {
    state.confidence = null;
  }
  if (options.maxIterations != null)
    state.maxIterations = options.maxIterations;
  state.failureThreshold = options.consecutiveFailures ?? 3;
  // Plateau over the current segment's recent runs.
  if (state.config && state.runs.length >= (options.plateauWindow ?? 5)) {
    state.plateau = detectPlateau(state.runs, {
      window: options.plateauWindow ?? 5,
      minImprovement: options.plateauMinImprovement ?? 0.01,
      direction: state.config.direction ?? "lower",
    });
  } else {
    state.plateau = false;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Full-session history (archive dashboard only; loop control stays on
// rebuildState's segment-scoped view)
// ---------------------------------------------------------------------------

/**
 * Flat whole-ledger view: the session reads as one run sequence. A config row
 * never splits the display — it only refreshes the title/metric/direction
 *口径 (the latest config wins).
 */
export interface SessionHistory {
  config: LedgerConfig | null;
  runs: LedgerRun[];
  totalRuns: number;
  kept: number;
  firstMetric: number | null;
  bestMetric: number | null;
  lastRunAt: string | null;
  confidence: Confidence | null;
}

/**
 * Pure view over the whole ledger, flattened. Runs keep their ledger order
 * regardless of config rows; the latest config row supplies the display
 *口径 (name, metric, direction, unit). A run before any config row is
 * rendered with the neutral fallbacks (hand-written ledgers).
 */
export function rebuildHistory(entries: LedgerEntry[]): SessionHistory {
  const runs: LedgerRun[] = [];
  let config: LedgerConfig | null = null;
  let firstMetric: number | null = null;
  let lastRunAt: string | null = null;
  for (const e of entries) {
    if (e.type === "config") {
      config = e;
    } else if (e.type === "run") {
      runs.push(e);
      if (firstMetric == null && e.metric != null && Number.isFinite(e.metric))
        firstMetric = e.metric;
      lastRunAt = e.timestamp ?? null;
    }
  }
  // Best over keep runs, direction-aware by the latest config.
  const dir = config?.direction ?? "lower";
  let bestMetric: number | null = null;
  for (const r of runs) {
    if (r.status !== "keep" || r.metric == null || !Number.isFinite(r.metric))
      continue;
    if (bestMetric == null || isBetter(r.metric, bestMetric, dir))
      bestMetric = r.metric;
  }
  // Confidence over all measured values against the global baseline/best.
  const values = runs
    .map((r) => r.metric)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const confidence =
    config && values.length > 0
      ? computeConfidence({
          values,
          baseline: firstMetric,
          best: bestMetric,
        })
      : null;
  return {
    config,
    runs,
    totalRuns: runs.length,
    kept: runs.filter((r) => r.status === "keep").length,
    firstMetric,
    bestMetric,
    lastRunAt,
    confidence,
  };
}

/**
 * Delta of a run's metric against the segment baseline, direction-aware:
 * positive = improvement (lower metric + baseline was higher, or higher metric).
 */
export function deltaFor(
  state: SessionState,
  metric: number | null | undefined,
): number | null {
  if (metric == null || state.baseline == null) return null;
  const dir = state.config?.direction ?? "lower";
  const raw = metric - state.baseline;
  return dir === "higher" ? raw : -raw;
}

export function readSessionConfig(cwd: string): SessionConfig {
  const cfg = join(cwd, CONFIG_FILE);
  if (!existsSync(cfg)) return {};
  try {
    return JSON.parse(readFileSync(cfg, "utf8")) as SessionConfig;
  } catch {
    return {};
  }
}

export function writeDashboard(cwd: string, html: string): string {
  writeFileSync(join(cwd, DASHBOARD_FILE), html, "utf8");
  return join(cwd, DASHBOARD_FILE);
}
