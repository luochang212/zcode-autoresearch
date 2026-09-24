---
description: Use when work establishes an important architectural choice that will constrain future development and whose rationale is not apparent from code alone; record it after the choice is made.
---

# ADR Kit Decide

## Overview

Record an already-made decision directly in `adr/decisions/` with the next
`N` number.

## When to record

Use this workflow for architectural choices that constrain future development
and whose rationale is not apparent from code alone. Routine implementation
details, local fixes, and easily reversible choices need no ADR. Do not create
an ADR for every task or invent alternatives and reasons to fill a template.

## Steps

1. Run `adrkit list` and read every decision in full with `adrkit show <N>`
   (or read its file), even if you ran it earlier in this conversation.
   Check whether this decision supersedes or overlaps an existing one against
   current code and requirements. Treat superseded records as history and
   pending drafts as unaccepted proposals. Reuse an existing decision when
   it already captures the same choice; explain changed assumptions when
   replacing one, and use `adrkit supersede` after its replacement is recorded
   and validated.
2. Run:

```bash
adrkit decide "<title>" --raised-by human --decided-by human   # or agent on either axis
```

3. Edit the created file and fill `## Problem`, `## Decision`,
   `## Alternatives considered`, and `## Consequences`. Add 2-4 kebab-case
   `tags` to the front matter (for example `frontend`, `execution-layer`)
   so the decision graph can group by theme.
4. Run `adrkit validate <N>` until it returns OK.

## Rules

- `raised-by` and `decided-by` declare the decision's provenance:
  `raised-by` is who put it on the table, `decided-by` whose judgment settled
  it. For `decided-by`, `human` means a person determined the direction — they
  stated it, changed your proposal into what shipped, or made it earlier and
  you are only recording it now; `agent` means it came from your own judgment,
  including when a person let your choice through without engaging with it. The
  fields record the source of the choice, not who ran the command: recording a
  person's decision makes it `human`, not `agent`. The CLI neither infers nor
  verifies either, so put the nuance (who redirected or approved) in the body.
- Accepted decisions must not contain `## Proposal`, `## Acceptance
criteria`, or `## Risks` sections.
- Never edit the `raised-by` or `decided-by` value afterwards. A wrong value
  is a false provenance claim no later check can detect. A record missing the
  fields is not a blank to fill on a hunch: write them only when you know where
  the choice came from — your own judgment, or the person who directed it — and
  ask the person when you do not.
- `accepted` means a recorded decision, not proof of human review.
- `adrkit accept` is the better path when a proposal already exists.
