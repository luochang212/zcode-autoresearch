---
name: adrkit-record
description: Use when recording an already-shipped architectural decision directly, without a pending proposal.
---

# ADR Kit Record

First run `adrkit list` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles or tags — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with `adrkit supersede --by` in the same change; a partial replacement keeps the older record active with a prose link between them.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update those facts in the existing record rather than recording a new one; a changed choice always needs a new record and an explicit relationship. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
