---
description: Use when a choice that will constrain future work has already shipped and adr/ does not own it yet; record it directly, with no pending proposal.
---

# ADR Kit Record

Recording a shipped choice at the moment of shipping keeps later tasks from re-deriving — and contradicting — it.

First run `adrkit list` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles or tags — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with `adrkit supersede --by` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update those facts in the existing record rather than recording a new one; a changed choice always needs a new record and an explicit relationship. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
