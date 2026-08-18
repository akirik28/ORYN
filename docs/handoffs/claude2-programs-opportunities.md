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
the "provider page accessible; exact naming needs normalization" tier (20 records).

## Batch 2: `05_ORYN_Online_Programs_and_Internships.xlsx` + a new `online_program` category

Prioritized this file next over mining deeper into `04` because `internship`, `scholarship`,
`online_program`, and `fellowship` were still all at zero — breadth into empty categories is
higher-value right now than more depth in one already-improved category. This corpus is much
smaller (README states 13 verified identity / 3 "2026 confirmed" / 1 review — small enough to
read the whole file in one `read_file_content` call, no pagination/chunking needed) and its
sections legitimately overlap (a few ids appear in both the full "Verified_Records" list and
the "Current_2026...Confirmed" subset list — intentional, not the same duplicate-emission bug
as `04`).

Hand-reading found the same per-record unreliability pattern as batch 1, worse in one respect:
several records marked "Verified - official/provider search evidence" have a
`verification_note` that says outright *"Direct page retrieval was blocked or failed; identity
was corroborated with an official/provider search result"* — i.e. the corpus's own notes admit
the page was never actually fetched, only search-corroborated, even though it's still labeled
"Verified". Excluded all such records from this batch on that basis (Inspirit AI's own
evidence text also independently confirmed this was right — it cited Spring/Summer **2025**
application deadlines despite being tagged "2026 cycle confirmed"). Same for records whose
`identity_verification_status` says "direct retrieval failed" outright (Boğaziçi BOUN 101,
CTY Online, Wall Street 101 as captured, SIP as captured) — excluded from the corpus's own
data, but see below.

**New this batch: live re-verification, not just trusting or discarding the corpus.** For the
"retrieval failed" records with real-looking evidence (BOUN 101, CTY, SIP, Wall Street 101,
Inspirit AI), fetched the official URL directly with WebFetch instead of just excluding them.
Results: BOUN 101's exact URL now 404s (confirms exclusion was correct — it was the dead 2024
course page); CTY blocked the fetch (403, left excluded, unresolved); **SIP, Wall Street 101,
and Inspirit AI all fetched successfully with genuinely current 2026 data** (SIP's live dates
even cross-validated the corpus's own secondary-source date claim exactly: June 22 – Aug 7,
2026). Also live-verified three "page accessible" records with spot-checkable date claims
(Özyeğin, Columbia Online Summer, Stanford ULO) rather than trust the tag at face value —
worth flagging: **the same URL fetched twice with differently-worded prompts returned
different (both individually accurate) date ranges for Stanford's multi-term ULO page**, since
the page lists Fall/Spring/Summer terms together and the extraction sampled different terms
each time. Resolved with a third, explicit fetch ("list every term separately") rather than
picking one arbitrary answer — the record ended up representing the Fall 2026-2027 term with
`cycle_status: closed`, since that term's own application deadline (July 27, 2026) had already
passed as of the verification date (2026-08-18). Records live-verified this way use
`researched_at: 2026-08-18` (today, when I actually fetched them) rather than the corpus's
`2026-08-15`, to keep provenance honest about who fetched what when.

Also caught mid-batch: **`UNITED NATIONS ONLINE — UNO 2026`'s own name is misleading.** Live
fetch confirmed this is a private company (Stanley Prep) program run in partnership with
WFUNA, not an official UN program. Kept the record (it's real and legitimately valuable) but
set `organization: "Stanley Prep"` (not "United Nations") and made the description explicit
about the non-affiliation — an easy place to have accidentally published a materially
misleading claim to a family.

**Schema change**: none of the "online" records fit any existing `opportunity_category` value
— the closest, `academic_program`, doesn't distinguish "fully online, from anywhere" from
"in-person, on a campus," a real distinction for cost/travel/visas, and the founder's own spec
names `ONLINE_PROGRAM` as a distinct target category. Since `opportunities` is this branch's
own schema territory (not spine's), added migration
`0045_opportunity_online_program_category.sql` (`ALTER TYPE opportunity_category ADD VALUE`)
and updated the four places the category enum is hardcoded in app code:
`types/database.ts`'s `OpportunityCategory`, `lib/opportunities/ingest.ts`'s
`VALID_CATEGORIES`, `lib/opportunities/matching.ts`'s `CATEGORY_DIMENSIONS` (TypeScript's
`Record<OpportunityCategory, ...>` requiring every key caught this one at typecheck — added
`online_program: ["intellectual_curiosity", "academics"]`, mirroring `academic_program`), and
`lib/ai/opportunity-extraction.ts`'s Zod schema. No UI change needed — this branch has no
category-filter or category-label UI yet (that work is on the separate `oryn/product-ux`
branch, not merged into this one), and the opportunity card doesn't render a raw category
string anywhere.

**Batch 2 result** (`data/research/opportunities/drive_batch2_2026-08-18.jsonl`, 9 records, all
9 accepted, 0 duplicates): `opportunities` 24 → 33. Category breakdown after: competition 4,
summer_program 16, entrepreneurship 3, research 3 (was 1 — Özyeğin, SIP), online_program 6
(new), internship 1 (new — InvestIN). `scholarship` and `fellowship` still at zero — not
covered by this file. Full lint/typecheck/725-test/build gate re-run clean after this batch.

## Batch 3: `06_ORYN_Competitions_and_Awards.xlsx`

README states 54 verified identity / 23 "2026 confirmed" / 3 review. File was too large for
one `read_file_content` call (98K chars) — extracted via `jq` to the scratchpad and parsed
with the same script shape as `04`/`05`, this time with the dedupe-by-id step built in from
the start rather than bolted on after: 80 record boundaries found, 77 parsed cleanly, 55
unique after dedup, **zero mismatched duplicate groups** (same clean pattern as `05` — the
`04` file's duplicate-emission bug hasn't recurred here).

**New failure mode this batch, not seen in `04`/`05`: the corpus's `current_cycle_status` tag
can be right about the *year* while my own re-verification fetch is wrong about *whether that
year is still in the future*.** Several records read as clearly evidencing "2026" (IYPT's
page literally said "Relive the IYPT 2026 Final in Zurich!", CMIMC gave an exact March 28 /
April 18-20 2026 date) — but today's actual date is 2026-08-18, so events with 2026 dates
earlier in the year have **already happened**. This matters because the WebFetch extraction
step itself doesn't know today's date and will confidently assert something like "registration
is currently open" purely from the page's own forward-looking phrasing, without checking that
against the present. Concretely: BIYSC's fetch summary said the July 2026 (10th edition) "is
the next one students can currently apply to" — wrong, that edition already ran; the correct
next cycle is BIYSC 2027 (applications open December 2026, per the same fetch's own quoted
text). YIS Stock Pitch's fetch said its cycle "has not yet closed" — wrong, its own quoted
deadline (February 20, 2026) is six months in the past. Both were corrected by hand: the
quoted facts from each fetch were trustworthy, the fetch's own "is this current" *conclusion*
was not, and had to be checked myself against 2026-08-18. Worth remembering for every future
batch, not just this one: **always do the today-vs-quoted-date comparison manually — never
trust an extraction step's own framing of "current/upcoming/still open".**

Also excluded `Stockholm Water Prize` entirely rather than guess — this file's competition/
award category mixes genuine student competitions with what may be the *main* (career-
achievement, not student) Stockholm Water Prize; a clarifying WebFetch came back truncated/
inconclusive, and given the real risk of misrepresenting a career-researcher award as
something a high schooler can enter, left it out rather than publish an unverified guess. A
cleaner path for a future batch: look up the Stockholm *Junior* Water Prize's own site
directly (siwi.org) instead of this ambiguous URL. Two live-fetch attempts (Battlecode-MIT,
iGEM's general competition page) failed outright (socket closed / empty content) — left both
out; iGEM doesn't need re-adding regardless, it's already live (`iGEM High School
Competition`, added in an earlier session).

**Batch 3 result** (`data/research/opportunities/drive_batch3_2026-08-18.jsonl`, 9 records: 120
Hours, BIYSC, IYPT, STEM Racing, WWD Youth Art Contest (IFAW), YIS Stock Pitch, BrUMO, CMIMC,
plus GENIUS Olympiad as a dedup-check) — **8 accepted, 1 correctly caught as duplicate**
(GENIUS Olympiad, already live from an earlier session). `opportunities` 33 → 41. Full
lint/typecheck/725-test/build gate re-run clean after this batch.

**Cumulative so far this pivot** (baseline 11 → 41, +30 across three batches): competition 4→12,
summer_program 3→16, research 1→3, online_program 0→6, internship 0→1, entrepreneurship 3
(unchanged). `scholarship` and `fellowship` still at zero — none of the three founder files
mined so far (`04`/`05`/`06`) produced a clean-evidenced scholarship or fellowship candidate;
worth targeted independent research once the founder corpus is exhausted (per PRIORITY 6).

**Next**: founder's named opportunity files (04/05/06) are now substantially mined at their
highest-confidence tiers. Remaining lower-confidence tiers in each file (the large
"official/provider search evidence" buckets — ambiguous whether page-fetched or search-only,
same discipline required) are a option for a future pass, but marginal value is dropping
per-record. Higher-leverage next step is likely pivoting to Priority 1 (university programs —
still only 182 rows / 49 universities, 0 with ≥5 programs) or beginning independent research
into scholarship/fellowship candidates specifically, since the founder corpus produced zero of
either.
