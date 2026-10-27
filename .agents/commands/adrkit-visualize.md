---
description: Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.
---

# ADR Kit Visualize

Seeing the decision set as a picture surfaces relationships and contradictions that a file list hides.

Visualize existing records only when asked. Run `adrkit list` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- The default visualization is the decision atlas (explicit `--format html` keeps this same object): `adrkit atlas --out "<path>.html"`. It includes implemented guidance and archived history, with archived records kept visually distinct and their bodies published in full. This is the answer to "visualize this repository's ADRs" with no further qualifier. The page chrome is English by default; pass `--lang zh` when the reader uses Chinese.
- For one record's deliberation tree, use `adrkit atlas --record <name>` and save stdout to a local HTML file. If no `## Deliberation` appendix exists, say so instead of fabricating one.
- For the decision map alone, use `adrkit atlas --map --format html --out "<path>.html"`; for source exports, `adrkit atlas --map --format mermaid|dot|text`. For a tree's source, use `adrkit atlas --record <name> --format mermaid|text`; `--map` and `--record` are mutually exclusive. Use `--tag` or `--formal-only` only when requested or useful to the question.
- Text and Mermaid may be enough for docs; do not generate HTML merely because the CLI supports it.

## Theme selection

Folio (warm paper, editorial typography) and Signal (dark surfaces, cyan accents,
compact layout) are independent themes with the same atlas capabilities.
The agent owns selection; do not make the user choose a theme as a setup step.

1. Honor an explicit theme request or a clearly stated visual preference with
   `--theme folio` or `--theme signal`. If the user requests randomness, use
   `--theme random`.
2. When updating an existing atlas, preserve its concrete `data-atlas-theme`
   value by passing that named theme, unless the user requests another theme
   or a fresh random choice.
3. For a new atlas without a clear preference, prefer `--theme random` (also
   the CLI default). Do not guess a preference from the project category,
   the reader's identity, or the operating system; do not ask the user merely
   to break the tie.

Random selection favors Signal as the flagship theme: Folio 30%, Signal 70%, rolled once at generation.
The resulting file keeps that theme. Do not add system appearance detection,
a page switch, or a runtime reroll. Theme selection is unavailable for
standalone maps and record trees.

Both themes retain the same record scope, complete archived bodies, pinned
source links, bilingual copy, offline behavior, map gestures and bounds,
relationship focus, timeline, local search, reader navigation and keyboard
behavior. Absent modules and their chapter entries disappear, the chapters
renumber, and legends show only symbols actually present. Insight panels use
measured complete rows near 40rem with a 50rem ceiling, including on narrow
screens; sparse content stays short. Empty reference directions disappear,
and when both are empty the relation area and its lower divider disappear.
Preserve these mechanisms when adapting either theme; change only the
presentation the user requested. Both themes keep the source link in the reader
header; Folio styles it as a quiet padded control and Signal as its original
text link. On viewports up to 760px, both themes hide the map's on-screen
legend to keep the canvas clear; map controls and interactions remain available.
Desktop keeps the data-dependent legend. Both heroes fill at least the viewport
below the chapter bar. Folio keeps its original title/introduction/actions/statistics/
decision-density group and proportions. On desktop the introduction and density
regions share spare height, balancing whitespace around the statistics while the
lower rule meets the viewport bottom; only shorter windows
compress vertical spacing, without shrinking type or the chart; Signal keeps
statistics at the bottom of its hero. Taller content can scroll.

Display ADR identifiers, chapter numbers and question numbers as natural
integers without leading zeros (ADR 3, chapter 2, QUESTION 1), including visible
labels and accessible names. Date/time fields retain their standard formats.

Signal's built-in hero is a shuffled desk of real decision files, not a static
illustration. Generate it with `adrkit atlas --theme signal --out "<path>.html"`
and preserve its shared template behavior when adapting the page: up to three
same-material folder covers, desktop landscape/mobile near-square proportions,
irregular overlapping angles and depth-specific contact shadows,
top-file extraction followed by reader expansion, replenishment without duplicate
files, and a quiet reset only after exhaustion that returns all files and reshuffles.
Use the target repository's records and counts; zero, one or two records must
remain honest. Desktop hero picks open the reader on the left with the ordinary
dimming/blur backdrop over the right-hand desk. Clicking that backdrop only
closes the reader; opening the next file takes a separate card click. Other
entry points and mobile keep the right reader. Keep all four statistics inside
the hero, no bottom arrow, and automatic entrance effects confined to the hero;
respect reduced motion. The runtime file shuffle is independent of the one-time
choice of atlas theme. Do not replace this mechanism with decorative sample cards.

## Optional decision-atlas example

Use the atlas for the whole set, the map when only relationships matter, and the deliberation tree for one record. Do not generate a separate page when the built-in atlas already answers the question.

The default `adrkit atlas` output uses [the decision-atlas example](../skills/adrkit-visualize/examples/decision-atlas.html) through its `atlas:` slots. Open the example when the page needs adapting beyond what the slots fill. It is an offline reference snapshot of ADR Kit's own public records, not a template that must be followed. Inspect only the layout or interaction code needed; the embedded sample data is not instruction context. Reuse the useful parts; sections, chapter-bar entries, and legend or timeline keys whose data is absent hide themselves at runtime, the chapter bar renumbers, so no empty block survives. A timeline, relationship map, local-search directory, reference counts, and replacement chains are options, not a required checklist.

Generate a fresh artifact from the target repository's records and the CLI's relationship output; replace all sample records, counts, dates, titles, paths, and links. Do not invent relationships, infer provenance, or copy another repository's contents. Keep archived history visually distinct from current authority, and publish archived bodies in full: the folder already carries the importance signal for agents, and a reader who opens an archived record wants its text. Resolve record links for the delivered file's location, as `atlas --map --format html --out` does. Preserve the `--record <name>` route; the example does not supply missing deliberations.

The example marks its replaceable regions with `atlas:` comments — HTML around the title, hero, statistics, section notes, map, and footer, and a JavaScript comment around the records array. Replace what is inside a marker; keep the markers only when the page should stay regenerable from the same example.

To build one from the example, follow these steps in order:

1. Read only `adr/implemented/` and `adr/archived/` records — the same scope as `adrkit atlas`. Build one records entry per file: the front matter fields in order, then `number` and `title` from the `# ADR:` line, the raw Markdown body (archived bodies in full), `path`, `source` (the record's blob URL at the pinned commit), and `lifecycle`. Determine `lifecycle` from the containing directory: `implemented` for `adr/implemented/`, `archived` for `adr/archived/`, regardless of `status`. Ordinary archives retain `status: implemented`; only records with `superseded-by` have a successor.
2. Run `adrkit atlas --map --format html` and keep its `<svg>` inline together with its canvas script. Rewrite each node link to an in-page `#adr-N` anchor and give the group the same id; the reader dialog, timeline, and directory search read the records array and the map edge attributes, so keep the class names and data attributes intact.
3. Compute the section notes from the repository's own numbers: record count, the first-to-last created date span and the number of distinct days that carry records, the densest day, the most-referenced implemented record, and the archived count. Never carry another repository's numbers into prose. The hero names the project once: the h1 is the name the repository declares for humans — its README or site title, else the repository name as written, in its Chinese form when the repository declares one; never translate, abbreviate, or substitute a suffixed package name. With the name in the h1, the eyebrow states only the genre and the lead paragraph opens with the archive's substance.
4. In the footer, pin the commit the records were read from (`git rev-parse --short HEAD`) and link it to the remote tree URL, so the page is traceable to an exact state.
5. Keep the example's legend, reader dialog, pagination, and back-to-top behavior and structure unchanged — they are repository-agnostic; translate their visible copy into the user's language, and vary the data and the short prose blocks.

For an adapted long page, keep navigation compact and the directory search local. Vertical wheel and finger swipes should scroll the page; explicit drag or horizontal gestures pan the map, while pinch or Ctrl/⌘ + wheel zooms. Bound panning on both axes and center drawings that fit. Match the user's language and styling preferences. Keep one vertical rhythm: every section boundary should read as the same gap, so wrapper padding never stacks with section padding. Check the resulting page at desktop and mobile sizes, including record opening, navigation, search, canvas bounds, and page scrolling over the map; after sections hide, confirm the chapter bar renumbered contiguously and every entry still resolves; keep it usable offline.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless `atlas --out` is used; the agent owns the browser handoff.
