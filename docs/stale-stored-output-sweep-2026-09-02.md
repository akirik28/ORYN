# Stale stored output sweep — 2026-09-02

A fix that changes how a value is *computed* leaves every previously-stored value untouched
until something recomputes it. This sweep enumerates the packages that changed a stored
computation (not scoped to "tonight" — extended back to any fix regardless of when it landed,
per instruction) and asks, for each: does stale pre-fix output exist live, and what — if
anything — would ever refresh it.

**Four states, not two**, following the taxonomy this sweep was assigned plus one CEO added
mid-sweep:
- **self-heals immediately** — the next ordinary page visit recomputes it, free
- **self-heals on a schedule** — a cron would recompute it, but no cron runs live (never
  deployed) — functionally identical to "stale forever" today, distinct in *cause*
- **only heals if someone pays** — a real, billed action (Regenerate, a new question) is the
  only path; nothing passive ever fixes it
- **no trigger exists at all** — nothing in the product, ever, recomputes it; it is what it is
  until something writes over it deliberately

**No backfill was performed or considered.** Every write to live data is founder-gated; this
is a report of what's stale and what would refresh it, not a fix.

---

## The founder-witnessed instance, independently reconfirmed

CEO reported the founder's own dashboard showing a weekly plan with English prose in an
otherwise-Turkish UI, including one action whose reason read *"Career_exploration is at 9/100"*
— a raw database column name. Reconfirmed directly, not taken on trust: querying
`weekly_actions` for any row whose title/description/reason contains a raw snake_case token
returns **exactly one row across the entire live table** — `id c621406c…`, reason text
*"Career_exploration is at 9/100 with low confidence — one of your weakest, least-understood
dimensions..."*, `created_at 2026-08-30 21:39:02`, belonging to plan `3241fb3d…`
(`week_start_date 2026-08-31`, `created_at 2026-08-30 21:01:10`), user `ccf2161e…`,
`profiles.preferred_language = 'tr'`. That same plan's own `summary` field is English prose
("Awards are a genuine strength (100/100), but everything else is thin or unverified...") for
a `tr`-preferred student — the language bug, in the same row.

Both root causes are fixed in code, confirmed by direct read: `formatContextForPrompt` now
calls `dimensionLabel(d.dimension, locale)` rather than interpolating the raw enum
(`c9a318e9`, 2026-09-01 05:27); `weekly-plan.ts:367` now wraps generation in
`withOutputLanguage` (`a9b4b644`, 2026-09-01 08:28). Both fixes postdate this stored plan by
32–35 hours. **This is bucket 3: only heals if someone pays.** `getOrCreateWeeklyPlan`
short-circuits on an existing plan for the current ISO week — the row on screen will not
change until the week rolls over (2026-09-07) or the student/founder pays for a Regenerate.
The regex scan found no other row anywhere in `weekly_actions` matching the raw-identifier
pattern — this appears to be a single instance, not a systemic one, though a model-generated
leak is not template-guaranteed to recur identically even under the same pre-fix code, so
absence of other matches is evidence of scope, not proof no other subtler instance exists.

---

## weekly_plans / weekly_actions — highest risk, checked in full, bucket 3 confirmed

8 live plan rows total, spanning 3 week-starts (08-17, 08-24, 08-31) across 5 students. Only
1 of 8 belongs to the sole `tr`-preferred student (`ccf2161e`) at each of her two plans
(08-24, 08-31) — **both** predate the language fix and **both** show English summary text;
the founder is not looking at an isolated incident, it is 2 of 2 plans this student has ever
had. No other language-mismatch candidates exist among the other 7 plans (all belong to
`en`-preferred students).

Beyond the two fixes CEO named, checked whether any other prompt-affecting change since
2026-09-01 could have left stale wording behind: `49d1a090` (*"extreme_reach" was reaching
students in advisor replies*) is a same-class fix — the regex scan above would have caught a
literal `extreme_reach` string in any stored action/summary, and did not. No evidence this
particular leak ever reached stored weekly-plan text, though (same caveat as above) a model's
past output isn't fully reconstructable from a negative grep alone.

**Every plan here is bucket 3 for wording-level staleness** (regardless of whether a given
plan's own text happens to be correct today) — there is no passive path, ever, for a
generated plan's prose to update. The only thing that changes a plan's stored words is a new
`getOrCreateWeeklyPlan` call, and every caller of it is either a natural week-boundary
generation or a billed Regenerate.

## advisor_messages — checked, lower consequence than weekly_plans despite sharing bucket 3-or-worse

Zero conversations exist for the one `tr`-preferred student — the language-mismatch question
doesn't apply here for lack of any data to be stale. A raw-identifier-style scan (same regex)
against assistant-role messages returned 2 hits, both in one conversation, both the QA admin
account (`46dd6f7e`, `en`-preferred): *`Your MIT checklist shows "test_score" as an unfinished
item`* — a literal internal requirement-type code, quoted, reaching the reply. This is the
same bug **class** as the dimension-key leak, but a **different, not-yet-triaged instance** —
no commit was found that maps application-checklist codes to display labels the way
`dimensionLabel` does for scoring dimensions; this may be a live, still-open gap rather than a
stale-pre-fix one. Flagged as its own finding, not folded into the dimension-key story.

**Structurally, advisor_messages has no self-heal path at all** (bucket 4, arguably worse than
weekly_plans' bucket 3): there is no "Regenerate" for a past chat turn, by ordinary chat-UI
design — a new reply only ever appends. The practical stakes are lower than weekly_plans'
though, and worth stating explicitly rather than treating both tables identically: a weekly
plan is presented as *this week's current guidance*, read as live and actionable; a chat
transcript is inherently read as a historical record of what was asked and answered at a
point in time, the same way any messaging app's scrollback is. A wrong word in old scrollback
misleads less than a wrong word in what's framed as *today's plan*.

## opportunity_matches / reason_codes — bucket 1, self-heals, previously reported

Already found and reported in the MVP-16 pass, restated here for completeness against this
sweep's own table list: `reason-codes-coverage` (`b24efdb8`, *"559 of 724 now say why"*) is
correct code; every live match row's `calculated_at` predates that merge by ~5.5 hours, so the
live split today is still the pre-fix 724-empty baseline. **Bucket 1**: `refreshOpportunityMatches`
recomputes a student's own rows the next time they load `/dashboard` or `/opportunities` — no
payment, no schedule, just an ordinary page visit. Self-heals the first time any of the 8
students next looks.

## profile_scores — no live staleness today, one confirmed structural gap for the future

`recomputeCareerProfile` is called only from Server Actions following a student's own edit
(achievement CRUD, CV import, skills/languages, onboarding) — **never** from a page-render
path, and never on any schedule. Every live row shares one `calculation_version`
(`career_profile_v1` — 72 of 72 rows, 8 of 8 students); this version string has never been
bumped in this project's history, so there is **no live cross-version staleness to find today**.

The structural gap, checked directly rather than inferred: the upsert's own conflict key is
`(user_id, dimension, calculation_version)` — if the version string is ever bumped, a
recompute would **insert** a new row rather than update the old one, and the read side
(`getProfileScores`/`toProfileSignal`, grepped directly) has no filter on
`calculation_version` at all. A future version bump would leave old-version rows live
alongside new ones with nothing to distinguish or exclude them on read, **and no trigger to
recompute a student who hasn't edited anything since** — bucket 3 at best (a student's own
edit would eventually force a fresh row) or bucket 4 in practice for an inactive student.
Not a live bug — there is exactly one version and has only ever been one — but worth the
founder knowing before the next scoring-formula change ships, since nothing in the current
design protects against it.

## target_universities / admission outlook — same structural shape as profile_scores, same "no live instance yet" conclusion

`refreshStaleOutlooks` (confirmed by direct re-read) triggers a recompute only when
`outlook_calculated_at < profiles.updated_at` — a **profile** change, never a **model**
change. `outlook_model_version` is written per row and has a real version constant
(`ADMISSION_MODEL_VERSION = "admission_model_v1"`) but is **never read or compared** anywhere
in the refresh path — grepped directly, zero references outside the write itself. Live check:
only 1 of 18 targets has ever had an outlook computed at all, and that one row is
`admission_model_v1` — the only version this project has ever produced. Same conclusion as
profile_scores: **no live staleness today, because there is only one version**, but the
self-heal mechanism as built would not catch a future formula change for a student whose
profile hasn't otherwise changed — bucket 1 for a profile edit, bucket 4 for a formula change
alone.

## university_statistics — checked, low relevance, not a computation-logic change

`fix-statistics-upsert-error` (`bfe58f8e`) only touches the sync **job**
(`lib/universities/sync-us-universities.ts`) — a write-reliability fix (a silent failure now
logs), not a change to what gets computed. The job is nightly-scheduled but, per the standing
"never deployed" fact, has never run (`data_status`: 285 fresh / 734 needs_review, unchanged
across every check this session). Nothing to be stale relative to a computation change; the
open question here is "has this sync ever run successfully at all," which is a different,
already-covered finding (see the university-depth-honesty/browse work), not this sweep's
bug class.

## Notification dedup (deadline reminders, university-change) — already reported, restated for this table list

Covered in the MVP-16 pass: `deadline_notification_log` (migration 0075) and
`university_notification_log` (migration 0080) don't exist live. This isn't quite the same
bug class — there's no "wrong stored value" here, just a missing dedup table — but it shares
the same root shape (a mechanism that would prevent double-notifying can't run without a
founder-gated migration). Not re-investigated further this pass; see
`docs/what-a-student-cannot-do-yet-2026-09-02-v2.md`.

---

## Summary, by bucket

**Bucket 1 (self-heals immediately, free):** opportunity_matches reason_codes (next dashboard
visit); admission outlook and profile_scores for the only case that currently exists (a
student's own subsequent edit) — moot today since there's only ever been one version of each.

**Bucket 2 (self-heals on a schedule that doesn't run):** none found that are purely
schedule-gated without also being founder-gated by a missing migration — the closest
candidate (university_statistics sync) folds into "never deployed," already known.

**Bucket 3 (only heals if someone pays):** the founder's own weekly plan — will not
correct itself before 2026-09-07 or a billed Regenerate. This is the one with a live,
witnessed consequence today.

**Bucket 4 (no trigger exists at all):** advisor_messages, structurally — though lower-stakes
than weekly_plans for the reason stated above (historical record, not live guidance).
profile_scores and admission-outlook's version-mismatch case, latently, for the day a formula
changes without a live instance to point at yet.

**One new, distinct finding, not part of either fix CEO named:** a raw `"test_score"`
requirement-type code reaching an advisor reply — same bug class as the dimension-key leak,
different source, not confirmed fixed by any commit found this pass. Worth its own triage,
separate from this sweep's staleness question.
