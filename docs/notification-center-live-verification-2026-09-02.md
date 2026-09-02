# Notifications, watched actually work — the founder's first request, first live check

The founder's first-named request, never before observed running. Walked the notification
centre live as `oryn.qa.b`, reading the database after every step rather than trusting the UI
alone. **The founder's own account (~100 unread `weekly_plan` notifications) was never touched
or queried** — every check below is scoped to `oryn.qa.b` (`e9eba798-195d-4859-960c-4b8968df7819`)
or is a schema/system-wide read that touches no user's data.

**Headline: the mechanics work. The spec's "aggregate" requirement doesn't exist yet, and the
live data shows exactly why that matters — a real, reproducible duplication bug, not a
hypothetical one.**

## What's confirmed working, each verified against the database, not just the screen

Baseline before touching anything: 15 rows for `oryn.qa.b`, 14 unread, queried directly.

- **Bell badge count is accurate.** Read `"14 okunmamış"` in the header before any interaction —
  exact match to the DB's unread count.
- **The list renders correctly and completely.** `/notifications` showed all 15 rows, same
  titles/bodies/relative-timestamps as the database, correctly split by read/unread (the one
  already-read row rendered with no "mark as read" control, matching its `read_at` being set).
- **Individual mark-as-read persists.** Clicked one item's own "Okundu işaretle" via a targeted
  DOM click (`element.click()`, not a coordinate guess — the Browser pane was backgrounded for
  part of this session, which zeroes out layout for coordinate-based tools; drove interaction
  through `javascript_tool` instead, a known-working pattern for this environment). Queried the
  exact row immediately after: `read_at` was set to a real timestamp. Not inferred from the UI —
  read from the table.
- **Bulk "mark all as read" persists too, and is a different code path worth checking
  separately** — it is. Clicked `"Tümünü okundu işaretle"`; queried the full account afterward:
  `still_unread: 0` of 15. Confirmed both the per-item and bulk actions are real, working writes,
  not just optimistic UI.
- **The badge updates live, no reload.** After the two mark-as-read actions above (one accidental
  side-effect, one deliberate — see below), the header badge read `"12 okunmamış"` with zero
  navigation or refresh between actions and the read — the count is driven by real client state
  sync, not a stale server-rendered number.
- **Notification links go somewhere real.** Clicked "New match: International Mathematical
  Olympiad (IMO)" — landed on the actual, fully-rendered IMO opportunity detail page: official
  site link, save/apply controls, Oryn's own match assessment ("Worth a look" — profile has
  little evidence in this area, low switching cost to try) and a specific, honestly-stated
  eligibility caveat about citizenship requirements the record couldn't auto-verify. This is not
  a stub or a placeholder — it's the real feature, reached correctly from the notification.
- **Opening a notification also marks it read, as a side effect — found by accident, then
  confirmed deliberately.** The first click above was aimed at the notification's own title
  (testing the link), not its "mark as read" button. A follow-up DOM query for remaining
  "mark as read" buttons came back one short of the unread count (13 instead of 14) — checked
  the database rather than assuming a rendering quirk: the clicked notification's `read_at` was
  already set, timestamped seconds after the click. Read-on-open is real, working behavior, not
  something this task set out to test — the discrepancy is what surfaced it.

## What Phase 24 asks for and isn't built: aggregation

Phase 24: *"avoid spam, aggregate where possible."* Dedup (below) is a different requirement
from aggregation, and only one exists. **The list is flat.** The baseline data made this visible
immediately, before any UI interaction was needed to prove it: of `oryn.qa.b`'s 15 rows, 12 are
`new_opportunity` notifications for **exactly 3 distinct opportunities**, each one **repeated 4
times**. The rendered page shows all 12 as fully separate list items — same title, same
timestamp, same "mark as read" control, four times over, with no grouping, no "4 new matches"
summary, nothing collapsed. A student opening this list today sees a wall of exact repeats.

## Why the duplicates exist despite "dedup" — traced to the code, not just observed

`lib/notifications/create.ts`'s `createNotification()` — the single function every notification
insert goes through — has no dedup logic of any kind; it inserts unconditionally every call.
Dedup lives one layer up, in the caller:
`lib/opportunities/persist-matches.ts`'s `notifyNewlyEligibleMatches()` does a
`SELECT ... WHERE user_id = ? AND category = 'new_opportunity' AND link = ? LIMIT 1` immediately
before deciding whether to insert — a **check-then-insert** pattern, not a database constraint.
Confirmed directly: `notifications` has exactly two constraints, a primary key and a foreign key
— **no unique constraint on `(user_id, category, link)` at all.**

This function's own comment already names the risk it doesn't fully close: *"a genuine race (two
renders landing within the same request window) can produce two matching rows"* — and says this
runs *"from every `refreshOpportunityMatches` call (dashboard, `/opportunities`,
`/opportunities/[id]`, all on every render)."* **The observed data is that race, not a
hypothetical one**: `oryn.qa.b`'s 12 duplicate rows were created in a 13-second window
(`06:58:19.32` to `06:58:32.20`), in patterns of exactly 4 — consistent with four near-
simultaneous page renders each independently reading "no existing notification yet" before any
of the other three had committed their insert. The `.limit(1)` the comment describes only
prevents `.maybeSingle()` from throwing when duplicates already exist — it doesn't prevent the
race that creates them. No test in
`__tests__/opportunities/notify-newly-eligible-matches.test.ts` covers concurrent calls.

**This isn't a rare edge case.** Any student who opens the dashboard, then `/opportunities`,
then an opportunity detail page within a few seconds of new matches becoming eligible — a
completely ordinary way to use the app — hits the same code path four times in quick succession
and can reproduce this today.

## What couldn't be tested, and why

**No `deadline`-category notification exists anywhere in the live system to click through.**
Checked system-wide, not just this account: `notifications` has exactly two categories with any
row ever, `weekly_plan` (111 rows, 5 users) and `new_opportunity` (15 rows, 2 users) — zero rows
for `deadline`, `profile_update`, `university_data_changed`, or the other categories the
`/notifications` filter tabs list. Whether a deadline notification's link actually reaches the
deadline it's about (the specific question asked) could not be live-verified — there is nothing
live to click. This says nothing about whether that code path works; it says the trigger
conditions for those five categories haven't fired yet in this environment, which is a
different, narrower gap than what this task could resolve by watching the UI.

## The founder's account

Not signed into, not queried, not touched. Its ~100 unread `weekly_plan` notifications are exactly
the shape of load this account's own UI has never been exercised against — everything above was
verified at a scale of 15 rows, not 100, and nothing here tests whether the list/badge/mark-as-read
paths hold up at that volume. Worth flagging as a distinct open question, not assumed answered by
this pass.

## Recommendation

1. **The duplication bug is real, reproducible, and traceable to a specific unguarded race** —
   the fix is a database-level `UNIQUE (user_id, category, link)` constraint (or an upsert
   `ON CONFLICT DO NOTHING`) on `notifications`, not a change to the read-then-check logic, which
   cannot close a race by construction. Scoped fix, not attempted here — this task was
   verification, not remediation, and a schema change is a decision this task wasn't asked to make.
2. **Aggregation is a separate, larger product decision** (collapse-by-category? by-time-window?
   a "4 new matches" summary row?) — sizing that design is out of scope for a verification pass;
   naming that it doesn't exist yet is the actionable output here.
3. **The five untested categories are worth a scoped trigger-check** (does a real deadline
   crossing actually produce a row, live, end to end) as a follow-on — this task confirmed the
   *display* layer works for the two categories that do fire; it did not and could not confirm
   the other five ever will.

## What this did not do

No writes to the founder's account — never signed into or queried it. No fix for the duplicate-
notification race or the missing aggregation — diagnosed, not remediated, per the read-only
scope of this task. No live check of the five categories with zero rows. No raw SQL `UPDATE`
against `notifications` — every state change was driven through the real product UI on the QA
account, the only path this task used to mutate anything.
