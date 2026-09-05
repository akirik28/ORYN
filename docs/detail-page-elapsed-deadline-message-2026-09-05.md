# Detail page: elapsed application deadline gets a real message, 2026-09-05

Fixes the inconsistency `docs/elapsed-deadline-display-audit-2026-09-05.md` measured and
reported (not fixed) earlier the same day. CEO's decision: same data gap, two surfaces, two
different results — the compare page correctly showed "N/A," the university detail page's
"Important Dates" section vanished entirely, no date, no message. Not silence disguised as an
answer — a student reading nothing has no way to tell "no deadline exists" from "one existed,
it's gone, nothing new yet," and those are different facts. Fix: the detail page states which
one it is, explicitly, with the real date — not a copy of the compare page's "N/A," since the
detail page has room for a full sentence.

## Root cause

`lacksApplicationDeadline` (`lib/universities/data-depth.ts`) answers "was an application/early
row ever researched," by type presence in the array — it has no idea whether that row's date
has since passed. The detail page's render guard (`datedDeadlines.length > 0 ||
recurringDeadlines.length > 0 || missingApplicationDeadline`) therefore had exactly one blind
spot: a university with a real, correctly-sourced application deadline that simply elapsed
(`missingApplicationDeadline` = false, since the type exists) and nothing current to replace it
(`datedDeadlines`/`recurringDeadlines` both empty, correctly filtered by the 2026-08-22 SEV-1
fix) — all three conditions false, section renders nothing. 27 universities live in this exact
shape as of the audit (e.g. Humboldt-Universitat zu Berlin: six elapsed "application" rows, most
recent 2026-08-31, five days before that audit's own retrieval date).

## Fix

New function `mostRecentElapsedApplicationDeadline` (`lib/universities/data-depth.ts`), a
sibling of the existing `soonestApplicationDeadline`: same row-filtering rules (application/early
type, actionable verification_state), but looks for the most recent *elapsed* `dated_specific`
row instead of the soonest upcoming one. Only worth calling once `datedDeadlines` and
`recurringDeadlines` are both already empty — a university with a real current or recurring
deadline has something to show already; an older stale row alongside it should just be dropped,
not surfacing as the headline fact.

Wired into the detail page's render guard as a third case, alongside (not replacing)
`missingApplicationDeadline`:

```
datedDeadlines.length > 0        -> show them (unchanged)
recurringDeadlines.length > 0    -> show them (unchanged)
missingApplicationDeadline       -> "hasn't confirmed yet" message (unchanged)
elapsedApplicationDeadline       -> NEW: "{date} has passed, next cycle not published yet"
```

New message (`applicationDeadlineElapsedMessage`, both locales): states the actual elapsed date
(via the page's existing `formatDeadlineDate` helper, same formatting the dated-deadline list
itself uses) and says plainly that it has passed, that the next cycle isn't published yet, and
links to the official source — same shape as the existing "unconfirmed" message, deliberately
not the compare page's bare "N/A" (CEO: there's room here for a real sentence).

## Proven red-to-green, not assumed

`git stash`-ed the three source files (`data-depth.ts`, `[id]/page.tsx`, both message files),
leaving the updated test file in place, and reran `__tests__/universities/data-depth.test.ts`:
**6 failures** — `mostRecentElapsedApplicationDeadline is not a function` (it didn't exist yet).
Popped the stash, reran: all 34 pass. New tests use Humboldt's real, live-queried shape (six
elapsed application rows plus one elapsed document row) as the primary fixture, confirming the
function picks the most recent elapsed date (Aug 31), not the earliest (Jan 15) or the
wrong-type document row — and separately confirm it correctly returns null whenever
`soonestApplicationDeadline` would already have found something (a future dated row, a
recurring row) or when there's nothing of the right type to find at all (mirroring
`lacksApplicationDeadline`'s own case, confirming the two functions partition the space rather
than overlapping or leaving a gap between them).

## Verification

`npx tsc --noEmit`: clean. `check:i18n`: 1875/1875 keys in sync, both locales. Full suite: 431
files, 6468 passed (+6 from this fix), 2 pre-existing expected-fails (unrelated). `npx eslint`
on all three changed source files: clean.
