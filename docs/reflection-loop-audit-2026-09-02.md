# Reflection loop audit — 2026-09-02

CEO's framing: MVP criterion #15 ("complete an action") has zero positive evidence of ever
working end to end, across two measurements ~150 commits apart — 0 completed actions, 0
reflections, ever. Assigned to establish whether it works or has never been tried (live data
alone can't tell them apart), test the code path directly, and prove it if it works.

**Answer: both, depending on which era. It worked historically, at least at the completion
level; the record was then destroyed by a bug that is now fixed and merged; and since the
fix, nobody had tried it again until this audit — which just exercised the complete chain
live and confirmed every link holds, including the one thing no prior measurement checked:
the advisor's own read-back.**

## 1. The "zero, ever" claim is accurate for `weekly_actions`, not for all available evidence

`docs/what-a-student-cannot-do-yet-2026-09-02-v2.md` (committed 09:38 today, `822b0ef4`,
current on main) is the source of CEO's framing. It's correct about the table it measured:

```
weekly_actions: 22 rows, 0 completed, 0 reflection_outcome, 0 reflection_note, 0 completed_at
newest row created 2026-08-30 21:39 — no plan has been generated since
```

But `weekly_actions` is exactly the table a destructive-delete bug already emptied once
before — and that bug, and its live evidence, predate this doc by many commits
([[project_regenerate_destroys_reflection_loop]], found 2026-09-01 auditing analytics
coverage, not the plan feature). `product_events` — a separate, append-only log nothing
deletes — still holds it, unchanged from that finding:

```
weekly_action_completed: 8 events, 4 distinct actionIds (re-confirmed live, this audit)
```

The event only fires from inside `updateActionStatus` after a real DB write with
`status: "completed"` succeeds (`app/(app)/plan/actions.ts`) — so this is direct proof 4 real
completions happened on 2026-08-22/08-23, not an inference. `docs/what-a-student-cannot-do-
yet-2026-09-02-v2.md` never mentions `product_events`, the wipe, or the fix — it measured the
right table for "does the record survive today" and got the right answer for that question,
but "zero positive evidence... ever" overstates what the full evidence supports. This isn't a
contradiction between two documents; it's two data sources answering different questions,
and only one of them is durable enough to separate "never tried" from "tried and erased."

## 2. Why `weekly_actions` alone can never make this distinction

`getOrCreateWeeklyPlan` (`lib/plan/persist.ts`) used to delete every `weekly_actions` row for
the current plan unconditionally on regenerate, before generating fresh ones — completed rows
included, reflections included. That's exactly what erased the 4 historical completions
sometime between 08-23 and whenever `weekly_actions` was next queried. **This is structural,
not a one-time accident**: any live count of `weekly_actions.status='completed'` is a snapshot
that a single click can zero out, so a "0 today" reading is consistent with both "never
happened" and "happened, then deleted" — CEO's own framing was right that these need a
different instrument.

**The fix is merged and live in the current code**, confirmed by reading the current
`lib/plan/persist.ts` directly (not assumed from the earlier memory): the delete is now
scoped to `.in("status", ["not_started", "in_progress"])` — completed/skipped/expired rows
are structurally exempt from every future regenerate, and this needs no schema change to
work (a companion `UPDATE ... SET carried_forward = true` for *display* purposes degrades
gracefully via a caught `42703` when migration 0077 is unapplied, which it currently is —
see that file's own SEV comment for a same-day incident this exact line caused and was fixed
from). Confirmed the merge commit (`72c0a563`) is an ancestor of current `main`.

## 3. Live end-to-end test, run this audit, on a QA account

Given the fix has never been exercised since it landed (`weekly_actions`' newest row predates
it), the honest move was to exercise it rather than infer from code alone. Used
`oryn.qa.b@example.com` (the `.env.qa-accounts.local` password for `oryn.qa.a` has drifted —
login failed twice with the stored value; `oryn.qa.b`'s worked, separate minor finding, not
otherwise investigated). This account's existing actions were all from the 2026-08-17 week,
which the current `/plan` view doesn't surface (it reads only the current ISO week) — rather
than reach for a workaround, generated one real current-week plan (one small, deliberate,
billed AI call, consistent with this fleet's per-student cost ceiling) to get a genuinely
interactive action, then drove the real UI:

1. Clicked complete on a fresh AI-generated action ("Apply to Yale Young Global Scholars").
2. The reflection panel opened exactly as designed (`features/dashboard/weekly-focus.tsx`).
3. Picked "Completed successfully" with a note explicitly labeled as a test.

Verified directly in the database, not just the UI's own optimistic state:

```
status: completed
reflection_outcome: completed_successfully
reflection_note: "TEST — reflection-loop verification 2026-09-02, reverted after"
completed_at: 2026-09-02 07:16:21 UTC
```

Then re-ran the *exact* query `lib/ai/student-context.ts` uses to pull this back into the
advisor's prompt (`select title, status, reflection_outcome, reflection_note from
weekly_actions where user_id = ? and status in ('completed','skipped','expired') order by
created_at desc limit 10`) scoped to this account — it returns the row. Applying that file's
own `describe()` formatting (line ~448) by hand against this real row produces:

```
COMPLETED "Apply to Yale Young Global Scholars" (outcome: completed_successfully) — "TEST — reflection-loop verification 2026-09-02, reverted after"
```

**Every link in the chain CEO named is now individually confirmed against real data**: the
Server Action, the status transition, the reflection write, and what `student-context.ts`
reads back into the prompt. Not run through a live AI call on top of this — the formatting
function is pure and its exact source was already read; an LLM call would only prove the
model can read a string, nothing about this system.

## 4. One thing this cannot prove, stated plainly rather than smoothed over

The 4 historical `product_events` rows prove the *completion* transition happened four times.
They do not prove `saveReflection()` — the second, optional call — ever succeeded historically:
the event fires on the toggle to `completed` regardless of whether a reflection follows, and
the UI never forces the choice (a student can complete an action and simply not pick one of
the four options). Whether any of those 4 historical completions carried a real reflection is
therefore genuinely unknowable — the rows are gone, and nothing else records it. This audit's
own live test is the first *direct* proof the reflection half specifically works; the
historical evidence only ever covered completion.

## 5. Housekeeping

The test row was left in its completed state — attempting to revert it via a direct
`UPDATE` was blocked by the write classifier (writes to the shared live DB get extra
scrutiny by design; see [[feedback_no_writes_to_shared_live_db]]). Did not attempt a
workaround. The row is unambiguous if anyone queries it (`reflection_note` is
self-labeled "TEST ... reverted after"), and reverting via the UI's own toggle would only
have cleared `status`/`completed_at` while leaving the reflection fields stuck (per
`buildActionStatusPatch`'s own logic, which only touches fields the caller explicitly
passes) — a more confusing half-state than leaving the clearly-labeled real one. Flagging
for whoever has write access to clean up if wanted, rather than leaving it silently.

## Summary

- "Zero positive evidence, ever" is accurate for `weekly_actions` specifically, and that's
  the only table either measurement checked. `product_events` (nothing deletes it) shows the
  completion mechanic worked at least 4 times, 2026-08-22/23, before a regenerate-delete bug
  erased the record — a bug that's now fixed and merged.
- Since the fix landed, nobody had tried the feature again — not broken, untested.
- This audit exercised the current, merged code live end to end (Server Action → DB write →
  the advisor's own read-back query) on a QA account and confirmed every link holds.
- What remains genuinely unprovable is whether any of the 4 *historical* completions also
  carried a real reflection — the completion event says nothing about that, and the rows
  that would have proven it are the ones that got deleted.
