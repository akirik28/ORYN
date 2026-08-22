# INSERT-forgery inventory — every table touched by the RLS verification package

**2026-08-22, BUG-1**, assigned by ORYN-CEO after the `profile_score_snapshots` finding
in migration 0063: a `BEFORE UPDATE OF <col>` guard protects an *existing* row, not a
freshly INSERTed one carrying a fabricated value from the start. This document is the
complete map CEO asked for — every table this package has touched, what a student's own
RLS-scoped session can INSERT with a fabricated value, whether any legitimate app
behavior depends on that INSERT access remaining open, and whether a guard trigger is
even the right tool for closing it. **Inventory only, nothing here is fixed.**

Method: for each table, the live RLS `INSERT`/`WITH CHECK` policy (re-confirmed against
`pg_policies` at write time, not assumed from memory) plus, where the risk was ambiguous
from policy text alone, an empirical adversarial insert against `oryn-qa-scratch` with a
real QA session — same standard as every other finding in this package. Every write this
inventory pass performed live is already recorded and cleaned up in the surfaces-3/4
report; this document adds no new live writes.

## Summary table

| table | forgeable columns on INSERT | legitimate path needs open INSERT? | guard trigger the right tool? | verdict |
|---|---|---|---|---|
| `profiles` | none — no INSERT policy exists at all | no (row created by `handle_new_user` trigger only) | n/a | **closed, not exploitable** |
| `connections` | none found | yes (`sendConnectionRequest`) | n/a | **closed** — WITH CHECK already pins requester_id + status='pending' |
| `messages` | none found | yes (`sendMessage`) | n/a | **closed** — WITH CHECK already requires accepted+unblocked, verified live |
| `blocked_users` | none found | yes (`blockUser`) | n/a | **closed** — WITH CHECK already pins blocker_id |
| `message_reports` | **`reported_user_id`** — no check ties it to `message_id`'s real sender | yes (`reportMessage`) | **no** — needs a same-row cross-column check, not a column reset | **fixed this pass — migration 0064, written not applied** |
| `profile_scores` | dimension, score, confidence, calculation_version, reason_codes, calculated_at (a fresh dimension/version combo, not yet scored) | yes (`recomputeCareerProfile`, now via admin client) | **no** — guard only fires on UPDATE of an existing (user,dimension,version) row | **open, real, same severity class the UPDATE path had before 0063** |
| `profile_score_snapshots` | overall_score, dimension_scores, score_version, snapshot_reason (every column) | yes (`recomputeCareerProfile`, now via admin client) | **no** — this table is INSERT-only, a guard trigger is structurally inert here | **open, real — the worst case in this map** |
| `opportunity_matches` | eligible, match_score, relevance_score, profile_need_score, eligibility_notes, effort_estimate, reason_codes, calculated_at (a fresh opportunity_id not yet matched) | yes (`refreshOpportunityMatches`, now via admin client) | **no** — same shape as `profile_scores` | **open, real, highest product-trust stakes (FEAT-1 eligibility work)** |
| `student_requirement_evaluations` | status, reasoning, evaluated_at (a fresh requirement_id not yet evaluated) | yes (`refreshRequirementEvaluations`, now via admin client) | **no** — same shape | **open, real** |
| `evidence_files` | `verification_status` set to `'verified'` directly at row creation, bypassing the app's own `'evidence_added'` default | yes (`uploadEvidence`) | **no** — the migration-0063 guard is UPDATE-scoped, doesn't touch INSERT | **open, real, but currently no UI reads verification_status at all (see known-issues.md)** |
| `ai_recommendations` | title, reason, recommendation_class, category, related_dimension — the entire row, impersonating the advisor's own output | yes (`lib/plan/persist.ts`) | **no** — INSERT-only table, same shape as `profile_score_snapshots` | **open, real — already flagged as a design question in known-issues.md, not re-litigated here** |

## Per-table detail

### `profiles` — closed

No `INSERT` policy exists on this table at all (confirmed: only `"select own profile"`
and `"update own profile"`, both row-scoped SELECT/UPDATE). A row is created exclusively
by the `handle_new_user()` trigger firing on `auth.users` insert (Supabase's own signup
flow), and that function's return type is `trigger`, which Postgres refuses to execute
outside a trigger context — confirmed live earlier this session
(`select handle_new_user()` → `ERROR: trigger functions can only be called as triggers`).
A client cannot insert a second `profiles` row for an existing id, and cannot insert one
under an arbitrary new id without also creating a matching `auth.users` row, which is
GoTrue's territory, not PostgREST's. No forgery surface here.

### `connections` — closed

`"create own connection request"` WITH CHECK: `requester_id = auth.uid() and status =
'pending'`. Empirically confirmed today (surfaces 3+4 report): a direct insert forging
`requester_id` to someone else, or setting `status='accepted'` at creation to skip the
request/accept flow entirely, both rejected by RLS itself. `recipient_id` is unconstrained
by the WITH CHECK, but that's correct — a student is expected to name any other real user
as the recipient of their own outgoing request; the FK to `profiles(id)` is the only
constraint that matters there, and an unknown/fake id simply fails the FK.

### `messages` — closed

`"send message to accepted unblocked connection"` WITH CHECK requires `sender_id =
auth.uid()`, an existing `accepted` connection between the two parties, and `not
is_blocked_between(...)`. Empirically confirmed today: forging `sender_id`, messaging
with no connection, and messaging while the connection is still `pending` (not yet
`accepted`) were all rejected by the raw insert, independent of the app-layer `sendMessage`
check. This is the one table in this map where the DB policy already does real,
multi-condition validation at INSERT time, not just an identity pin — no forgery surface.

### `blocked_users` — closed

`"create own block"` WITH CHECK: `blocker_id = auth.uid()`. Empirically confirmed today:
a direct insert forging `blocker_id` to claim someone else blocked a third party was
rejected. `blocked_id` is unconstrained beyond the FK + the `blocked_users_no_self` check
constraint, which is correct — a student legitimately names any other real user as the
one they're blocking.

### `message_reports` — FIXED this pass (migration 0064, written not applied)

`"create own report"` WITH CHECK: `reporter_id = auth.uid()` only. **Empirically
confirmed**: `reported_user_id` and `message_id` were both accepted with no relationship
checked between them — a student could file a report against a message a different, real
user actually sent while naming an entirely unrelated user (including, tested directly,
themselves) as `reported_user_id`. Neither RLS nor `reportMessage()`'s app code
cross-checked that the accused matched the message's actual `sender_id`.

- **Legitimate path needs open INSERT**: yes, `reportMessage` must be able to create a
  new report row for any accepted-connection message the caller received.
- **Was a guard trigger the right tool? No.** A `BEFORE UPDATE` guard is irrelevant here —
  the defect is at INSERT time, on a relationship between two columns of the *same* new
  row, not a column being overwritten later.
- **Severity, revised from this pass's own initial "moderate" call (ORYN-CEO)**: higher
  than moderate, though not critical. `message_reports` feeds the admin moderation queue
  (`app/(app)/admin/page.tsx`), reviewed by an adult — a reviewer has no reason to suspect
  the accused doesn't match the message shown, so the row presents as validated input,
  not a claim requiring independent verification. On a product for 14–18-year-olds
  (AGENTS.md Section 12), the failure mode is a minor accused of something in a queue an
  adult acts on, not a wrong statistic. Still not critical: reaching it needs a deliberate
  raw insert, not the UI, and it remains catchable by a reviewer who happens to check.
- **Fix, amended once before ever being applied**: the first version of
  `supabase/migrations/0064_message_reports_verify_reported_user.sql` only closed the
  `message_id` branch, reasoning `message_id is null` was safe to leave unconstrained
  because "no current app path inserts one." **That premise was wrong, caught by
  ORYN-CEO before merge**: `message_reports` has a second reference column,
  `recommendation_id` (migration 0035, added specifically so this same table could also
  queue reported recommendations rather than building a parallel moderation system), and
  `reportRecommendation()` (`app/(app)/u/[id]/recommendation-actions.ts`) inserts with
  `recommendation_id` set and `message_id` left null on every real call — precisely the
  branch the first version left with zero attribution check. The forgery was therefore
  still fully open via the second column, reachable without ever calling
  `reportMessage()` — the exact same shape as the original finding, one field different.
  **Amended**: two symmetric OR'd branches, `message_id` cross-checked against the
  message's real `sender_id`, `recommendation_id` cross-checked against the
  recommendation's real `author_id` (`not null`, migration 0035). Both DB-level `WITH
  CHECK` subqueries, matching `messages`' own existing subquery-in-WITH-CHECK precedent.
  The recommendation branch's safety (does the subquery resolve correctly under the
  caller's own RLS, or does it need security-definer) was checked independently rather
  than assumed by analogy: `recommendations`' own SELECT policy is the same party-scoped
  shape as `messages`' (`author_id = auth.uid() or recipient_id = auth.uid()`), so a
  caller reporting a recommendation they were never a party to also gets correctly
  rejected. Requiring at least one correctly-attributed branch also rejects a report with
  neither column set, closed for free. Regression test extended to cover both branches
  and the OR structure: `__tests__/security/message-reports-forgery-guard.test.ts`.
  Written, not applied — founder-gated, same standing constraint as every migration in
  this package.
- **What this amendment is really evidence of**: not that the fix was careless, but that
  "no legitimate path does X" is a claim that needs the same verification standard as
  everything else in this package — checked against every actual call site, not asserted
  from the one call site that prompted the finding. The same discipline this whole
  package has applied to live database behavior (verify, don't assume from policy text)
  applies just as much to a migration's own stated premises about the application code
  it's protecting.

### `profile_scores`, `opportunity_matches`, `student_requirement_evaluations` — OPEN, same shape

All three share one structure: the legitimate writer now uses the admin client (0063),
and a guard trigger correctly resets a column if a non-service-role session tries to
*update* an existing row. None of the three guards fire on INSERT. For a `(user_id,
dimension/opportunity_id/requirement_id)` combination that has never been computed
before, a student's own RLS-scoped session can still INSERT a brand-new row with any
value in the guarded columns — the row simply doesn't exist yet for the guard's `OF`
clause to intercept.

- **`profile_scores`**: a student could insert a fake score for a dimension `calculation_version`
  that's never been computed (e.g., a new `calculation_version` string of their own
  choosing sidesteps the unique constraint on `(user_id, dimension, calculation_version)`
  entirely). Feeds the dashboard's own score display and `lib/benchmarking/cohort.ts`'s
  cross-user peer comparison.
- **`opportunity_matches`**: a student could insert `eligible=true`/a high `match_score`
  for an opportunity they've never had matched (any real `opportunity_id`, which is
  enumerable via the `opportunities` table's own `authenticated read` policy). Highest
  product-trust stakes of the three — this is the exact eligibility-honesty surface
  FEAT-1's concurrent work targets.
- **`student_requirement_evaluations`**: a student could insert `status='met'` for a
  `requirement_id` they've never had evaluated. Feeds the university detail page's
  Requirement Check display and, per Phase 70, application readiness.

**Is a guard trigger the right tool for any of these?** Only partially. A guard closes
the *repeat*-computation forgery (a student can't overwrite a row the real engine already
wrote). It does nothing for the *first*-computation forgery (inserting a row for a key
the engine hasn't touched yet). Closing that needs either: a `WITH CHECK` requiring
`current_user = 'service_role'` for INSERT too (which would need the guard's reasoning —
role-based, not row-based — extended to the INSERT policy itself, not just an UPDATE
trigger), or moving these tables' RLS INSERT grant to service-role-only entirely and
routing every legitimate insert through the admin client (which 0063 already did for the
*write*, but the RLS policy itself still permits `authenticated` to insert directly).

### `profile_score_snapshots` — OPEN, the worst case in this map

Already named in migration 0063's own comment as the case where a guard is "close to
inert." Restated here because CEO asked for the complete map, not a re-derivation: this
table is **pure INSERT**, no UPDATE path exists anywhere in this codebase, legitimate or
otherwise. Every column beyond `id`/`user_id`/`created_at` (`overall_score`,
`dimension_scores`, `score_version`, `snapshot_reason`) is freely insertable by the row's
own owner today, with no guard of any kind touching INSERT. A student could insert a
fabricated low-score-then-high-score pair of snapshots to manufacture a fake "improvement
over time" narrative for `lib/scoring/monthly-review.ts`'s own trend calculation and the
dashboard's "Biggest improvement" widget.

**Is a guard trigger the right tool?** No, categorically — there is no UPDATE event for a
`BEFORE UPDATE` trigger to ever fire on. The only tools that touch INSERT are: a `WITH
CHECK` restricting insert to `current_user = 'service_role'`, or a `BEFORE INSERT`
trigger that rejects/silently drops a non-service-role insert (mirroring the UPDATE
guards' reset-not-raise shape, but for INSERT: `NEW := NULL` inside a `BEFORE INSERT`
trigger silently skips the row entirely instead of erroring — the INSERT-side equivalent
of "reset to OLD," since there is no `OLD` to reset to).

### `evidence_files` — OPEN, real but currently inert in practice

`verification_status` migration-0063 guard is `BEFORE UPDATE OF verification_status`
only. At INSERT time, nothing stops a student from setting `verification_status:
'verified'` directly on a freshly-created row, bypassing the app's own hardcoded
`'evidence_added'` default (`uploadEvidence`, `app/(app)/documents/actions.ts`). Restated
from the original finding: this is currently not a live-risk *display* problem, since
`verification_status` is rendered nowhere in the UI today (re-confirmed: still zero
matches for the column across `app/`, `features/`, `components/`) — but the INSERT path
means even the UPDATE guard's protection was incomplete from the start, independent of
whether a display feature ever ships. Same tool gap as the three computed-score tables:
a `WITH CHECK`/`BEFORE INSERT` restriction, not a `BEFORE UPDATE` guard, is what would
actually close this.

### `ai_recommendations` — OPEN, already tracked as a design question

Restated for completeness of the map, not re-litigated: the only writer
(`lib/plan/persist.ts`) is a single INSERT site with no UPDATE path anywhere, so this is
structurally identical to `profile_score_snapshots` — a guard trigger cannot help. Already
in `docs/known-issues.md` as an open design question (should this table's RLS-scoped
INSERT exist at all, or should the whole write path move to the service-role client) —
not re-opened or re-decided here.

## What this map is for

Six tables in this map are open, one is fixed, and the two shapes are genuinely
different — worth stating plainly rather than blurring together.

`message_reports` was a **cross-column** gap on a single new row (does `reported_user_id`
agree with `message_id`'s real sender) — a `WITH CHECK` subquery closes it completely at
INSERT time, no design tradeoff involved, so it was fixed in this same pass rather than
left on the map.

The remaining six (`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
`student_requirement_evaluations`, `evidence_files`, and — pending its own separate
design decision — `ai_recommendations`) share a different root cause: this package's
guard triggers close the *repeat-write* forgery (overwriting a row the real engine
already computed) but not the *first-write* forgery (inserting a row for a key the engine
has never touched). Closing that class needs an INSERT-scoped mechanism, not an
UPDATE-scoped one, applied consistently across all six — a deliberate, single design
choice with real blast radius (it changes an RLS INSERT grant that's currently
`authenticated`-wide on tables spanning three different feature areas), which is exactly
why this pass produced the map for these six and not the fix.
