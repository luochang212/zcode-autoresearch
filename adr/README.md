# Architecture Decision Records

Records follow the lifecycle folders proposed/, implemented/, rejected/, and
archived/. The folders are a context budget as well as a lifecycle:
implemented/ is current authority and is read in full; proposed/ is intent and
is checked; rejected/ is anti-pattern memory and is checked;
archived/ is lowest-value frozen history and is not read by default.

A proposal is unshipped even when its direction has been settled. Implemented
records describe shipped decisions and receive stable ADR numbers. A rejection
is a durable terminal record of a declined proposal: it is removed only when
another record owns the warning it blocks, never for appearing stale —
rejections are unnumbered and unsealed, so removing a redundant one cannot
reuse a number or break the archive. Archived records
are frozen history, not current authority. Each one is
sealed in adr/archived/MANIFEST.json; adrkit validate checks the seal, and
adrkit validate --base <git-ref> proves the archive only grows.

Never delete a numbered decision: its stable N may be referenced elsewhere.
Implemented records may refresh factual paths, symbols, and defaults, but a
changed choice needs a new record. Archive or supersede rather than erase it.

The canonical header includes status, date, and created: YYYY-MM-DD (the
birth date, never re-stamped). Numbered records declare raised-by: human | agent
and decided-by: human | agent; these are provenance declarations, not proof
of approval. Optional tags: [frontend] classify records by theme.

Use adrkit propose for unshipped work, adrkit implement after it ships, and
adrkit record for an already-shipped decision. Use adrkit reject with a reason
for a proposal that will not ship. A full replacement archives the old
implemented record through adrkit supersede; adrkit archive also retires
implemented guidance whose rationale is no longer needed in the active set.

Run adrkit list to discover records. Read the relevant implemented/ records in
full, check the relevant proposed/ records for intent and the rejected/ records
for the bad cases they warn against, and consult archived/ only when a task
cites history. Do not decide relevance by title alone.
Run adrkit validate to check the repository.
