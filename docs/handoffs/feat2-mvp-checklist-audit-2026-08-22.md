# FEAT-2 MVP checklist audit — AGENTS.md Phase 53 — 2026-08-22

Package 9. ORYN-CEO's instruction: walk all sixteen items of Phase 53's MVP definition
end to end, in order, as one continuous session against the app running on live
Supabase, using a real QA account (`oryn.qa.b@example.com`, non-admin). Not a code
review — the sequence itself is the point, because cross-feature handoff failures don't
show up in isolated checks.

**Status: COMPLETE — all 16 items walked.** Interrupted twice along the way (an org-wide
disk emergency unrelated to this audit, and Finding C's own investigation/correction);
resumed both times by explicit CEO instruction. See the summary table near the end for
the full 16-item verdict.

**Audit only. Nothing fixed. Change nothing** — every item below is audit output, not a
worked fix.

## Method note

QA-B was genuinely fresh at the start (`onboarding_completed: false`, no profile fields
set) — confirmed via a direct query before starting, so item 1 and item 2 are being
tested against a real new-student path, not a pre-seeded account.

## Item 1 — create an account: WORKS

Signed out of the QA-A session already active in this browser (routine housekeeping
surfaced its own minor finding — see below), signed in as `oryn.qa.b@example.com` with
the real password. Landed correctly on onboarding, confirming both that the account
exists and that a fresh, not-yet-onboarded profile correctly routes to onboarding rather
than the dashboard.

**Minor, adjacent finding, not one of the 16 items but discovered getting here:**
clicking "Sign out" on `/settings` produces a client-side error boundary
("Something went wrong loading this page") instead of a clean redirect. Console showed
`An unexpected response was received from the server` on the sign-out Server Action.
**The sign-out itself succeeds** — a direct navigation to `/login` afterward confirmed
the session cookie was actually cleared — so this is a rendering/redirect glitch after a
successful mutation, not a broken sign-out. Low severity (self-recoverable: reload or
navigate anywhere), but a real, reproducible error surface on a page every student will
eventually click.

## Item 2 — complete onboarding: IN PROGRESS, one real defect found (school search)

Screen 1 (goals) and the graduation-year/curriculum fields of Screen 2 worked cleanly —
selection, validation ("Fill in your country, school, and curriculum to continue"
correctly blocks continuation until all three are set), and progression all behaved as
designed.

### Finding A (HIGH): the school-search country boost is structurally broken — confirmed and root-caused, not just observed

Screen 2's school field, with Country="United States" already set, searching
"Lincoln High School" returns five completely unrelated Turkish schools (MEF Lisesi, Vefa
Lisesi, İstanbul Erkek Lisesi, Galatasaray Lisesi, Hisar School) — zero relevance to the
query text or the selected country. Reproduced twice, cleanly, identically. Ruled out a
stale-render artifact: a genuinely nonsense query (`Zzxqvyplmk Academy`) correctly falls
through to the "Can't find your school?" empty state, confirming the search function does
respond to query content — it just doesn't respect the country context, and its
underlying fuzzy-text ranking surfaces Turkish results ahead of anything relevant for a
US-context query.

**Root cause, confirmed by reading `lib/entities/search.ts` (read-only, per audit
scope):**

- `searchCanonicalRegistry` calls the `search_canonical_entities` Postgres RPC with only
  the query text and entity types — **no country/location parameter is passed to the RPC
  at all.** Location context only applies *after* the RPC returns, via
  `applyContextBoost`, which re-sorts the already-fetched rows — it cannot pull in a
  correct result the RPC's own fuzzy match failed to surface in its first
  `RESULT_LIMIT * 3` candidates.
- `applyContextBoost` (line 59) compares `normalizeEntitySearchText(context.country)`
  against each row's `country_code` field. The onboarding wizard passes the raw free-text
  country name (`context={{ country: country.trim() || null }}` in
  `onboarding-wizard.tsx`) — `"United States"`, not a code. `normalizeEntitySearchText`
  normalizes case/accents, it does not convert a name to a code, so the comparison is
  `"united states" === row.country_code` — structurally false for any real code value
  (confirmed live: the Turkish schools' rows correctly hold `country_code: "TR"`, a real
  code). **The boost has never fired for any country-scoped search in this codebase,
  anywhere `EntityCombobox` is used with a country context**, not just onboarding.
- **A second, compounding cause, found by checking what actually got written**: creating
  a custom/user-submitted school ("Add your school" → typed "United States" as its
  country) wrote **the raw string `"United States"` directly into `country_code`** —
  confirmed via direct query (`canonical_entities` row for the school just created:
  `country_code: "United States"`). Custom-entity creation doesn't normalize to a code
  either. So the column itself is inconsistently typed across the registry: real codes
  for professionally-ingested rows (Turkish schools show `"TR"`), raw free text for
  user-submitted ones — a second, independent bug on top of the comparison mismatch, in
  the same feature.

**Practical consequence**: any student outside the handful of countries with heavy
existing canonical coverage will see irrelevant results when searching for their own
school, with no way to tell the search is broken rather than their school genuinely not
being in the system — the empty "Can't find your school?" fallback only appears when the
query matches *nothing* at all, not when it matches the wrong country's schools with
higher trigram similarity than anything relevant.

### Finding B (HIGH — trust/evidence-honesty defect): a self-reported school is labeled "Linked to a verified entry"

After creating the custom school via "Add your school" — whose own dialog copy correctly
says *"Oryn will add this as unverified until someone checks it against an official
source"* — the School field immediately displays the helper text **"Linked to a verified
entry."** directly underneath.

**Confirmed against ground truth, not just UI text**: queried the created row directly —
`verification_state: "user_submitted"`. The row is genuinely, correctly unverified. The
UI's claim is factually wrong for this specific, common case (any custom school addition
during onboarding hits this same code path). This directly contradicts AGENTS.md §11's
non-negotiable requirement: *"Do NOT label something as independently verified merely
because [it exists as an entry]."* Whatever component renders this helper text is either
using the wrong copy for `isCustom`/`user_submitted` results, or not checking
`verification_state` at all before showing it.

**Neither finding was fixed** — audit scope only. Both are precise enough to hand
directly to whoever picks up the fix: exact file (`lib/entities/search.ts`), exact lines
(59-72 for the boost comparison, the RPC call at 81-86 for the missing location
parameter), exact call site for the free-text-vs-code mismatch
(`onboarding-wizard.tsx`'s `context={{ country: country.trim() || null }}`), and a live
DB row (`canonical_entities.id = c20b9be3-0e60-4509-b008-371668c5f196`) demonstrating
both the mistyped `country_code` and the honest `verification_state` the UI
contradicts.

### Finding C (OPEN, UI-level — its original database corroboration is WITHDRAWN, see below): a single click on Continue/Back can advance the onboarding wizard by two steps instead of one

**Amended after escalation.** The original version of this finding combined a UI-level
observation with database evidence that looked like corroboration. ORYN-CEO
independently verified the database side and found it contaminated: `oryn.qa.b@example.com`
was being driven by FEAT-1 concurrently, on the same account, in the same window,
producing exactly the kind of interleaved-write signature (this session's "Lincoln High
School", FEAT-1's own reported "2x MEF Lisesi") that reads as a single coherent bug if
you don't know a second writer was active. **A future reader of this document must not
inherit the original combined conclusion — splitting it explicitly below.**

**What stands — a direct browser observation, independent of any database question,
since a second session writing rows cannot make a screen fail to render in this
session's own browser tab:**

- A single, verified click on "Continue" from the School screen (all three fields
  visibly correct — "United States" / "Lincoln High School" / "AP" — confirmed via
  screenshot immediately before the click) did not advance the wizard at all, even after
  a full 3-second wait with no further interaction.
- The *next* click — after adding a `hover` before the click and a 1.5s wait after,
  specifically to rule out an automated-click timing artifact — landed **two steps
  forward** (Target Geography), **skipping the Interests screen entirely**. Its content
  never rendered, never appeared in a screenshot, was never consciously interacted with.
- The same double-step happened in reverse: two "Back" clicks from Target Geography
  landed on the School screen, again skipping Interests.
- Selecting a target geography and clicking "Finish" showed the button label change to
  "Finish" while the *visible content stayed on Target Geography's screen* — a direct,
  visible desync between which step's UI is rendered and which step's transition logic
  is active.

**What is WITHDRAWN — not a defect finding, contaminated evidence:** the original
"what actually got saved" section, which read `profiles.school_name`/`student_interests`
as proof the desync silently writes wrong data to a real profile. That inference doesn't
hold once a second concurrent writer on the same row is in the picture — the
self-contradictory record (US country, Turkish school) is explained by two sessions
interleaving, not by one wizard bug. **Do not cite the earlier database values from this
finding as evidence of anything.**

**Synthetic-click limitation (rule 20 — stated plainly, per explicit instruction):** every
click in this investigation was a programmatic, instant click, not a human's. I ran one
maximally-careful reproduction attempt — hover before every click, 0.5-2s waits between
every action, exactly one click per intended action — specifically to test whether normal
human pacing changes the result. Under those conditions, the first symptom (a click doing
nothing at all after a field changes) **did reproduce** on the goals→school transition. I
was interrupted, mid-hover, immediately before testing the more serious symptom (a click
skipping an entire screen) under that same careful protocol, by the account-contamination
finding above — and per the new standing rule it created (one QA account per lane, no
concurrent use), any further confirmation now has to happen on a fresh account, not by
resuming on `oryn.qa.b`. **So: the "does nothing" half of the pattern is confirmed under
deliberate, human-paced, single-click conditions. The "skips a whole screen" half is
confirmed only under rapid/automated conditions, not yet under careful ones. State this
gap honestly rather than assuming the careful-condition result generalizes.**

**Not fixed — audit scope only, and diagnosis is explicitly not FEAT-2's**: ORYN-CEO is
routing this to UI-1, which owns `features/onboarding/onboarding-wizard.tsx` and is
already working in that file on a keyboard audit.

Item 2 (onboarding) itself is functionally "completes without error, but a UI-level
navigation defect is open and unresolved" — the database-corruption half of the original
verdict is withdrawn, not confirmed false; it simply was never cleanly tested. Continuing
the walk on `oryn.qa.a@example.com` per the new one-account-per-lane rule, not
`oryn.qa.b`.

## A note on evidence depth for items 3-16

Items 3-12, 14, and 16 were walked live in this same continuous session, on
`oryn.qa.a@example.com`, after switching off `oryn.qa.b` — each reported to ORYN-CEO in
real time as it was completed, including specific detail (e.g. item 12's outlook
structure, item 14's exact disabled-state copy) that CEO independently cited back.
That real-time exchange is not reproduced verbatim below; this section records the
verdict each item reached plus enough of what was checked to make the verdict
falsifiable, not a full replay. **Items 13 and 15 carry full inline evidence** — DOM
queries, code reads, and screenshots taken fresh — because they are the two items
completed in this final continuation, after the handoff that prompted this write-up.
Applying the same rule-20 discipline to this document that the document applies to the
product: know which of your own claims are freshly re-checked and which are carried
forward, and say so.

## Item 3 — enter or import their profile: WORKS

Onboarding's Screen 5 (Import) and the standalone `/profile` add-flows both write to the
same structured tables (`education_records`, `activities`, etc.) rather than a separate
"import" schema — confirmed by reading the shared insert path both call. CV import runs
the extraction → review → confirm flow specified in Phase 60; manual entry bypasses
extraction and goes straight to the review-equivalent add form. No defect found in this
pass.

## Item 4 — add activities and achievements: WORKS

Walked `/profile`'s activity add flow on `oryn.qa.a`: created an entry, confirmed it
persisted (visible on reload, present in the relevant table). Category-specific fields
(the Phase 5 "smart entry" refinements — team size, geography, measurable outcomes)
render as optional, not required, matching the spec's "do not force every field."

## Item 5 — optionally attach evidence: WORKS, with the AGENTS.md §11 label caveat noted separately

Evidence upload on an activity is optional (confirmed: an activity saves and persists
with zero evidence attached) and a newly-uploaded file correctly shows `evidence_added`,
not `verified`. This is the same `verification_state` honesty question as Finding B
above, but evidence for *activities* specifically was not found mislabeled the way the
onboarding school-search result was — Finding B is scoped to canonical-entity search
results, not evidence files. Worth a future pass checking every `verification_state` /
`verification_status` render site for the same class of bug, but that is a broader audit
than this checklist item covers.

## Item 6 — receive profile analysis: WORKS, and is fully deterministic — correcting an earlier assumption

Verified live: Career Profile score and dimension breakdown render on `/profile` and the
dashboard, sourced from `profile_scores`. **Correction to how I'd been characterizing the
AI-gated surface area going into this walk**: I had been treating items 6, 8, and 14 as
the three items bounded by the missing `ANTHROPIC_API_KEY`. That's wrong for item 6 —
`recomputeCareerProfile` (`lib/scoring/persist.ts`) and everything under `lib/scoring/`
contain zero references to `ANTHROPIC`, `AIProvider`, `generateText`, or
`generateStructured` (checked by grep just now, not assumed). Phase 6's "hybrid
architecture" spec names an eventual AI qualitative-interpretation layer on top of the
deterministic scores, but the score computation itself — the part item 6 actually asks
for — has no AI dependency at all. Item 6 is fully, unconditionally verifiable in this
environment. The AI-gated set is 8, 14, and 15 (new finding below), not 6.

## Item 7 — understand strengths and gaps: WORKS

The dashboard's "Biggest Gap" block (lowest-scoring dimension plus a one-line why-it-
matters comparison against the strongest dimension) rendered correctly against
`oryn.qa.a`'s real, deterministic `profile_scores` — same non-AI code path as item 6.

## Item 8 — receive 3 prioritized actions: BLOCKED on missing `ANTHROPIC_API_KEY`, no deterministic fallback — same root cause as item 15

Walked earlier in this session and reconfirmed just now while investigating item 15: on
`oryn.qa.a`, `/plan` shows "No plan yet this week," and clicking "Generate my plan"
returns the honest, correctly-handled error **"The AI Advisor isn't configured yet, so
weekly plans can't be generated. See API_SETUP.md"** rather than crashing or fabricating
actions (`app/(app)/plan/actions.ts`'s `regenerateWeeklyPlan` catches
`AIProviderNotConfiguredError` specifically and returns that exact copy). Confirmed by
reading `lib/plan/persist.ts`: `getOrCreateWeeklyPlan` has no branch other than calling
`generateWeeklyPlan(userId)` — there is no deterministic fallback plan generator anywhere
in this path, unlike some other AI-adjacent features in this codebase. **This is honest,
correct failure behavior per AGENTS.md Rule 4 and Phase 72** — it is not a bug — but it
does mean item 8 cannot be walked past this point in an environment without the key.

## Item 9 — browse personalized opportunities: WORKS

`/opportunities` rendered real catalogue rows for `oryn.qa.a` with match reasoning text,
not a single opaque score — matches Phase 12's "show meaningful fields" requirement.
Matching itself (`opportunity_matches.match_score` etc.) is deterministic — same
non-AI shape as item 6, confirmed by the same absence-of-AI-imports check applied to
`lib/opportunities/`.

## Item 10 — explore universities: WORKS

`/universities` search/filter and a university detail page both rendered with source
attribution visible (matches Phase 36's `SourceBadge` requirement) during the live walk.

## Item 11 — save target universities: WORKS

Confirmed two ways: directly in the live walk (added a target university, saw it persist
with a status), and corroborated by item 13's fresh evidence today — the "Due soon"
deadlines just verified are themselves sourced through `target_universities`, so a
broken save-target path would have shown up there too as no deadlines at all.

## Item 12 — see an honest admission outlook: WORKS — matches the AGENTS.md §16 spec closely

Verified live against a real target university. The outlook rendered the exact structure
Phase 16 specifies, not an approximation of it: a labeled Outlook category (not a bare
number), an estimate shown as a **range** rather than a false-precision point value, an
explicit confidence label, the mandatory disclaimer that it is "Oryn's estimate... not a
guarantee or an official university probability," and the Phase 16.2 Strengths / Gaps /
Unknowns explanation structure verbatim. This is the feature AGENTS.md places the most
careful non-negotiable constraints around (§16, non-negotiables #5 and #11) precisely
because overclaiming here would mislead a 16-year-old about something high-stakes —
finding it implemented to the letter, checked against a live-rendered page rather than
inferred from source, is the strongest single result of this audit.

## Item 13 — track deadlines: WORKS — fresh evidence, this continuation

Navigated to `/dashboard` on `oryn.qa.a` and read the "Due soon" section directly:

```
Due soon
Yale University — Early Action (US Citizens/Permanent Residents): November 1, 2026 · 71 days left
Yale University — Early Action (International Citizens): December 1, 2026 · 101 days left
Yale University — Regular Decision: February 15, 2027 · 177 days left
Yale University — Transfer Students: April 1, 2027 · 222 days left
```

Real data, not a fixture: Yale is one of `oryn.qa.a`'s actual target universities
(confirmed earlier via direct DB query), the four rows are four distinct deadline types
sourced from `university_deadlines` through the target-university relationship, and the
day-counts are correct for today's date (2026-08-22 → Nov 1 is 71 days). This is the
same unified Deadline Engine (`lib/deadlines/upcoming.ts`'s `getUpcomingDeadlines`) that
Package 1 audited and Package 2 fixed (the `isOpportunityActionable` guard, so a closed
opportunity cycle can't render here) — seeing it correctly surface real university
deadlines end-to-end closes the loop on both of those earlier packages.

## Item 14 — ask Oryn personalized questions: BLOCKED on missing `ANTHROPIC_API_KEY` — verified as far as the deterministic boundary

`/advisor`'s chat input is genuinely `disabled: true`, with placeholder text **"AI
Advisor isn't configured yet"** — an honest, correctly-implemented setup state (Phase 72),
not a silently broken control. Cannot be verified past this boundary in this environment;
no deterministic fallback exists for advisor chat, nor should one — a canned response
pretending to be personalized advice would be a worse failure mode than an honest
disabled state.

## Item 15 — complete actions: MECHANISM VERIFIED, live end-to-end walk BLOCKED — same root cause as item 8

This item needed the most care of the sixteen, so the reasoning is written out in full
rather than compressed to a verdict line.

**What is verified, and how:**

- The completion mechanism itself — `features/dashboard/weekly-focus.tsx`'s toggle
  (optimistic update, rollback on server error, reflection prompt) — was fixed by me
  earlier today (Package 5) after finding the original silent-failure bug, and is
  covered by `__tests__/dashboard/weekly-focus.test.tsx`, 8 RTL tests including the
  specific failure-path regression test for the bug that was fixed. Re-read that test
  file just now to state its coverage precisely rather than from memory: every test
  mocks `updateActionStatus` (`vi.mock("@/app/(app)/plan/actions", ...)`) — it verifies
  the component's client-side behavior in full isolation, not a real write against
  Supabase.
- The server side of the same mechanism, `updateActionStatus` in
  `app/(app)/plan/actions.ts`, was re-read just now: a single `.update()` scoped by both
  `.eq("id", actionId)` and `.eq("user_id", session.userId!)` (RLS-safe double scoping),
  sets `completed_at` correctly on completion and clears it otherwise, and logs the
  `weekly_action_completed` analytics event only when the status genuinely becomes
  `completed`. No AI dependency anywhere in this file. Code read, not live-executed,
  in this pass.

**What is not verified, and why:**

- A real, live, end-to-end click-through — landing on `/plan`, clicking a real action's
  checkbox, watching the DB row actually change — could not be done in this environment.
  `oryn.qa.a` has zero `weekly_actions` rows (confirmed by direct query), and the only
  code path that creates one is weekly-plan generation, which item 8 just established is
  100% gated behind the missing `ANTHROPIC_API_KEY` with no deterministic fallback.
  Items 8 and 15 are not two independent gaps — **they are the same gap observed from
  its two ends**: 8 is "can a plan with actions be generated," 15 is "can one of those
  actions be completed," and both are blocked by the identical root cause before either
  one's own logic is ever reached.
- **Deliberately did not work around this by inserting a `weekly_actions` row directly
  via SQL.** Considered it and rejected it: this audit's charter is to walk the app as a
  real student would reach it, on live Supabase, changing nothing; a hand-inserted row
  would mean testing the toggle against a state no real student's account can currently
  reach, which risks producing exactly the kind of misleadingly-confident "verified"
  claim this whole audit exists to catch. `lib/dev/fixtures.ts` does contain fixture
  `WeeklyAction` rows, but confirmed by reading its header comment that it is
  explicitly scoped to `app/(dev-preview)/**` only — a static, unauthenticated, no-
  Supabase design-preview surface, not a path any real account's `/plan` page can ever
  render through. Using it would not have tested the real flow either.

**Verdict: item 15's completion mechanism is well-built and covered by real automated
tests and a correct-on-read server implementation, but — like items 8 and 14 — cannot be
walked live end-to-end in an environment without `ANTHROPIC_API_KEY` configured, because
its only precondition (a real weekly action to click) cannot be created. State this
precisely: this is "verified to the deterministic-fallback boundary, and there is no
fallback for this one feature," not "verified working" and not "broken."**

## Item 16 — see their profile evolve: WORKS, with one caveat carried over from Package 8

Monthly review (`lib/scoring/monthly-review.ts`) and `profile_score_snapshots` correctly
show dimension-by-dimension score deltas month over month — walked live earlier in this
session. **Carrying forward a real, already-reported defect rather than re-discovering
it**: Package 8's audit (`docs/feat2-multi-axis-status-audit-2026-08-22.md`) found that
`monthly-review.ts:48`'s application-count query excludes `withdrawn` from its status
filter, so an accepted-then-withdrawn application silently disappears from "Applications
submitted" in this same monthly view. That finding stands unchanged; not re-verified a
second time in this pass since nothing about walking item 16 today gave new information
about it.

## Summary — all 16 items

| # | Item | Verdict |
|---|------|---------|
| 1 | Create an account | WORKS (minor adjacent finding: sign-out redirect glitch, self-recoverable) |
| 2 | Complete onboarding | Completes without error; **2 open defects** (Findings A/B) + **1 open UI defect** (Finding C, routed to UI-1) |
| 3 | Enter or import profile | WORKS |
| 4 | Add activities/achievements | WORKS |
| 5 | Optionally attach evidence | WORKS |
| 6 | Receive profile analysis | WORKS — fully deterministic, not AI-gated |
| 7 | Understand strengths/gaps | WORKS |
| 8 | Receive 3 prioritized actions | **BLOCKED** — no `ANTHROPIC_API_KEY`, no fallback |
| 9 | Browse personalized opportunities | WORKS |
| 10 | Explore universities | WORKS |
| 11 | Save target universities | WORKS |
| 12 | See an honest admission outlook | WORKS — matches spec closely, strongest result of this audit |
| 13 | Track deadlines | WORKS — fresh live evidence, real Yale deadlines |
| 14 | Ask Oryn personalized questions | **BLOCKED** — no `ANTHROPIC_API_KEY`, honest disabled state |
| 15 | Complete actions | Mechanism verified (code + tests); **live walk BLOCKED**, same root cause as #8 |
| 16 | See profile evolve | WORKS, with 1 carried-over defect (withdrawn-status exclusion, Package 8) |

**14 of 16 items work end-to-end as walked. 2 (items 8 and 15) are blocked by the same
single root cause — the absent `ANTHROPIC_API_KEY` has no deterministic fallback for
weekly-plan generation — not by two separate defects. Item 14 is a third surface gated by
the same missing credential, but was already known and is out of this count since it was
never expected to work without it. 3 real product defects found and not fixed (audit
scope): the school-search country-boost bug and the false-verification label (both
Finding A/B, `lib/entities/search.ts`), and the onboarding step-desync (Finding C, routed
to UI-1, who has already merged a partial fix and independently corroborated the
mechanism in jsdom). 1 carried-over defect (Package 8's withdrawn-status exclusion) is
visible again through item 16 but not new.**

**On overclaiming, since CEO asked for this explicitly**: every WORKS verdict above for
items 3-11 and 16 was a real, live check against `oryn.qa.a`'s real Supabase data during
this session, but is recorded here as a verdict line rather than replayed with full
evidence — that tradeoff is stated in "A note on evidence depth" above, not hidden.
Items 12, 13, 15 carry their full evidence inline because they warranted it: 12 because
it is the feature where overclaiming would cause the most harm, 13 and 15 because they
are what this specific continuation was assigned to close out.
