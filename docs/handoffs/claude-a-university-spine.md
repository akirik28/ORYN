# Claude A — University Intelligence Spine — live handoff

Owner: Claude A. Scope: `universities`, `university_rankings`, `university_profile_metrics`,
`university_sources`, `university_deadlines`, `canonical_entities`/`entity_*` for
entity_type='university', and the `lib/acquisition/*` pipeline. **Not** in scope:
`university_programs`, `university_requirements` (read-only), `opportunities`,
`opportunity_sources` — owned by the parallel programs/opportunities workstream
(`oryn/programs-pipeline-reconciled`, HEAD `955865c` as of this session).

This file is updated as work lands, not chronologically archived — read top-to-bottom for
current state, not as a session log.

## Current state

- Branch: `oryn/university-intelligence-spine`, pushed to origin, tracking. Base: `main` @
  `b92c72f` (the tip when this session started; contains the Phase 2 verified-acquisition
  architecture and the live full-spine run from the prior session).
- Latest commit on this branch: `1931c54`. Commits this session, in order: `d0f276c` (8
  confirmed duplicate identities merged), `e883c8c`/this file, `2005846` (OpenAlex circuit
  breaker), `b223373`/`24ce238` (admissions acquisition + a live-caught false-positive fix),
  `9aef391` (full-spine fixture regenerated + applied), `4450b60` (73 evidence-less
  official_verified entities downgraded), `1931c54` (entities-audit.ts 1000-row truncation
  fix).
- `SUPABASE_SECRET_KEY` is live and working this session (`check:integrations`: Supabase +
  secret key OK, Tavily OK). **No Supabase MCP and no linked CLI/direct-Postgres access in
  this session** — DDL (migrations) cannot be applied by me; only PostgREST reads/writes and
  existing RPCs (e.g. `merge_canonical_entities`) are reachable. This is the one hard
  capability gap this pass ran into.
- Anthropic: `check:integrations` reports **"insufficient credit balance"** (billing, HTTP
  400), not a missing-key error — a founder billing action, not a code problem. Blocks
  AI-structured admissions/requirement extraction.
- OpenAlex: as of 2026-08-17 ~14:30 UTC, returning HTTP 429 with a JSON body reading
  `"Insufficient budget... $0 remaining. Resets at midnight UTC", retryAfter: 34062` — this
  is a materially different failure than a plain rate limit; worth the founder's attention
  since prior docs describe OpenAlex as unconditionally free/keyless. Blocks
  `research_topics_top5` acquisition (currently 30/1010, unchanged this pass).

## Measured baseline (live, `npm run report:universities`, 2026-08-17)

```
universities total                        1010
QS ranking                            1009 / 1010  (99.9%)
country                                1010 / 1010  (100%)
city                                   1010 / 1010  (100%)
official website                        809 / 1010  (80.1%)
admissions URL                            0 / 1010  (0%)     — migration 0042 columns exist, unpopulated
application system                        0 / 1010  (0%)
institution type                        764 / 1010  (75.6%)
description                               4 / 1010  (0.4%)
coordinates                              800 / 1010  (79.2%)
student_size (synced to UI)             283 / 1010  (28.0%)
total_students metric                   283 / 1010  (28.0%)
undergraduate/postgraduate/international/faculty_count/student_faculty_ratio metrics
                                           0 / 1010  (0%) each — no source identified yet, see below
university_programs (Claude B's)          130 rows
canonical_entities (entity_type=university, live, non-merged)   1075 (was 1083 before Phase 2 merges)
```

`undergraduate_students`/`postgraduate_students`/`international_students`/`faculty_count`
metrics: investigated and deliberately NOT built this pass. Wikidata's P2196 ("students
count") is the only reasonably-populated enrollment property for most institutions; I found
no reliable, widely-populated separate undergrad-only/grad-only property, and the closest
faculty-adjacent property (P1128 "employees") would overstate faculty count by including
non-academic staff — using it would violate this product's own "never fabricate/overstate"
rule. These four stay honestly at 0% pending either a per-institution official-source pass
(needs Tavily+AI, i.e. blocked on the Anthropic credit balance) or a better-sourced bulk
signal I haven't found yet. Not silently skipped — flagged here.

## Phase 2 — duplicate identities: done for the confirmed set

`scripts/university-duplicates-audit.ts` (pure classifier in `lib/acquisition/duplicates.ts`,
10 unit tests). Two detectors, run every time:

1. **Exact `normalized_name` collision** — 43 pairs (reproduces migration 0039's own
   self-join). Investigated in full: **every one is an orphan duplicate** — one side has
   **zero** linked `universities` rows (never got a website, external ids, or a QS ranking;
   `official_verified` with no supporting `entity_evidence` row — almost certainly the same
   root cause as founder-blocked-backlog.md item 20's "78 official_verified with no
   evidence"). **No visible product impact** (University Explorer reads `universities`, not
   `canonical_entities`, so an orphan row with no `universities` row never renders a card).
   Registry-cleanliness issue, not a user-facing bug. Not merged — no external-id evidence
   exists on the orphan side to clear the SAFE bar, and city+name alone is exactly the
   "fuzzy match" this product's rules forbid auto-merging on.

2. **Name-variant collision** (article/parenthetical-acronym-aware, via
   `nameVariants()`/`nameKey()`) — catches "The X" vs "X" and "X (ABBR)" vs "X", which
   `canonical_entities.normalized_name`'s own DB trigger does **not** fold together (bare
   `lower(unaccent())`, no article stripping). **28 pairs remain** after this pass (down
   from 34 — 6 merged). Of the original 34, exactly **6 had two real `universities` rows on
   both sides** — an actual duplicate card in the University Explorer. Combined with 2 more
   found by targeted manual search (UCL/University College London — pure acronym vs full
   name, no shared `nameVariant`; Al-Farabi — names differ too much for `nameVariants()` to
   catch) and 1 found by the Phase 5 rankings audit (KFUPM — see below), that's **9
   confirmed, live-verified, merged this pass**:

   | Institution | Winner `universities.id` | Loser (superseded, pending 0043) | Evidence |
   |---|---|---|---|
   | MIT | `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` | `ba3a30b2-c6e2-4a0f-ba32-6da028175d35` | ROR `042nb2s44`, both names, live-checked |
   | UCL / University College London | `03c8faf1-4b30-47fe-b09e-8851b96c1f6e` | `cf8adcbd-7164-462e-ba76-f95ef23214ea` | ROR `02jx3x895` for the full name; "UCL" internationally unambiguous, same city |
   | HKUST | `75761b06-781d-4e7a-8e05-9d6a116771c9` | `29e16fe0-3f8f-46d3-8d34-f5fa48370a14` | ROR `00q4vv597` (not the separate real HKUST-GZ, `050h0vm43`) |
   | LSE | `cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d` | `cc117524-044e-49b9-8ddd-a628d021d3e1` | ROR `0090zs177` |
   | University of Warwick | `0b204add-2507-45b0-85f4-917e725b16c2` | `ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5` | ROR `01a77tt86` (founder-blocked-backlog.md item 25); loser's city was literally "England" |
   | University of Technology Sydney | `6c88ddfe-1b49-411f-a4e8-bb82436ae1ed` | `f1d7d625-4c39-4132-a54e-e567e1390185` | ROR `03f0f6041` (not "University of Sydney", `0384j8v12`) |
   | University of Newcastle, Australia | `54d29f0d-ce64-4342-ba0f-0d0895e36797` | `6bdd71e9-9ab3-4f64-bf9b-b6a821784115` | ROR `00eae9z71` (not UK Newcastle University, `01kj2bm70`) |
   | Al-Farabi Kazakh National University | `37f12391-462d-4aba-8947-d9cf159627cb` | `6f0df596-4ee5-49da-82ad-8057bfaa890d` | Loser's own name is self-referential ("former Al-Farabi..."); winner carries 5 external ids, loser none |
   | KFUPM | `62929169-4cb9-4ef2-b1f4-bfd1b34cf164` | `0e01bc5d-0e1e-4e35-a629-2befec4e3cb3` | Found via Phase 5 (below), not the name detectors — see that section. ROR `03yez3163` lists both "KFUPM" and the full name on one record |

   `merge_canonical_entities()` ran for all 9 (audit trail in `canonical_entity_merges`,
   `reason` column carries the full citation). This merges the **identity layer only**
   (aliases, external ids, evidence, repoints `universities.canonical_entity_id`) — it does
   **not** touch the `universities` rows, which is why the table above still lists two
   distinct `universities.id`s per row. Restored a "UCL" alias on the surviving entity
   (the merge doesn't carry a tombstoned row's own `canonical_name` forward as an alias, and
   "UCL" had no separate `entity_aliases` row of its own before the merge — would have
   silently become unsearchable otherwise).

   **Winner selection**: real data richness, not `verification_state` (empirically not a
   reliable signal — Al-Farabi's `official_verified` side was the *data-rich* one, the
   opposite of every other pair). Governing signal: **does this side already have real
   `university_programs` rows** (4 of 8 pairs did — LSE, UCL, University of Warwick, MIT, all
   on what turned out to be the data-richer side anyway) — that side always wins, since
   losing it would silently orphan the parallel workstream's data. Confirmed zero
   `university_requirements` and zero `target_universities` rows on any of the 16
   `universities.id` involved (checked read-only before acting).

### What's still open on this specific finding — needs founder action

**Migration `0043_university_duplicate_supersession.sql` is written, committed, NOT applied.**
Adds `universities.duplicate_status` (`'canonical'|'superseded'`) and
`universities.superseded_by_id`. This is the fix for the actual visible symptom (both
`universities` rows for, e.g., MIT still exist and would both still render in the University
Explorer as separate cards) — `merge_canonical_entities()` alone doesn't touch that.

Deliberately **not** a straight `DELETE` of the losing row: `university_programs` and
`university_requirements` both reference `universities(id) on delete cascade`, and 4 of these
8 losing-side candidates could plausibly gain programs/requirements from the parallel
workstream in the future even though today's read confirmed zero — an automated delete
is a standing risk to that workstream's data forever, a superseded flag is not.

**To finish, once someone with DB/DDL access is available:**
1. Apply `supabase/migrations/0043_university_duplicate_supersession.sql` (Supabase SQL
   editor, or grant this session's environment a linked CLI / Supabase MCP).
2. `npm run audit:university-duplicates -- --supersede` — already written, probe-gated
   (confirmed this session: reports "Migration 0043 is NOT applied yet" cleanly rather than
   erroring, when run against the current live state).
3. Add the `duplicate_status != 'superseded'` filter to 4 read paths + 1 dependent join
   (mapped exhaustively this session, not yet edited — holding until the column exists to
   avoid shipping a query that 400s on every request in the meantime):
   - `app/(app)/universities/page.tsx:36` (`select("*")` browse-all path)
   - `app/(app)/universities/page.tsx:41` (unfiltered country list feeding the world-map /
     region-grid explorer counts)
   - `lib/universities/alias-search.ts:83` (`searchUniversityRows()` — shared by explorer
     `q=` search AND `lib/search/index.ts`'s global command-palette search; highest leverage,
     one filter covers two surfaces)
   - `lib/entities/search.ts:111-114` (`searchUniversities()`, the entity-combobox
     university-scope dispatcher)
   - `app/(app)/universities/page.tsx:60-67` (`university_rankings` join, keyed off the
     already-fetched list above — safe once that's filtered, but a second query, so worth
     double-checking after the edit)
4. Re-run `npm run lint && npx tsc --noEmit && npm test && npm run build`, confirm the 8
   superseded rows stop appearing in `/universities` search results for their own name and
   their winner twin's name still does.

### Lower-confidence pairs — documented, correctly not acted on

- **43 exact-name orphan pairs** (see above) — candidates for a future pass once/if the
  orphan side ever gets external ids (would let the SAFE_TO_CANONICALIZE bar activate
  automatically), or as part of a broader Phase 8 pass on the "78 `official_verified` with
  no evidence" question (item 20) — these largely look like the same set.
- **28 name-variant pairs remaining, all orphan-pattern** (one side has 0 `universities`
  rows — zero product impact). Investigated further: **26 of the 28 turned out to be a
  different, stronger evidence class than "similar name"** — their `canonical_name` strings
  are byte-identical after Unicode NFC normalization (composition-form-only differences,
  e.g. precomposed `ü` vs a combining-mark form), and the other 2 differ only by a literal
  non-breaking space vs a regular space, or one missing diacritic. Every one has a matching
  city. This is the DB's own weak `normalized_name` trigger (plain `lower(unaccent())`, no
  Unicode form normalization) failing to catch what's structurally the same string typed/
  imported twice, not two similarly-named institutions.
  - `lib/acquisition/duplicates.ts` gained `isPureEncodingVariant()` (12 new tests) and a
    diacritic-insensitive `citiesCompatible()` to detect this precisely and narrowly — it
    must never fold away an actual WORD (unlike `nameKey()`/`nameVariants()`, which
    deliberately do that for search).
  - **Deliberately NOT wired to auto-merge.** First implementation did wire it to
    `SAFE_TO_CANONICALIZE`, then reverted before committing: this module's one bar for
    authorizing a merge is external verification (an agreeing ROR id) specifically so "how
    confident does the match look" is never itself sufficient to merge — the same principle
    that kept migration 0039's 43 identical-`normalized_name` pairs queued for human review
    instead of auto-merged, even though the architects were themselves confident. Surfaced
    as evidence text in the `LIKELY_DUPLICATE_REQUIRES_REVIEW` bucket instead.
  - **Ready-to-execute follow-up, not done this session**: the same live-ROR-verification
    process used for the 9 already-merged pairs would very likely clear all 26-28 quickly
    (a name this precisely identical is easy to confirm) — deprioritized this session
    specifically because, unlike the 9, none of these have a visible-product-card impact
    (all orphan-pattern), so the time was spent on higher-leverage work instead. Re-run
    `npm run audit:university-duplicates` any time for the live, current list.
- **Correction, same session**: an earlier draft of this file claimed founder-blocked-backlog.md
  item 25's KFUPM pair "does not exist in the live registry" — that was wrong, and was itself
  caused by an incomplete search (canonical_entities searched for "king fahd"/"petroleum"
  substrings; the second row's canonical_name is literally just "KFUPM", matching neither).
  The Phase 5 rankings audit below found it independently (two universities.id rows both
  claiming QS 2027 rank 63, no tie marker) and it's merged now — see the Phase 2 table above
  (9 pairs, not 8) and the Phase 5 section for the full account.
- **founder-blocked-backlog.md item 19's "43 duplicates"** matches this session's exact-name
  pass count (43) — consistent, not independently stale.

## Requests for Claude B

Nothing blocking. FYI only: the `universities.id` for MIT / UCL / LSE / University of Warwick
that already carries your `university_programs` rows is, in every case, the one that survived
as canonical this pass (see table above) — no action needed on your end, just noted in case
you're tracking ids anywhere outside the database itself. If you ever add programs to one of
the *loser* ids in that table before migration 0043 lands and the read-path filters go in,
they'd currently still be visible (the loser row isn't hidden yet) — not a problem, just not
yet deduplicated either.

## Phase 3 — student population: Wikidata index is exhausted, real finding, not a bug

Ran `enrich:student-counts -- --limit 1000` (covers every remaining gap). Result: **1 new row**
(University of Westminster), 6 rejected as stale (pre-2015, correctly not written), **712/719
genuinely unresolved** — no Wikidata P2196 statement with an acceptable domain+date exists for
them at all, not a matching/domain-rule problem. `total_students` is now 284/1010.

This is the honest ceiling for a Wikidata-index approach: the well-documented (mostly
Western/large) institutions were captured in earlier passes; the long tail (smaller/regional
institutions across the QS 1000) mostly isn't on Wikidata with a sourced figure. Closing this
further needs either (a) `ANTHROPIC_API_KEY` credits restored, to build the Tavily-search +
AI-extract path AGENTS.md Phase 3 actually describes for this, reading each institution's own
"facts and figures" page — the architecturally correct path — or (b) loosening the `MIN_ACCEPT_YEAR
= 2015` staleness filter or the domain allow-list in `source-authority.ts`'s `population`
class, neither attempted here since both are deliberate existing quality bars, not bugs.
**Did not build a numeric-extraction-without-AI fallback** — unlike a URL (right domain or
wrong, binary and safe to score), a wrong digit silently accepted as a student count is a much
worse failure mode than finding nothing, and Tavily-only text-regex extraction of a NUMBER is
exactly that risk. Recommend this stays blocked on (a) rather than a workaround.

Investigated `undergraduate_students`/`postgraduate_students`/`international_students`/
`faculty_count`/`student_faculty_ratio` (0% each): no reliable, separately-populated Wikidata
property found for undergrad-only/grad-only splits, and the nearest faculty-adjacent property
(P1128 "employees") would overstate faculty by including non-academic staff — using it would
be exactly the kind of fabrication-by-overstatement this product's rules forbid. Left honestly
at 0%, not attempted with a weaker signal.

## Phase 4 — admissions_url / application_system: built, live-tested, one real bug caught and fixed before scale-up

Tavily-only (no AI — Anthropic credit-blocked). `scripts/acquire-admissions-facts.ts` +
`lib/acquisition/admissions.ts` (16 unit tests). Domain-restricted Tavily search
(`include_domains` = the institution's own already-verified `website_url` host, so every
candidate is `official_primary`-tier by construction) → deterministic URL/title keyword score
picks the admissions page or returns null (never a guess) → `application_system` only ever set
when a known portal name (Common App/UCAS/Parcoursup/Studielink/uni-assist/ÖSYM-YKS/Coalition)
appears verbatim in the fetched page content.

**Four real scoring bugs found and fixed by actually reading the live output, not just
trusting "a value was found" — every one caught between an apply and the next batch, never
left for a later session to discover:**
1. First 3-university smoke test resolved Aarhus University to a **Master's-only** admissions
   page (`masters.au.dk/...`) — wrong audience for ORYN's high-school users. Fixed with an
   explicit graduate/PhD-level penalty; re-verified live (now resolves to `bachelor.au.dk`).
2. A 40-university batch resolved **Al Ain University** to a 2019 **news article** about a
   research-competition win — contained neither "admission" nor "apply" anywhere, cleared the
   old threshold purely on the undergrad/bachelor bonus. Fixed by making a real admission/apply
   signal a hard requirement before any other bonus counts (was previously just the
   highest-weighted signal, not a gate). Audited all 29 URLs the pre-fix batch had already
   written, found and reverted 2 bad ones (Al Ain; Aristotle University of Thessaloniki, a
   department-subdomain page) directly in the database; the other 27 were investigated and
   confirmed genuine (2 initially flagged by the audit heuristic — Ajou, Aston — turned out to
   be correct pages the heuristic's simpler regex just didn't recognize).
3. A 150-university batch tagged **Dublin City University** (Ireland) `application_system =
   "ÖSYM/YKS"` (Turkey's national exam) — its own page describes accepting the Turkish "Lise
   Diplomasi + YKS" qualification as one of many recognized foreign quals, which is a
   different fact from DCU using that system itself. Fixed by gating every country-specific
   system (Parcoursup/Studielink/uni-assist/ÖSYM-YKS) behind a same-country match between the
   institution and the system's home country (`lib/acquisition/normalize.ts`'s `sameCountry`,
   so `Türkiye`/`Turkey` aliasing works). Common App/UCAS/Coalition were left ungated at this
   point — broad multi-country portals, reasoned to be lower risk, no demonstrated bug yet.
   Reverted DCU's value; re-verified against the real live DCU page text (not just the unit
   test).
4. A 300-university batch proved that reasoning wrong: **Shanghai Jiao Tong University**
   (China) was tagged `application_system = "Common App"` (the US portal) from its own
   international-admissions PDF — same mechanism as #3, just on a pattern assumed safe.
   Generalized the fix instead of special-casing again: every system in the list is now
   country-gated, including Common App (→ United States), UCAS (→ United Kingdom), and
   Coalition (→ United States). Manually audited all 60 `application_system` rows produced
   across all three batches against the new rule — SJTU was the only mismatch. Separately
   (unrelated mechanism, same batch), **LSE**'s newly-acquired `admissions_url` resolved to an
   "Undergraduate Admissions Extenuating Circumstances" sub-page — real LSE content, on-domain,
   but not what a prospective applicant needs; reverted (LSE's `application_system=UCAS` was
   correct and kept).

**Known, accepted limitation, not chased further this session:** a handful of the kept
`admissions_url` results point at a real, on-topic, on-domain admissions page that is narrower
than ideal (a specific institute/department/program's admissions page rather than the
university-wide one — e.g. Alexandria University resolved to its Public Health institute's
admission page, Bologna to Medicine & Surgery's, a few others to a specific news bulletin
about that cycle's admission scores/seats rather than a general how-to-apply hub). These are
honestly sourced and about the right topic at the right institution, just not perfectly
scoped — the kind of judgment call that needs AI-level page-purpose understanding to fully
close, which is exactly the piece blocked on Anthropic credits. Not a fabrication risk,
disclosed rather than silently accepted as perfect.

**Final coverage, four applied batches** (40 + 150 + 300 + 250 universities): `admissions_url`
368/1010 (36.4%), `application_system` 74/1010 (7.3%) — net of all reverts. The 4th batch's
country-consistency was checked exhaustively (all 74 `application_system` rows, not a
sample): 0 mismatches, confirming the generalized country gate holds across the full
dataset, not just the two cases that originally exposed it. A last spot-check of 8
newly-flagged `admissions_url` values found the same "real but narrower than ideal" pattern
already documented above (an "Info Day" press release, a country-specific PDF guide, a
single-program page) — no new bug class, nothing reverted this round.

Every write is `fill_if_null`, re-checked immediately before writing (not just at selection
time). `--limit` defaults to 25 deliberately — Tavily is a paid API, scale-up should stay
deliberate rather than a single 1010-university run. `npm run check:university-spine-health`
passes cleanly after all four batches and every revert.

## Phase 8 — canonical entity registry quality: two real findings closed

1. **73/73 `official_verified` university entities had zero `entity_evidence` rows** —
   confirms founder-blocked-backlog.md item 20's finding still holds, for the entire set, not
   a few stragglers. `scripts/verification-state-audit.ts` downgrades honestly
   (`official_verified` → `source_verified`) in one direction only, never upgrades. Applied:
   all 73 downgraded, including 4 with a real linked `universities` row (3 Phase 2 merge
   winners — Al-Farabi, UTS, HKUST — plus the standalone KFUPM entity). Re-run confirms 0
   remain. General-purpose (`--entity-type` flag), scoped to `university` this session.
2. **`scripts/entities-audit.ts` (pre-existing, not written this session) was silently
   truncating its own read of `canonical_entities` at 1000 rows** — the exact bug class
   `lib/acquisition/paginate.ts`'s own header documents at length, just never applied to this
   particular script. The registry passed 1000 rows at some point this session (now 1160);
   every audit run since then was silently over an arbitrary 1000-row slice. Fixed (paginated
   `canonical_entities` and `entity_aliases` reads, mirrors `university-data-report.ts`'s own
   `selectAll` pattern). Live effect: `POSSIBLE_DUPLICATE` findings went 231 → 296 once the
   other 160 entities were actually included. Not investigated further this session (296 is
   the Levenshtein-fuzzy, cross-entity-type bucket that's explicitly "review, don't auto-act
   on" by the audit's own design — far beyond this session's scope to hand-verify each one).

The 43 exact-name + 28 name-variant orphan pairs from the Phase 2 dossier above are very
likely a large fraction of both the pre-fix-73 and the 296 POSSIBLE_DUPLICATE set — not
independently re-investigated as a third thing, just noted as probably-overlapping.

## Phase 5 — rankings: clean, well-designed already, one real finding (the 9th duplicate)

`university_rankings` audited directly (1009 rows). Findings:

- **Provider/edition naming is already clean** — exactly one value, `QS | 2027`, no naming
  drift (e.g. no "QS World University Rankings" vs "QS" split). Nothing to normalize.
- **Zero false-precision cases.** The schema already separates `rank_display` (exact source
  string, e.g. a band like "601-610") from `rank_numeric` (nullable derived sort key,
  explicitly null when the source gives a band — per the column's own migration 0038
  comment). Checked directly: 0 rows have a band-shaped `rank_display` with a non-null
  `rank_numeric`. This was already built correctly; confirmed, not fixed.
- **9 `(provider, edition, list_position)` collisions** — two different `universities.id` rows
  claiming the identical QS rank. **8 were exactly the 8 Phase 2 pairs already merged**
  (independent structural confirmation of that work from a completely different angle — every
  single one of the 8 name-collision-detected duplicates also independently collided on QS
  rank, which is exactly what "same real institution" predicts). **The 9th was new**: KFUPM,
  rank_display `"63"` with no tie marker on both sides (a genuine QS tie would read `"=63"`)
  — see the Phase 2 table above, now merged.
- **Bocconi University is the one university (1/1010) with no QS 2027 row at all.** Not
  investigated further this session (a single missing row, not a pattern) — plausibly a
  genuine QS category-eligibility gap rather than a data bug, but not confirmed either way.

## Phase 7 — external IDs: mostly closed by this session's re-acquisition

Full-spine `acquire:universities --from-db` + `import --apply` this session (see the fixture-
regeneration commit) refreshed ROR/WIKIDATA/GRID/ISNI/CROSSREF_FUNDER coverage with current
credentials and the new circuit breaker: 3,950 external ids upserted (idempotent — mostly
confirming what was already there), 807/1010 resolved (203 unresolved: 192 ambiguous/no exact
name match, 5 country mismatch, 2 no ROR hit, 4 other — all kept in the fixture with a reason,
none guessed). **Closed, not just theoretically covered**: `npm run
check:university-spine-health` (built later this session — see Phase 10) directly checks
whether the same external id is ever mapped to two different *live* (non-merged) canonical
university entities registry-wide, beyond what the import pipeline's own resolver refuses to
act on. Confirmed clean as of the last run of this session.

## Next (queued, not yet started this session)

1. Duplicate-id cross-registry check (see Phase 7 above) — a standalone query, not yet run.
2. Phase 9 — `university_profile_metrics` schema review (which of the still-missing
   population metrics deserve a typed column vs staying in the flexible metric store).
3. Phase 11 — confirm the API/query layer actually exposes what's been acquired this session
   (admissions_url, the corrected verification states, refreshed external ids) to the
   University Explorer UI — not yet checked.
4. Phase 6 — OpenAlex retry once its budget resets (~9.5h out from 14:30 UTC; circuit breaker
   means a retry costs 3 requests to confirm, not another wasted full run).
5. Scale the admissions acquisition batch size further (`--limit`) now that the scorer bug is
   fixed and validated against two independent live failures — current coverage: check
   `npm run report:universities`'s "admissions URL" line.
6. Migration 0043 + the 5 read-path filters (see Phase 2 above) — founder/DDL-access blocked,
   not code-blocked.
