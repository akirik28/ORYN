# "Oxford updated" when Oxford did nothing: the first-fill/real-change conflation in `notify_university_changes`

**Date:** 2026-09-05. CEO's dispatch, from the cron pre-arm audit: before crons are armed,
`notify_university_changes` will tell students that universities "updated" their data when
the actual event was Proxola researching and writing that data for the first time. Measurement
only, no code, per explicit instruction.

## 1. What the job counts as "changed" — read directly from `lib/universities/data-change-scan.ts`

Four independent sources, aggregated into one notification per student per run:

| Source | Claim made | Signal | Comparator |
|---|---|---|---|
| `university` | **VALUE CHANGED** | `universities.last_changed_at` | `hasUniversityDataChanged` (lib/universities/sync-us-universities.ts) |
| `statistics` | **VALUE CHANGED** | `university_statistics.last_changed_at` | `hasStatisticsChanged` (same file) |
| `requirement` | **NEW ROW APPEARED** | `university_requirements.created_at` | none — any new row counts |
| `deadline` | **NEW ROW APPEARED** | `university_deadlines.created_at` | none — any new row counts |

All four route through one shared question, `hasChangedSinceTracked(sourceTimestamp,
trackedSince)`: is the source timestamp strictly after `target_universities.created_at` (when
the student started tracking)? This file's own header comment is unusually explicit that
`requirement`/`deadline` are a **deliberately weaker claim** than `university`/`statistics` —
"never that something changed" — specifically because those two tables are insert-only with no
way to tell a genuine correction from a re-extraction of the same fact. That distinction is
real, already reasoned through, and already correctly scoped in the code.

**It is not carried into the notification copy.** `buildUniversityChangeNotification` uses one
title key, `universityDataChangedTitle` → *"{name} — information updated"* (`messages/en.json`,
`messages/tr.json`: `"bilgiler güncellendi"`), for all four sources. A `requirement`/`deadline`
hit — which the code's own comments insist must never claim "changed" — reaches the student
saying "updated" anyway. This is a real, independent inconsistency, orthogonal to the null-value
question below, and worth fixing regardless of which option CEO picks for the other two sources.

## 2. Can "first fill" be told apart from "genuinely changed"? — No, confirmed at the comparator

`hasUniversityDataChanged` (`lib/universities/sync-us-universities.ts:50`):
```ts
existing.name !== incoming.name || existing.city !== incoming.city || ... // plain !==
```
`hasStatisticsChanged` is the same shape. Both are called as:
```ts
const changed = hasUniversityDataChanged(existing, incomingFields);          // university
const statsChanged = !existingStats || hasStatisticsChanged(existingStats, incomingStats); // stats
```

Two confirmed facts, not inferred:

- **`existing.field !== incoming.field` treats `null !== "real value"` exactly like
  `"value A" !== "value B"`.** There is no branch anywhere that checks "was the old value
  null" — a stub row (created early with just an identity/spine, per
  `scripts/expand-university-spine.ts`'s own two-phase population model, referenced directly in
  this sync file's own comment) having its `city`/`website_url`/`student_size` filled in for the
  first time sets `changed = true` and stamps `last_changed_at = now`, identically to a real
  later correction.
- **For statistics, "no row existed before" is EXPLICITLY written as "changed."**
  `!existingStats || hasStatisticsChanged(...)` — the first university-wide statistics ever
  recorded for a school is `statsChanged = true` by construction, not by omission.

`last_changed_at` therefore has exactly one meaning today — "this row differs from what it
held before" — with no memory of whether "before" was a real value or nothing at all. The
schema does not carry the distinction CEO asked about; nothing does.

## 3. Live scale, measured against the real database (no PII selected — aggregate counts and public catalog joins only)

**The specific batch CEO named has not fired anything yet, and cannot yet.**
`docs/d1-qs-101-150-fill-2026-09-05.md` states directly: *"SQL below is staged, not applied —
CEO packages, applies, and assigns the migration number."* Confirmed independently against the
live DB: `universities.last_changed_at` — newest value 2026-08-21 (15 days old); `university_
statistics.last_changed_at` — **null on every one of 133 rows, always** (this source has
literally never fired once in this product's history); `university_requirements.created_at` —
newest 2026-09-04. Zero rows in any of the four source tables carry today's date. The risk is
real and imminent, not already-realized.

**Total blast-radius ceiling today, live-counted:** `target_universities` in an active status
(`exploring`/`target`/`applying`) = **19 rows total** (6 `target` + 13 `exploring` + 0
`applying`; there is also 1 `accepted` row, correctly excluded — the job's own active-status
filter already handles a university a student stopped pursuing).

Joined against the actual completeness of each tracked university (aggregate counts only):

| Measure | Count / 19 |
|---|---|
| Points at a university missing a core fact (city, website, or student size) | **5** |
| Points at a university with zero requirements on file | 0 |
| **Points at a university with zero statistics on file** | **8** |

(Not mutually exclusive — a target can appear in more than one row.) Every one of these 5 and 8
is a live account that would receive a false "information updated" notification the moment its
university's stub gets its first real core facts or its first statistics row, respectively —
because they are already tracking it, so any future fill is, by construction, strictly after
`target_universities.created_at`. **Zero requirements gap on the currently-tracked set** is a
genuinely reassuring number: none of today's 19 active targets are sitting at zero requirements,
so the largest population this job scans (1,550 requirement rows) isn't where today's near-term
risk concentrates — the risk is concentrated in `statistics` (8/19, ~42%) and core `university`
facts (5/19, ~26%).

This ceiling will grow with tomorrow's 54 UK + 94 US batches (more universities crossing from
stub to full) and with ordinary product growth (more students, more targets) — 19 is today's
number, not a permanent one, and the underlying comparator defect will keep producing this exact
shape of false positive for every future stub-to-full transition, not just this week's batches.

## Recommendation

Independently reasoned before reading CEO's own leaning, and it lands on the same answer:
**(b) — split the notification into two honest claims, not one collapsed one.**

- **(a) (exempt first fill, stay silent)** throws away real information. "We researched and
  added Oxford's requirements for the first time" is useful, actionable news to a student who
  is actively tracking Oxford and had nothing on file for it before — silence isn't more honest
  here, it's just quieter.
- **(c) (flag and skip today's specific batch)** doesn't touch the comparator at all. It would
  need repeating for tomorrow's batch, and the next, and every future incremental fill outside a
  named "batch" — it treats a structural defect in `hasUniversityDataChanged`/
  `hasStatisticsChanged` as a one-time data event, which the two-phase spine-then-flesh-out
  population model this codebase already uses makes untrue by construction.
- **(b)** is the only option that removes the mechanism rather than working around today's
  instance of it, and it matches the exact "say what actually happened, don't collapse two
  different facts into one word" shape that closed several other findings tonight (the detail-
  page standing-badge split, the deadline-honesty pass). It also naturally fixes the
  already-real `requirement`/`deadline` copy bug (§1) for free, since both fixes are "the
  notification must say which of the two claims this hit actually is," applied consistently
  across all four sources rather than two of them.

Implementing (b) needs the comparators (or their call sites) to report *which* kind of event
happened — genuinely new/first value vs. a value that existed and differs — not just a boolean,
so `UniversityChangeHit` can carry that distinction through to `buildUniversityChangeNotification`
and two real title keys. Not attempted here per instruction; bringing the measurement and the
recommendation back before writing any of it.
