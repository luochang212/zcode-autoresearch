---
description: Use when an unshipped choice has important constraints or reasons that existing sources do not preserve, especially context held only in conversation; assess whether it merits a proposal.
---

# ADR Kit Propose

A proposal preserves important context for an unshipped choice before that context evaporates.

## When to record

Preserve important context missing from existing sources, especially context held only in a user conversation. Honor explicit user requests to preserve a choice without making similar edits record-worthy.

Before creating or shaping a record, answer these four questions:

1. **Can code, tests, or Git explain this choice?** If yes, it is not an ADR.
2. **Does the record only say "we did X" while X is visible in the code?** If yes, it is not an ADR.
3. **Is the constraint or reason behind it hidden and durable enough to guide future choices?** If no, it is not an ADR.
4. **Is this a routine upgrade, naming change, format migration, visual tweak, or process ritual?** If yes, it is not an ADR.

Use judgment, not a score or an all-must-pass checklist. If nothing meaningful would be lost, or forgetting it would cost nothing, skip without a justification field, user approval, or deferred note. Notes are candidates, not commitments to ADRs.

| Usually leave to existing sources                                              | Potentially worth preserving                                                                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event       | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden                     |
| Selected a library; the manifest already shows which one                       | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable                |

Judge information, not topic names; an existing record is not precedent for recording similar edits. Update only claims made false by a change; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest moving details to their existing owner or authorized archival when the rationale no longer guides work. Do not silently rewrite choices, ignore constraints, delete a record, or archive it without authorization.

Before writing, run `adrkit list` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Read `adr/notes.md` too — its unshaped lines are the likeliest raw material for this record. Judge overlap from record content, not titles alone; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: create a proposal linking the decision it will replace; keep the implemented decision active until the replacement ships. After shipping, use `adrkit implement` and resolve the old decision with `adrkit supersede --by` in the same delivery change. A proposal is intent, not duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Then run `adrkit propose "<title>"`; it creates a dated, unnumbered file in `adr/proposed/`. Write a one-sentence description explaining when to read the record, then fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run `adrkit validate <name>` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.
