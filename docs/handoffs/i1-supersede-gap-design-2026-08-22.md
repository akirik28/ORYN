# RES-I1 supersede-gap analysis — 2026-08-22

**Package I1-3, assigned by ORYN-BASORG. Read-only analysis and design proposal only — no
implementation, no writes, no migration authored.** Scope: characterize the "pipeline can
insert but not supersede" gap precisely (the 18 UPDATE-shaped files, and the Michigan/CMU/
UCLA case referenced in `docs/ORYN-OVERNIGHT-2026-08-22.md`), and propose what a fix would
require.

**Headline finding: this is not one gap, it's three, with three different correct shapes.**
Treating them as one problem would produce the wrong design for at least two of them.

## 1. Scoping the 18 files, by ID against live — not by file-name guess

Ran every `program_id` in all 18 files against live `university_programs` directly (existence
by primary key, not by name or count) and, where the target field exists, diffed the proposed
value against the current live value.

### 1a. `url_repair_*` (12 files) — a pure single-field correction

| | |
|---|---|
| Records | 1,437, across 12 files |
| Target `program_id` exists live | **1,437/1,437 (100%)** — zero orphans |
| Would actually change `official_program_url` | **1,429** |
| Already matches live (no-op if applied) | 8 |

The target column (`official_program_url`) already exists on `university_programs`. This is
structurally the simplest of the three: identity is unambiguous (keyed by `program_id`, a
real primary key, not a fuzzy match), one column changes, nothing else about the row is in
question.

### 1b. `tr_bilingual_names_*` (6 files) — two different problems bundled in one file family

| | |
|---|---|
| Records | 175, across 6 files |
| Target `program_id` exists live | **175/175 (100%)** — zero orphans |
| Live `name` already matches `file.english_name` exactly | 152 |
| Live `name` differs from `file.english_name` | **23** |

The 23 "mismatches" are not a data problem — they're informative. Sample:

```
live="Aircraft Engineering (Uçak Mühendisliği)"        file.english_name="Aircraft Engineering"
live="Business Administration (İşletme)"                file.english_name="Business Administration"
live="Economics (İktisat)"                              file.english_name="Economics"
```

**Live already carries a Turkish name for these 23 — informally, appended in parentheses to
the `name` field itself.** There is no separate structured column for it. So this file family
is asking for two different things depending on the row:
- For the 152 with no Turkish name anywhere live: genuinely new information.
- For the 23 that already have one, embedded in `name`: a question of *convention*, not of
  missing data — should the parenthetical move to a structured field, and does leaving `name`
  as-is (with the parenthetical) conflict with however the other ~600+ Turkish programme rows
  not touched by this file family are recorded? **Not answered here — flagging as a real
  open question for whoever designs the fix, not guessing at a convention.**

**The schema has no column for this at all.** `information_schema.columns` on
`university_programs` (28 columns, checked directly) has no `turkish_name`, `name_local`,
`faculty_tr`, or equivalent. Whatever path handles this needs new columns before it needs new
logic.

**`kilavuz_codes` is a third, separable sub-problem, richer than the one existing draft
migration for it.** Sample record (Koç International Relations):

```json
"kilavuz_codes": [
  {"kilavuz_kodu": "203910327", "tier_label": "Ücretli",        "yok_birim_adi": "... (Ücretli)"},
  {"kilavuz_kodu": "203910336", "tier_label": "Burslu",          "yok_birim_adi": "... (Burslu)"},
  {"kilavuz_kodu": "203910345", "tier_label": "%50 İndirimli",   "yok_birim_adi": "... (%50 İndirimli)"}
]
```

This is **one-to-many per programme** (a single programme can have paid/scholarship/discount
admission tiers, each with its own `kilavuz_kodu`). The founder-pending, already-designed
`supabase/migrations/0057_university_program_kilavuz_kodu.sql`
(`docs/founder-blocked-backlog.md` item 26, `docs/handoffs/university-program-kilavuz-kodu-
proposal.md`) is a single nullable `text` column — **one code per programme, not three.** Even
once/if 0057 is approved and applied, it does not fit this file family's actual data shape.
That's not this package's problem to solve (0057 is a separate, already-escalated founder
decision), but it means 0057 alone would not close the tr_bilingual_names gap even after
approval — worth the founder/BASORG knowing before treating 0057's approval as sufficient.

### 1c. Overlap between the two file families

**108 `program_id`s appear in both `url_repair_*` and `tr_bilingual_names_*`** — just over
6% of the URL corrections and 62% of the bilingual-name records target the same rows. A
combined update path (touch both fields in one pass for these 108) would be more efficient
than two independent passes, if the eventual mechanism supports multi-field updates.

## 2. The Michigan/CMU/UCLA case — re-measured, and the overnight doc is already partly stale

`docs/ORYN-OVERNIGHT-2026-08-22.md` (written earlier today) states "all three had every
stored row pointing at a single index page." **Re-measured directly: that is no longer
accurate for any of the three** — a large majority of rows at all three now have distinct,
per-programme URLs, presumably from work done since that doc was written. Current, real
numbers:

| University | Live rows | Distinct URLs | Largest single-URL cluster |
|---|---|---|---|
| Carnegie Mellon | 158 | 85 | 52 rows → `coursecatalog.web.cmu.edu/degreesoffered/` (the degree-index page) |
| UCLA | 181 | 146 | 36 rows → `ugeducation.ucla.edu/.../majors/` (the general majors-listing page) |
| Michigan | 226 | 136 | 72 rows → `lsa.umich.edu/lsa/academics/majors-minors.html`, plus a second 13-row cluster on a School of Music admissions page |

So the actual residual problem is smaller than the overnight doc implies but still real: **160
rows across the three universities (52+36+72+13)** still resolve to a shared listing/index
page instead of a programme-specific one. This is the pattern BASORG named: a correction here
isn't "add a missing fact," it's "the currently-live capture is a worse, generic version of
what the programme's real source page would show" — a different problem shape from `url_repair`'s
targeted single-field fixes above, even though both look like "change `official_program_url`."

**Why it's a different shape, confirmed structurally, not just by description**: I checked
what `decideIngestion()` would actually do if research produced a corrected, programme-
specific URL for one of these 160 rows and it went through the normal insert path.
`programDedupKey()` includes `officialProgramUrl` as a key component
(`lib/programs/ingest.ts`). A corrected record's URL necessarily *differs* from the old
shared-index-page URL (that's the whole point of the correction) — so the dedup key would
not match, `decideIngestion` would return `accepted`, and the corrected row would be
**inserted as a new row alongside the old one**, not in place of it. This is the literal
mechanism behind "the pipeline can insert but not supersede" — not a metaphor, a specific,
checked code path.

## 3. What schema already exists for this, and what doesn't

Checked directly rather than assumed, per BASORG's ask:

- **`universities` has exactly this pattern already**: `duplicate_status` and
  `superseded_by_id`, populated (1,010 canonical / 9 superseded, confirmed in an earlier
  session's work — `docs/handoffs/canonical-live-column-refactor-2026-08-22.md`), with a
  working consumer pattern (`lib/universities/canonical.ts`'s `loadSupersessionMap` /
  `excludeSupersededUniversities`, used by every acquisition/ingestion script that resolves
  university identity).
- **`university_programs` has neither column.** Checked `information_schema.columns`
  directly (28 columns total) — no `duplicate_status`, no `superseded_by_id`, no equivalent
  under any other name.
- **`requirement_research_queue` has a `superseded` *outcome* value** (confirmed live: 20
  rows), but this is a different mechanism solving a different problem — it marks one
  *candidate record in the research queue* as superseded by *another candidate record in the
  same batch* (a within-corpus re-pass collision, per
  `docs/handoffs/requirements-deadlines-incident-and-backfill-report.md`: "a newer record in
  this same corpus explicitly supersedes this one"). It does not touch a *live* row at all,
  and there is no equivalent on the `university_requirements` table itself. Noting this so it
  isn't mistaken for prior art that already solves the live-row-retirement problem — it
  doesn't, it solves an adjacent one.

## 4. Design proposal — two paths for two shapes, a flagged-not-designed third

**Path A — in-place field correction** (fits `url_repair`'s 1,429 real changes: identity
already certain via `program_id`, single field, no question of which row is "more correct").

- An `UPDATE university_programs SET official_program_url = $1 WHERE id = $2` by primary key
  — no identity resolution needed, `decideIngestion`/`programDedupKey` not involved at all.
- Needs its own audit trail, matching the org's evidence-provenance standard rather than a
  bare UPDATE with no trace: a queue table analogous to `program_research_queue`
  (`program_url_correction_queue` or similar) recording `program_id`, `previous_value`,
  `new_value`, `source_url`, `evidence_note`, `outcome`. Without this, a correction pass
  would regress the audit discipline every insert path already has.
- Multi-field capable for the 108 overlap rows (URL + eventually the bilingual fields, once
  those columns exist) without needing two separate mechanisms.

**Path B — retire-and-replace** (fits Michigan/CMU/UCLA's 160 rows: the live row itself is a
worse capture, not just one stale field on an otherwise-fine row; the "correction" is really a
new, better-sourced row that should become authoritative).

- Mirror `universities`' existing, working pattern exactly rather than invent a new one: add
  `duplicate_status` and `superseded_by_id` to `university_programs` (same nullable-column
  shape, same semantics). Research produces the corrected row; it goes through the *normal*
  `decideIngestion` insert path (it legitimately is new content by the dedup key, as shown in
  §2); a separate, small step then marks the old row `superseded_by_id = <new row's id>`.
  Every consumer that already knows to call `excludeSupersededUniversities`-style filtering
  for universities would need the identical filter added for programs — a known, bounded
  extension of an existing pattern, not new architecture.
- Deliberately **not** proposing this for `url_repair`'s case: doubling row count for a
  one-field fix, and requiring every downstream reader to follow a `superseded_by_id` chain
  even for trivial corrections, would be disproportionate to what that gap actually needs.

**Not designed here — flagged for a schema decision, not an ingestion-routing one**:
`tr_bilingual_names`'s two sub-problems (new `turkish_name`/`faculty_tr`-equivalent columns;
`kilavuz_codes`'s one-to-many shape not fitting migration 0057's single-column design) are
schema questions for the founder/BASORG, not something `decideIngestion` routing can paper
over. Recommend they get resolved together with backlog item 26 rather than as a third
mechanism bolted onto Path A or B.

## Addendum — Package I1-4: Glasgow's 69 fold into Path A, with a resolution step Path A didn't have

ORYN-CFO re-derived the Glasgow finding independently and surfaced a reclassification: under
RULE-INGEST-003 (populating an empty field is the permitted case), live Glasgow's
`degree_type` is NULL on all 101 rows while the file populates 93 of its 101 — so the correct
handling of the near-certain-duplicates isn't "skip," it's "enrich." That makes them
UPDATE-shaped, the same structural category as `url_repair`. BASORG assigned folding this into
the design, with one binding constraint checked below before anything else.

### The constraint, verified directly, not taken on description alone

CFO's claim: URL must be the primary identity-resolution axis; stripped-name is corroboration
only, never sufficient alone. Checked the specific counter-example directly rather than
trusting the description:

```
File:  "Music [BMus]"  →  official_program_url: https://www.gla.ac.uk/undergraduate/degrees/musicbmus/
Live:  "Music"          →  official_program_url: https://www.gla.ac.uk/undergraduate/degrees/musicma/
```

Confirmed: these are genuinely different pages for genuinely different degrees (BMus vs. MA)
that happen to share a stripped name. **Zero URL overlap.** A name-only resolver would merge
the file's BMus record into live's MA row and enrich it with the wrong degree_type — silent
corruption, not a caught error, because a wrong-but-plausible degree_type looks exactly like a
right one. **Constraint confirmed as binding, not adopted on trust.**

### Measuring the actual shape of the 93 populated-degree_type candidates

Ran URL-based resolution (own script, deleted after use) against all 93 Glasgow file records
that carry a non-null `degree_type`, matching each against live Glasgow rows by exact
`official_program_url`:

| Resolution outcome | Count |
|---|---|
| URL matches exactly one live row (clean, resolvable) | **62** |
| URL matches zero live rows | **31** |
| URL matches multiple live rows (ambiguous) | 0 |

The 31 zero-match records overlap heavily with the "32 genuine variants needing research
adjudication" already identified for Glasgow (partnership/dual-degree/graduate-entry
programmes, confirmed by inspecting the sample — `Aeronautical Engineering (in partnership
with Tianjin University)`, `Common Law (graduate entry)`, and similar). **These are not
enrichment candidates at all** — there is no live row for them to enrich, by URL or otherwise.
Routing them through a name-based fallback (rather than leaving them unresolved) is exactly
the mechanism that would produce the Music/BMus-vs-MA failure at scale. They stay in RES-V1's
research-adjudication queue, unchanged by anything proposed here.

So the real enrichment set is **62 of Glasgow's 101**, not 69 or 93 — the difference from
CFO's "69 near-certain duplicates" figure is that a name-based duplicate count and a
URL-resolvable-identity count aren't the same measurement, which is itself the point of this
whole package.

### Does Path A cover this, or does it need extending?

**It needs extending — the difference is a resolution step Path A didn't have.**
`url_repair`/`tr_bilingual_names` both carry an explicit `program_id` naming an exact live row
— identity is *given*, so Path A's plain `UPDATE ... WHERE id = $1` applies directly.
Glasgow-class research records carry no such reference; they look like new-programme captures
and need identity *resolved* before any update can happen at all. Proposed extension:

1. **Resolve university** (existing `resolveUniversity()`, unchanged).
2. **Resolve program identity within that university by exact `official_program_url` match
   against live rows — never by name, stripped or otherwise.** Zero matches → not an
   enrichment case, falls through to the normal `decideIngestion` insert/research path
   unchanged. Multiple matches → ambiguous, routes to manual review, never auto-resolved.
   Exactly one match → proceed to step 3.
3. **Enrich, field by field, only where the live value is currently NULL.** This is a
   narrower write rule than `url_repair`'s: `url_repair` *replaces* an already-populated
   value because the file carries explicit evidence the old value was wrong
   (`previous_official_program_url`/`correction_type`/`evidence_note`). Glasgow's case only
   *fills* an empty column — RULE-INGEST-003's permitted case specifically, not a claim that
   any existing populated value is wrong. Path A's audit-queue table needs an `enrichment` vs.
   `correction` distinction (or an explicit `was_null_before` column) so a future reader can
   tell "we knew the old value was wrong and replaced it" apart from "there was no old value
   and we added one" — different evidence bars, shouldn't be recorded identically.

### Superseded_by_id — not needed here, confirmed against my own read of the code

Agree with BASORG's read: this is in-place, not retirement. Path B exists for when the *old
row itself* is a worse capture that a *new* row should replace (Michigan/CMU/UCLA — a new row
gets inserted, the old one marked superseded). Here there is no new row: the same row, same
identity, same URL, gains one previously-empty field. Nothing about the row's identity or
correctness-as-far-as-it-goes changes; it was simply incomplete. Using Path B's machinery for
this would be modeling "this row got better" as "this row got replaced," which isn't what
happened.

### Dependency flagged, not scoped in

Per BASORG's explicit instruction: **not** treating `url_repair`'s 1,429 records, or
Glasgow's 62 resolved-by-URL records, as ready to apply once a path exists. Nobody has
verified the *content* is correct — that a corrected URL actually is the right page, that a
filled-in `degree_type` is the right degree — only that identity resolution and the write
mechanism can be designed soundly. A wrong value written through a well-designed path is still
a wrong value; content verification is V-lane work, not assigned here, and this design
depends on it before either Path A sub-mode goes live.

## What this package did not do, by design

No migration written, no code changed, no `--apply` of anything, no schema modified. Both
proposed paths are options for BASORG/the founder to choose between (or reject), not a
commitment. Nothing here widens `university_programs`' evidence or authority gates — Path A
and Path B both still run through identity/source checks equivalent to what `decideIngestion`
already does before anything is proposed as a correction, and the addendum's URL-only
resolution rule is, if anything, stricter than what `decideIngestion` requires today.
