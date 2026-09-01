# Turkish university depth (Gate F) — what's there, what it costs a student, what's closeable now

**Status:** report + re-verified staging data. No `--apply` run, no DB writes. **Author lane:**
oryn-60, at oryn-a7's request. **Base:** local `main`. All figures below re-measured live today
(2026-09-01) against `qtcvcflzxbuagvvwahhu`, not carried forward from the 2026-08-22 handoffs
this builds on.

---

## 0. The finding that reframes the other two

**`university_program_placement_cycles` — the table every YÖK Atlas script reads and writes —
has no read side anywhere in the product.** Grepped `app/`, `features/`, `lib/` for the table
name outside the ingestion/matching code itself: nothing. The university detail page
(`app/(app)/universities/[id]/page.tsx:122-130`) queries `university_programs`,
`university_requirements`, `university_deadlines`, `university_statistics` — never this table.

This matters for how to read everything below it. **Applying the 265 staged rows in §3 would not
show a single student anything new today.** The data-ingestion gap and the display gap are two
separate gaps, and only closing both makes a Turkish 16-year-old's comparison page look
different. §3 closes the first with existing infrastructure, exactly as asked. The second is a
real UI feature (a cutoff/rank card per programme, reading a table with an explicit
"a student reasoning about whether a programme is in reach needs this year's cutoff against last
year's trend" design intent already written into migration 0055's own header) — new
infrastructure, out of scope for today, named here so it isn't assumed to already exist.

---

## 1. What's actually there

**12 Turkish universities in the catalogue. YÖK Atlas's own live `universiteler` list holds 228**
(fetched today, confirmed: state + foundation universities of every type and size, not filtered
to research-competitive institutions — 228 is the honest denominator, not a refined "comparable"
subset, which this pass did not attempt to classify).

Per-university depth, live, today:

| University | Programs | Requirements | Deadlines | Placement cycles |
|---|---|---|---|---|
| Ankara Üniversitesi | 153 | 7 | 2 | 153 |
| Middle East Technical University (ODTÜ) | 136 | 11 | 2 | 79 |
| Istanbul University | 124 | 2 | 1 | 120 |
| Hacettepe University | 101 | 9 | 1 | 51 |
| Istanbul Technical University (İTÜ) | 69 | 6 | 1 | 44 |
| Yıldız Technical University | 43 | 1 | 1 | 0 |
| Bilkent University | 33 | 4 | 1 | 0 |
| **Boğaziçi University** | **30** | **5** | **1** | **0** |
| Özyeğin University | 24 | 2 | 1 | 0 |
| Gebze Technical University | 23 | 1 | 2 | 0 |
| **Koç University** | **22** | **17** | **4** | **0** |
| Sabancı University | 21 | 9 | 1 | 9 |

The 12 is not an arbitrary subset that happened to accumulate — it is the literal, hardcoded
`TARGET_UNIVERSITIES` list in `scripts/fetch-yok-atlas-placements.ts`. The catalogue's breadth
ceiling and the pipeline's own target list are the same 12 names; growing one requires
deliberately growing the other (see §4).

**The existing pipeline, read first as instructed:**

- `scripts/fetch-yok-atlas-placements.ts` — keyless, hits `yokatlas.yok.gov.tr`'s own
  `api/tercih-kilavuz/{universiteler,search}` endpoints directly. Ran it fresh today: **228
  universities, 21,493 total placement records nationally, 1,005 filtered to the 12 target
  universities.** Writes a local JSON staging file — no DB access at all, nothing here needed
  founder gating.
- `scripts/ingest-yok-atlas-placements.ts` — matches the fetched records against existing
  `university_programs` rows (via `lib/programs/yok-atlas-matching.ts` + a bilingual English/
  Turkish name bridge for the 6 universities whose programme names are recorded in English) and
  inserts into `university_program_placement_cycles`. **Never touches `university_requirements`
  or `university_deadlines`** — those tables have no automated Turkish pipeline at all;
  `lib/requirements/discover.ts`'s job only ever selects universities with **zero**
  `university_requirements` rows, and all 12 already have at least one, so it would never pick
  any of them regardless of how thin their coverage is.

---

## 2. What the gap costs a student

**All four of Boğaziçi, ODTÜ, İTÜ and Koç are in the catalogue.** That is the direct answer to
the question as asked — a student is not blocked by absence on the four names most likely to
come up in one comparison.

**What they'd actually see is uneven, though, in a way that lands worst on exactly the two most
selective names.** Cutoff-cycle coverage: ODTÜ 79/136 programs (58%), İTÜ 44/69 (64%) — real
data — versus **Boğaziçi 0/30 and Koç 0/22 — nothing at all**, not because the data doesn't
exist (§3 shows it does, and cleanly) but because it was never ingested. A student comparing all
four today sees real numbers for two and silence for the two hardest to get into — the opposite
of where a 16-year-old most needs the number.

**`university_requirements`/`university_deadlines` are thin across all 12 uniformly** (1-2
deadlines regardless of programme count; Koç's 17 requirements is the one outlier, everyone else
in single digits against 20-150+ programmes). This is real and worth closing eventually, but
`lib/admissions/system-shape.ts` changes how urgent it is relative to the placement-cycle gap:
Turkey's domestic pathway is modeled as `academic_rank_competitive` — "no application file at any
point — no essay, no interview, no recommendation letter, no activity record." For a holistic-
review country, a thin `university_requirements` table hides real, decision-relevant criteria.
For YKS, the number that actually decides admission **is** the cutoff/rank data in §0's
unread table — `university_requirements` was never going to be where the decisive fact lives for
a domestic YKS applicant. The genuinely missing administrative facts (which exam track a
programme accepts, the national placement calendar's actual dates) are real gaps, just smaller
and lower-stakes ones than the cutoff-coverage asymmetry above.

**Nothing here risks the reach/competitive/likely mislabeling constraint.** `computeAdmissionOutlook`
already gates that scale on Gate 1 (`reviewsNonAcademicEvidence`), and Turkey's entry returns
`false` — the product does not and would not show that framing for a YKS target regardless of
how much placement data lands. §3 stages placement facts, not an outlook label.

---

## 3. What the existing pipeline closes today — staged, not applied

Re-ran the full pipeline against live data (fetch for real; the match/insert step via the same
`matchYokPlacements`/`buildKilavuzBridge` functions the real ingest script calls, fed from a
Supabase MCP snapshot instead of the script's own direct PostgREST call, which hits the exact
401 its own header comment already documents from the lane that first wrote it — a known local
credential quirk, not something this pass diagnoses further):

**265 new `university_program_placement_cycles` rows would insert cleanly today — identical to
the 265 the 2026-08-22 handoffs already predicted.** `university_program_placement_cycles` is
unchanged at 456 rows since that date, so nothing has drifted; the already-completed bilingual-
name research (`data/research/university-programs/tr_bilingual_names_*.jsonl`, 175 programmes
across the 6 English-named universities) still resolves correctly against fresh live data.

| University | Programs on file | New rows ready | Unmatched | Ambiguous |
|---|---|---|---|---|
| Bilkent | 33 | 72 | 0 | 0 |
| **Boğaziçi** | 30 | **27** | 13 | 0 |
| Gebze Technical | 23 | 20 | 2 | 0 |
| **Koç** | 22 | **53** | 0 | 0 |
| Özyeğin | 24 | 59 | 3 | 0 |
| Yıldız Technical | 43 | 34 | 10 | 0 |
| Ankara, Hacettepe, İTÜ, İstanbul, ODTÜ, Sabancı | — | 0 | 108 (mostly İTÜ/Hacettepe) | 3 (İstanbul) |

Applying this would take Boğaziçi from 0/30 to ~27/30 programs with real cutoff data and Koç to
full coverage (53 cycle rows across 22 programs — several carry more than one fee-tier variant).
It does not touch the six already-saturated universities' remaining unmatched/ambiguous records —
those are name-matching and faculty-disambiguation gaps in the core matcher, a different and
smaller problem than the bilingual-bridge one this data closes.

**23 records are blocked by a real schema gap, not a data gap, and the fix is already written.**
`docs/handoffs/yok-placement-key-gap-2026-08-22.md` found the same 23 collisions on
2026-08-22 (reproduced exactly, unchanged, today): the unique index on
`university_program_placement_cycles` is `(program_id, cycle_year, burs_orani_adi, fymk_id)`,
one field short of `kilavuz_kodu` — YÖK's own stable per-record identifier, already stored on
every row — which is exactly what distinguishes pairs like Yıldız Teknik's two real, differently-
quota'd admission tracks currently colliding onto one key. **The fix is already staged**:
`supabase/migrations/0059_schema_gaps_2026-08-22.sql` widens the index to include
`kilavuz_kodu`. Confirmed live today the index has not been widened
(`pg_indexes` still shows the 4-column form) — this is a founder-authorization gap, not a
missing-migration one, and it was not yet its own tracked backlog item (item 26 is a different,
related migration — a `kilavuz_kodu` *column* on `university_programs` for source traceability,
not this index). Added as item 40.

**Per instruction, nothing was applied.** `data/research/yok-atlas-placements-2026-08-21.json`
in this branch is today's live re-fetch (same filename, current content — the script hardcodes
that path) — a current, verified staging artifact, ready for `ingest-yok-atlas-placements.ts
--apply` once (a) the founder authorizes the write and (b) someone with working local Supabase
credentials runs it (or the 401 is resolved) for the 265, and once migration 0059 is authorized
and applied for the remaining 23.

---

## 4. What this does NOT do

- No `--apply` run. `university_program_placement_cycles` is unchanged at 456 rows.
- No migration applied. The index is still the 4-column form.
- No new universities added to the 12 — growing past YÖK Atlas's 228 would mean growing
  `TARGET_UNIVERSITIES` and doing new bilingual-name research for whichever are added, both real
  work not attempted here.
- No `university_requirements`/`university_deadlines` rows added — no existing pipeline reaches
  those tables for Turkey; closing that gap needs new research work, not a re-run.
- No read-side UI built for `university_program_placement_cycles` — see §0. This is the
  highest-leverage actual next step and is deliberately not built here, both because it's new
  infrastructure (outside today's "run and extend" scope) and because staging 265 rows nobody
  can see yet is the wrong order to do real UI work in.
