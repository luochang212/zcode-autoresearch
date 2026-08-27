---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

## Overview

Create an `adr/` repository in the target directory.

## Steps

1. Decide the target directory (default: current working directory).
2. Run:

```bash
adrkit init [path]
```

3. Confirm the output lists `adr/config.yaml`, `adr/decisions`, and
   `adr/.gitignore`. Proposals are not a separate folder: they are ephemeral
   drafts in `adr/.drafts/`, created by `adrkit propose`.

## Rules

- Never create `adr/` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, the next action is usually `adrkit decide "<title>"`, or
  `adrkit propose "<title>"` when the decision still needs review.
