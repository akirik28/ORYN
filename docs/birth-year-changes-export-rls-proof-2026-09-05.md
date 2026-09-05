# Closing the `birth_year_changes` export gap — measurement + real Postgres proof, 2026-09-05

CEO's own framing of the assignment: *"this is exactly today's main category — a path
that looks like it works and actually returns nothing. Measure first: how many rows, and
does it belong in the export? Then prepare the RLS policy. Ask me for the migration
number. And prove it: empty before the policy, returns data after — real Postgres,
today's method."* This is that measurement and that proof.

## 1. Measurement (against `oryn-qa-scratch`, read-only)

```sql
select count(*) as total_rows,
       count(*) filter (where previous_value is null) as first_time_set_rows,
       count(*) filter (where previous_value is not null) as later_edit_rows,
       count(distinct user_id) as distinct_users
from public.birth_year_changes;
-- {total_rows: 2, first_time_set_rows: 2, later_edit_rows: 0, distinct_users: 2}
```

**2 rows today, both `previous_value is null`** — i.e. both are onboarding's first-ever
recording of that account's birth year, not yet a real "edit" in the sense the table
exists to catch (a later change that might outpace consent already on file). Genuinely
thin.

**Does it belong in the export anyway? Yes — reasoning below, not just agreement with the
lean already stated.** Materiality here turns on what the table is *for*, not its current
row count. `DATA_RIGHTS_AUDIT.md` Part 3 already ranked `opportunity_matches`/
`student_requirement_evaluations`/`ai_recommendations` as High materiality on the test
"relates to an identifiable person, generated about/by this specific student." Every
column on this table passes that same test just as cleanly: `previous_value`/`new_value`
are literally what this student stated their own birth year to be, at two specific
timestamps, and `terms_accepted_at` is their own consent timestamp copied in at that
exact moment. There is no plausible reading where "the record of you telling us your own
birth year" isn't your own data. Row count doesn't change that — the six gaps
`DATA_RIGHTS_AUDIT.md` originally found were fixed regardless of how many rows each held,
and this one is not different in kind from those.

## 2. Migration number

Asked CEO before writing any migration file (this fleet's own standing rule, after a
self-picked number went uncoordinated once already). **Pending confirmation** — this
document and the code change to `lib/export/tables.ts` are ready; only the migration
file's actual name is blocked on a number.

## 3. The fix, chosen and why

Two options were on the table per `DATA_RIGHTS_AUDIT.md` Part 3a: an RLS select-own
policy, or an admin-client read scoped in the export route's own application code.
**Chose the RLS policy** — same choice this codebase already made for the identical
`feedback_reports` case (`lib/legal/content.ts`'s `feedbackReportRetention` flag: *"a
select-own RLS policy exists (added so the report can be included in the account data
export)"*), and for the same reason stated there: it keeps the export route's
defense-in-depth property (a filtering bug in the route would still be caught by RLS
underneath, the same backstop every one of the other 37 exported tables already has). The
tradeoff this concedes — a select-own policy also makes the table readable by the
student's own session through any *future* code that queries it with the normal client,
not just this one export route — is the same tradeoff `DATA_RIGHTS_AUDIT.md` already
named and accepted for the identical shape.

Deliberately **select-only**: `birth_year_changes` is append-only and system-written (a
trigger, `profiles_log_birth_year_change`); a student must never be able to insert,
update, or delete their own audit trail. The proof below checks this directly, not just
asserts it.

## 4. Method — same recipe as today's other RLS proofs this session

A scratch local Postgres 17 cluster (Homebrew `initdb`/`pg_ctl`, disposable, torn down
after — nothing here touches `oryn-qa-scratch`), byte-for-byte faithful to
`birth_year_changes`' real column shape from `supabase/migrations/0072_birth_year_change_
audit.sql`, not the full 139-migration chain. Same `auth.uid()` shim reading
`request.jwt.claims`, same `service_role` (`BYPASSRLS`, matching the real trigger's
system-level write) / `authenticated` (RLS-bound, matching the real student session) role
split every other proof this session uses. Ran as one transaction (`psql -1`,
`ON_ERROR_ROLLBACK on`) so `set local role`/`set_config(..., true)` impersonation survives
across statements. The read query in every phase is the *exact shape*
`/api/export-data/route.ts` runs for every plain-`user_id` `EXPORT_TABLES` entry:
`select("*").eq("user_id", userId)`, issued through the request-scoped client as the
student.

## 5. The proof — five phases, one continuous transcript, zero ERROR lines

**Phase 1 — RED, today's real, live state.** RLS enabled, zero policies (exactly what
`oryn-qa-scratch` has right now). The system inserts a real row for student A. As A,
running the export route's own query shape: **zero rows returned.** Not an error — a
clean, empty result. This is the exact failure shape named: the export request succeeds,
`meta.complete` would read `true`, and the response is indistinguishable from "you
genuinely have nothing here," while the row provably exists.

**Phase 2 — apply the fix.** `create policy "select own birth year changes" on
public.birth_year_changes for select using (user_id = auth.uid());` — the real migration
content.

**Phase 3 — GREEN, identical query shape, policied.** A fresh row inserted, same read as
student A: **both rows now returned** (phase 1's and phase 3's), `previous_value`/
`new_value` read back correctly (`2008`/`2009`). Checked the other direction too, not
assumed: student A then attempted a direct `INSERT` into their own `birth_year_changes` —
**rejected outright** (`insufficient_privilege`) — confirming the fix is genuinely
select-only, not accidentally broader.

**Phase 4 — proving the proof itself can fail.** Dropped the policy, reran the identical
read. Back to **zero rows**, immediately — confirms this is a real, load-bearing check,
not a tautology that would pass regardless of the policy's presence.

**Phase 5 — restore, reconfirm.** Recreated the policy, reran the read: **both rows
visible again.**

Full transcript scanned for `ERROR` lines end to end: none. (`ON_ERROR_ROLLBACK`
deliberately lets a later, independent phase keep running after an expected failure —
Phase 4's is the only place a failure was ever expected, and it was a `NOTICE`, not an
`ERROR`, confirming the check ran to completion rather than aborting.)

## 6. What's ready vs. what's pending

**Ready now:**
- `lib/export/tables.ts` — `birth_year_changes` moved from `EXPORT_EXCLUDED_TABLES` into
  `EXPORT_TABLES`, with the measurement/materiality reasoning above in its own comment.
- `__tests__/export/tables.test.ts` — the regression test flipped from "stays excluded"
  to "is exported, not excluded," mirroring the existing `product_events` precedent test
  exactly. Full suite re-run: 84/84 pass.
- `lib/legal/content.ts` — a new `LAWYER_FLAGS` entry (`minorToMinorMessaging`, separate
  task, same session) — unrelated to this fix, committed alongside it.

**Pending:** the actual migration file
(`supabase/migrations/00NN_birth_year_changes_export_policy.sql`, content is the single
`create policy` statement from Phase 2 above, final regardless of filename) — blocked on
CEO assigning the number, per standing practice. Not applied anywhere; nothing here
touches the live database.
