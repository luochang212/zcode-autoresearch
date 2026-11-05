---
description: Use when a shipped choice has important constraints or reasons that existing sources do not preserve; assess whether to record that missing context directly.
---

# ADR Kit Record

Recording a shipped choice preserves important context that later tasks could otherwise lose.

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

First run `adrkit list` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles alone — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with `adrkit supersede --by` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update facts the existing record actually claims rather than recording a new one; changes within its implementation freedom need no update. A changed recorded choice needs a new record and an explicit relationship. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Write a one-sentence description explaining when to read the record, then fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
