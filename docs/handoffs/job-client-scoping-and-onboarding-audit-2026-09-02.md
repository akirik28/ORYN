# Two follow-ups from tonight: the other three jobs (clean), one onboarding gap (fixed)

**Status:** two investigations, one fix, gates green (typecheck/lint/3349 tests/build).
**Author lane:** oryn-31, self-directed at oryn-a7's invitation. **Base:** local `main`
(`5fce56a6`). **Branch:** `oryn/job-client-audit-2026-09-02`.

---

## Part 1 — the other three unattended jobs: checked, clean

Same question as Job D (docs/handoffs/new-student-flow-audit-2026-09-02.md): does
`discover_opportunities`, `discover_requirements`, or `sync_us_universities` share the
session-scoped-client-in-a-session-less-context bug? Traced each implementation's actual
client sourcing, then checked live data for the same "paid but nothing saved" signature that
caught Job D.

**All three are clean.** `lib/opportunities/discover.ts`, `lib/requirements/discover.ts`, and
`lib/universities/sync-us-universities.ts` each create their own `createAdminClient()` at the
top of the function that needs it and use that single instance consistently through every read
and write in the call — no session-scoped `createClient()` anywhere in any of the three files
or their dependencies (`lib/ai/opportunity-extraction.ts` and `lib/ai/requirement-extraction.ts`
have no database dependency at all — pure text-in/structured-data-out).

**Why these three didn't inherit Job D's shape**: Job D's bug came from reusing functions
(`getOrCreateWeeklyPlan`) that were *originally and correctly* built for real user-session
callers (the dashboard, the manual Regenerate button) — a third, session-less caller got added
later and the default silently became wrong for it. These three jobs write to globally-owned
reference tables (`opportunities`, `university_requirements`, `universities`) that an ordinary
user session was never allowed to write to in the first place — there was no legitimate
session-scoped code path to default to by accident. Structurally different from day one, not
just luckier.

**Confirmed empirically, not just by reading code**: `external_sync_jobs` (the table
`runWithTracking` writes to) has exactly 2 rows total, ever — both `deadline_reminders`,
neither of the three named jobs. `ai_usage` has zero rows for `opportunity_extraction` or
`requirement_extraction`. Both checks agree with oryn-a7's "none has ever run" — these three
have never been exercised even manually, unlike Job D's one orphaned test call.

**One connected observation, not fixed**: `discover_opportunities` and `discover_requirements`
catch per-item/per-query errors internally (into an `errors: string[]` per run) without ever
throwing up to `runWithTracking`'s own try/catch — the same shape as Job D's per-student
catch. A systematic failure (an invalid Tavily key, an exhausted AI budget on the very first
candidate) would report `external_sync_jobs.status: "succeeded", items_processed: 0` rather
than `"failed"` — indistinguishable at the tracked-run level from "ran and correctly found
nothing new this time." The real error text exists in the per-item results embedded in the
JSON response, just not in the field an admin dashboard would most likely surface first.
Naming this because it's the same *class* of blind spot as Job D's `itemsProcessed`
undercount, but not fixing it — changing what `runWithTracking`'s contract means (a job with
some real errors and some real successes needs a genuine three-way status, not a bigger
if/else bolted onto this pass) is a design decision spanning every job that uses it, not a
narrow bug fix.

## Part 2 — onboarding wizard: one real gap, fixed

No data pointed here (part 1 of tonight's audit already established every completed account
got through onboarding — the redirect works, 8/11 accounts made it). Read the wizard directly
instead, since it's the one part of the day-one path with zero real users behind it.

**`graduationYear` had no client-side validation at all**, unlike every other step-1 field.
`country`/`schoolName`/`curriculum` are checked together; `birthYear` has its own two-part
check (format, then the minimum-age policy) with a comment explicitly explaining *why* it's
checked client-side ("the student is four steps from the end at this point, and a Zod error
surfacing on the final button would send them back through the wizard for one number"). That
same reasoning applies word-for-word to `graduationYear` — it just wasn't applied.

**Confirmed reachable, not theoretical**: the `<Input type="number" min={currentYear}
max={currentYear+8}>` bounds are advisory only — this button has an `onClick` handler, not a
real form submission, so the browser's native min/max constraint validation never actually
runs (that only fires on submitting an actual `<form>`). A student can clear the field mid-edit
or type an out-of-range year and `goNext()` lets it straight through. `finish()`'s error
handling (`if (result?.error) setError(result.error)`) never changes `step` — so the rejection
surfaces on whatever step the student is currently on (step 4, Import, having clicked through
everything else first), with a specific, legible message (`CompleteOnboardingSchema`'s own
Zod message, "Pick a graduation year in the future.") about a field that isn't anywhere on
screen. The message itself clears Phase 45's bar; reaching the field it's about doesn't.

**Fixed**: added the missing check to `goNext()`, same shape and same step-1 placement as the
existing `birthYear` check, same bounds as the server schema (`currentYear` to
`currentYear + 8`). New message key (`graduationYearError`, both locales) reuses the server's
own English wording verbatim for consistency between the two surfaces. Verified live (this
worktree's own dev server, `/design-preview/onboarding` — mounts the real `OnboardingWizard`
with no auth needed): an out-of-range year now shows the error and holds the student on step
1; a corrected year advances normally. No new unit test — the sibling `birthYear` check this
mirrors has none either, for a real structural reason: `EntityCombobox`/`SuggestInput` are
fully inert mocks in `__tests__/onboarding/onboarding-wizard.test.tsx`, so `country`/
`schoolName`/`curriculum` are permanently empty in that harness and the *first* step-1 check
always fires first, before birthYear's or graduationYear's checks are ever reached. Building
interactive mocks to unlock that coverage is a real, separate, moderate-sized investment (it
would also retroactively cover birthYear, which has never had it) — flagging as worth doing,
not doing it inside this pass.

## What this does NOT do

- No change to `runWithTracking`'s status semantics — named as a real, connected gap, not
  decided.
- No new component-test coverage for step-1's numeric validations (birthYear or
  graduationYear) — flagged, not built; see above for exactly why and what it would take.
- Didn't re-check `interests` (schema cap 20) or `extractedItems` (schema cap 60) for the same
  missing-client-check pattern — checked briefly, concluded both caps are far enough from
  realistic use (16 fixed suggestions; a real CV producing 60+ distinct items) that chasing
  them further would be speculation, not a mechanism with the same concrete reachability
  graduationYear has.
