# Admin Growth & Engagement Panel — data shape + action list

**Status: report only, per both briefs (data shape before building; action list before
building). No query-layer code, no section components, no `page.tsx` change yet — this is
the read before either.**

## What changed mid-task

Started this as a read-only observation panel (signups, activation, feature usage, loop
closing, retention). Mid-investigation, oryn-a7 relayed a real course correction: the
founder saw a read-only prototype and said *"sen bana rapor tarzı bir şey yapıyorsun"* (you're
making me a report) — they want a control panel, not a dashboard. This doc answers both
briefs together: the data shape (what the numbers actually look like, live-verified), and
the action list (what's genuinely operable here versus what would be a manufactured
button).

---

## Part 1 — Data shape, live-verified

**Read-only, aggregate queries only** (`GROUP BY`/`count()`, no raw row selection) —
consistent with the sensitivity of querying real student data directly, even against
`oryn-qa-scratch`. A few individual-row queries this session were blocked by this session's
own permission classifier; every number below is real and came back from the live
database, but the *set* of aggregate queries run was shaped by what the classifier allowed,
not by what would have been most useful in an unconstrained session. Said here once,
plainly, rather than silently presenting a curated set as if it were the full query plan
I'd have run otherwise.

### 1. Growth — and the first, most important honest finding

**This is not a growth curve. It's a seed cohort.** All 11 signups land in a single 5-day
window:

| Day | Signups |
|---|---|
| 2026-08-20 | 2 |
| 2026-08-21 | 3 |
| 2026-08-22 | 2 |
| 2026-08-23 | 3 |
| 2026-08-24 | 1 |

**Zero signups since 2026-08-24** — over a week before this data was pulled (2026-09-02).
Consistent with [[project_oryn_has_never_been_deployed]]: this reads as a founder-seeded
test cohort, not organic acquisition. A line chart of this data, drawn the way a growth
chart is normally drawn, would show a rise then a flat trailing edge that looks exactly
like *decelerating growth* — the one shape a chart at this n is most likely to lie about,
which is precisely the risk oryn-a7 named. **The honest version of this chart doesn't plot
a trend line at all** — it's a bar-per-day count with an explicit caption stating the
cohort is closed/seeded, not a rate a viewer should extrapolate from. Whenever real signups
start, the same query needs no change; only the caption's honesty condition does.

### 2. Activation — onboarding is a 2-checkpoint funnel today, not a 5-screen one

**Real numbers:** 8 of 11 profiles have `onboarding_completed = true`; 3 do not.

**The funnel is much shallower than it looks from the outside, and this is worth stating
directly rather than building a 5-bar chart that implies data that doesn't exist.** Traced
every `logEvent` call site in the onboarding flow (`app/(onboarding)/onboarding/actions.ts`,
`features/onboarding/onboarding-wizard.tsx`) — there are exactly two: `cv_imported` (fires
mid-flow, only for a student who chooses the CV-upload path, at the moment AI extraction
succeeds) and `onboarding_completed` (fires once, at the very end). **Nothing saves to
`profiles` incrementally per screen** — `completeOnboarding` is one `.update()` with every
field at once. So a profile that never completed onboarding looks identical whether the
student dropped on screen 1 or screen 4 — there is no way to reconstruct which of the
spec's 5 screens (AGENTS.md Phase 3) a non-completing student actually reached. **The
honest funnel today has two real stages: signed up → completed onboarding**, plus one
CV-path-specific sub-signal.

**A sharper finding than "no evidence anyone completes CV import":** the `cv_imported`
event doesn't actually mean "completed CV import" — it fires the moment AI extraction
succeeds, which per the spec's own flow (Phase 60: *Upload → Extract → Structure → Review →
User confirms → Save*) is **before** the human review/confirm step. The actual save
(`insertCvImportItems`) happens inside `completeOnboarding` itself, at the very end of the
wizard. So a student who uploads a CV, sees it extracted, then abandons before finishing
onboarding gets a `cv_imported` event with **nothing ever saved to their profile** —
the event measures "extraction succeeded," not "CV import completed." Real count this
session: **3 `cv_imported` events fleet-wide**, against 7 `onboarding_completed` events (see
§3 — a small mismatch between 7 and profiles' 8-true is timing: `product_events` and
`profiles.onboarding_completed` aren't the same read, and one profile likely completed
before event logging existed or outside the events table's current window).

**What this section can honestly show:** signed up (11) → completed onboarding (8) → of
those, chose the CV-upload path and reached extraction (3, with the caveat above) — three
real numbers, not a five-stage funnel. If a five-stage funnel is wanted, it needs a
one-line `logEvent` call per onboarding screen transition added to the wizard first — a
real, small, separate piece of work, not something this panel can back into from existing
data.

### 3. Feature usage — real census, live counts

`product_events`: **62 rows total**, 9 of the 13 known event names have ever fired:

| Event | Count |
|---|---|
| `profile_item_added` | 17 |
| `advisor_message_sent` | 14 |
| `weekly_action_completed` | 9 |
| `onboarding_completed` | 7 |
| `target_university_added` | 6 |
| `cv_imported` | 3 |
| `opportunity_saved` | 3 |
| `ultra_interest_registered` | 2 |
| `application_updated` | 1 |

**Four names exist in code and have never fired, once, ever:**
- **`research_project_started`** (`app/(app)/profile/actions.ts:407`) — Phase 13's Research
  Project Generator. This is the one worth taking seriously as "dead": a real, spec'd,
  built feature with genuinely zero recorded use.
- **`opportunity_applied`** — students save opportunities (3 times) but have never logged
  moving one to "applied" via this action. Worth checking whether "applied" status changes
  might happen through a different path this event doesn't cover, before calling the
  feature itself unused — flagged, not concluded.
- **`birth_year_backfill_below_minimum_age`**, **`birth_year_settings_update_below_minimum_age`**
  — **zero is the good outcome here, not evidence of a dead feature.** These exist so a
  human sees when a saved birth year reveals an underage signup (age-gate safety net, not a
  product feature anyone is meant to "use"). Grouping these with the two above in a "dead
  features" view would misrepresent what zero means for a safety mechanism versus a
  product feature — worth two visually distinct categories if this ships as a table, not
  one flat list sorted by count.

Small correction to an existing code comment while reading around this:
`lib/admin/queries.ts:191` says "ten known event names, 56 rows" — actual count today is
**13 names, 62 rows** (`ultra_interest_registered` didn't exist when that comment was
written). Not touching that file yet ("report before building"), but worth knowing before
whoever does touch it treats the comment's numbers as current.

### 4. Loop closing — the number is real, and it's small enough that a percentage would mislead

`weekly_actions`: **25 rows total. 1 `completed`. 24 `not_started`. Zero `in_progress`,
`skipped`, or `expired`.**

**Deliberately not presenting this as "4% completion rate."** At n=25 actions (spread
across only 9 `weekly_plans`, meaning well under 11 distinct students), a percentage reads
as more precise than the underlying count supports, and it invites exactly the wrong
question ("why is completion so low") when the more honest question is "is 25 actions even
enough history to have an opinion about." **What the panel should show: the raw fraction
(1 of 25) plus the plan/action counts it's built from, explicitly not a percent sign.** This
is the single number oryn-a7 asked for as "whether the advice is any good" — the honest
answer right now is *there isn't enough completed history to say yet*, and that itself is
the finding, not a disappointing statistic to soften.

### 5. Retention — the schema doesn't support what "by cohort" implies

Checked `auth.users.last_sign_in_at` directly — **it is a single point-in-time value,
overwritten on every sign-in, not a visit history.** It can answer "when did this user last
show up," never "how often do they come back" or "did last week's cohort return this
week" — true cohort retention needs a log of every visit, which nothing in this schema
currently writes (`notifications.read_at` and `product_events` are both event logs, but
neither fires on a bare sign-in/page-load; they're both scoped to specific actions a
student takes once inside the product).

**What exists as an honest proxy, not a cohort chart:** grouped by last-seen day —

| Last seen | Count |
|---|---|
| 2026-08-21 | 2 |
| 2026-08-23 | 2 |
| 2026-08-24 | 2 |
| 2026-09-02 (today) | 2 |
| never signed in (`null`) | 3 |

Two real, useful facts in this table, neither of which is "retention by cohort": **3 of 11
accounts have an `auth.users` row but have never actually signed in** (a real activation
gap, arguably belongs in §2 more than here), and **2 of the original signup-week cohort
were active again as recently as today** — genuine, if thin, evidence some of this seed
cohort keeps coming back a week-plus later. **Recommendation: build "days since last
seen," distinctly bucketed (today / this week / stale / never signed in), not a cohort
retention curve** — the curve would need infrastructure (a visit log) that doesn't exist
yet, and building the chart before the data it needs is exactly the kind of confident
rendering from an absent input this session has been asked to avoid all night.

---

## Part 2 — Action list

Oryn-a7's own framing, taken at face value: *"if your honest answer is 'growth has three
real actions and the rest is genuinely read-only,' give me that."* Walking their four
candidates critically, not accepting the list as-is:

### Real, scoped, buildable with existing infrastructure

1. **Regenerate a student's weekly plan.** `getOrCreateWeeklyPlan(userId, { force: true })`
   (`lib/plan/persist.ts:74`) already exists and already takes a `force` option — this is
   close to a one-function wire-up: an admin server action, admin-client-scoped, calling
   this for a specific student. Directly answers oryn-a7's real scenario ("a student whose
   plan generation failed has no recovery path today"). **Low complexity, real value, this
   panel's clearest genuine lever.**

2. **Export a cohort.** A CSV of the current profile list (or a filtered view — e.g., "not
   onboarded," "no plan yet") — no new schema, no new risk, "the thing a founder actually
   reaches for." Straightforward.

3. **Mark a feature as dead — scoped to record + display, not enforcement, this pass.**
   §3 found a real candidate (`research_project_started`, genuinely zero uses). Full
   enforcement (a feature registry that actually gates code paths, shows a deprecation
   banner, excludes itself from cost/health monitoring) is real scope beyond a control
   panel's read/act boundary — `lib/admin/queries.ts`'s own architecture doc (D8) draws
   this exact line: *"the panel reads and renders... enforcement lives in `lib/ai/limits`
   [i.e., the relevant library]... never split between a screen and a library."* The panel
   version that respects that boundary: an admin can mark a feature's census row
   "confirmed dead, do not build on top of this" — visible, dated, attributed to whoever
   marked it — which is a genuine decision with a genuine consequence (nobody spends a
   future night extending `research_project_started` without seeing that flag first), just
   not a flag that changes runtime behavior tonight. Said plainly since it's a real scoping
   choice: this is smaller than "mark a feature as dead" sounds, on purpose.

### Real, but not this panel's to own outright

4. **Impersonate / view-as a student, read-only.** Genuinely the most useful diagnostic
   tool oryn-a7 named — but it's cross-cutting (the People tab's user list is at least as
   natural an entry point as a stalled-student row in Growth), and it needs real safety
   infrastructure this session shouldn't build casually given the exact incident oryn-a7
   flagged tonight (a lane reaching the founder's own real account). The right shape,
   modeled on `lib/tier/dev-preview.ts`'s own pattern (an override applied at the edge,
   after the real decision, never touching the underlying table) but hardened for a
   production feature rather than a dev-only one:
   - A **required reason field**, not a bare toggle — logged, not just entered and
     discarded, matching oryn-a7's own line: *"a support request, not curiosity."*
   - A **new audit table** (`admin_impersonation_log` or similar): who, whom, when, why,
     and when the session ended. This is real new schema, not a query-layer addition —
     scoping it honestly rather than implying it fits inside existing tables.
   - **Excluded targets**: at minimum the founder's own account and other admin accounts,
     given tonight's own near-incident is the direct reason this constraint exists.
   - **Recommendation: this belongs to whoever owns the People tab, or to a shared
     `lib/admin/impersonation.ts` both tabs import** — Growth should get a link into it
     from a flagged-stalled-student row, not build a second, competing implementation.

### Considered and rejected — the "say so" the brief asked for

- **"Re-run onboarding for a student."** Traced this literally and it doesn't hold up as
  stated. Onboarding is a client-driven wizard that ends in one `completeOnboarding` call
  carrying every field the *student* typed — there's no server-side "run it again" for an
  admin to trigger, because the admin doesn't have the student's answers to re-submit. The
  honest admin-side action isn't "re-run it for them," it's **"reset
  `onboarding_completed` to false so the student can walk through it again themselves"** —
  a real, much smaller action, and a different one from plan regeneration despite being
  bundled with it in the brief. Originally flagged as not worth building without a
  concrete recovery scenario; oryn-a7 approved it explicitly ("take that") on the honest
  smaller-action framing, so it's built (§ below), gated the same as every other action
  here — not because a scenario surfaced, but because a low-cost, non-destructive, easily
  reversible action doesn't need one the way a destructive one would.
- **An admin-triggered one-off "nudge" notification to a stalled student.** Considered and
  actively rejected, not just omitted. A `notifications` row is cheap to write, but a
  message an admin hand-picks and sends to one specific minor student, based on that
  student's own stalled-activation state, is structurally the same shape this session's
  own upgrade-prompt research flagged as legally live territory a few hours ago
  (`docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md` §2: *"never built from
  an individual's behavioral/usage data"*) — the target selection itself (this student,
  because they stalled) is exactly that. Manufacturing this button would be the kind of
  padding oryn-a7 explicitly asked not to do.

### The honest answer to the question asked directly

**Growth has two actions fully its own (regenerate plan, export cohort), one action scoped
down to something real but smaller than it sounds (mark-dead as record-not-enforce), and
one genuinely valuable action (impersonation) that belongs to shared infrastructure rather
than to this tab alone.** The rest — signups, activation, feature census, loop-closing,
retention — is what it is: a read. Not because nothing was tried, but because a signup
count and a retention curve aren't the kind of number a click fixes, and building a button
next to them anyway would be the exact manufactured-lever failure mode oryn-a7 asked this
panel specifically to avoid.

---

## Update — built, per oryn-a7's "go" on regenerate-plan, export-cohort, mark-feature-dead

**oryn-a7 accepted all six calls above, including both rejections, and gave an explicit
go-ahead for three of the four action candidates** — build regenerate-plan, export-cohort,
and mark-feature-dead as record+display; impersonation deferred to a founder decision
(requirements written up below, ready if they say yes).

**Shipped this pass:**
- Migration `0101_admin_dead_feature_flags.sql` — `admin_dead_feature_flags(feature_key pk,
  marked_by, marked_at, note)`, RLS enabled with zero policies (service_role/admin client
  only), same posture as `provider_health`/`external_sync_jobs`. Written, not applied to
  live — migrations stay founder-gated regardless of who authorized the build
  ([[project_oryn_fleet_runway_2026_09_02]]'s own recorded boundary).
- `lib/admin/queries.ts`: `getSignupTimeline`, `getOnboardingFunnel`, `getFeatureCensus`
  (+ `KNOWN_PRODUCT_EVENT_NAMES`, exhaustively grepped and pinned by
  `__tests__/admin/known-product-event-names.test.ts` the same way
  `BELOW_MINIMUM_AGE_EVENT_NAMES` already is), `getLoopClosingStats`, `getRetentionBuckets`.
  All reads (D8); no mutation lives in this file.
- `app/(app)/admin/actions.ts`: `regenerateStudentWeeklyPlan`, `resetStudentOnboarding`,
  `markFeatureDead`, `unmarkFeatureDead`. The plan-regeneration action threads the admin
  Supabase client through `getOrCreateWeeklyPlan`'s own `supabaseClient` option explicitly
  — its doc comment documents a confirmed-live bug where the default session-scoped client
  bills a real AI call and then fails to save under RLS with no session to satisfy it; an
  admin action has exactly that shape by construction, so this isn't optional hardening.
  Also confirmed live via `lib/plan/generate-for-active-students.ts`'s own comment: `force:
  true` deletes the student's already-completed actions for the current week — the section
  below confirms that in an AlertDialog before the button is clickable, not just in code.
- `app/api/admin/export-cohort/route.ts` + `lib/admin/cohort-csv.ts` (RFC-4180-minimal
  escaping, unit tested) — a CSV of `getAdminUserList`'s own data, `tier` column omitted
  since it's always null today (noise, not data, until the minor-payment legal research
  settles what a tier attaches to).
- Six section components under `features/admin/sections/growth-*.tsx`, wired into a new
  "Growth" tab in `page.tsx` (D1/D2), bilingual strings shipped in both `messages/en.json`
  and `messages/tr.json` from this commit (D7). Signups render as `BarChart` (4e's kit) —
  never a line — with a live-computed (not hardcoded) seed-cohort caption that stops
  appearing the moment real signups resume. Loop-closing and the onboarding funnel render
  as plain numbers/fractions, deliberately no chart implying a rate or a five-stage shape
  the data doesn't support.
- Tests: the event-name guard above, `buildCohortCsv`'s escaping (comma/quote/newline/null
  fields), and the migration-numbering collision guard
  (`__tests__/social/posts-schema.test.ts`) bumped 93 → 94 with a header note explaining
  why, matching that test's own established convention.

**Not built, deliberately:** anything that gates a code path on a dead-feature flag
(record+display only, per D8 — see the scoping note above), impersonation itself (below).

---

## Impersonation requirements — written up, not built, pending a founder decision

oryn-a7's own words: *"a lane landed in the founder's own authenticated session tonight
through nothing more than a browser pane reopening, and correctly stopped... building a
supported path into student sessions, on a product for minors, is a decision the founder
should make explicitly."* Not scoped to Growth specifically — People tab is at least as
natural an entry point — written here so the requirements exist in one place before anyone
builds against them, on either tab.

1. **A required reason field, logged, not just entered and discarded.** The UI must not
   allow starting an impersonation session without text in this field — "a support request,
   not curiosity" (oryn-a7's own line) has to be enforced, not just suggested by a label.
2. **A new audit table** (`admin_impersonation_log` or similar): admin id, target student
   id, reason, started-at, ended-at. Append-only; nothing about an impersonation session
   should be editable or deletable after the fact, including by the admin who started it.
3. **Excluded targets, enforced server-side, not just absent from a picker UI:** at minimum
   the founder's own account and every other admin account. This is the direct fix for
   tonight's near-incident, not a hypothetical hardening — a client-side-only exclusion
   (hiding the founder from a dropdown) would not have prevented what actually happened
   (`app/(app)/layout.tsx` reopening a browser pane already carrying the founder's real
   session cookie has nothing to do with any picker).
4. **Read-only for the duration of the session** — same word oryn-a7 used both times
   ("read-only"). No write should be possible while impersonating, full stop; this is
   stricter than the founder's own real session (which can, obviously, write), so the
   mechanism cannot be "log in as them," it has to be a genuinely separate, write-disabled
   view built on the `lib/tier/dev-preview.ts` pattern — an override applied at the edge,
   after the real auth decision, never a second way to actually authenticate as someone.
5. **A visible, persistent indicator for the duration** — the admin (and, ideally, anyone
   who might screen-share or screenshot) should never be able to mistake an impersonated
   view for the admin's own account. Not specified further here; a design decision for
   whoever builds it, not a research question.

Not estimating build size or committing to who owns it — that's oryn-a7's call once (if)
the founder says yes, per their own framing.
