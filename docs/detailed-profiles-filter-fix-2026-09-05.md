# `detailedProfilesOnly` filter fix — CEO's decision, 2026-09-05

Follow-up to `docs/d1-qs-top100-fill-2026-09-05.md`'s measurement (315/1010 pass the filter,
160 of those with zero programs and zero requirements — a bare source citation or an empty
statistics row was enough). CEO's ruling, verbatim reasoning: the card badge is a **label** (it
states what exists, promises nothing — yesterday's fix correctly weakened its wording instead
of its signal), but the filter is an **action** — a student toggling "show me detailed profiles
only" is asking for pages worth reading. Renaming the filter to match the loose signal would be
"honest but useless." **Fix the filter, not the label.**

## What changed

`getAllSubstantiveContentUniversityIds` (`lib/universities/queries.ts`) — a new function,
unioning only `university_programs` and `university_requirements` — replaces
`getAllResearchDepthUniversityIds` (unchanged, still unions all four tables) as the signal
`detailedOnly` filters against. The badge (`hasResearchDepth`, feeding "Researched"/
"Araştırılmış" on the card) keeps its original, looser signal — these are now two genuinely
different checks for two genuinely different purposes, not the same set serving both.

Threaded through: `lib/universities/filters.ts` (`RangeFilters.detailedOnly`'s doc comment and
`applyRangeFilters`'s `data.substantiveIds` field, renamed from `data.depthIds` — this field
was only ever read for the `detailedOnly` check, never for anything else, so the rename doesn't
touch the badge path at all), `lib/universities/browse-page.ts` (the `rangeData` type
`loadUniversityBrowsePage` accepts), and both call sites that assemble `rangeData` —
`app/(app)/universities/page.tsx` (first page load) and `app/(app)/universities/actions.ts`
(`loadMoreUniversities`, the infinite-scroll Server Action). Both call sites fetch
`substantiveIds` conditionally (only when `detailedOnly` is actually true), the same pattern
`qsRankMap` already used — the badge's own `depthIds` fetch stays unconditional, unchanged,
since every card needs it regardless of whether the filter is active.

Extracted a shared `allUniversityIdsForTable` helper so the two now-genuinely-different
functions don't duplicate the paginate + exact-count-verify logic — both call it, parameterized
by which table.

## Measured, live, before writing any code

```
Before (four-table union, the old signal):    316 universities pass
After  (two-table union, programs/requirements only): 155 universities pass
Of the 155 that pass after: 155 have a real program or requirement row — 100%, by construction
and confirmed by direct query, not just asserted.
```

Matches CEO's own prediction (~315 -> ~155) almost exactly. Replicated the exact UNION logic
`getAllSubstantiveContentUniversityIds` implements as a raw SQL query against the live DB
(`oryn-qa-scratch`) to get these numbers, independent of the Next.js/React wiring — the
authoritative proof of the fix's actual effect, not an inference from the code alone.

## Red-to-green, proven not assumed

`git stash`-ed the five source files (leaving the updated test files in place) and re-ran the
two affected test files against the pre-fix code: **5 failures** — `getAllSubstantiveContentUniversityIds`
and `allUniversityIdsForTable` don't exist yet, so `extractFunction` (the source-text assertion
helper these tests use) throws "couldn't find X in source." Popped the stash, re-ran: all pass.
Genuinely proved the new tests fail against the old code and pass against the new one, not
inferred from reading the diff.

## Filter hint text — checked, not assumed correct

CEO asked specifically to verify the hint text ("Most universities in Proxola's catalog don't
have detailed program and requirement data yet — this narrows to the ones that do" /
`researchDepthHint`, `messages/en.json`/`tr.json`) actually matches post-fix, rather than
assuming it automatically does. Read it closely: "program and requirement data" reads
naturally as naming the domain (programs-or-requirements), not requiring literally both to be
present on every passing row — the same construction as "medical and dental records" doesn't
require every record to be both. Under that reading, the hint is now accurate: it wasn't before
(a bare citation or empty stats row satisfied "the ones that do" under the old signal, with no
program or requirement data at all), and now every university it describes genuinely has one or
the other. **No wording change needed or made** — the mismatch was entirely in the signal, which
is what this fix corrects.

## Verification

`npx tsc --noEmit`: clean. Full suite: 431 files, 6462 passed, 2 pre-existing expected-fails
(unrelated). `npx eslint` on all seven changed files: clean. No render/browser check performed —
this is a server-side filtering-logic change with no visual component; the live-DB
logic-replication check above is the authoritative proof of the actual effect, and the
type-checked, mechanically-consistent rename across exactly the files that reference the changed
field (verified with a repo-wide grep after editing, zero stray references left) covers the
wiring risk a render test would otherwise catch.
