# Claude 2 (programs & opportunities intelligence) → founder / Claude 1

## 2026-08-18: pivot from product/UX to data acquisition, per direct founder instruction

The founder sent a detailed, deliberate reassignment (Turkish, full text preserved in this
session's own transcript): product/UX work is complete, stop building product features, and
switch to "ORYN DATA BASE — PROGRAMS & OPPORTUNITIES INTELLIGENCE" — university programs,
requirements, and the opportunity catalog. Explicitly not university canonical
registry/identity/aliases/duplicates/spine — that stays "Claude 1"'s (this repo's established
"Claude A", on `oryn/university-intelligence-spine`).

This is structurally the same "Claude 2 = programs/opportunities" mandate that arrived earlier
this same session mid-turn and was explicitly disregarded at the founder's own instruction
("okey promtu boşver o zaman ama durma" — "ok forget that prompt then, but don't stop"). This
time it arrived as a fresh, complete, deliberate message that explicitly names this session's
prior work as finished and gives a full, detailed, thought-through spec — not a stray paste.
Treated as a genuine reassignment, not a repeat of the earlier mistargeting, but verified
before acting rather than assuming:

- `origin/oryn/programs-pipeline-reconciled` (established "Claude B" territory for exactly
  this data) has had **zero commits for ~14 hours** as of this pivot (last commit `ca20671`,
  2026-08-17 21:17) — no live-collision risk found.
- `origin/oryn/university-intelligence-spine` (Claude A) had a commit **16 minutes before**
  this pivot started, confirming that session is active and still working strictly within
  its own described scope (a university detail-page metrics fix, not programs/opportunities).

## Branch setup

New branch `oryn/programs-opportunities-intel`, worktree at
`.claude/worktrees/programs-opportunities`, created from `origin/oryn/programs-pipeline-reconciled`
(preserving Claude B's existing infrastructure — `lib/acquisition/identity.ts`'s
`resolveIdentity()`, `program_research_queue`, the ingestion scripts, 182 already-verified
programs — rather than rebuilding any of it), then merged with the latest
`origin/oryn/university-intelligence-spine` to pick up Claude A's newest canonical-entity/dedup
work. This branch does **not** descend from `oryn/product-ux` (this session's own prior
branch) — that work is finished, pushed, and left alone; nothing from it is needed here per
the founder's own "UI changes only if data is truly unusable" instruction.

**Merge reconciliation, not a blind auto-merge:**
- Real migration-number collision: both branches independently created `0043` (this branch's
  `university_programs_enrichment`, already applied live; spine's
  `university_duplicate_supersession`, not yet applied). Spine's file left untouched (not my
  territory, and it's not applied yet so nothing depends on its number); this branch's
  renumbered to `0044` — confirmed safe via `list_migrations` (it's tracked live by a
  synthetic timestamp version from its `execute_sql`-based apply, not by parsing the
  filename).
- One real content conflict in `app/(app)/universities/[id]/page.tsx`: both branches had
  independently extended the same page in complementary ways (spine: superseded-university
  redirect + rankings + research-topic metrics; this branch: subject-grouped program
  display). Merged by hand to keep both — full detail in commit `33115bc`.

Baseline re-verified on the merged commit before starting: lint/typecheck clean, 725/725
tests, clean production build (36 routes, all matching what each side had independently).

## Live baseline, measured before any new work (not assumed)

```
university_programs: 182 total, 49 universities represented, 0 universities with ≥5 programs
  by subject: economics 51, computer_science 33, business 24, other 22, engineering 21,
  artificial_intelligence 7, political_science 6, mathematics 5, finance 4, law 3, design 2,
  international_relations 2, physics 1, entrepreneurship 1
  — zero rows for medicine, psychology, architecture
  verification_state: 182 verified_current (100% — none unverified, matches the ingestion
  pipeline's own "only insert what clears the VERIFIED_CURRENT gate" design)
program_research_queue: 182 accepted, 32 unresolved_university, 29 insufficient_evidence
university_requirements: 15 (thin)
universities total: 1019

opportunities: 11 total
  by category: competition 4, summer_program 3, entrepreneurship 3, research 1
  — zero rows for internship, scholarship, online_program, fellowship
  verification_state: 6 verified_current, 4 unverified, 1 verified_historical
  cycle_status: 4 closed, 4 unverified, 2 open, 1 upcoming
  5 of 11 have a deadline
```

## Major discovery: a large, already-verified Drive corpus exists, not yet fully mined

Found via Drive search (not assumed from the founder's file-name list) a numbered series of
already-researched spreadsheets, apparently from an earlier pass this same week
(`2026-08-15` timestamps throughout): `02_ORYN_University_Programs.xlsx`,
`03_ORYN_Program_Requirements.xlsx` / `03B ORYN Detailed Verified Requirements — 200 Programs`,
`04_ORYN_Summer_Programs.xlsx` (199 verified identity records, confirmed by direct read),
`05_ORYN_Online_Programs_and_Internships.xlsx`, `06_ORYN_Competitions_and_Awards.xlsx`, plus a
`10 ORYN Canonical App Data Pack — Verified 2026-08-15` that looks like a consolidated,
ready-to-map master file, and a narrative `ORYN University & Opportunity Enrichment —
Canonical Report` doc. A `99_SUPERSEDED_...` copy exists too — explicitly superseded, not
used.

## Parsing `04_ORYN_Summer_Programs.xlsx`: a real duplicate-emission bug, found and fixed

Drive's markdown-flattening of the sheet escapes `_`/`*`/`!`/`-` and collapses row-separating
newlines into spaces, so the sheet needed a custom parser (regex-split on the
`ORYN-OPP-\d{4},` record-boundary pattern, per-chunk CSV parse, unescape). First pass produced
309 records — more than the sheet's own stated "199 Verified identity records" — no obvious
section-boundary bug explained the gap. Root-caused by checking for duplicate
`opportunity_id`s directly: **94 of the 309 rows were exact duplicates** (byte-identical
JSON, confirmed by diffing every duplicate group) of another row already in the 309 — a pure
parse artifact, not conflicting data. Deduping by `opportunity_id` (keep first occurrence)
gives **215 unique records**, and the corrected breakdown matches the sheet's own stated
numbers almost exactly: 95 "2026 cycle confirmed" (sheet says 95), 17 "Review/quarantine"
(sheet says 17 — exact match), ~198 "Verified*" (sheet says 199). Any future parse of this
sheet, or of `05`/`06` using the same script shape, must dedupe by the record-id column
before trusting counts.

Even after deduping, **the sheet's own `current_cycle_status` tag is not reliable at the
per-record level** — found by manually reading, not by a year-regex (a regex checking for
"2026 present in the evidence text" produced a false negative: one record's page had an
unrelated "2026" mention from a scraped academic-calendar snippet, masking that the record's
*own* dates were 2024). Of the 16 unique records tagged both "Verified - provider page
accessible" (the strongest identity tier) and "2026 cycle confirmed" (the strongest cycle
tag), hand-reading all 16 found: 1 flatly wrong (İTÜ Tasarım Atölyesi — page evidence is
explicitly dated April–June **2024**, excluded entirely), 3 with identity confirmed but zero
actual cycle-date evidence in the captured text (Oxbridge Academic Programs, Sabancı Uni Yaz
Okulu, Notre Dame Summer Scholars — ingested with `cycle_status: unverified` rather than
trusting the sheet's tag), and 2 already live in `opportunities` (PROMYS, LaunchX — confirmed
by query before writing the batch, and separately re-confirmed by `decideIngestion()`'s own
dedup check catching both). The remaining 10 had real, specific, corroborating date/fee
evidence in their own captured text and were ingested as `verified_current` /
`cycle_status: upcoming` (or `closed` for KU Leuven, whose own page says 2026 applications
already closed).

**Batch 1 result** (`data/research/opportunities/drive_batch1_2026-08-18.jsonl`, 15 records
run through the real `decideIngestion()` from `lib/opportunities/ingest.ts`, not
reimplemented — `SUPABASE_SECRET_KEY` still unavailable, so `existing` was fetched via
Supabase MCP `execute_sql` and the accepted rows applied the same way instead of via the CLI
script): **13 accepted, 2 correctly caught as duplicates**. `opportunities` went from 11 → 24
rows; `summer_program` category from 3 → 16. Every accepted row has a matching
`opportunity_sources` provenance row (`source = official_primary`, `source_confidence = high`,
`verified_at = 2026-08-15` — the date the underlying page was actually fetched, not today's
date, since I didn't re-fetch it myself). Full lint/typecheck/725-test/build gate re-run clean
after this batch.

**Not yet mined from this same sheet**: the remaining ~185 unique records outside this
strictest "page-accessible + 2026-confirmed" tier — including the large
"Verified - official/provider search evidence" tier (102 records, ambiguous whether that
means a fetched page or a search snippet — needs its own per-record read before trusting) and
the "provider page accessible; exact naming needs normalization" tier (20 records). Next
batch should work through those, then move to `05_ORYN_Online_Programs_and_Internships.xlsx`
and `06_ORYN_Competitions_and_Awards.xlsx` (structure not yet confirmed — apply the same
dedupe-by-id check immediately after parsing, before trusting any count from either file).
