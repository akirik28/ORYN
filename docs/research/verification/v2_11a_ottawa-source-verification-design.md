# Package V2-11a — sampling design: independent source verification of RES-R1's Ottawa corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Assigned by BASORG (received via a new channel this package cycle, cross-checked against the
established one and against falsifiable git evidence before treating it as legitimate — see the
session record for that exchange; not repeated here since it's not a source-data question).

Source: `data/research/university-programs/ca_programs_ottawa_2026-08-22.jsonl` (276 in-scope
records) on `origin/oryn/res-r1-au-programmes`, inspected read-only via a detached-HEAD worktree.

## Robots.txt, checked before anything else

`catalogue.uottawa.ca/robots.txt`: `User-agent: * `with a specific disallow list (`/archive/`,
`/admin/`, `/en/search/`, `/fr/chercher/`, and others) — **`/en/undergrad/` is not disallowed.**
No named-bot rule, no wildcard block. Confirmed fresh, independently.

## Reconciliation — close, not exact, and stated as such rather than forced

Fresh sitemap fetch: **399 unique `/en/undergrad/` URLs** (https-normalized; the sitemap itself
serves `http://` links). R1's stated stage-1 count is 398 — a 1-URL residual, plausibly ordinary
drift on a live, term-updated course catalogue, not chased further. **All 276 committed URLs
found present — zero missing.** Excluded population by direct set subtraction: **123** (399 −
276), against R1's stated 118 exclusions — a 5-URL gap, larger than Adelaide's or UWA's residual
but still consistent with catalogue pages added/changed between R1's fetch and mine; not
attributed to a bucketing error without evidence, since the excluded-arm sample below tests the
exclusion logic directly regardless of which exact URLs make up the gap.

## Three instruments, matching the three risks BASORG named specifically for this corpus

**1. `language_of_instruction` read per-record, not inferred from path — the corpus's own
central claim, tested rather than accepted.** Every record in this corpus sits under `/en/...`
regardless of language; the test is whether the recorded value reflects the page's own stated
language, not the URL. Two sub-groups, chosen to stress the claim from both directions:
- **Full coverage (9 records) — the highest-risk group**: every record whose title matches a
  French-language pattern (accented characters, `Baccalauréat`, `spécialisé`, `français`,
  `Majeure`/`Mineure`) **but whose `language_of_instruction` is recorded as `null`** — exactly
  the shape of gap a path-based inference would produce and a per-record read should not.
- **Random sample, n=8/20, seed `20260822021`**, from records whose `language_of_instruction`
  is recorded as exclusively-French-shaped (`"in French only"` and its variants) — confirming
  the positive claim is also correct, not just that the null cases are explainable.
IDs: `v2_11a_language_sample.json`.

**2. The excluded 123 — the direction-of-defect principle, applied here because it already paid
off twice (UWA, and independently in RES-R1's own Ottawa classifier work per BASORG's note).**
Random sample, n=25/123, seed `20260822022`. Per BASORG: the corpus was built with an
"enrollability test" distinguishing independently-admitted programmes from concentrations
declared within an existing degree; one record was already moved *into* scope by this test
during R1's own review. Checking a fresh, independent random draw of the excluded population
tests whether that test holds beyond the one case R1's own review already caught — the same
shape of check that found UWA's rebuild hadn't over-corrected. IDs: `v2_11a_excluded_sample.json`.

**3. `status_note` — a new, deliberately vocabulary-free field, verified against its own
justification.** 22/276 populated, verbatim source text (`"admission ... suspended until
further notice"`, `"Coming in 2027"`), no enum — the design choice is defensible only if the
text really is verbatim. Random sample, n=10/22, seed `20260822023`. IDs:
`v2_11a_status_note_sample.json`.

**Plus a general content-accuracy random arm, n=20/276, seed `20260822024`**, checking
`program_name`/`degree_level` against the live page as a baseline, same method as every prior
university package this session. IDs: `v2_11a_content_random_arm.json`.

## Totals

69 individual page fetches after overlap (3 records shared between the language, status_note,
and content arms, left as drawn): 44 unique in-scope records + 25 from the excluded population.
Read-only throughout; no researcher file edited; no live DB write.

Pushing this design and all four sample files now, before the first individual-page fetch.
