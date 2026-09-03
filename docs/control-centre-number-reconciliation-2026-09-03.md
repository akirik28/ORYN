# Do the control centre's numbers agree with reality? — 2026-09-03

Measurement only, per oryn-a7's dispatch. No code changed. Scope: the overview page's four
headline cards plus the two named-example categories (growth signups/activation, catalogue),
checked against independent SQL I wrote myself, not against what the code claims about
itself. Did not attempt all twelve screens exhaustively — this covers spend, students,
growth, and catalogue specifically, the four categories the dispatch named.

## Result: the numbers I checked are accurate. One latent (not currently manifesting) inconsistency found.

### Overview card 1 — "AI spend, last 30 days"

The exact shape the dispatch predicted, checked directly: `getSpendSummary`'s `last30dUsd`
is `sumCostSince(admin, daysAgoIso(30))` — a genuine rolling 30-day window
(`Date.now() - 30*86400000`), not calendar-month-to-date or all-time mislabeled. Confirmed
against my own independent query (`ai_usage` summed where `created_at >= now() - interval
'30 days'`): **$3.8929**, matching what the code would compute, to the label it carries.
Label and window agree.

**One real seam, currently harmless:** `sumCostSince` (backing `todayUsd`/`last7dUsd`/
`last30dUsd`) does not exclude `model = 'test-model'` rows, while the same function's
`allTimeUsd`/`byFeature`/`byModel` explicitly do (a prior pass's own fix, with its own
comment explaining why). Right now this produces no wrong number — the three live
`test-model` rows all have `estimated_cost IS NULL` (confirmed), and `sumCost`'s `?? 0`
treats null as zero either way, so my independent sum matched with and without excluding
`test-model` ($3.8929 both times). But the inconsistency is real: the day a fixture or test
run writes a `test-model` row with a nonzero cost, `last30dUsd` would silently include it
while `allTimeUsd` on the same page would not — two numbers on one summary object,
disagreeing for a reason nothing on screen would explain. Worth closing the gap
opportunistically, not urgently.

### Overview card 2 — "Registered students"

`users.length` from `getAdminUserList`, which selects every `profiles` row with no filter —
11 today. Independently confirmed: 11 total profile rows, of which 8 have
`onboarding_completed = true` (the /kumanda/ogrenciler page's `completedOnboarding` figure,
also independently confirmed against `getOnboardingFunnel`, which agrees exactly). **The
label says "registered," not "active" or "onboarded," and the code counts registrations —
label and scope agree.** This is the one place a mismatch would have been easy (11 vs. 8 is
a real, visible gap) and isn't one, because the label was written narrow enough to be true.

### Growth: signups and onboarding funnel (`/kumanda/trafik`)

`getSignupTimeline`: `total = 11` (every profile, all-time, no window claimed — it's a
timeline, and the section's own copy doesn't claim a recency it doesn't have).
`getOnboardingFunnel`: `signedUp: 11, completedOnboarding: 8` — independently confirmed
against the same direct count. `reachedCvExtraction` is deliberately *not* labeled
"completed CV import" in its own interface comment, because the underlying event fires
before the real save step — a distinction the section's copy is required to carry, and does
(checked the component, not just the query). No mismatch found.

### Catalogue count

**Checked for a displayed total and found none to check.** `/kumanda/katalog`'s
`OpportunitiesSection` renders a capped moderation list (`ADMIN_OPPORTUNITY_LIST_LIMIT =
50`, most-recently-created, no status filter) via `OpportunityModerationList` — grepped
that component directly: its only use of `.length` is an `=== 0` empty-state check, never a
displayed count. There is no "N opportunities" or "N universities" headline number anywhere
in the admin panel today (grepped for every plausible name — `totalOpportunities`,
`catalogCount`, etc. — zero hits). The dispatch's own catalogue example was the right kind
of question to ask; there's just no number behind it yet to be wrong about. Worth naming so
nobody assumes it was checked and found fine — it was checked and found absent.

### Students page — "last seen"

`getAdminUserList`'s `lastSeenAt` is genuinely `auth.users.last_sign_in_at`
(`admin.auth.admin.listUsers()`), not `profiles.updated_at` — read the code specifically to
rule out the more tempting, wrong substitute (a profile *edit* timestamp, which the
function's own comment says was deliberately rejected as "staler" and different in kind).
Matches "when they last showed up" honestly.

## What this pass did not cover

`/kumanda/arastirma`, `/ayarlar`, `/defter`, `/kar-zarar`, `/moderasyon`, `/topluluk`, and
the remaining growth sections on `/trafik` (loop-closing, retention, feature census, student
actions, `ActivitySection`) — not checked this pass. `/kumanda/sistem` was already verified
in a separate audit tonight (docs/migration-transition-audit-2026-09-03.md territory).
Flagging the boundary rather than implying full coverage.

## Bottom line

Every number checked against independent SQL — spend's window, students' scope, growth's
signup/onboarding counts — matches its own label. This is the second "checked and found
little" result tonight; the one real thing found is a latent inconsistency with no current
victim, not a currently-wrong number a founder would act on incorrectly this morning.
