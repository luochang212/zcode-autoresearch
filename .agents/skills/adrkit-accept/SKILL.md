---
name: adrkit-accept
description: Use when a proposal draft is complete, and the team has decided to accept it.
---

# ADR Kit Accept

## Overview

Promote a completed draft to a decision. The CLI validates the draft, assigns
the next `N` number, rewrites `## Proposal` to `## Decision`, folds
`Acceptance criteria` and `Risks` into `## Consequences`, writes
`adr/decisions/N-*.md`, and discards the draft from `adr/.drafts/`.

## Steps

1. Review the draft with `adrkit show "<name>"`; every section must have real
   content before accepting.
2. Run:

```bash
adrkit accept "<name>"
```

3. Confirm the output names the new `adr/decisions/N-*.md` file.

## Rules

- Never accept an invalid draft; the command refuses.
- Re-run `adrkit show "<name>"` immediately before accepting, even if you
  reviewed it earlier in this conversation; the repo may have changed since.
- Review the generated `## Consequences` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example `## Plan`); save their content elsewhere
  if it still matters.
