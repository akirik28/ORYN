# Staging the S5/S6/S7 opportunity research — validated, not applied

Follow-on to [[the unmerged-branch audit]]: stage the ~1,447-record S5/S6/S7 opportunity
research against the *current* schema and ingest contract, run it through the real decision
code, report what would actually change, and stop. Per the Caltech-requirements precedent:
**staged, gate-checked, not applied. Nothing was written to any database or table. Not one row.**
The founder decides whether any of this enters the live catalogue.

## Correction to the branch-audit's framing, made before anything else

The prior audit described this research as "sitting in git" on four unmerged branches. That
undersold how accessible it already is: **every one of the 83 `.jsonl` files is already
committed to `main`, byte-identical to the branch copies**, at
`data/research/opportunities/*.jsonl` — confirmed directly (`git ls-tree` diff across all four
branches against `main`, zero files unique to any branch; `diff` against two full files, zero
output). The branches' still-unlanded commits are about other things — `s7_MASTER_CLOSEOUT.md`-
style handoff docs, cross-review logic, the S1-S4/S8 photo pipeline — not this data. **Nobody
needed to merge a branch to read this research; it has been sitting in `main`, unread by the
ingest pipeline, the whole time.** That is a materially better starting position than "stuck on
a branch," and worth stating precisely rather than carrying the looser framing forward.

## What "1,447 records" actually contains

The number is a line count across 83 files, not a count of opportunity proposals. Classified
every line by purpose (`action` field first, field-shape as a fallback for the ~53% of lines
that carry none):

| Class | Count | What it is |
|---|---:|---|
| Claims/coordination registry | 632 | Fleet lane-claiming records (`duplicate_of`, `claimed_at`, `owner_agent`) — internal coordination, not opportunity data |
| Photo verification | 371 | Image sourcing/verification/regrade records for the S1-S4/S8 photo campaign |
| **Candidate (new opportunity)** | 202 → **127 after dedup** | Proposes a row with no live match |
| Rejected / not viable | 124 | Explicit negative findings — "don't add this," with a reason |
| **Enrichment (updates an existing row)** | 95 → **89 after dedup** | Proposes filling gaps on/correcting a specific live `opportunities` row |
| Peer review | 18 | One researcher checking another's already-filed record |
| Held / unresolved | 2 | Explicitly "not resolved either way" |
| Meta | 1 | A coordinator note, not a record |
| **Total** | **1,447** | |

Deduplication (75 candidate + 6 enrichment records eliminated as re-listings of the same
proposal — the `s7_MASTER_consolidated.jsonl` rollup alone re-lists 71 candidates already in
per-batch files) used canonical-name matching for candidates and target-ID matching for
enrichments; kept the most complete version of each.

## Validated against the real code, not a re-implementation

`lib/opportunities/ingest.ts`'s `decideIngestion()` — the exact function
`scripts/ingest-opportunities.ts` calls — was imported directly and run against the **127
mapped candidates** and the **421 live `opportunities` rows** (fetched read-only via the
Supabase connector; this worktree has no `SUPABASE_SECRET_KEY`, same gap the Caltech precedent
hit, same workaround: MCP for the read side, the real decision function for the logic, zero
writes anywhere). This is not a simulation of the gate — it is the gate.

**Mapping the corpus's field vocabulary onto the current `ResearchOpportunityRecord` contract
required real judgment calls, all disclosed:**
- `canonical_name`→`title`, `organizer`→`organization`, `official_rules_url`/
  `official_application_url`→`official_url` (whichever was present) — direct renames.
- `category`/`category_hint`/`competition_category`/`opportunity_type` → the 13-value
  `VALID_CATEGORIES` enum via a translation table. **120 of 127 mapped at high confidence**
  (e.g. `mentored_research_1on1`→`research`, `math_competition`→`competition`); **7 at medium
  confidence** (e.g. `essay_publication`→`competition`) — listed in
  `candidate_meta.json` in the scratch working set, not silently blended into the 120.
- `deadline`/`start_date`/`end_date` mapped **only** when the field was already a genuine
  ISO date — prose like "2026-11-14, in-person at UC Berkeley" was left `null` rather than
  parsed, so nothing here is an invented structured date.
- `verification_status` constructed from the record's own `evidence`/`sources`/`citation_url`
  arrays: a record with a real URL **and** a real supporting quote/excerpt got an honest
  "Verified — official page fetched and read" attestation; a record with neither got an honest
  negative one. **Caught and fixed a bug in my own first attempt here**: the negative string
  originally read "Unverified — no supporting quote…", which itself contains the substring
  "verified" — the gate's own legacy matcher (`looksPageConfirmed`, a plain `.includes("verified")`
  check) would have silently passed all 8 of these records as verified by accident. Rerunning
  the decision function is what surfaces a bug like this; reasoning about the mapping by hand
  would not have.
- `retrieval_method` left unset for all 127 — none of these records ever declared the
  structured field, and mapping it as `live_fetch` without the record actually saying so would
  be fabricating a fact the record doesn't assert. Left null, every one of these routes through
  the same legacy prose-matcher the rest of the pre-existing corpus does — the bar the gate
  applies is unchanged, not lowered, for this reason (`lib/acquisition/retrieval-method.ts`'s
  own stated policy).

## The real outcome

```
{ accepted: 97, duplicate: 18, malformed_source: 4, insufficient_evidence: 8 }
```

- **8 `insufficient_evidence`**: exactly the 8 records with no real evidence backing (the bug
  above, now correctly failing instead of accidentally passing).
- **4 `malformed_source`**: the record's own cited evidence URL doesn't share a domain with the
  organizer's official site — e.g. iNaturalist's evidence cites Wikipedia, not
  `inaturalist.org`; Taiwan Scholarship's cites a Taiwan representative-office page, not
  `mofa.gov.tw`. These are honest gate rejections of real research that cited a secondary
  source — plausibly fixable by re-sourcing to the primary domain, not a dead end, but outside
  this task's scope.
- **18 `duplicate`**: correctly matched against a live row by title+organization similarity.
  Notably, three distinct Berkeley-organizer records (BMT in-person, BMT Online, BmMT online —
  the [[unmerged-branch audit]]'s own §1 finding) all matched the **same** live row
  (`823e79e6`), even though the research explicitly documented them as three different formats.
  The live catalogue currently cannot distinguish them; worth naming for whoever works that
  entity.
- **97 `accepted`**: passed every gate — title/organization/category/source present, category
  valid, source domain authoritative, evidence genuine, not a title/org match against any of
  the 421 live rows. **This is the real number the current code would insert.**

## The dedup gate has a blind spot, found and quantified, not just claimed

`lib/opportunities/dedup.ts`'s duplicate rule requires either a matching canonical URL, **or**
matching organization **and** title similarity ≥0.6. **197 of the 421 live rows (47%) have
`organization: null`** — confirmed directly. Any candidate whose title alone closely matches
one of those 197 rows still passes as `accepted`, because the organization half of the check can
never fire.

Quantified rather than left as a caveat: ran a title-only Jaccard pass (≥0.5, no organization
requirement) across all 97 "accepted" candidates against all 421 live rows. **11 flagged**,
including two exact title matches this session did not catch:

| Candidate | Live row (org) |
|---|---|
| Technovation Girls | Technovation Girls (org: null) — same title, exact |
| The Diana Award | The Diana Award (org: null) — same title, exact |
| Venture & Tech Summer Program (VTSP) | Venture & Tech Summer Program 2026 (org: null) |
| Johns Hopkins Center for Talented Youth (CTY) — Online Programs | CTY (Center for Talented Youth) Online Programs Courses (org: null) |

The remaining 7 (clustered around generic "Journal of ... High School ... Research/Science"
titles) are genuinely ambiguous — there are plausibly several real, distinct teen research-
journal brands, not necessarily one program under different names — flagged, not asserted
either way.

**Honest revised estimate: the real new-row count is closer to 86 than 97.** Reporting 97
unqualified would have been the algorithm's number, not the accurate one; the 11-record list
above is what closes that gap, and is included in the staged output for manual review before
anyone applies this batch.

## Enrichments cannot go through the normal path — confirmed at the code, not asserted

`decideIngestion()`, on any duplicate match: `return { outcome: "duplicate", detail: ..., row:
null, matchedExistingId: dup.id, ... }` (`lib/opportunities/ingest.ts:202-204`). **`row: null` —
nothing about the matched candidate's own field values is ever returned or applied.** The 89
distinct enrichment proposals (gap-fills, corrections, recategorizations, Turkey-eligibility
annotations, each naming a specific live `opportunities.id`) cannot flow through
`scripts/ingest-opportunities.ts` at all, confirming exactly what was flagged before this task
started. Staged separately (`staged_s5s6s7_enrichment_proposals_2026-09-02.jsonl`) as
target-id + proposed-field-changes + evidence, explicitly labeled as needing a different
mechanism — a dedicated UPDATE path, or manual application — not something this script can do
today.

## The number that actually matters: how many carry a future deadline

- Among the **97 accepted (new)** records: **8 carry any structured deadline at all; 3 are in
  the future** (≥ 2026-09-02). The other 94 are rolling/undated programs — summer programs,
  mentorships, scholarships without a published next cycle.
- Among the **89 enrichment proposals**: **17 carry any structured deadline value; 11 are
  future-dated** — and these are recognizable, high-value competitions already live in the
  catalogue with a stale or missing deadline: AMC 8/10/12, HMMT, Breakthrough Junior Challenge,
  the Wharton Global Investment Competition, the Diamond Challenge, the Conrad Challenge, the
  Blue Ocean Competition.

**Combined: 14 records, out of 1,447 lines, carry a deadline a student could act on soon.**
Using oryn-a7's own framing directly: this lands close to the *"200 rows and 150 deadlines"*
scenario's opposite — a meaningful number of new rows (86-97), a real and currently-blocked set
of enrichments (89, 11 of them deadline-bearing), but a **small** actionable-deadline count.
Most of this corpus's value is catalogue breadth and program-level enrichment, not urgent
near-term deadlines. That is the honest shape of the finding, not a disappointing one — it says
this is worth doing carefully (breadth) rather than urgently (deadlines).

## What's staged

- `data/research/opportunities/staged_s5s6s7_new_candidates_2026-09-02.jsonl` — the 97 records
  `decideIngestion()` accepts today, in the exact `ResearchOpportunityRecord` shape, ready for
  `npm run ingest:opportunities -- <path> --apply` **if and when approved**. The 11 likely-
  duplicate IDs from the table above are flagged in `docs/opportunity-research-staging-2026-09-02.md`
  (this file) for exclusion or manual re-check before that command is ever run with `--apply`.
- `data/research/opportunities/staged_s5s6s7_enrichment_proposals_2026-09-02.jsonl` — the 89
  distinct enrichment proposals, target ID + proposed changes + evidence, explicitly not
  ingestible by the current script.

Neither file has been applied. No `--apply` flag was ever passed. No `opportunities` row, no
`opportunity_sources` row, was written, updated, or deleted by this task.

## Recommendation

1. **New candidates**: 86 (97 minus the 11 flagged) are ready for a human pass and then
   `--apply`, at the founder's discretion — the gate they'd pass is the real one.
2. **Enrichments**: real and useful (11 carry live deadline updates for recognizable
   competitions) but need a small dedicated apply-path before they can move at all — currently
   a dead end even with approval, since the ingest script has no upgrade-in-place branch.
3. **The 4 `malformed_source` and 8 `insufficient_evidence` records**: not included in the
   staged batch. The 4 `malformed_source` cases are named individually above, with the exact
   domain mismatch, in case someone wants to re-source and retry them. The 8
   `insufficient_evidence` records simply lack a captured supporting quote/excerpt in the
   original research — re-running this pass against the same source files after a re-research
   touch would recover them if wanted; their record IDs weren't worth a persistent list here
   since the fix (go find a quote) is the same for all 8.
4. If this or a similar corpus gets staged again, the title-only similarity pass in this
   document (§ dedup blind spot) is reusable and cheap — worth running by default rather than
   trusting the organization-gated dedup alone whenever a meaningful share of the live catalogue
   has `organization: null`.

## What this did not do

No live AI calls. No re-sourcing attempt for the 4 `malformed_source` records. No individual
verification of the 124 `REJECTED` records' own conclusions — taken as the prior research's own
honest negative findings, not re-litigated. No resolution of the 7 ambiguous "Journal of..."
title-similarity flags — named, not decided. No changes to `lib/opportunities/dedup.ts` or any
other product code — the null-organization blind spot is reported, not patched; that is a
product decision (tighten the dedup rule vs. backfill organization on existing rows) outside a
staging task's scope. Nothing applied, merged, or written to any database.
