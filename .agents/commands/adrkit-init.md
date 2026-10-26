---
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

Installing ADR Kit wires a repository's decision memory into the surfaces agents read, against two failure modes: mid-task drift from long-term decisions, and forgetting settled choices until they bite.

Run `adrkit init [path]` for a new repository, or `adrkit update` if `adr/` exists. Confirm the four lifecycle folders: `proposed/`, `implemented/`, `rejected/`, and `archived/`. They are a context budget as well as a lifecycle: `implemented/` is current authority, `proposed/` is intent, `rejected/` is anti-pattern memory, and `archived/` is lowest-value frozen history. The CLI installs workflow skills but does not rewrite a project's standing orders.

Record language follows the repository: match the language of existing records, or the user's language when the repository has no records yet, and keep that language for both titles and bodies rather than switching per conversation.

The trailing generation marker declares which template the section was reconciled against; it does not assert identical text. Translation, shortening, and local edits are allowed. Keep project-specific obligations outside the pasted section. Keep the marker to receive template-change notes, or omit it to maintain the section without tracking. When a note appears, compare with this template and reconcile any changes before updating the marker.

Add or update this section in `AGENTS.md`:

## Reading architecture decisions

`adr/` exists because agents over-focus on the current task and forget settled decisions: reading it at task start counters the drift, and recording when a choice settles counters the forgetting. At the start of a coding, design, or review task, if `adr/` exists, run `adrkit list`. The four folders are a context budget: read the relevant `implemented/` records in full with `adrkit show <N>` or their files; check the relevant `proposed/` records for intent and the relevant `rejected/` records for the bad cases they warn against (a rejection is durable: it leaves only when another record owns its warning); treat `archived/` as frozen history and read it only when a task explicitly cites it. Do not judge relevance by title alone: inspect tags, paths, relationships, and task scope; when a task targets specific files, `adrkit relevant <path>` retrieves the records whose `paths:` scopes govern them. For actual Git changes, use `adrkit relevant --base <review-base>` or `adrkit relevant --staged`; supplement scope matches with inventory reading for unscoped decisions and resolve incomplete-search diagnostics. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a `## Deliberation` appendix only when its decision is in play.

Before creating a record, compare it with the active records covering the same choice or mechanism: extend a duplicate; when the active record's mechanism is itself unsound, weigh removing it rather than patching it; for an unshipped full replacement, link its intent and keep the old authority active, then use `adrkit supersede --by` in the same change that ships and records the replacement; link a partial overlap while the older record stays active. When shipping or reviewing, keep each active record's realization facts — paths, names, defaults — aligned with shipped code; a changed choice is a new record with an explicit relationship, not a rewrite of old rationale. Archived records are ordinary Git-tracked history, never edited silently, and not read by default.

Records cost time to write, read, and maintain, and stale records can mislead; record only when preserving the rationale is worth that cost. For example, routing all writes through one boundary to preserve validation and auditing can merit an ADR: a later direct write may look locally correct while bypassing those guarantees. Routine fixes and local renames usually need none when code and tests adequately explain them.

Record an ADR when an architectural choice constrains future work and its lasting rationale or genuine trade-offs are not adequately explained by code, tests, and existing documentation. A behavior change alone does not qualify. Record genuine alternatives and trade-offs, not invented template filler. A grilling session records every choice it settles, but unshipped outcomes remain proposals. Use `adrkit propose` for unshipped work, `adrkit implement` after it ships, and `adrkit record` for an already-shipped decision. `raised-by` declares who introduced the choice; `decided-by` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

Records outlive the format that wrote them. The npm package is `adr-kit`; the command it installs is `adrkit`, so install and upgrade with `npm install -g adr-kit`. When `adrkit validate` reports unknown fields, missing sections, or parse errors on records an older release wrote, treat it as format drift rather than damage: upgrade the `adr-kit` package to the latest stable release, migrate the active records to the current format where the change is mechanical, and report any record that cannot be carried over instead of forcing a rewrite; then re-run `adrkit validate --all`. Archived records are ordinary Git-tracked history: validate checks them by the current rules; a later format change is a normal migration commit.

When the user wants to review or share the project's history, use the `adrkit-visualize` skill; generate a browsable atlas from `adr/implemented/` and `adr/archived/` only, publish archived bodies in full, and pin the page to the commit it was built from.

<!-- adrkit: standing-orders b82e4add -->

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.
