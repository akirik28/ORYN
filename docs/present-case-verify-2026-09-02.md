# Present-case verification — 0089/0090/0091, now live — 2026-09-02

CEO's ask: the founder has applied `plan_tier` (0089), `notify_*` (0090), and `response_mode`
(0091) by hand — three migrations' worth of degrade machinery that was, until tonight,
"written and tested for absence" only (this session's own deploy-readiness audit named this
exactly). Now that the columns are genuinely live, verify the direction that was never
exercised: does the present-case behavior actually match what the absent-case tests assumed
it would. Read-only on live, no writes performed. Branch off `6b9f1682`.

## Method

Two kinds of evidence, used for what each is actually good for. **Live reads** (read-only
`SELECT`s against `qtcvcflzxbuagvvwahhu`) prove what the columns' real, current shape and
values are — the thing no local replica or mock can prove on its own. **A local Postgres
replay** (same technique as the deploy-readiness audit: Homebrew PG17, a hand-built
Supabase-schema stub, all 91 migrations applied in order, dropped after this pass) proves the
actual *write* paths succeed against the real schema shape, without ever writing to live — CEO
was explicit that `plan_tier` in particular should not be set by anyone but the founder, and
this pass extended that caution to all nine columns rather than assuming `notify_*`/
`response_mode` were lower-stakes enough to risk a live write on.

## 1. `resolvePlanTier` / `resolveResponseMode` — present-case confirmed, live

Queried five real profile rows directly (`select id, plan_tier, response_mode, ...,
pg_typeof(plan_tier), pg_typeof(notify_deadline) from profiles limit 5`) rather than trusting
the relayed count: `plan_tier: "standard"` (type `text`), `response_mode: "balanced"`, both
matching their migrations' own defaults exactly, on every sampled row.

Both functions are `profile.plan_tier ?? "standard"` / `profile.response_mode ?? "balanced"`
— a real, present, non-null string can never trigger a nullish-coalescing fallback, so this
isn't asymmetric by construction: the absent case (`undefined`) and the present case (a real
string) take genuinely different branches of the *same* single expression, and only the
absent one was ever exercised before tonight. Now confirmed directly against real, live,
correctly-typed data that the present branch — the identity pass-through — returns exactly
the stored value. Neither function has any write path (both are read-only by their own
doc comments, confirmed unchanged), so there's no write-side asymmetry to check for either
of these two specifically.

## 2. `categoryIsEnabled` — the "interesting one," confirmed with the exact query it actually runs

This is the one CEO flagged as different in kind: a **named-column select** of all seven
`notify_*` fields (`lib/notifications/create.ts`), not a wildcard — the shape that makes
`isUndefinedColumnError` fire correctly pre-migration and, correspondingly, the shape that
stops firing once the columns are real. Confirmed by running the *exact* query the function
issues (same seven-column list, `select notify_deadline, notify_new_opportunity, ...`)
directly against live: returns real `true`/`false` booleans for three sampled rows, no error.
The function's own extraction (`data[PREFERENCE_COLUMN_FOR_CATEGORY[category]]`) is a plain
object-key read against a row now guaranteed to carry all seven keys — confirmed correct by
inspection, not just inference, since the live query proves the row shape it depends on.

Its test file (`__tests__/notifications/create.test.ts`, read in full during tonight's
deploy-readiness pass and re-confirmed unchanged on this branch) already has explicit,
real present-case coverage — including the exact "student muted a category" case and a
dedicated test that would catch a wrong-column read. Nothing more to verify here beyond
confirming the real column shape matches what those mocks already assumed, which the query
above does directly.

## 3. `updateNotificationPreferences` and `updateResponseMode` — dormant, not dead, proven by replay

**`updateNotificationPreferences`** (`app/(app)/settings/actions.ts:202-229`): oryn-bd's
finding was that this failed 100% of the time pre-migration, with an honest, specific
message (`isUndefinedColumnError(error, "notify_")`) rather than a generic one. Its test file
(`__tests__/settings/update-notification-preferences.test.ts`) already mocks a clean success
case ("no error -- returns {} and revalidates /settings") — the mock has always agreed the
function's *logic* is correct for success; what nothing had ever confirmed is whether a real
Postgres, with the real schema, actually returns that success. Ran the exact `update profiles
set notify_deadline = ..., notify_new_opportunity = ..., ...` statement this function issues
against the full 91-migration local replay: `UPDATE 1`, values read back exactly as set.

**`updateResponseMode`** (`app/(app)/settings/actions.ts:247-258`, migration 0091's own write
path): same shape, same `isUndefinedColumnError(error, "response_mode")` guard, same "one
column, one purpose, fail loudly rather than silently drop it" reasoning in its own comment.
Ran its exact `update profiles set response_mode = ...` statement in the same replay:
`UPDATE 1`, value read back correctly.

**Access control checked at all three places a write can be blocked** (the standing rule from
earlier tonight — a policy alone was once nearly enough to wrongly conclude an update was
possible when a trigger silently guarded it) — all confirmed clean for all nine columns:
- **RLS policy**: one blanket `update own profile` policy on `profiles` (`USING id =
  auth.uid()`, `WITH CHECK id = auth.uid()`) — row-scoped, no column restriction, covers
  these columns the same as any other.
- **Column grants**: `authenticated` holds `INSERT, UPDATE, SELECT, REFERENCES` on
  `plan_tier`, `response_mode`, and `notify_deadline` (checked individually; the pattern
  holds for all nine — standard Supabase project-creation grants, nothing narrowed for these
  columns specifically).
- **Triggers**: `profiles` carries six triggers total; queried each one's exact definition.
  Only `profiles_00_guard_protected_columns` restricts specific columns, and its `BEFORE
  UPDATE OF` list is `is_admin, profile_strength_score, completeness_percent` — none of the
  nine new columns. No trigger touches any of them.

**Genuinely asymmetric finding, not just a repeat of the above**: `updateNotificationPreferences`
has direct Server-Action-level unit tests covering both its success and every failure shape.
`updateResponseMode` has none — only `__tests__/advisor/response-mode-slider.test.tsx`, which
tests the UI slider component and almost certainly mocks the action call itself rather than
exercising its internal degrade-guard logic (not independently confirmed by reading that
file this pass, but the absence of any `settings/actions`-level or `response-mode`-Server-
Action-named test file is confirmed by a direct search). The function's logic is proven
correct here by the same replay evidence as its sibling, but it's the one piece of degrade
machinery in this batch that shipped with weaker direct coverage than its neighbor, despite
identical risk shape and landing in the same migration set.

## 4. Anything else that assumed absence — one found, comment-only, same bug shape as ten migration headers and `shape-audit.ts` tonight

**`lib/tier/dev-preview.ts`'s header comment** stated, in the present tense: "migration 0089
... is written, not applied — confirmed live against the real database, the column genuinely
does not exist. `resolvePlanTier` therefore returns 'standard' for every account ... with no
code path able to produce anything else." True when written; not true of the database as of
this pass. **Fixed in this branch** — a dated "STATUS, corrected" note (same template used on
ten migration headers and `lib/requirements/shape-audit.ts` earlier tonight), explaining what
changed and, just as importantly, what *didn't*: the actual override mechanism (a cookie
applied after `resolvePlanTier` decides, never touching `profiles`) was never conditional on
the column's absence and needed no functional change — only the comment's account of *why*
"ultra" is currently unreachable was stale (nothing has set a real row to `'ultra'` yet; the
column existing is no longer the reason).

**Checked and found clean**: `lib/tier/dev-preview-actions.ts` (`setDevTierPreview`) never
writes to `profiles` at all — a cookie-only override, unaffected by any of the three
migrations landing. Grepped every consumer of `plan_tier`/`response_mode`/`notify_deadline`
across `app/`, `lib/`, `features/` (12 non-test files) — the two dev-preview files, both
settings pages, both settings actions, both resolver functions, `plan-tier-view.tsx`,
`settings-view.tsx`, and two `(dev-preview)` design-preview routes (fixture-driven, already
confirmed non-live-data-dependent) — nothing outside the six functions/comment already
covered above touches these columns.

## What this pass did not do

Did not perform any write against live — every write-path claim above is proven via an
isolated local replay, dropped after this pass, never the shared database. Did not read
`__tests__/advisor/response-mode-slider.test.tsx` in full to confirm exactly what it mocks —
flagged the coverage gap from its existence/absence pattern, not from tracing its internals;
worth a direct look if `updateResponseMode` gets its own dedicated test written. Did not
verify `anon`'s broad column grants (`INSERT`/`UPDATE`/`SELECT` alongside `authenticated`) are
themselves correct — read as standard Supabase project-default schema-wide grants (RLS is the
real gate, confirmed above), not something this specific migration batch changed, so out of
scope for this pass rather than silently assumed safe.

## Bottom line

All four checks came back clean or already explained. The present-case direction of every
degrade guard in this batch — two read-only resolvers, one named-select read gate, two
write-path guards — now has direct evidence behind it rather than an untested assumption of
symmetry. One real, if minor, asymmetry found (`updateResponseMode`'s missing dedicated test)
and one stale comment found and fixed (`dev-preview.ts`) — both exactly the shape this session
spent tonight finding elsewhere, applied here to its own most recent work.
