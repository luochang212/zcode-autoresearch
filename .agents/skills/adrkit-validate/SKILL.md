---
name: adrkit-validate
description: Use when checking ADR record format before implementation, rejection, archival, or commit.
---

# ADR Kit Validate

Validation keeps the record set a dependable memory: a format contract only works when drift fails loudly.

Run `adrkit validate [name]` for one record or `adrkit validate` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.

Repository-wide validation checks archived records like any other record. If it reports a format or path error in an archived file, migrate it in a normal Git commit with a reason and re-run; do not leave validation red. Before pushing, `git diff <base> -- adr/archived` shows what changed; there is no separate seal or `validate --base`.
