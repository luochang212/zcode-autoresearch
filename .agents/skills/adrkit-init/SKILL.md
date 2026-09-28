---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

Run `adrkit init [path]` for a new repository, or `adrkit update` if `adr/` exists. Confirm the four lifecycle folders: `proposed/`, `implemented/`, `rejected/`, and `archived/`. They are a context budget as well as a lifecycle: `implemented/` is current authority, `proposed/` is intent, `rejected/` is anti-pattern memory, and `archived/` is lowest-value frozen history. The CLI installs workflow skills but does not rewrite a project's standing orders.

Add or update this section in `AGENTS.md` (and `CLAUDE.md` when used):

## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run `adrkit list`. The four folders are a context budget: read the relevant `implemented/` records in full with `adrkit show <N>` or their files; check the relevant `proposed/` records for intent and the relevant `rejected/` records for the bad cases they warn against (a rejection is durable: it leaves only when another record owns its warning); treat `archived/` as frozen history and read it only when a task explicitly cites it. Do not judge relevance by title alone: inspect tags, paths, relationships, and task scope. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a `## Deliberation` appendix only when its decision is in play.

Before creating a record, compare it with the active records covering the same choice or mechanism: extend a duplicate, fully replace through `adrkit supersede --by` in the same change, or link a partial overlap while the older record stays active. When shipping or reviewing, keep each active record's realization facts — paths, names, defaults — aligned with shipped code; a changed choice is a new record with an explicit relationship, not a rewrite of old rationale. Archived records are sealed in `adr/archived/MANIFEST.json`, never edited, and not read by default.

Record an ADR when an architectural choice constrains future work and its rationale is not evident from code. Record genuine alternatives and trade-offs, not invented template filler. A grilling session records every choice it settles, but unshipped outcomes remain proposals. Use `adrkit propose` for unshipped work, `adrkit implement` after it ships, and `adrkit record` for an already-shipped decision. `raised-by` declares who introduced the choice; `decided-by` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.
