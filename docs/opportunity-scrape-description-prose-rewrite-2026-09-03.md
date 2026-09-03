# Raw-scrape description prose rewrite — 2026-09-03

Direct follow-up to
[`docs/opportunity-description-org-mismatch-sweep-2026-09-03.md`](./opportunity-description-org-mismatch-sweep-2026-09-03.md),
which found that description-side contamination in the catalog survives almost exclusively
in the 35 active records still stored as raw pipe-delimited scrape fragments rather than
prose — everything else had already been rewritten by earlier research passes. That sweep
fixed 4 of the 35 (real cross-institution splices/duplication). The CEO asked for the
remaining 31 to be rewritten into real prose "that a fifteen-year-old can read," using only
what each record's own stored text already supports — no new research, no invented facts.

**Result: 30 rewritten, 1 left untouched and flagged as too thin to write.**

## Ground rules followed for every rewrite

- Every fact in the new text was already present in that record's own stored description.
  Nothing was looked up fresh; nothing was inferred beyond what the source text states.
- Stale or internally inconsistent dates (several records mix 2023/2024/2025 text under a
  2026 title, or state two different years for the same event) are preserved as historical
  fact where a specific date is quoted, with a plain "check the official page for current
  dates" hedge — never silently upgraded to a guessed current date, never silently dropped.
- Sentences truncated mid-word by the original scrape (ending "…") are cut at the last
  complete sentence rather than completed by guesswork.
- Unlabeled bare numbers in the raw fragments (a lone "60.0" or "7.0" with no unit or field
  name attached) are dropped rather than assigned a guessed meaning, and where dropping one
  removes real substance, that's said explicitly in the new text.
- Two likely-duplicate pairs (Lehigh's Iacocca programme, Edinburgh's Pre-University Summer
  School) are each rewritten independently, using only that row's own stored text — never
  cross-pollinated with its sibling's facts even where the sibling has a detail this row
  lacks. Flagged for dedup, not merged here.

## The one left untouched

**"For-Credit Fun-Sized Courses"** (Purdue, `1d9d3901-b31f-44f8-9147-d6807b04ad3e`). Its
entire stored description is *"For-Credit Fun-Sized Courses: | 4-WeekResidentialProgram: |
The Summer 2024 application deadline: May 15, 2024 | Requirements:"* — cut off after the
word "Requirements:" with nothing following. There is no description of subject matter,
cost, or actual requirements to rewrite into prose. Per the brief's own instruction ("where
a record's own content is too thin to make a real description, say so and leave it rather
than writing around it"), this one is left as-is rather than padded with invented content.

One other record came close to the same line — **"Student Science Training Program"**
(University of Florida, `142a6597`) — but was judged to have just enough real substance
(concrete application requirements, eligibility, rolling admissions) to write a paragraph
around, while explicitly stating in the new text itself that the source doesn't describe
what the programme actually does, and that two bare unlabeled numbers (60, 4,800) couldn't
be confidently interpreted. That's the "say so" instruction applied inline rather than by
skipping the record outright.

## Two guard-verification catches, before this file was finalized

Every one of the 30 `UPDATE` guards below is a full-text equality check against the row's
exact live value, dry-run verified via a batch `SELECT` before finalizing — same discipline
as `description_contamination_cleanup_2026-09-02.sql` and
`description_org_mismatch_sweep_2026-09-03.sql`. That check caught two real mistakes before
they could silently no-op:

- **Northwestern CTD** (`af30653c`) — the guard text I'd drafted had a trailing `" | "`
  after "Research Project Opportunity 2025" that isn't actually in the live value (a
  transcription artifact from earlier in this session, before the guard was checked against
  fresh data). Fixed by dropping the trailing fragment from the guard.
- **PolyU Summer Institute** (`255377bc`) — the live description wraps "Summer Institute" in
  curly quotes (`'Summer Institute'`, U+2018/U+2019), not straight apostrophes. My first
  draft guard used straight quotes. Same gotcha the 2026-09-02 contamination-cleanup file
  hit on a Ringling record — noted there as a known risk, and it recurred here. Fixed by
  matching the live curly quotes exactly.

Both are now byte-for-byte verified against live data (re-confirmed via a second, isolated
check after the fix). The other 28 matched on the first pass.

## Style notes on specific records

- **Sabancı Nanotechnology Winter School** (`4db17042`) — the source was scraped as a
  flattened timetable grid (days × time-slots × lecture titles × lecturer names all run
  together with no reliable column alignment). Reproducing it as prose risked mismatching a
  lecturer to the wrong day or time — a fabrication risk the brief specifically warned
  about — so this rewrite summarizes the programme's theme, dates, and two-module structure
  only, and points to the official schedule document for lecture-by-lecture detail rather
  than guessing at the grid.
- **Andover Summer at Phillips Academy** (`c14ee166`) and **USC Pre-College** (`4a54159a`)
  — both already carried a research note appended to the raw scrape fragment (the *other*
  known contamination pattern — reasoning leaking into `description` — documented in
  `description_contamination_cleanup_2026-09-02.sql`; these two rows weren't part of that
  file's 35-record cleanup, so the note was still sitting here in its original form). Both
  are merged into one clean paragraph combining the scrape content and the note's
  already-verified facts — no new fact added beyond what the two pieces already stated
  between them.
- **University of Edinburgh Pre-University Summer School 2026** (`dc762fce`) — same
  treatment: a 2026-08-24 verified correction note is merged into prose rather than left
  trailing.
- **Koç University KUSRP** (`2116709f`) and **Sabancı Nanotechnology Winter School**
  (`4db17042`) — rewritten in Turkish, matching the source language and this catalog's
  existing convention for Turkey-facing records.

## Adjacent findings, not acted on here (different lane)

Same two duplicate pairs already flagged in the prior sweep — Lehigh's two Iacocca rows
(`d12506f1`, `a7a89e1e`) and Edinburgh's two Pre-University rows (`30436a92`, `dc762fce`) —
each rewritten independently in this pass, per the CEO's instruction not to chase dedup.

Two records' `official_url` points somewhere unrelated to what the description actually
describes — Hochschule Bremen (`8f6e438f`, URL is an unrelated Master's-degree page) and
Maastricht (`14db7109`, URL is a third-party aggregator, not Maastricht's own site) — both
already noted in the prior sweep's doc, not re-litigated here since `official_url` isn't
this pass's field either.

## What this closes

Combined with the 4 fixes from the prior sweep, all 35 records that were still in raw
pipe-delimited scrape format are now either rewritten into prose (34) or explicitly flagged
as too thin to write (1). This was, per the CEO's framing, "the last place raw scrape text
is still reaching students" in the active catalog.
