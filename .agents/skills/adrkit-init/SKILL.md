---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

Installing ADR Kit puts a repository's decision memory where agents can see it: records live in `adr/`, and the `adrkit` CLI reads them. Run `adrkit init [path]` for a new repository, or to repair an existing `adr/` whose `config.yaml` is missing. Repair fills missing files and preserves existing records and integrations. Use `adrkit update` to refresh integrations in an initialized repository. Confirm the four lifecycle folders: `proposed/`, `implemented/`, `rejected/`, and `archived/`. The CLI installs workflow skills but does not rewrite a project's AGENTS.md.

Record language follows the repository: match the language of existing records, or the user's language when the repository has no records yet, and keep that language for both titles and bodies rather than switching per conversation.

Offer one of the sections below for `AGENTS.md` — suggest the one matching the repository's language, judged from the existing AGENTS.md, README, and records, defaulting to English when nothing decides — and paste it only with the user's agreement. A section in another language is a translation of the Chinese source; translate it and keep the `adrkit` invocations verbatim. If AGENTS.md already mentions adrkit in the user's own words, respect that text and suggest nothing. The section names the tool and the record-worthiness bar, and leaves whether or when an agent runs the commands to its judgment.

## 架构决策记录

本仓库用 `adr-kit` 这个 npm 包管理架构级决策，记录保存在 `adr/` 目录。可以用 `adrkit list` 列出全部记录，`adrkit show <编号>` 读取某一条，`adrkit relevant <路径>` 查找与某文件相关的记录。记录是有代价的：每记一件事，就要在代码之外多维护一份真相源。但记录又是必要的——代码只是根因衍生的现象，知道根因却不记录，未来的 agent 只能从代码反猜。例行修改留给 Git 和测试；没有值得记的就跳过。何时记录的四问与写法见 `adrkit-propose`、`adrkit-record` 技能。

## Architecture decisions

This repository uses the `adr-kit` npm package to keep architecture-level decisions; the records live in `adr/`. Browse them with `adrkit list`, read one with `adrkit show <N>`, and find the records relevant to a file with `adrkit relevant <path>`. Recording has a cost: every record is a second source of truth to maintain outside the code. It is also necessary — code is only the symptom a root cause produced, and a root cause left unrecorded forces future agents to reverse-guess it from the code. Routine edits belong to Git and tests; skip what is not worth recording. The `adrkit-propose` and `adrkit-record` skills carry the four-question recording test and the format.

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.
