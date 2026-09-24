/**
 * Marketplace 契约一致性检查。
 *
 * 背景：上游 zai-org/zcode-plugins 的内部校验（scripts/validate.py，跑在 PR 与
 * main 的合并结果上）对市场条目做硬校验，plugin.json 与 marketplace.json 条目
 * 不一致会直接拒收——PR #1 曾因 description_i18n 漂移被拒。本文件把上游硬规则
 * 镜像为本地测试，在推送前拦截漂移：
 *
 * - 本仓库：plugin/.zcode-plugin/plugin.json ↔ 根 marketplace.json 条目必须一致
 * - 上游镜像：archived/zcode-plugins clone 存在时，对其 marketplace.json 完整跑
 *   一遍上游 validate.py 规则的 TS 移植（CI 上无此 clone，自动跳过）
 * - 树安全与铁律：无 symlink、文件数/体积上限、无 Python 字节码、无 node_modules、
 *   无 /Users/ 个人路径泄漏
 *
 * 规则以 2026-09 的上游 validate.py / build_dist.py 为基准；上游规则演进时需
 * 同步更新本文件。
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DIR = join(ROOT, "plugin");
const MANIFEST_PATH = join(PLUGIN_DIR, ".zcode-plugin", "plugin.json");
const DEV_MARKETPLACE = join(ROOT, "marketplace.json");
const FORK_CLONE = join(ROOT, "archived", "zcode-plugins");

// —— 上游 validate.py 的规则常量（逐字镜像）——
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const LOCALE = /^[a-z]{2}(-[A-Za-z0-9]+)*$/;
const CATEGORIES = new Set([
  "developer-tools",
  "productivity",
  "utilities",
  "guides",
  "finance",
  "template",
  "other",
]);
const REQUIRED_LOCALES = ["en", "zh-CN"];
const MAX_PLUGIN_FILES = 5000;
const MAX_PLUGIN_BYTES = 256 * 1024 * 1024;
const TEMPLATE_DIRS = new Set(["example-plugin"]);
// build_dist.py 会拒绝打包的字节码；本仓库零依赖铁律额外禁止 node_modules。
const FORBIDDEN_DIRS = new Set(["__pycache__", "node_modules"]);
const FORBIDDEN_SUFFIXES = new Set([".pyc", ".pyo", ".tgz"]);
// 隐私铁律：仓库内不得出现个人绝对路径。只盯 /Users/（/tmp/ 会误伤测试夹具）。
const PERSONAL_PATH = /\/Users\//;
const TEXT_SUFFIXES = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sh",
  ".html",
  ".css",
  ".yml",
  ".yaml",
  ".svg",
]);

type Json = Record<string, unknown>;

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  try {
    assert.deepStrictEqual(a, b);
    return true;
  } catch {
    return false;
  }
}

/** 上游 validate_i18n 的镜像：description_i18n 必须是对象，en/zh-CN 非空，locale 键合法。 */
function i18nProblems(label: string, value: unknown): string[] {
  const problems: string[] = [];
  if (value === undefined || value === null) {
    problems.push(`${label}: missing 'description_i18n'`);
    return problems;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    problems.push(`${label}: 'description_i18n' must be an object`);
    return problems;
  }
  const i18n = value as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const text = i18n[locale];
    if (typeof text !== "string" || !text.trim()) {
      problems.push(
        `${label}: 'description_i18n.${locale}' must be a non-empty string`,
      );
    }
  }
  for (const [locale, text] of Object.entries(i18n)) {
    if (!LOCALE.test(locale)) {
      problems.push(
        `${label}: 'description_i18n' has invalid locale key '${locale}'`,
      );
    }
    if (typeof text !== "string" || !text.trim()) {
      problems.push(
        `${label}: 'description_i18n.${locale}' must be a non-empty string`,
      );
    }
  }
  return problems;
}

/** 上游 tree_violations 的镜像：symlink 一票拒绝，文件数与体积设上限。 */
function treeProblems(root: string, label: string): string[] {
  const problems: string[] = [];
  const rootStat = lstatSync(root, { throwIfNoEntry: false });
  if (rootStat === undefined) return [`${label}: directory does not exist`];
  if (rootStat.isSymbolicLink()) return [`${label}: directory is a symlink`];
  let files = 0;
  let totalBytes = 0;
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        problems.push(
          `${label}: ${relative(root, path)} is a symlink (not allowed)`,
        );
        continue;
      }
      if (entry.isDirectory()) {
        stack.push(path);
      } else if (entry.isFile()) {
        files += 1;
        totalBytes += statSync(path).size;
      }
    }
  }
  if (files > MAX_PLUGIN_FILES) {
    problems.push(
      `${label}: ${files} files exceeds the ${MAX_PLUGIN_FILES} file limit`,
    );
  }
  if (totalBytes > MAX_PLUGIN_BYTES) {
    problems.push(`${label}: ${totalBytes} bytes exceeds the byte limit`);
  }
  return problems;
}

/** 字节码 / node_modules / tgz 等禁止进入插件包的产物。 */
function forbiddenArtifacts(root: string): string[] {
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue; // symlink 由 treeProblems 单独拦截
      if (entry.isDirectory()) {
        if (FORBIDDEN_DIRS.has(entry.name)) found.push(relative(root, path));
        else stack.push(path);
      } else if (
        entry.isFile() &&
        FORBIDDEN_SUFFIXES.has(extname(entry.name))
      ) {
        found.push(relative(root, path));
      }
    }
  }
  return found;
}

/** 隐私铁律：文本文件中不得出现 /Users/ 个人路径。 */
function personalPathLeaks(root: string): string[] {
  const leaks: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(path);
      } else if (entry.isFile() && TEXT_SUFFIXES.has(extname(entry.name))) {
        if (PERSONAL_PATH.test(readFileSync(path, "utf8")))
          leaks.push(relative(root, path));
      }
    }
  }
  return leaks;
}

/** 上游 plugin_manifest_path 的镜像：.zcode-plugin 优先，.claude-plugin 兼容。 */
function manifestPath(pluginDir: string): string {
  const preferred = join(pluginDir, ".zcode-plugin", "plugin.json");
  return existsSync(preferred)
    ? preferred
    : join(pluginDir, ".claude-plugin", "plugin.json");
}

/**
 * 上游 validate.py main() 的 TS 移植，对 clone 根目录跑全量规则，
 * 返回问题列表（空列表 = 通过）。clone 不存在时抛错，由调用方跳过。
 */
function upstreamProblems(clone: string): string[] {
  const problems: string[] = [];
  const err = (msg: string): void => {
    problems.push(msg);
  };

  const marketplace = readJson(join(clone, "marketplace.json"));
  for (const field of ["name", "owner", "plugins"]) {
    if (!(field in marketplace))
      err(`marketplace.json: missing required field '${field}'`);
  }
  if (!marketplace["description"])
    err("marketplace.json: missing 'description'");
  problems.push(
    ...i18nProblems("marketplace.json", marketplace["description_i18n"]),
  );

  const rawEntries = marketplace["plugins"];
  if (!Array.isArray(rawEntries))
    err("marketplace.json: 'plugins' must be a list");
  const entries = (Array.isArray(rawEntries) ? rawEntries : []) as Json[];

  const seen = new Set<string>();
  const registered = new Set<string>();
  const pluginsRoot = join(clone, "plugins");

  entries.forEach((entry, i) => {
    let label = `marketplace.json plugins[${i}]`;
    const name = entry["name"];
    if (typeof name !== "string" || !name) {
      err(`${label}: missing 'name'`);
      return;
    }
    label = `${label} (${name})`;

    if (!KEBAB.test(name)) err(`${label}: name must be kebab-case`);
    if (seen.has(name)) err(`${label}: duplicate plugin name`);
    seen.add(name);

    for (const field of ["source", "description", "version"]) {
      const value = entry[field];
      if (typeof value !== "string" || !value)
        err(`${label}: missing '${field}'`);
    }
    problems.push(...i18nProblems(label, entry["description_i18n"]));

    const version =
      typeof entry["version"] === "string" ? entry["version"] : "";
    if (version && !SEMVER.test(version)) {
      err(`${label}: version '${version}' is not semver (X.Y.Z)`);
    }

    const category = entry["category"];
    if (typeof category !== "string" || !category) {
      err(`${label}: missing 'category'`);
    } else if (!CATEGORIES.has(category)) {
      err(`${label}: category '${category}' not in allowed set`);
    }

    const source = typeof entry["source"] === "string" ? entry["source"] : "";
    if (
      !source.startsWith("./plugins/") ||
      source.split("/").length !== 3 ||
      source.includes("..")
    ) {
      err(`${label}: source must be exactly ./plugins/<name>`);
      return;
    }

    const pluginDir = join(clone, source.slice(2));
    registered.add(basename(pluginDir));
    const dirStat = lstatSync(pluginDir, { throwIfNoEntry: false });
    if (dirStat === undefined || !dirStat.isDirectory()) {
      err(`${label}: source directory ${source} does not exist`);
      return;
    }
    if (basename(pluginDir) !== name) {
      err(
        `${label}: directory name '${basename(pluginDir)}' does not match plugin name`,
      );
    }
    if (dirname(resolve(pluginDir)) !== resolve(pluginsRoot)) {
      err(`${label}: source resolves outside plugins/`);
      return;
    }
    problems.push(...treeProblems(pluginDir, label));

    const mPath = manifestPath(pluginDir);
    let manifest: Json | null = null;
    if (!existsSync(mPath)) {
      err(`${relative(clone, mPath)}: file not found`);
    } else {
      try {
        manifest = readJson(mPath);
      } catch (e) {
        err(`${relative(clone, mPath)}: invalid JSON: ${String(e)}`);
      }
    }
    if (manifest !== null) {
      if (manifest["name"] !== name) {
        err(
          `${label}: plugin.json name '${String(manifest["name"])}' does not match`,
        );
      }
      if (manifest["version"] !== version) {
        err(
          `${label}: plugin.json version '${String(manifest["version"])}' does not match marketplace version '${version}'`,
        );
      }
      if (!manifest["description"])
        err(`${label}: plugin.json missing 'description'`);
      problems.push(
        ...i18nProblems(`${label}: plugin.json`, manifest["description_i18n"]),
      );
      if (!jsonEqual(manifest["description_i18n"], entry["description_i18n"])) {
        err(
          `${label}: plugin.json description_i18n does not match marketplace entry`,
        );
      }
    }
  });

  for (const child of readdirSync(pluginsRoot, { withFileTypes: true })) {
    if (child.isSymbolicLink()) {
      err(`plugins/${child.name}: symlink (not allowed)`);
    } else if (
      child.isDirectory() &&
      !registered.has(child.name) &&
      !TEMPLATE_DIRS.has(child.name)
    ) {
      err(
        `plugins/${child.name}: directory not registered in marketplace.json`,
      );
    }
  }

  const assets = join(clone, "assets");
  if (existsSync(assets)) problems.push(...treeProblems(assets, "assets"));

  return problems;
}

const hasForkClone =
  existsSync(join(FORK_CLONE, "marketplace.json")) &&
  existsSync(join(FORK_CLONE, "scripts", "validate.py"));

describe("marketplace 契约（本仓库）", () => {
  const manifest = readJson(MANIFEST_PATH);
  const marketplace = readJson(DEV_MARKETPLACE);
  const entry = (marketplace["plugins"] as Json[]).find(
    (e) => e["name"] === "autoresearch",
  );

  it("plugin.json 字段符合上游硬校验规则", () => {
    assert.match(manifest["name"] as string, KEBAB, "name 必须 kebab-case");
    assert.match(manifest["version"] as string, SEMVER, "version 必须 semver");
    assert.ok(
      typeof manifest["description"] === "string" && manifest["description"],
      "description 必须非空",
    );
    assert.deepStrictEqual(
      i18nProblems("plugin.json", manifest["description_i18n"]),
      [],
    );
  });

  it("根 marketplace.json 顶层结构符合上游 schema", () => {
    for (const field of ["name", "owner", "plugins"]) {
      assert.ok(
        field in marketplace,
        `marketplace.json 缺少顶层字段 '${field}'`,
      );
    }
    assert.ok(marketplace["description"], "顶层 description 必须非空");
    assert.deepStrictEqual(
      i18nProblems("marketplace.json", marketplace["description_i18n"]),
      [],
    );
  });

  it("autoresearch 条目与 plugin.json 一致（上游硬拒点）", () => {
    assert.ok(entry, "marketplace.json 缺少 autoresearch 条目");
    assert.strictEqual(entry!["name"], manifest["name"], "name 不一致");
    assert.strictEqual(
      entry!["version"],
      manifest["version"],
      "version 不一致",
    );
    assert.strictEqual(
      entry!["description"],
      manifest["description"],
      "description 漂移（与 plugin.json 不一致）",
    );
    assert.ok(
      jsonEqual(entry!["description_i18n"], manifest["description_i18n"]),
      "description_i18n 漂移：上游 validate.py 要求与 plugin.json 完全相等",
    );
    assert.ok(
      CATEGORIES.has(entry!["category"] as string),
      "category 不在允许集合内",
    );
    assert.strictEqual(
      entry!["source"],
      "./plugin",
      "本地条目 source 必须指向 ./plugin",
    );
  });

  it("plugin/ 树安全：无 symlink、无字节码、零依赖、无个人路径泄漏", () => {
    assert.deepStrictEqual(treeProblems(PLUGIN_DIR, "plugin"), []);
    assert.deepStrictEqual(forbiddenArtifacts(PLUGIN_DIR), []);
    assert.deepStrictEqual(personalPathLeaks(PLUGIN_DIR), []);
  });
});

describe(
  "marketplace 契约（上游 clone 镜像）",
  {
    skip: hasForkClone
      ? false
      : "archived/zcode-plugins clone 不存在（CI 上正常跳过）",
  },
  () => {
    it("上游 validate.py 全量规则镜像通过", () => {
      const problems = upstreamProblems(FORK_CLONE);
      assert.deepStrictEqual(
        problems,
        [],
        "上游 clone 的 marketplace 契约未通过；推送前先在 clone 内修复",
      );
    });

    it("clone 内 autoresearch 包无字节码、无 node_modules、无个人路径泄漏", () => {
      const pluginDir = join(FORK_CLONE, "plugins", "autoresearch");
      assert.deepStrictEqual(forbiddenArtifacts(pluginDir), []);
      assert.deepStrictEqual(personalPathLeaks(pluginDir), []);
    });
  },
);
