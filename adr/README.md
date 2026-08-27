# Architecture Decision Records

This directory is an ADR Kit repository. Each record is plain Markdown with a
machine-checkable header. Decisions are durable; proposals are ephemeral drafts.

## Folders

| Folder       | Meaning                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `decisions/` | Decisions, numbered sequentially, immutable history (accepted or superseded)                                    |
| `.drafts/`   | Proposal drafts, gitignored and ephemeral - promote one with `adrkit accept` or discard it with `adrkit reject` |

Rejection is recorded in a decision's `Alternatives considered` section, never
as a standalone record.

## Record format

Every record starts with a YAML front matter block:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
commit: abc1234
---

# ADR: N <title>
```

Decisions use `# ADR: N <title>` and require `Problem`, `Decision`,
`Alternatives considered`, and `Consequences`. Superseded decisions add
`superseded-by: N`. The `date` field records when the current status was
reached; the CLI stamps it at every lifecycle move, alongside the git `commit`
the decision was recorded against. Drafts (`adr/.drafts/`, `status:
proposed`) require `Problem`, `Proposal`, `Alternatives considered`,
`Acceptance criteria`, and `Risks`; `adrkit accept` promotes one into a
decision, and `adrkit reject` discards it without leaving a record.

Run `adrkit validate` to check every record.
