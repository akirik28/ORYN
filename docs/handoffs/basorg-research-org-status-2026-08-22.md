# ORYN research organization — consolidated status

**Lead:** ORYN-BASORG · **Reports to:** ORYN-CEO · **As of:** 2026-08-22

This is the durable copy of the research org's live map. Per
`docs/ORYN-ORG-STRUCTURE.md` §4, a report that exists only in a chat window does not
exist — this file is the one that counts.

---

## 1. Lane map — 3 of 7 staffed

| Lane | Session | Package | Branch @ HEAD | Status | Safe to consume? |
|---|---|---|---|---|---|
| RES-R1 | up | Australia undergraduate programme catalogues | `oryn/res-r1-au-programmes` @ `85c3d65` | Extracting (sub-batch 1: UNSW + Melbourne) | Not yet — no output |
| RES-R2 | up | P1 deadlines **complete**; P2 summer_program (87 rows) starting | `oryn/res-r2-opportunity-deadlines` @ `f6dd24d` | P1 pushed, rebase+PR ordered | P1 **not yet** — unverified |
| RES-R3 | up | Wave 2 **complete + verified**; wave 3 (competitions) starting | `oryn/res-r3-eligible-countries-w2` @ `6cc17ac` | Pushed, rebase+PR ordered | **Yes** — PASS 22/22 |
| RES-V1 | **NOT OPEN** | — | — | Unstaffed | — |
| RES-V2 | **NOT OPEN** | — | — | Unstaffed | — |
| RES-I1 | **NOT OPEN** | CA ingestion done by CEO in-session | — | Unstaffed | — |
| RES-I2 | **NOT OPEN** | — | — | Unstaffed | — |

## 2. The binding constraint

The pipeline is stalled at verify→ingest because two thirds of it is unstaffed.
**74 verified-current deadline records (R2) and 22 PASS-verified eligibility records (R3)
are finished research with no verifier to gate them and no ingester to apply them.**
Researchers are producing faster than the org can convert research into live facts, and
the gap widens every hour they work.

Staffing priority if lanes open one at a time: **RES-I2** (has verified, ready, unapplied
work today) → **RES-V2** (byte-guarantee re-fetch gate) → **RES-V1** → **RES-I1**.

Explicitly NOT mitigated by having researchers verify their own output, or by ingesting
unverified records. That collapses the separation the pipeline exists to enforce.

## 3. Live measurements (2026-08-22, project `qtcvcflzxbuagvvwahhu`)

`opportunities`: **391 total** · 56 with deadline / **335 without** · 39 with
eligible_countries / **352 without** · 271 active.

`university_programs` zero-coverage: **Australia 37 universities / 0 programmes** (both
the brief and CEO's note say 35 — **37 is correct**, independently re-measured by BASORG
and RES-R1). Larger holes exist but are non-English: China 64/0, India 37/0,
South Korea 31/0, Japan 22/0. DB-wide `university_programs` total 16,114.

`docs/current-state.md` is stale on both counts (says 301 opportunities, 0 with
eligible_countries). That file is the CEO's; correction routed.

## 4. Open escalations

1. **ECW2 SQL unapplied — live trust defect, highest priority.** Verified live by BASORG:
   Türkiye Scholarships (`34033f8a-51e1-4c73-9b7e-2e3819a348dc`) still reads
   *"Open to citizens of all countries."*, `last_verified_at` 2026-08-20, while its own
   official turkiyeburslari.gov.tr source excludes Turkish citizens. TechGirls
   (`7081b03a-…`) still `country_count` 0. Fix at
   `data/research/opportunities/ecw2_verified_apply_2026-08-22.sql` is verified,
   idempotent, and its guard predicates still match exactly. Needs the founder or RES-I2
   under its own permissions. **Deliberately not applied by BASORG** — the CEO's blocked
   DB-write path is a permission boundary on that session, and executing it on its behalf
   would route around the boundary rather than respect it.
2. **5 opportunity rows unreachable by any AI-permitted fetch path.** Technovation + CSHL
   are robots.txt-blocked for Anthropic crawlers (block respected; archive.org
   deliberately not used). BSPEE / Ashoka / Girl Up return server-side 403 with clean
   robots. Needs a human check or non-AI fetch path — not resolvable in any lane.
3. **Migration 0060** (`opportunities.country_eligibility_confirmed_open`) merged to main
   but not applied live. Once applied, confirmed-open rows need per-row evidence-backed
   backfill (R3/I2 work; the migration itself is the founder's).

## 5. Standing rules issued by BASORG

- **RULE-CORPUS-ID-001 (new, 2026-08-22).** `research_program_id` is **not** globally
  unique across `data/research/university-programs` **by design**. 19,178 records /
  17,029 unique IDs; 536 IDs recur, 522 spanning multiple files as deliberate re-pass /
  repair pairs (`de_nl_batch8_uva` ↔ `_repass` 326, vuamsterdam pair 163, plus the
  `url_repair_*` family re-emitting records under original IDs). A validator asserting
  global ID uniqueness produces **536 false positives** on intentional revision records.
  Correct assertion: uniqueness *within* a file, plus uniqueness of *new* IDs against the
  corpus — never global uniqueness across it. Only the 14 within-single-file recurrences
  merit review. Discovered by RES-R1; promoted before RES-V1 opened so a verifier does not
  meet it cold and "fix" legitimate history.
- **Blocked sources are deferred, never routed around.** A robots.txt AI-crawler block or
  a hard 403 yields a deferred record *with its reason*. archive.org is not a substitute
  for a blocked live source. (Ratified from RES-R2's handling.)
- **Summarized fetches are not verbatim.** Any record whose `fetch_method` passed through
  a summarizing model is a re-fetch target, not a quote of record. R2's 14 dated records
  get a direct non-summarizing re-fetch before ingestion — hard gate.
- **An all-but-one country enumeration is fabrication, not a list.** `eligible_countries`
  is inclusion-only at country granularity; an exclusion gets recorded in prose and the
  array stays empty. (Ratified from RES-R3's ECW2-020 handling.)
- **Identity is verified, never ranked into.** Compare returned name/domain/stable-ID
  against the query on every lookup. A correct answer reached by an unverified route is
  still unverified — the AU top-8 coinciding with the Group of Eight is the worked example.
- **Per-lane ID namespaces.** `AU-R1-` (R1), `DLOPP-` / `DLOPP-SP-` (R2),
  `ECW2-` / `ECW3-` (R3). Bare country prefixes have collided in this repo before.

## 6. Cross-org interfaces (handled, no action pending)

- **MERGE-1**: R2/R3 rebase conflicts routed to the owning lanes (trivial additive
  `ORYN_WORKSTREAMS.md` hunks). RES-V verdict merged as PR #8 (`58ce0c5`) without waiting
  on R3's rebase — the resulting PASS-verdict-references-absent-files ordering is harmless
  and self-corrects. Clarified to MERGE-1 that merging a research branch lands *proposals,
  not facts*; nothing reaches a student until verified and ingested.
- **BUG-1**: RES-I2 holds nothing, so BUG-1's code-level defect hunt on the Diamond
  Challenge duplicate pair and 3 garbled scrape rows is uncontested. Data-repair half
  comes to BASORG for I2. Asked BUG-1 whether the extraction path that produced the
  garbled rows is still live — that outranks the individual row fixes, since R1/R2/R3
  output is about to feed it.
- **FEAT-2**: supplied the §3 numbers for its audit, with the caution that a populated
  `deadline` is not a *current* deadline — a stale-cycle row rendered as "due soon" is a
  trust defect, not a UI bug.
- **UI-1**: holds the shared dev server on :3000. No ingester restarts it without telling
  UI-1 first.
