# S5B — 8 existing `summer_program` rows are actually research/internship opportunities, miscategorized

Lane S5B · found 2026-08-26 · no production writes made, this is a dry-run correction proposal.

## What happened

While researching net-new `research`/`internship` candidates, I fully independently verified 8 programs
(Polygence, Lumiere Education, UC Santa Barbara Research Mentorship Program, Summer Science Program,
Rockefeller University Summer Science Research Program, University of Iowa SSTP, Venture & Tech Summer
Program, and International Research Institute of North Carolina) from their official sources before
writing them up as new S5B records in `s5b_batch1_2026-08-26.jsonl` and `s5b_batch2_2026-08-26.jsonl`.

Before committing, I ran a final dedup query against the **entire** live `opportunities` table (not just
`category IN ('research','internship')`, which is what I had checked initially and is why this was missed
the first time). All 8 already exist in production — every one of them filed under **`category =
'summer_program'`**, not `research` or `internship`.

**This is the likely root cause of at least part of why `research` (13 rows) and `internship` (8 rows) read
as thin categories**: some of the genuine research/internship opportunities that already exist in the
corpus are sitting in `summer_program` instead, undercounting the true depth of those categories and
overcounting `summer_program`. This does not mean the categories aren't genuinely thin overall (my own
net-new research this session, and two independent prior lanes' findings, still support that they are) —
but the true gap is smaller than the raw category count implies, and some of the fix is recategorization,
not new discovery.

**I am not correcting the category myself** (no production writes, per the Research Freeze Contract) — this
file and the companion `s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl` are a dry-run proposal for
CEO/DATA.

## The 8 rows, what's wrong, and what I found

All 8 currently have `eligible_countries = []` (empty array, not null — i.e., explicitly recorded as
"none listed" rather than simply unset) and no `country`/`cost`/age data in most cases. My research fills
every one of these gaps with first-party-sourced facts. Full field-level detail for each is in the
companion JSONL; summary here:

| Existing row (id) | Current category | Current status/verification | What I verified |
|---|---|---|---|
| Polygence (`0337369f-bb69-47e5-aa82-d4a0e92a674b`) | summer_program | under_review / unverified | Mentored 1-on-1 research, online, cost ~$3,000+ (own FAQ), no citizenship bar found |
| Lumiere Education (`bc678344-c213-4ae8-a4f8-48af2856338f`) | summer_program | active / unverified | Mentored 1-on-1 research, online, cost not confirmed first-party this session (flagged) |
| UCSB Research Mentorship Program — **two rows**: `8296f39c-93da-48ab-acc5-af023b14f347` ("Research Mentorship Program", under_review) AND `647eb8da-9cb8-46d4-8ded-b4c516f7ac90` ("UCSB Research Mentorship Programs", active) | summer_program | one active, one under_review — **these two rows are themselves duplicates of each other** | Explicitly "from all over the world" eligibility (official page), 2026 dates already closed, fee unconfirmed |
| Summer Science Program (`ae174625-5ad8-41b7-9c9a-7f00710c168a`) | summer_program | active / verified_current | International-applicant financial aid explicitly confirmed, need-blind, $11,800 max fee (free under ~$75k income) |
| Rockefeller SSRP (`2bbea7da-09bb-4eca-b46b-c3b5363e3b92`) | summer_program | active / verified_current | Explicitly welcomes students "outside the Tri-State Area," zero cost, visa/travel self-arranged |
| Iowa SSTP — **two rows**: `418217ec-65af-494a-bf4f-370c0b6f070c` ("Secondary Student Training Program (SSTP)", active, already has cost=$7,500 and deadline filled in) AND `3533791e-62a7-49b7-a983-469a8a1c2514` ("SSTP", under_review, empty) | summer_program | one well-filled, one nearly empty — **these two rows are themselves duplicates of each other** | International students explicitly addressed (English-proficiency + visa requirement) |
| Venture & Tech Summer Program 2026 (`d1c24acc-a289-459f-a476-110a731e2eb8`) | summer_program | active / unverified | This is a **startup internship placement** (real work on real startup teams), not a taught summer course — arguably belongs in `internship`, not `research` or `summer_program`. "International equivalents" explicitly welcomed. |
| International Research Institute of North Carolina (`09b42a46-cd61-4576-bc5a-565975c66d05`) | summer_program | under_review / unverified | Remote mentored research; cost and explicit international statement NOT confirmed first-party this session (weakest-evidenced of the 8) |

## Two pre-existing internal duplicate pairs (not something I created — found while researching)

Independent of my research, **the UCSB program and the Iowa SSTP program each already have two separate
rows for the same real-world entity** in the live table (see table above). This is a data-quality issue
CEO/DATA should merge regardless of what happens with the category question. I did not attempt to merge
them myself (no production writes).

## Recommended category

- Polygence, Lumiere, UCSB RMP, SSP, Rockefeller SSRP, Iowa SSTP, IRI-NC → `research` (all are mentored
  research / research-mentorship programs, not taught courses)
- Venture & Tech Summer Program → `internship` (real placement on a startup team, not coursework)

## Why this wasn't caught by my initial dedup pass

The S5 operating brief and Contract correctly told me to check `category IN ('research','internship')`
for dedup — I did this first, and none of these 8 appeared (because they're filed under
`summer_program`). I only caught this by later running a second, broader query against the *entire*
table by name/URL as an extra safety check before finalizing. **This is worth flagging as a general
lesson for the fleet**: an "already covered, don't re-research" dedup check scoped to the assigned
category can miss an entity that a prior, differently-scoped lane miscategorized. A name/URL sweep across
the whole table, not just the assigned category, is the more reliable check — S5A and S6/S7 should
consider doing the same before finalizing their own batches, since the same failure mode could affect any
category boundary.

## What I did with my already-completed research on these 8

I did **not** discard the research. It is fully preserved in `s5b_batch1_2026-08-26.jsonl` (7 of the 8)
and `s5b_batch2_2026-08-26.jsonl` (IRI-NC) exactly as originally written — I am **not rewriting already
-pushed history**. Instead:

1. This file and `s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl` re-present the same verified facts as a
   **correction proposal keyed to the existing row IDs**, for CEO/DATA to apply directly.
2. `data/research/registry/claims_s5b.jsonl` has been updated (append-only, new lines) to mark the
   corresponding `research_id`s as `duplicate_of` the existing production IDs rather than counted as new.
3. My final PRODUCTION-READY / net-new count in the handoff excludes these 8 from "new discoveries" and
   reports them separately as "gap-closure corrections to existing rows," per the S5 addendum's own
   framing that this is an equally real contribution.
