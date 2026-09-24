---
name: adrkit-validate
description: Use when checking whether ADR files follow the ADR Kit format, especially before accepting a proposal or committing.
---

# ADR Kit Validate

## Overview

Run the machine checks for one record or the whole repository.

## Steps

```bash
adrkit validate [name] [--all]
```

- With no `name`, the whole repository is validated.
- `name` resolves by title, file name, or decision number.

## Rules

- Treat any non-OK output as a blocker for `adrkit accept`.
- A `front matter must include "raised-by"` or `"decided-by"` issue on a
  record that lacks the field is not yours to repair on a hunch: the value
  comes from whoever knows where that choice came from — your own judgment, or
  the person who directed it — so ask when you do not.
- `adrkit validate` checks durable decisions only; a draft in `adr/.drafts/`
  is validated by `adrkit accept` right before it is promoted.
