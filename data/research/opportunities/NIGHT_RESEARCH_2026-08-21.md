# Night research campaign — global opportunities intelligence (2026-08-21)

Founder brief: "ORYN NIGHT RESEARCH — GLOBAL OPPORTUNITIES INTELLIGENCE", timeboxed to
2026-08-21 11:00 Europe/Istanbul (session started ~01:22 local). Goal: build a large,
highly trustworthy set of real student-opportunity records worldwide, prioritizing
categories/geographies the live `opportunities` table currently under-represents.
Output only — **no production DB writes, no schema changes, no application code**, per
the brief's explicit instruction. This package is research/evidence for a later,
separate ingestion pass (by DATA-A or the founder), same contract as every prior
`data/research/opportunities/*.jsonl` batch in this repo.

## Isolation note (important for whoever reconciles this later)

This session found the shared primary checkout (`/Users/adasarpkirik/Desktop/Founder/ORYN`)
being actively branch-switched and committed to by another live session in real time
(observed `HEAD` move from `oryn/programs-pipeline-reconciled`@`5ec6700` to a brand-new
`oryn/counseling-intelligence-research`@`148a2d6` between two consecutive `git` calls, with
9 total peer Claude sessions active per `ListAgents`). Per this repo's own established
parallel-session discipline (protect first, isolate, never assume shared state is stable),
this campaign's work was moved into its own worktree/branch rather than committed into the
shared checkout: worktree `.claude/worktrees/night-opportunities-research`, branch
`oryn/night-opportunities-research-2026-08-21`, branched from the confirmed-safe
`origin/oryn/programs-pipeline-reconciled` @ `60d52a3` ("apply Wave 3 summer programs").
Not merged/rebased onto anything else mid-session to avoid compounding the risk — pushed
standalone, for the founder or DATA-A's next checkpoint to integrate.

## Live baseline (measured 2026-08-21 ~01:35 local, read-only, `qtcvcflzxbuagvvwahhu`)

`opportunities`: **369 total**, 166 `verified_current` (45%), 46/369 have a `deadline`,
18/369 have `eligible_countries` populated, 134/369 have `country` populated (235 NULL).

By category: summer_program 252, competition 72, research 13, scholarship 9, internship 8,
online_program 6, entrepreneurship 3, academic_program 3, fellowship 2, volunteering 1,
**hackathon 0, conference 0, student_program 0**.

By country (top): United States 105, United Kingdom 9, Turkey 8, Germany 2, France 2,
Spain 2, then Canada/Denmark/Switzerland/Italy/Belgium/"International" at 1 each. **Zero**
rows tagged to any Middle Eastern, East Asian, South Asian, Australian/NZ, or most
continental-European countries. 235/369 rows have no `country` at all (pre-existing gap,
not fixed here — this campaign's own new records all populate `country`).

Full dedup reference (title | organization | official_url | category | country for all 369
live rows) extracted to
`/private/tmp/claude-501/-Users-adasarpkirik-Desktop-Founder-ORYN/eb923a9f-1130-4bd1-b08e-afd777a6860e/scratchpad/existing_opportunities_baseline.txt`
(local scratch, not committed — regenerate via Supabase MCP `execute_sql` if this file is
gone in a future session). Also known-pending-not-yet-live: two records in
`data/research/opportunities/counseling-list-verification_2026-08-21.jsonl` on
`origin/oryn/research-turkey-schools` (Berkeley Math Tournament, Stanford Math Tournament —
do not re-research).

## Priority (per founder brief: accuracy > provenance > freshness > completeness > volume)

1. **Empty/near-empty categories**: hackathon, conference, student_program, volunteering,
   fellowship, entrepreneurship, academic_program, online_program, internship, scholarship,
   research — all far behind summer_program/competition.
2. **Empty/thin geography**: Middle East, East Asia, South Asia, Australia/NZ, Canada,
   continental Europe beyond the current handful, and growing Turkey further (explicit
   initial-market focus per `AGENTS.md`).
3. Global/online opportunities (bypass visa/travel barriers, help both axes at once).
4. Do not add more US summer programs — that category is already the best-covered by far
   and has its own dedicated campaign (`SUMMER_PROGRAMS_350_TRACKER.md`).

## Method

Parallel background research agents (general-purpose, WebSearch+WebFetch+Write), each
assigned a distinct category/geography slice to avoid overlap, each required to follow the
exact `docs/research-handoff-opportunities.md` JSONL contract and this repo's established
verification discipline (page-fetched not search-snippet, selectivity_evidence required
above open_enrollment, manual today-vs-quoted-date check, drop rather than guess). Each
writes to its own file under this directory; this session reviews, schema-validates,
dedupes across all files + the live baseline, and commits in batches.

## Wave log

| Wave | Scope | Candidates researched | Accepted | Rejected/dropped | Status |
|---|---|---|---|---|---|
| 1 — Middle East + South Asia | UAE/Saudi/Israel/Qatar/Lebanon/Egypt/India/Bangladesh/Pakistan, all categories | ~24+ reached fetch stage | 16 | 7 explicit + more searched-only; 0 duplicates | Committed `a678535` |
| 1 — East Asia + Australia/NZ | Australia/HK/Japan/Taiwan/China/Singapore, all categories | ~31 | 11 | ~20; 3 duplicates (HKUST iElite, HKBU, PolyU-adjacent) | Committed `54541cb` |
| 1 — Canada + Turkey + continental Europe | Canada/Turkey/Netherlands/Germany/Ireland/Poland, all categories | ~41 | 19 | ~22; 0 exact duplicates (1 judgment-call kept as distinct, see commit msg) | Committed `552dd2b` |
| 1 — International olympiads | IPhO/IChO/IBO/IOI/IOL/iGeo/IOAA/etc. | Unknown — agent ran 9h without completing | **Incomplete at session end.** Asked to finalize immediately with whatever it has via SendMessage at 10:43 local; no reply received before the 11:00 deadline. **Handed off, not lost** — agent `a5728d8c0eeab4de7` may still complete and its output file (`night1_2026-08-21_groupOLYMPIADS.jsonl`) should be checked by whoever picks this up next; if empty/missing, this slice needs re-dispatching. | Undelivered |
| 1 — Self-research | Categories with zero coverage (hackathon/conference/student_program) + volunteering/fellowship | 11 | 5 | 6 (4 already-live duplicates: Concord Review, National History Day, Technovation Girls, Davidson Fellows; 2 fetch-blocked: Ashoka Young Changemakers, Journal of Student Research) | Committed `d628da6` |

**Wave 2 was not dispatched.** Time ran out mid-Wave-1 (the olympiads agent unexpectedly took 9h against the other three's ~22-25min) — see Final Report below for what Wave 2 would have targeted.

## Final report (produced at session end, 2026-08-21 ~10:45 Europe/Istanbul)

**Total candidates researched:** ~107+ reached an actual fetch-and-evaluate stage across the four completed batches (24 Middle East/South Asia + 31 East Asia/ANZ + 41 Canada/Turkey/Europe + 11 self-research), not counting the incomplete olympiads batch or the many more names searched but never reaching a fetchable official URL.

**Verified-primary (accepted) count:** **51**, all `verification_status: "Verified - official page fetched and read"` on the organizer's own domain, `researched_at: 2026-08-21`.

**Historical-verified count:** 0 — every accepted record this session represents current-cycle or evergreen (not-cycle-bound) status; none were knowingly published as stale/historical data presented as current.

**Needs-review count (12):** promising, real-seeming leads blocked by technical fetch failures (403/SSL/connection-reset/JS-rendered), not confirmed non-existent — worth a retry with different tooling or timing, not re-research from scratch:
1. Rotary National Science & Technology Forum (New Zealand) — blocked 6 times across 2 researchers/4 domains despite strong corroborating evidence (36-year-running program, 2027 dates found via search: 9-23 Jan 2027, applications closed 9 Aug 2026)
2. NUS SCALE Youth Open Enrolment Programmes (Singapore) — JS-rendered page, unreadable
3. CUHK Summer Institute (Hong Kong) — SSL certificate errors, 3 domains
4. Weill Cornell Medicine–Qatar (QMEP/PCEP) — connection resets, only reached 2008-2011 archived PDFs
5. THIMUN Qatar — mismatched SSL certificate
6. Ashoka Young Changemakers (global youth social-entrepreneurship fellowship) — HTTP 403, 2 attempts
7. Journal of Student Research (jsr.org) — HTTP 523 server error, 2 attempts
8. Stockholm Junior Water Prize — blocked/truncated fetches
9. SUPERNOVA Summer School (Nova SBE, Portugal) — TLS certificate error, 3 attempts across 2 domains
10. Yaşar Üniversitesi Lise Yaz Okulu (Izmir, Turkey) — TLS certificate error, 2 attempts (real program, 3 known tracks per search snippets)
11. Concours Général des lycées (France) — HTTP 403 on 3 different domains
12. Duke of Edinburgh's International Award – Canada — HTTP 403, 2 attempts

**Rejected/junk count (~35+):** confirmed non-existent, discontinued, wrong-audience, or too ambiguous to represent honestly. Notable ones: Encounters with Canada (confirmed permanently discontinued, closed Jan 2021); KFUPM "Olympiad Track" (conflicting/ambiguous eligibility — turned out to be a direct-admission pathway for already-crowned medalists, not a standalone competition); ~6 East Asian university programs confirmed undergrad/exchange-only on direct fetch despite SEO-listicle claims otherwise (KAIST EE Camp, Seoul National ISP, Yonsei ISS, Ewha-Harvard, Tsinghua/Peking summer schools); European Forum Alpbach (wrong age band, 18-30); Aalto University (explicitly excludes current high schoolers); ~10 European institutions with no HS-specific program found after a genuine search (NTNU, Oslo, KTH, Uppsala, Anadolu, Akdeniz, Uludağ, TED University, Ghent, ULB); several commercial "volunteer abroad" companies dropped for not meeting the official-source bar.

**Duplicate count (7):** caught against the live baseline *before* writing, so never risked a double-insert: HKUST iElite, HKBU 2026 site, a PolyU/Robomaster-adjacent program (East Asia batch); Concord Review, National History Day, Technovation Girls, Davidson Fellows Scholarship (self-research — all four were strong candidates that simply turned out to already be live).

**Category distribution of the 51 accepted:**
summer_program 23, competition 9, volunteering 4, student_program 3, hackathon 3, scholarship 2, entrepreneurship 2, academic_program 2, research 1, conference 1, fellowship 1.

**Geography distribution of the 51 accepted (21 countries + 2 global/online):**
Canada 9, Turkey 4, Australia 4, UAE 4, Hong Kong 3, Saudi Arabia 3, United States 3, Netherlands 2, Germany 2, Israel 2, Qatar 2, global/online 2, then Ireland/Poland/Japan/Taiwan/China/Singapore/Lebanon/Egypt/India/Bangladesh/Pakistan at 1 each.

**Highest-value remaining gaps (for whoever continues this campaign):**
1. **International olympiads batch never landed** — the single biggest open item. Check `night1_2026-08-21_groupOLYMPIADS.jsonl` for partial output before re-dispatching from scratch.
2. **New Zealand and South Korea** — zero accepted records despite genuine effort in both. NZ's best lead (Rotary forum) is fetch-blocked, not disproven. Korea's leads were bad (undergrad-only programs misdescribed by SEO sites).
3. **Jordan, Sri Lanka, Kuwait, Bahrain, Oman** — no candidate cleared the verification bar in any of these five countries.
4. **Non-US/UK internships** — untouched this wave; the live `internship` category (8 rows pre-session) remains 100% US/UK.
5. **Fellowship, research, conference categories** — still thinnest (1 new addition each this session).
6. **Wave 2 (never dispatched)** would have targeted: non-US internships/fellowships/scholarships specifically (not just geography-first), hackathons, and arts/writing/business/debate competitions globally.
7. Pre-existing gap, out of scope for this research-only session: 235+/420 live `opportunities` rows still have no `country` populated at all — a DB backfill task, not a new-research task.

**Exact ingestion handoff:**
- Branch `oryn/night-opportunities-research-2026-08-21` (worktree `.claude/worktrees/night-opportunities-research`), fully pushed to origin, HEAD `552dd2b` as of this report (plus whatever the olympiads agent may still add).
- 51 new records across 4 files: `night1_2026-08-21_groupMIDEAST-SASIA.jsonl` (16), `night1_2026-08-21_groupEASIA-ANZ.jsonl` (11), `night1_2026-08-21_groupCANADA-TURKEY-EU.jsonl` (19), `night1_2026-08-21_groupSELF.jsonl` (5).
- Every record already validated: correct JSONL, all required fields present, all enum fields (`category`/`cycle_status`/`selectivity_tier`/`location_mode`) within the valid sets defined in `lib/opportunities/ingest.ts`, `selectivity_evidence` present wherever required, checked against a live-DB snapshot for duplicates (0 collisions surviving into the committed files).
- **Next action for whoever owns ingestion (DATA-A per `docs/ORYN_WORKSTREAMS.md`, or the founder):** re-fetch live `opportunities` fresh (this session's baseline may be stale by pickup time — other sessions were actively writing to it tonight), run these 4 files through the real `decideIngestion()` from `lib/opportunities/ingest.ts` (not reimplemented), apply accepted rows + matching `opportunity_sources` provenance rows via the established Supabase MCP `execute_sql` pattern this repo already uses, re-run lint/typecheck/test/build.
- This session made **no production DB writes, no schema changes, no application code changes** — 100% compliant with the brief's explicit constraint.

**Cross-lane duplicate check (per coordination session flag, 2026-08-21 ~10:50):** the `oryn/programs-pipeline-reconciled` lane independently committed `wave4_2026-08-21_diverse.jsonl` (7 records) and `wave5_2026-08-21_thin-categories.jsonl` (3 records) tonight — read via `git show origin/oryn/programs-pipeline-reconciled:<path>` (read-only, no checkout). Cross-checked all 10 titles/URLs against this session's 51: **zero real duplicates** — two keyword-grep false positives (Loran Award mentions "Toronto" only as an interview-city; Georgetown Qatar GPS mentions "Princeton Review" only as a test-prep vendor brand). The two lanes' work is genuinely complementary: theirs is US/Turkey-summer-program-heavy plus 2 US-centric fellowships (Diana Award, Prudential Emerging Visionaries) and a 7th-grade scholarship (Cooke Young Scholars); this session's is geography-first outside the US/UK. Both sets are independently verified against official sources — acceptable as independent-verification duplication of effort, not wasted, per the coordination session's relayed founder policy.
