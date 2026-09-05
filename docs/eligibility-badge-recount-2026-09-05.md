# Eligibility badge recount, after the partially_known fix (2026-09-05)

CEO's explicit ask: after fixing the badge collapse (docs/d2-visible-set-fill-2026-09-05.md's
own measurement — 3 of 27 real researched rows would show a different badge under the first,
three-state version of the fix), recount the same 27 rows against the corrected version and
report how many actually change. Building on that doc's own measurement, not re-deriving it
from scratch, per CEO's own instruction.

## Headline

**19 of the 24 rows that weren't already fully clean now show a genuinely different badge.**
Only 5 still show the identical old "Eligibility unknown" warning — and each of those 5 has a
real, named reason that has nothing to do with the badge's own design: either a real remaining
research gap (2 rows) or an explicit fetch failure this pass couldn't get past (3 rows).

Against the full 27: 3 were already fully clean before this fix (Yale Young Global Scholars,
TechGirls, Student Science Training Program — zero remaining notes, no badge under the old
code either, so they were never part of the problem). Of the other 24: 19 improve, 5 don't.

| Result | Count | Rows |
|---|---|---|
| Already clean (unaffected either way) | 3 | Yale Young Global Scholars, TechGirls, Student Science Training Program |
| → "Checked, not stated" (calm) | 12 | Wharton, HPEC, BRI Student Fellowship, Istanbul Bilgi, ODTÜ (METU), Purdue, Wall Street 101, YGA, UCSB*, JA Company Programme, IEO, LaunchX* |
| → "Partly checked" (cautious, credits real progress) | 7 | Breakthrough Junior Challenge*, DECA*, Schoolhouse.world*, Duke of Edinburgh Türkiye*, Interlochen Review, Dive Into Engineering!*, Univ. of Applied Sciences Western Switzerland |
| Unchanged — real remaining gap | 2 | The Earth Prize Competition, InvestIN |
| Unchanged — explicit fetch failure | 3 | Girl Up Project Awards, NYT Audio Stories Podcast Contest, STEM Fellowship Journal |

\* has at least one axis marked uncertain below — see Method.

## Method, and why this isn't a live-database read

The same access wall from earlier today applies here: direct SQL was denied by this session's
own safety classifier, and this worktree has no `.env.local` (confirmed deliberate — an
existing test comment already documents this exact worktree-isolation choice), so there's no
path to the credential the app's own read path would use either.

Instead, `scripts/eligibility-badge-recount-2026-09-05.ts` builds each of the 24 rows' real
`OpportunityForMatching` shape from two real, cited sources — `docs/d2-visible-fill-additions-
2026-09-05.sql`, `docs/d2-visible-fill-requires-0126-0129-0133-2026-09-05.sql`, and, wherever
an axis is untouched by either file, `docs/opportunity-eligibility-d2-not-found-2026-09-04.md`'s
own "already confirmed accurate" findings from the day before — then runs the REAL,
already-tested `computeEligibility` and `classifyEligibilityGap` functions against them, not a
hand-simulated approximation of what they'd do. Every row's source citation is in the script
itself, next to its data. Run it directly to see the full per-row breakdown:

```bash
npx tsx scripts/eligibility-badge-recount-2026-09-05.ts
```

**Six of the 19 "changed" rows have at least one axis absent from every source document I could
find** (marked `uncertain` in the script and with `*` above) — for those, the script
conservatively assumes that axis is still fully unresearched, which can only make a row look
*less* improved than it may actually be (worst case, an uncertain row that's actually further
along than assumed would move from `partially_known` to `checked_not_stated` — still counted
as changed either way, just in the calmer of the two buckets). No uncertain assumption can flip
a row from "changed" to "unchanged," since the uncertainty is only ever about whether an
untouched axis is unresearched (keeping it in whichever "changed" bucket it's already in) or
was secretly already resolved (making it look calmer still, never less improved). The 19-of-24
headline is therefore a reasonably confident floor, not a rounded estimate.

**This is not a substitute for reading the live database directly.** If someone with working
Supabase access runs the query handed off in the original eligibility-badge-split commit
(`git log --grep "Split the collapsed eligibility badge"`) and gets back the 24 rows' real
current column values, re-running this script's logic against the real rows (swapping the
hand-derived `ROWS` array for real query results) would close every one of the six uncertain
cases and confirm or correct this count precisely.
