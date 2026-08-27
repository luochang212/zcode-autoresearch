---
name: adrkit-supersede
description: Use when an accepted decision is replaced by a newer accepted decision and must be retired without deleting history.
---

# ADR Kit Supersede

## Overview

Mark an accepted decision as superseded. The CLI rewrites its front matter
to `status: superseded` with `superseded-by: N`, stamps the supersede date
on the `date` field, and leaves the record in `adr/decisions/` as frozen
history.

## Steps

1. Record the replacement first (`adrkit decide` or `adrkit propose` +
   `adrkit accept`), and make sure it validates.
2. Run:

```bash
adrkit supersede "<old name or number>" --by "<new name or number>"
```

## Rules

- `--by` must reference an existing accepted decision that is not itself
  superseded; the command refuses dangling chains.
- Re-run `adrkit list` right before superseding to confirm the `--by` target
  still exists and is not itself superseded, even if you checked earlier in
  this conversation.
- Never hand-edit a superseded record afterwards; it is history.
- Mention what it supersedes in the new decision's `## Problem` section so
  the causal link survives in prose.
