# Why 17 of 18 saved target universities have a null admission outlook

CEO's narrowing (item 2 on tonight's gap list): `refreshAdmissionOutlook` has only two early
returns (`!target`, `!hasConfidentSignal`), the write after them is unconditional, and it's
called from exactly two places — the university detail page and the save action, the latter
present since 2026-08-15, before every one of the saves in question. Ask: does the save-time
call never get reached, or does the `.update()` fail silently? Say plainly if it can't be told.

**It can be told, and it's neither of the two hypotheses — a third explanation covers all 18
rows with no ambiguity left over.**

## Method

Every `target_universities` row's `created_at`, grouped by `(user_id, created_at)`. A real save
through `addTargetUniversity` is one HTTP round-trip per university — two separate saves cannot
land at the same microsecond. Cross-referenced against `profile_scores` for the affected users
(all 7 have 9/9 dimensions scored, which is why "the profile isn't assessed yet" looked
plausible at a glance and needed checking directly) and against `hasConfidentSignal`'s actual
definition in `lib/scoring/signal.ts`, not an assumption about what it checks.

## The 18 rows split into three groups, not two

**12 rows (4 users) share an identical microsecond timestamp with their siblings** —
`6cd11755`/`95c594d9`/`2bbfb9dd`/`3f534a96` (user `6e2f0ff1`, "Ada Yilmaz") all at
`2026-08-21 08:06:05.668542+00`; two more users' rows at `2026-08-23 15:43:06.307783+00` (a
third and a second user, same instant — the same batch created two accounts' targets at once);
one more user's 3 rows at `2026-08-23 15:42:06.948198+00`. **This is not achievable through the
UI.** No file under `app/`, `lib/`, or `scripts/` inserts into `target_universities` other than
`addTargetUniversity` — these rows were written by a single bulk `INSERT` run directly against
the database, outside any script this repo tracks. **The save-time call was never reached,
because these rows were never saved — they were seeded.** Three of the four affected users
(`6e2f0ff1`, and two more) have real confident signal today (9/9, 5/9, and 3/9 dimensions above
low confidence) — if any of their rows had gone through `addTargetUniversity`, or if the
student had opened that university's detail page since, it would have a real outlook. Nothing
has, yet. The fourth user's batch (3 rows) has one sibling that *does* have an outlook,
calculated six days after the insert — consistent with a detail-page visit — while its two
un-visited siblings are still null. Same mechanism, mid-way through happening.

**6 rows (3 users) have distinct, minutes-apart timestamps** — `84abb7df`/`91d0d162`/`2244893e`
at `11:13:06`/`11:14:10`/`11:17:52` the same morning; two more rows 40 minutes apart for a
second user; one row for a third. **These are real, individual saves**, consistent with someone
clicking "save" on each university in one browsing session. All 6 are still null. Checked why:
all three of these users have **9 dimensions scored and zero of them above `low` confidence.**
`evidenceStateFor` (`lib/scoring/signal.ts:99`) maps `confidence === "low"` to
`"limited_evidence"` unconditionally, before it ever looks at the score — and `isAssessed`
(same file, line 87) excludes `limited_evidence` by design. `hasConfidentSignal` is therefore
`false` for these three students today, exactly as it would have been at save time. **This is
the gate working as intended, not a bug** — the same predicate this session's own fix
(`178ff931`, earlier tonight) added specifically to stop a genuinely-unassessed profile from
getting a confident-looking Reach/Competitive/Strong verdict.

**1 row has a real, working outlook** — proof the mechanism functions correctly when both
conditions are met: a row created through the real code path, for a student with confident
signal, later visited.

**Total: 12 + 6 = 18. 17 null, 1 populated — matches exactly.** No row in this set is explained
by "the call was reached, the update ran, and it failed" — every null row is fully accounted
for by either bypassed insertion or a correctly-firing gate.

## What this means, and what it doesn't

**Not a defect in `refreshAdmissionOutlook` itself.** The function does what its own doc
comment says. The dashboard's University Outlook block reading a `null` badge for a bulk-seeded
row, or for a genuinely-low-confidence student, is the system behaving exactly as designed in
both cases — CEO's own framing ("the outlook never improves as their profile does" for a saved
university nobody revisits) is a real, separate, product-level gap: **there is no mechanism
that retroactively refreshes a saved university's outlook when a student's profile crosses the
confidence threshold later.** The only two triggers are save-time and detail-page-view; a
student who saves early and never returns to that specific page keeps seeing "Not yet assessed"
indefinitely even after their profile is fully scored. That's a product decision (a weekly
sweep? refresh on every dashboard load for saved-but-stale rows?), not a bug fix, and out of
scope for this pass.

**The missing error check was real and is now fixed, even though it wasn't the cause here.**
`refreshAdmissionOutlook`'s final `.update()` discarded its result entirely — a genuine failure
(RLS, a constraint, anything) would have been invisible forever, identical in every observable
way to "never refreshed." Added a checked, logged (not thrown) error path
(`lib/admissions/persist.ts`), matching this codebase's existing convention
(`lib/opportunities/persist-matches.ts`, `lib/requirements/persist.ts`) for a write that
shouldn't fail a page render if it fails. This doesn't change behavior for any of tonight's 18
rows — it closes the blind spot for the next one.

**No test file exists for `refreshAdmissionOutlook` at all** — worth naming, since an untested
save-time side effect is exactly the kind of thing that goes unnoticed for weeks, which is what
happened here.

**No live writes made.** The 17 null rows are still null — recomputing them for real would
require either the bulk-seeded rows' owners to visit those universities' detail pages, or a
decision about whether/how to build the "retroactive refresh" mechanism above, both out of
scope for "find out why," which was the assignment.
