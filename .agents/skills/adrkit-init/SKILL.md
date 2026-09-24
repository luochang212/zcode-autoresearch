---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

## Overview

Create an `adr/` repository in the target directory.

## Steps

1. Decide the target directory (default: current working directory).
2. For a new repository, run:

```bash
adrkit init [path]
```

If `adr/` already exists, run `adrkit update` instead and continue with
the project instruction setup below.

3. For a new repository, confirm the output lists `adr/config.yaml`, `adr/decisions`, and
   `adr/.gitignore`. Proposals are not a separate folder: they are ephemeral
   drafts in `adr/.drafts/`, created by `adrkit propose`. Durable records
   carry `raised-by` and `decided-by` fields you declare; drafts never do.

4. Add the following section to the project's agent instruction file
   (`AGENTS.md`; also `CLAUDE.md` if that is the team's entry point). Preserve
   existing instructions and update an equivalent section instead of adding
   a duplicate. This agent step supplies the task-start entry point; the CLI
   only installs workflow files. If ADR Kit is already initialized, use
   `adrkit update` to refresh those files and still check this section.

```markdown
## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run
`adrkit list` and read every decision in full with `adrkit show <N>` (or read
its file). ADR sets are small; do not filter by title alone. Treat accepted
records as decision context, superseded records as history, and pending
drafts as unaccepted proposals. Check relevant decisions against current
code and the task's requirements. Apply the constraints that still hold;
explain conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.

A `## Deliberation` appendix records the design tree behind a decision. It is
reference material: read it only when that decision is in play, not on every
task.

Record an ADR when an architectural choice will constrain future development
and its rationale is not apparent from code alone. Record only decisions
actually made and genuine alternatives and trade-offs; do not invent reasons
to fill a template. Reuse an existing record for the same choice; record a
replacement when important assumptions change. Routine implementation details,
local fixes, and easily reversible choices need no ADR. If no important
architectural decision was made, create none. When you grill a decision with
the `adrkit-grill` workflow, record every decision the session settles: the
session is itself the importance signal, so the bar above governs only the
direct `decide`/`propose` path. `accepted` means a recorded
decision, not proof of human review. `decided-by` is a declaration of where the
choice came from, not an inference: `human` when a person determined the
direction — they stated it, changed a proposal into what shipped, or you are
recording one they made earlier — `agent` when it came from the agent's own
judgment, including when a person only let it through. The CLI neither infers
nor verifies it.
```

## Rules

- Never create `adr/` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, read existing decisions and continue the task. Use
  `adrkit decide "<title>" --raised-by human --decided-by human` (`agent` on
  either axis when that is the truth) only for an important architectural choice
  already made, or `adrkit propose "<title>"` when such a choice still needs
  review.
