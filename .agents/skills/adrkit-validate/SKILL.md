---
name: adrkit-validate
description: Use when checking ADR record format before implementation, rejection, archival, or commit.
---

# ADR Kit Validate

Run `adrkit validate [name]` for one record or `adrkit validate` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.

Repository-wide validation also checks the archive seal: `adr/archived/MANIFEST.json` must cover exactly the archived records and match their bytes. When it reports drift — edited bytes, an unsealed file, a missing file, a malformed or missing manifest — restore the sealed bytes, the manifest entry, or the empty manifest; never re-seal changed archived content to make the check pass. Before pushing, `adrkit validate --base <git-ref>` additionally proves the archive only grew since that ref: entries sealed at the base must remain byte-identical, so a coordinated edit of an archived file and its hash still fails. A base that carries no readable manifest fails.
