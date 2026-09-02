# Batch 3 (of the 79): 16/21 researched, rate holds around ~75%, one row deliberately skipped

22 rows pulled; 1 (University of Maastricht) deliberately not researched — see below.
Of the 21 actually researched: **16 resolved, 5 unresolvable.** 76%, consistent with
batch 2's 74% rather than a further drop — the corpus seems to have settled into two
real populations rather than continuing to degrade: an easy ~90%+ population (batch 1's
sample skewed toward it) and a harder ~75% population (batches 2 and 3), not a
continuously worsening trend.

**No writes.**

## The Maastricht skip

Mid-batch, oryn-a7 relayed that oryn-d0 independently audited `official_url` provenance
across all 421 `opportunities` rows and found 5 confirmed defects — all traceable to the
same 2026-08-18 bulk import this task's null-organization rows come from. Two of the five
are live right now: a University of Maastricht row and a Winchester College row, both
pointing at third-party sites. This batch's pull included the Maastricht one. Per
instruction, **flagged rather than researched** — it's already queued for a founder call,
and re-sourcing it here would duplicate that work rather than add to it.

**This also reframes defect class 3** (`official_url` pointing at something unrelated
entirely, e.g. a publications page or another university's page) as a **bounded property
of the 2026-08-18 import specifically, not a general corpus risk** — oryn-d0's audit found
zero confirmed instances outside it. Two more class-3 instances turned up in this batch
anyway (Exeter and St. Andrews, both `research-portal`/staff-profile URLs, same shape as
batch 2's King's College London) — worth noting the specific sub-pattern: **UK
universities' academic-profile systems appear to be a recurring source of this exact
defect**, useful if anyone automates detection later.

## What was new this batch

- **Three likely-duplicate pairs found**, none resolved here (dedup's job once
  organization exists, same stance as before): a third School of the Art Institute of
  Chicago row (now three separate rows, same official_url, same org), a University of
  Miami pair (two rows, identical official_url), and Venture & Tech Summer Program —
  which is *also* one of the 11 likely-duplicates already named in
  `opportunity-data-decision-2026-09-02.md`'s new-candidates list, so this is a
  cross-artifact match worth surfacing to whoever applies either one.
- **A title-accuracy error, not just an organization gap**: "Trinity College London,
  Ireland" — the stored URL is Trinity College Dublin (tcd.ie), a real but different
  institution from Trinity College London (also real, in England). The title conflates
  the two. Classified unresolvable regardless (bare homepage, no specific program), but
  worth flagging on its own since it's a title error, not just a missing field.

## Running totals (batches 1–3, 59 researched + 1 skipped, of ~79)

- **Resolved**: 13 + 17 + 16 = 46
- **Confirmed dead/renamed**: 1 (Duke TIP)
- **Unresolvable without the original source**: 1 + 6 + 5 = 12
- **Skipped (already on another queue)**: 1 (Maastricht)
- **Successfully determined**: 47/59 researched = 80%

## Recommendation

Rate has stabilized, not collapsed — continuing per oryn-a7's standing "go in batches"
instruction. Roughly 20 rows remain in the pool after this batch.
