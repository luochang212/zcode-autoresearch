---
description: Enter autoresearch mode. Resumes from .auto/prompt.md when a session exists, otherwise sets one up from your goal. Usage: /autoresearch:autoresearch <goal or resume context>
---

Enter autoresearch mode for this workspace.

1. If `.auto/log.jsonl` and `.auto/prompt.md` exist, **resume**: first clear `autoresearchOff` if it is set (set it to false in `.auto/config.json`), then read the charter and the ledger and continue the loop (one focused change → `run_experiment` → `log_experiment`).
2. Otherwise **set up a new session** from the goal in $ARGUMENTS:
   - Load the skill `autoresearch` (or read `skills/autoresearch/SKILL.md`).
   - Follow `references/setup-guide.md`: pick a mechanical metric, create `.auto/measure.sh` (prints `METRIC name=value`), optional `.auto/checks.sh`, record the user's deep goal verbatim in `.auto/goal.md` and the agreed scope boundary in `.auto/scope.md`, write `.auto/prompt.md` charter (its goal/scope sections quote the two files verbatim).
   - `init_experiment` with metric name and direction, run a baseline, then start the loop.
3. Remind the user: keep the session anchors frozen (`.auto/measure.sh` / `.auto/checks.sh` / `.auto/goal.md` / `.auto/scope.md` are write-protected by the plugin hook once created), and use `/autoresearch:export` for a dashboard.

$ARGUMENTS
