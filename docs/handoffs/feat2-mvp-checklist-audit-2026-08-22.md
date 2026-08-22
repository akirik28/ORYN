# FEAT-2 MVP checklist audit — AGENTS.md Phase 53 — 2026-08-22

Package 9. ORYN-CEO's instruction: walk all sixteen items of Phase 53's MVP definition
end to end, in order, as one continuous session against the app running on live
Supabase, using a real QA account (`oryn.qa.b@example.com`, non-admin). Not a code
review — the sequence itself is the point, because cross-feature handoff failures don't
show up in isolated checks.

**Status: in progress, interrupted once by an org-wide disk emergency (unrelated to this
audit — see `docs/handoffs/...` if a separate record exists), resumed by explicit CEO
instruction.** Writing this file now, mid-walkthrough, specifically so a second
interruption cannot cost these findings — CEO's direct instruction after the resume.

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

## Remaining items — not yet reached

Interrupted twice: once by an org-wide disk emergency, once by this finding's own
investigation and its subsequent correction. Checklist items 3-16 are not yet walked.
Item 2 (onboarding) itself is functionally "completes without error, but a UI-level
navigation defect is open and unresolved" — the database-corruption half of the original
verdict is withdrawn, not confirmed false; it simply was never cleanly tested. Continuing
the walk on `oryn.qa.a@example.com` per the new one-account-per-lane rule, not
`oryn.qa.b`.
