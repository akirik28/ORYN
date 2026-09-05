# University duplicate cleanup — `university_rankings` orphans, 2026-09-05

CEO (oryn-5b) assignment, following up on the HKUST duplicate flagged (not touched) in
`docs/d1-qs-top100-fill-2026-09-04.md`. Scope grew from "handle HKUST" to "handle all 9 known
pairs" once measuring showed HKUST wasn't a special case.

## What's already true, confirmed live, before writing anything

- **The `universities`-table side of all 9 known duplicate pairs is already resolved** —
  `duplicate_status`/`superseded_by_id` correctly set for MIT, HKUST, UCL, LSE, KFUPM, Warwick,
  UTS, Newcastle (Australia), and Al-Farabi Kazakh National University. This predates this
  session; `lib/universities/canonical.ts`'s own header dates the live-column cutover to
  2026-08-22, and yesterday's `docs/d9-systematic-duplicate-scan-2026-09-04.md` independently
  re-confirmed the same 9, 0 orphaned pointers, 0 `target_universities` rows on the losing side.
  This session's own scan (below) re-derived the identical 9 a third time, independently.
- **CEO's specific worry — a duplicate rank appearing twice in a list — is already prevented at
  the application layer**, not something this fix needs to add. `app/(app)/universities/page.tsx:131-132`
  loads the supersession map and applies `getSupersededUniversityIds()` to the browse query, the
  country-count query, and search, with a comment stating exactly this intent ("so none of the
  three shows a duplicate card or an inflated per-country count"). Verified by reading the
  actual call site, not assumed from the helper's docstring.
- **The real, remaining risk is CEO's other named outcome: an orphaned `university_rankings`
  row tied to the retired `universities` id.** This part is real, confirmed, and not yet fixed
  by anything — `merge_canonical_entities()`/the supersession migration deliberately never
  touches child tables (`lib/universities/canonical.ts`'s own header: "both `universities` rows
  keep existing... some of those rows carry real, irreplaceable data on one side of a pair" —
  written about FK safety in general, but `university_rankings` was never subsequently merged
  either).

## The bigger finding: a dormant but real data-loss risk, not just orphaned rows

`pickCanonicalWinner` (`lib/universities/canonical.ts:191`) picks the winner by **summed** FK
references across every table including `university_rankings` — a sound rule in aggregate (e.g.
UCL: canonical row has 429 programs + 16 requirements + 2 sources + 2 deadlines vs. the loser's
0/0/0/0, an obvious landslide). But summing hides a per-table asymmetry: in **6 of the 9 pairs**,
the *losing* row's own `university_rankings` entry carries a real `overall_score` (QS's 0-100
score) that the *winning* row's own ranking entry lacks (`null`) — because two independent QS
ranking-ingestion passes (`verified_at` 2026-08-16 21:42 and 23:30) each wrote to a different one
of the two duplicate ids per pair, essentially at random relative to which id later won the
supersession vote:

```
pair                    winner has overall_score?   loser has overall_score?
Al-Farabi                        yes (57.9)                no
KFUPM                            no                        yes (78.3)
MIT                              no                        yes (100.0)
HKUST                            yes (86.4)                no
LSE                              no                        yes (78.8)
Newcastle (Australia)            no                        yes (51.9)
UTS                              yes (70.5)                no
Warwick                          no                        yes (75.9)
UCL                              no                        yes (96.3)
```

Since nothing merges child rows, the 6 "no" winners are missing a real score that exists
elsewhere in the same database. **Confirmed this has zero current user-facing effect**:
`university_rankings.overall_score` is not read or rendered anywhere in `app/`, `features/`, or
`lib/` outside its own type definition (grepped `.tsx`/`.ts` excluding scripts/migrations/tests
— the only other `overall_score` hits are `career_profile`'s unrelated student-score column).
So today this is inert, not a live bug. It becomes a real, silent data-loss bug the moment any
future feature renders a QS overall score for these 6 (now-canonical) universities — worth
fixing now, while the source data to fix it from still exists, rather than after it's deleted.

**MIT also carries one stray, exact-duplicate `university_statistics` row** on its superseded
id (`ba3a30b2-...`) — checked field-by-field against the canonical row's own statistics row:
identical `admission_rate`, `cost_of_attendance`, SAT/ACT ranges, `graduation_rate`, `source`
string (same College Scorecard UNITID), inserted 210ms apart. A College Scorecard batch job
evidently ran against both duplicate ids before the dedup pass existed. No merge needed here —
confirmed identical, not just similar, before treating a straight delete as safe.

## The broader duplicate scan CEO asked for: measured, not assumed

Asked: are there *other* duplicate pairs (beyond the known 9) whose `university_rankings` rows
also collide? Two independent methods, both restricted to same-`rank_numeric` pairs within
QS 2027 (696 legitimate ties exist past rank ~200 among genuinely different universities — a
first crude substring heuristic drowned in false positives here and was discarded):

1. **Trigram similarity** (`pg_trgm`, already enabled) on names normalized by stripping leading
   "The " and parenthetical suffixes. At `similarity = 1.0` (exact match after normalization),
   returns exactly 6 pairs — LSE, Warwick, UTS, Newcastle, HKUST, MIT — all 6 already correctly
   flagged. Every result below 1.0 (checked down to 0.35) is a genuinely different institution
   with coincidental word overlap (e.g. "Management and Science University" vs. "Lahore
   University of Management Sciences (LUMS)" at 0.63 — two real, unrelated universities).
2. **Bare-acronym-embedded-in-full-name**: every all-caps name ≤8 characters, checked for
   appearing as a parenthetical or substring in another same-rank row's name. Returns exactly
   KFUPM — already known, already flagged. (UCL doesn't surface via this method either, since
   "UCL" is not a literal substring of "University College London" — it's only catchable by
   already knowing the pair, which the `duplicate_status` link already does.)

**Result: zero new duplicate pairs found.** Both methods independently re-derive the same known
9 and surface nothing beyond them — consistent with yesterday's D9 scan reaching the same
conclusion by a different method (all-pairs trigram self-join across all 1019 rows, reviewed
against domain/city/country signals rather than restricted to matching QS rank). **Honest
limitation, not glossed over**: neither method would catch a duplicate using two completely
unrelated naming conventions with no embedded acronym and no textual overlap (e.g. a
transliteration variant in a different script, or a genuinely different-sounding former name
with no "(former X)" marker) — that class of duplicate, if one exists, needs a different check
(shared `website_url`, which D9's method 4 covers for the full table; not re-run here since D9
already ran it against all 1019 rows two days ago and found nothing new).

## SQL — staged, not applied; explicit order, per CEO's own caution about yesterday's 3 sequencing errors

Three steps, meant to run together in one transaction. **Order matters**: step 1 (additive,
fully reversible) must commit before step 2 (deletion, not reversible) — if step 1 were skipped
or failed silently and step 2 ran anyway, the 6 real `overall_score` values above would be lost
with no remaining copy anywhere in the database. Step 3 is independent of 1-2 (different table,
already-confirmed-identical data) and can run in any order relative to them, but is included in
the same transaction for one atomic migration rather than a second one.

```sql
-- Step 1 (run first — additive/reversible): backfill overall_score + the later of the two
-- verified_at/correction_checked_at timestamps onto each canonical row's own QS-2027 ranking
-- entry, from its paired superseded row's entry. COALESCE makes this a no-op for the 3 pairs
-- where canonical already has the score (Al-Farabi, HKUST, UTS) and fills the real gap for the
-- other 6 (KFUPM, MIT, LSE, Newcastle, Warwick, UCL) -- one general statement, not nine
-- hardcoded per-pair updates, because the asymmetry runs in both directions per pair and a
-- hardcoded version would need to get that direction right nine separate times.
update public.university_rankings as canon
set overall_score = coalesce(canon.overall_score, sup.overall_score),
    verified_at = greatest(canon.verified_at, sup.verified_at),
    correction_checked_at = greatest(canon.correction_checked_at, sup.correction_checked_at)
from public.university_rankings as sup
join public.universities u on u.id = sup.university_id
where u.duplicate_status = 'superseded'
  and canon.university_id = u.superseded_by_id
  and canon.ranking_provider = sup.ranking_provider
  and canon.ranking_edition = sup.ranking_edition;

-- Step 2 (run second, only after step 1 has committed — irreversible): remove the now-redundant
-- ranking row attached to each superseded university id. Targeted by the exact same join
-- condition as step 1's backfill, so nothing is deleted that step 1 didn't already have a chance
-- to read from first.
delete from public.university_rankings as sup
using public.universities u
where sup.university_id = u.id
  and u.duplicate_status = 'superseded'
  and exists (
    select 1 from public.university_rankings canon
    where canon.university_id = u.superseded_by_id
      and canon.ranking_provider = sup.ranking_provider
      and canon.ranking_edition = sup.ranking_edition
  );

-- Step 3 (independent of steps 1-2; MIT-specific): remove MIT's confirmed-identical, now-inert
-- duplicate statistics row. Not a merge -- verified byte-for-byte identical to the canonical
-- row's own statistics row first (same admission_rate/cost/SAT-ACT ranges/graduation_rate/
-- source string/UNITID), so nothing is lost.
delete from public.university_statistics
where university_id = 'ba3a30b2-c6e2-4a0f-ba32-6da028175d35';
```

**Expected effect**: `university_rankings` row count drops from N to N-9 (one orphan removed per
pair); 6 canonical universities (KFUPM, MIT, LSE, Newcastle, Warwick, UCL) gain a real
`overall_score` they didn't have before; `university_statistics` drops by 1 (MIT). No row in
`target_universities`, `university_requirements`, `university_programs`, `university_sources`,
or `university_deadlines` is touched — confirmed empty on the superseded side for all 9 pairs
except the two cases this SQL explicitly handles.

**Rules, unchanged:** SQL staged, not applied — CEO packages, applies, and assigns the migration
number. No writes made to the live DB in the course of this investigation, only reads.
