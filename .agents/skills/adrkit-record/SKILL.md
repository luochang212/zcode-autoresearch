---
name: adrkit-record
description: Use when a shipped choice has important constraints or reasons that existing sources do not preserve; assess whether to record that missing context directly.
---

# ADR Kit Record

Recording a shipped choice preserves important context that later tasks could otherwise lose.

## Is this worth recording?

Preserve important context missing from existing sources. Honor explicit user requests to preserve a choice without making similar edits record-worthy.

Before creating or shaping a record, ask:

1. **What would be lost?** Find a constraint, reason, or genuine trade-off that code, tests, and existing documentation do not reliably explain, especially context held only in a user conversation. An implementation result alone is insufficient.
2. **What would forgetting cost?** Identify a plausible future mistake and its consequences. Weigh importance and breadth of impact; a local decision with severe consequences can qualify. Do not invent disasters to justify recording.
3. **What should survive?** Preserve the stable choice, boundary, and reason. Consider longevity and resistance to becoming stale separately; leave volatile facts to code, configuration, tests, or existing docs.

Use judgment, not a score or an all-must-pass checklist. If nothing meaningful would be lost, skip without a justification field, user approval, or deferred note. Notes are candidates, not commitments to ADRs.

| Usually leave to existing sources                                              | Potentially worth preserving                                                                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event       | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden                     |
| Selected a library; the manifest already shows which one                       | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable                |

Judge information, not topic names; an existing record is not precedent for recording similar edits. Update only claims made false by a change; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest moving details to their existing owner or authorized archival when the rationale no longer guides work. Do not silently rewrite choices, ignore constraints, delete a record, or archive it without authorization.

First run `adrkit list` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles alone — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with `adrkit supersede --by` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update facts the existing record actually claims rather than recording a new one; changes within its implementation freedom need no update. A changed recorded choice needs a new record and an explicit relationship. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Write a one-sentence description explaining when to read the record, then fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
