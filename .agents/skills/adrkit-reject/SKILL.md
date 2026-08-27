---
name: adrkit-reject
description: Use when a proposal draft should be declined and discarded.
---

# ADR Kit Reject

## Overview

Discard a proposal draft. The CLI deletes the draft from `adr/.drafts/` and
leaves no record - rejection lives in the winning decision's
`## Alternatives considered`, not in a standalone rejected record.

## Steps

```bash
adrkit reject "<name>" [--reason "<why it was rejected>"]
```

## Rules

- `--reason` is optional and is only echoed; nothing is persisted. If the
  rejection matters, record it in `## Alternatives considered` of the decision
  that won.
