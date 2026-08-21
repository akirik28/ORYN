# YÖK Atlas per-cycle placement schema — decision

Branch `oryn/yok-atlas-placement-schema`. Migration `0055` written and committed, **not
applied** (confirmed directly against `information_schema.tables` before revising this file in
place — `0055` is merged to `main` but the table has never existed live, so editing it, rather
than layering a second migration, is clean). Full gate clean: lint 0, typecheck 0, test
1278/1278, build succeeds.

## Addendum — revised against the live API, not just research prose

A second dispatch asked for the same schema with more specific requirements (verify
retrievability directly, get quota/placed/score/rank as distinct fields, use exact score-type
values, do not touch production). Flagged the collision rather than silently redoing or
ignoring it (per that dispatch's own explicit instruction to check occupancy first). Given the
overlap plus real, uncovered gaps, the resolution was: extend `0055` in place, not open a new
migration number.

**Retrievability, verified directly**: `yokatlas.yok.gov.tr`'s "Tercih Sihirbazı" tool calls
`api/tercih-kilavuz/search`, a genuinely keyless POST endpoint — confirmed 200 with no auth
header via the browser's own network log, not HTML-scraped.

**The raw API response is richer than the original design below, built from research prose
alone.** Real, structural facts found only by checking the live source directly:

- **`bursOraniAdi`** (Burslu / Ücretli / %50 İndirimli / %25 İndirimli — scholarship/fee tier)
  is a genuinely separate admission track, not decoration. İstanbul Medipol's "Tıp
  (İngilizce)" has two full records — Burslu (`kontenjan` 3, `kilavuzKodu` 203110477) and
  Ücretli (`kontenjan` 7, `kilavuzKodu` 203101291) — same programme, same university, same
  cycle, genuinely different quotas and cutoffs. Added to the table's **unique key**, not just
  as a column: this is the third time in one day the identical shape has caused real damage —
  the programme dedup key ignoring `degree_type` collapsed Durham's BSc and MChem (migration
  0054); before that, a URL-based rule silently rejected 53 genuine METU programmes to catch
  one duplicate. A column without key membership would let one track's placement data
  overwrite the other's on the next cycle — and Burslu vs. Ücretli is a full-scholarship-vs.
  full-fee difference for a Turkish family, not a cosmetic distinction.
- **`fymkId`/`fymkAdi`** (faculty/school id and name) are real, populated fields in the source,
  not something inferred. Added as real columns and also placed in the unique key: the İstanbul
  Üniversitesi "İşletme" case (three records, three faculties) is unresolvable without it — two
  of the three share identical name/degree_level/language (both "İngilizce (%30)") and
  plausibly the same burs tier too, so `fymk_id` is the only field left to actually separate
  them.
- **`kilavuzKodu`** confirmed as a real, live API field (not only a prose mention) — YÖK's own
  stable per-programme identifier. Still not wired into `university_programs`' own identity
  resolution or dedup key in this migration — flagged as the more valuable finding of this pass
  (every one of Oryn's Turkish programme rows points at the same portal root, since YÖK Atlas
  has no per-programme URL; `kilavuz_kodu` is the only real candidate for a stable reference
  across that whole population), left for whoever next works on identity resolution generally.
- **No "placed" field exists in this source.** Checked directly against the live response: only
  `kontenjan` (quota) and the last-placed student's rank/score are present. No column added for
  something with no path to populate — an empty column invites someone to fill it from a worse
  source later.
- **Column names renamed to match the source verbatim** (`kontenjan`, `puan_turu`, `min_puan`,
  `basari_sirasi`, `kilavuz_kodu`), replacing the English approximations (`quota`, `score_type`,
  `success_score`, `success_rank`) the original design below used — every translation layer is
  a place for a wrong assumption to hide, and this dataset will be re-fetched for years.

**Investigated and left unresolved, not guessed at**: the live response also carries
`gk1`/`minPuan1`/`basariSirasi1`, `gk2`/`minPuan2`/`basariSirasi2`, `gk3`/`minPuan3` alongside
the current-cycle fields. Checked two ways: the raw values (no independently-confirmable
prior-cycle progression to check against, since 2026 is the first captured cycle) and the UI's
own column-selector ("Kolonlar"), which exposes no corresponding column at all — if this were
product-relevant historical trend data, the UI that already surfaces `kontenjan`/`başarı
sırası`/`başarı puanı` directly would very likely expose it too. Neither check confirmed a
meaning. Not modeled in this migration.

**Validation**: the instruction was to validate on an actual Supabase branch, never against
production. Branch creation was attempted (cost confirmed with the founder directly first — a
real recurring spend needs the account holder's own confirmation, not a peer's) and failed:
branching requires the Pro plan, which this org is not on. Nothing was charged. Round-trip
sample validation has **not** run yet — standing by for the coordination session's direction on
the fallback (the same project used for every apply/replay today) before applying anything or
inserting a sample, given how explicit and repeated its "never against production" instruction
was.

## The decision

New table `university_program_placement_cycles`: one row per `(program_id, cycle_year)` —
quota, YÖK's own programme code, YKS score type, and outcome (`filled` with a paired
rank+score, or `unfilled` with neither). Not columns on `university_programs` — a student
reasoning about whether a programme is in reach needs this year's cutoff against last year's,
not just whichever cycle was ingested most recently silently overwriting the one before it.

## Evidence, read from the actual research text first

Checked every record with a YÖK programme code across all 8 Turkish independent batches
(37-44, 399 records — every Turkish batch ingested or pending as of 2026-08-21), not designed
from the brief's description alone:

- **368 filled, 31 unfilled, 0 partial.** Every filled record has both a success rank and a
  score; every unfilled record has neither. Zero cases of one present without the other —
  confirms the "go null together" fact directly, across the full population, not a sample.
- **The "unfilled" fact is already phrased three different ways across different research
  passes**: `"UNFILLED (quota had no qualifying placement this cycle — a real outcome, not a
  missing-data gap)"` (METU/Sabancı/İTÜ), `"no 2026 placement recorded (unfilled quota) / n/a"`
  (Ankara Üniversitesi), and a third variant using `"placement success rank / score: X / Y"`
  phrasing for the filled case (İstanbul Üniversitesi). Same underlying fact, three free-text
  shapes — direct, first-hand evidence of exactly why this needs to become a real column
  rather than staying prose: it has already started fragmenting.
- **Every one of the 399 also carries a YÖK-assigned programme code** (e.g. `"108410354"`),
  confirmed genuinely stable and per-real-programme — the three İstanbul Üniversitesi
  "İşletme" records this session's dedup-key work already characterized as three distinct,
  uncollapsable programmes each carry a different code (`105610555`, `105690907`,
  `105610643`). See "What this does not do" below for why this isn't used to fix that case
  here.
- **Only one cycle exists in the data so far** (`cycle_label` is `"2026-YKS"` on all 399,
  no variation) — the trend-tracking this table exists for is architecturally ready but has
  not been exercised with real multi-cycle data yet. Stated plainly rather than implied as
  already working.

## Design choices, and why

**`placement_status` has exactly two values, `filled` | `unfilled` — not three.** "Not yet
captured" is deliberately not a status value; it's the absence of a row for that
`(program_id, cycle_year)`. A third status would mean inserting a placeholder row for every
programme × every cycle Oryn hasn't researched, which nothing here does.

**A plain wide table, not `university_profile_metrics`'s existing `metric_code`/`value_*`
EAV shape** (migration 0038, the closest existing precedent for "dated, sourced facts").
That table is deliberately open-ended and university-scoped; this data is a small, fixed,
evidenced set of program-scoped fields where the load-bearing null-together invariant needs a
single-row `CHECK` constraint. Spreading quota/rank/score across separate metric rows would
need a cross-row trigger to enforce the same fact a plain `CHECK` expresses directly. Noting
the deviation explicitly rather than leaving a future reader to wonder why two different
per-period patterns exist in this schema.

**`score_type` is free text, not a `CHECK`-constrained enum.** Four values observed (SAY, EA,
SÖZ, DİL) across four batches is not confident coverage of every score type Turkey's whole
higher-ed system uses — an overly narrow `CHECK` would reject genuine future data rather than
merely fail to validate it, the same reasoning migration 0052 used for `group_role`.

## What this deliberately does not do

**`yok_programme_code` is stored, not used for identity resolution.** It is genuinely strong
evidence — a stable, per-real-programme identifier that would have separated all three
İstanbul Üniversitesi "İşletme" records, something the current `university_programs` dedup
key (through migration 0054) cannot do, because YÖK Atlas has no per-programme URL for any key
shape to use. **Not acted on here**: this migration does not touch `university_programs`, its
dedup index, or `decideIngestion()`. Using it to resolve identity would be exactly the kind of
schema change migration 0054's own decision explicitly declined to make reactively for three
records. Recorded as a genuine, evidenced finding for whoever next works on program identity
resolution generally — not a decision this pass is making unilaterally.

**No ingestion code.** Schema only, per the same precedent as migrations 0052-0054. This table
starts empty.

**Not backfilled from the free text already ingested.** The 399 records characterized above
are already live in `university_programs.notes` as prose (via the existing ingestion path,
which doesn't know this table exists). Regex-parsing that already-ingested prose to populate
this new structured table would be inferring structure from text rather than reading it from
the source record — the same "schema first, never backfill existing rows into new structures
by inference" principle migration 0052 held to. This table is populated only by a future
ingestion pass reading fresh, structured fields from source records — which leads to the one
concrete recommendation this design makes:

**Recommendation: extend the research-handoff contract with first-class fields** for
`yok_programme_code`, `cycle_year`, `cycle_label`, `score_type`, `quota`, `placement_status`,
`success_rank`, `success_score` — not implemented here (that document belongs to the research
lane, not this schema pass), but directly evidenced by the three-different-phrasings finding
above: free text has already started fragmenting across research passes, and every additional
batch written against prose rather than structured fields makes eventually parsing it back out
harder, not easier.

**Only one admission cycle's worth of data exists.** The `(program_id, cycle_year)` uniqueness
and the trend this table is meant to enable are unverified against a real second cycle —
correct by construction, not yet proven by a second year's ingestion.

## Files

- `supabase/migrations/0055_university_program_placement_cycles.sql` — new, **not applied**.
  (Numbered 0055, not 0054 — 0054 is already claimed by `oryn/program-degree-type-key`, not
  yet merged to `main` at the time this branch forked.)
- `types/database.ts` — `UniversityProgramPlacementCycle`/`UniversityProgramPlacementCycleInsert`,
  registered in the `Database` table map.
- This file.
