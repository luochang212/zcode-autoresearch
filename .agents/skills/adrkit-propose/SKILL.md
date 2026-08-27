---
name: adrkit-propose
description: Use when starting a new architecture decision that still needs review before it is accepted.
---

# ADR Kit Propose

## Overview

Create an ephemeral proposal draft in `adr/.drafts/`. A draft is temporary:
`adrkit accept` promotes it into a decision, `adrkit reject` discards it
without leaving a record.

## Steps

1. Run:

```bash
adrkit propose "<title>"
```

2. Edit the created draft. Fill every section with real content:
   `## Problem`, `## Proposal`, `## Alternatives considered`,
   `## Acceptance criteria`, `## Risks`.
3. Add 2-4 kebab-case `tags` to the front matter (for example `frontend`,
   `execution-layer`) so the decision graph can group by theme.
4. Promote the completed draft with `adrkit accept "<title>"`; the CLI
   validates it before promoting.

## Rules

- Do not skip `## Alternatives considered`. A proposal without alternatives
  is invalid by design.
- Keep the front matter exactly `status: proposed`.
- Before proposing, run `adrkit list` and check whether this decision
  supersedes or overlaps an existing one; mention that in the record. Re-run
  it even if you ran it earlier in this conversation: session memory can be
  stale, and the repo may have changed.
