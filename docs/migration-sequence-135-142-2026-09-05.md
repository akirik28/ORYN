# Sequence test: migrations 0135 → 0142, chained, twice, against the live-matching baseline

CEO's instruction, explicitly framed as "bugünün sabah dersinin birebir tekrarı" (an exact
repeat of this morning's own lesson, `scripts/check-morning-packages-14-15-16-sequence.sh` /
`docs/morning-packages-14-15-16-sequence-2026-09-04.md`): eight migrations — 0135, 0136, 0137,
0138, 0139, 0140, 0141, 0142 — were each individually proven today in real Postgres, but never
run **in sequence** against each other or against each other's side effects. Scope was set in
two messages: the first named 0135→0141 (0136-0139 already on `main`; 0140/0141 read in full
from their own unmerged branches); the second, after the founder's return, finalized it at eight
by adding 0142 (`birth_year_changes` select-own policy, merged to `main` at `27bec513` while this
task was in progress) and flagged a live incident directly relevant to this same test's own
subject: 0142's merge broke `__tests__/social/posts-schema.test.ts`'s migration-number ceiling
because the landing lane ran only its own tests, not the full suite — `main` was red for four
minutes before CEO caught and fixed it.

## Provenance of the eight files under test

- 0135-0139, 0142: real files on `main` (`da664179`) at the time of this run.
- 0140: extracted from `oryn/recommendations-guard-2026-09-05` — **re-verified byte-identical**
  to that branch's current remote tip via a fresh `git fetch` + diff immediately before writing
  this doc (`diff` exit code 0), not merely trusted from an earlier read.
- 0141: extracted from `oryn/advisor-generation-locks-guard-2026-09-05`, captured in full
  earlier this session. **Could not be re-verified against a remote tip** — `git ls-remote
  --heads origin` shows no branch by that name at the time of this run, consistent with CEO's
  own "0140 ve 0141 hâlâ başka şeritte, henüz push edilmedi." Used anyway rather than waiting
  idle, since the full content was already in hand; treat this one file's result as provisional
  until CEO confirms the pushed version matches. Structurally low-risk to have drifted (a
  REVOKE plus two short SECURITY DEFINER SQL functions, already proven individually per CEO's
  own message), but named here rather than silently assumed.

## Method

Real local Postgres 17 (the persistent Homebrew service, a unique throwaway database per run,
dropped on exit) — bootstrap and baseline pattern reused verbatim from this morning's own
reusable script, extended with the full Supabase-platform GRANT recipe
(`reference_psql_set_config_local_does_not_survive_psql_f.md`: `grant usage on schema
public/auth`, `alter default privileges ... grant all ... to anon, authenticated, service_role`)
because — unlike the morning script, which only applied DDL as superuser — this test has to
exercise real `authenticated`-role writes to answer CEO's own question about 0141's GRANT/REVOKE
layer. `auth.uid()` shim self-tested against all three real claim shapes (none/empty/real) before
trusting it, per that same reference's standing discipline.

**Baseline** = every migration file except the eight confirmed missing from live
(`docs/migration-vs-live-schema-audit-2026-09-05.md`: 0123, 0124, 0126, 0127, 0129, 0130, 0132,
0133), applied in numeric order up to but excluding 0135 — "taban o," the live-matching starting
point, not a from-scratch schema.

## Result 1 — first pass, in order: all eight applied cleanly

```
0135_notifications_guard_system_generated_columns.sql: OK
0136_target_universities_guard.sql: OK
0137_evidence_status_guard.sql: OK
0138_messages_guard_identity_columns.sql: OK
0139_connections_guard_identity_columns.sql: OK
0140_recommendations_guard_content_columns.sql: OK
0141_advisor_generation_locks_guard.sql: OK
0142_birth_year_changes_export_policy.sql: OK
```

## Result 2 — the interaction questions CEO asked by name

**Does 0141's GRANT/REVOKE (a different layer than the other seven's triggers/policy) leak into
or get affected by them?** Checked directly with `has_table_privilege()`, not inferred: 0141's
`revoke insert, update, delete on public.advisor_generation_locks from authenticated` is scoped
*exactly* to that one table — every one of the other six guarded tables
(notifications/target_universities/activities/messages/connections/recommendations) still has
its full INSERT/UPDATE grant for `authenticated`, unchanged. `pg_policies` confirms
`advisor_generation_locks` still carries exactly its original one RLS policy after 0141 runs —
0141 never touches RLS at all, only the GRANT layer underneath it, which is what "different
layer" means made concrete rather than asserted.

**Do the six chained trigger-guards (0135-0140) still correctly fire in a database where 0141
has already run ahead of them?** One live smuggled-write test per table, executed after all
eight migrations were already applied (so every one of these already ran *after* 0141 in this
same database):

| Migration | Legit field (same statement) | Smuggled field(s) | Result |
|---|---|---|---|
| 0135 notifications | `read_at` | title/body/link/category | frozen, read_at updated |
| 0136 target_universities | `notes` | all 8 outlook-cache columns | frozen (NULL), notes updated |
| 0137 evidence_status (activities) | `description` | `evidence_status` → `'verified'` | frozen, description updated |
| 0138 messages | `read_at` | body/sender_id | frozen, read_at updated |
| 0139 connections | status/responded_at | `requester_id` | frozen, status/responded_at updated |
| 0140 recommendations | `status` | body/author_id/relationship | frozen, status updated |

All six: guarded column(s) unchanged, legitimate field in the same statement still updated —
exactly the same shape each migration's own individual proof already established, now confirmed
unaffected by 0141 running immediately before them in the same chain.

**0141 itself, full functional lifecycle, chained after all six:** `acquire_advisor_generation_
lock()` succeeds via its SECURITY DEFINER RPC despite the REVOKE (returns a real timestamp); a
direct `INSERT`/`UPDATE`/`DELETE` against the table as `authenticated` are each denied
(`42501`/`insufficient_privilege`) — including the UPDATE case specifically, which is the actual
vulnerability this migration closes (RLS's own pre-existing `owner full access` policy would
otherwise let a student bypass the RPC's atomic "only reclaim if stale" check with a bare direct
UPDATE); `release_advisor_generation_lock()` succeeds and removes the row.

## Result 3 — second pass, idempotency: seven clean, one genuine loud failure

```
0135_notifications_guard_system_generated_columns.sql: OK
0136_target_universities_guard.sql: OK
0137_evidence_status_guard.sql: OK
0138_messages_guard_identity_columns.sql: OK
0139_connections_guard_identity_columns.sql: OK
0140_recommendations_guard_content_columns.sql: OK
0141_advisor_generation_locks_guard.sql: OK
0142_birth_year_changes_export_policy.sql: FAILED
  ERROR: policy "select own birth year changes" for table "birth_year_changes" already exists
```

**0135-0141 replay cleanly**, matching their own construction: every guard uses `create or
replace function` + `drop trigger if exists ... ; create trigger ...`, both idempotent by
design (0135's own footer says "re-run safe" — now proven, not just asserted). 0141's `revoke`
is naturally idempotent (re-revoking an already-revoked privilege is a silent, harmless no-op in
Postgres — confirmed directly: `has_table_privilege` for INSERT/UPDATE/DELETE still reads `false`
after the second `revoke`, not somehow restored). Zero duplicate objects anywhere: every trigger
name and every function name in this chain shows exactly 1 row in `pg_trigger`/`pg_proc` after
the second pass, and a live re-check confirms the notifications guard — dropped and recreated
twice now — still actually fires correctly, not just "still present."

**0142 does not replay.** `create policy` has no `create or replace` form and no `if not exists`
clause in Postgres, and 0142 doesn't `drop policy if exists` first (every trigger-based migration
in this same chain does the equivalent guard; 0142 is the one file here that doesn't). This is
**CEO's "errors loudly" category, not the "migration 0104" dangerous category** — the second run
aborts inside its own transaction with a clear Postgres error and changes nothing (confirmed:
the policy count on `birth_year_changes` stays at exactly 1 after the failed second attempt, not
2 and not corrupted) — but it is a real, confirmed gap against the literal "does this survive
being run twice" question, not a theoretical one, and this codebase's own history (documented in
`posts-schema.test.ts`'s migration-numbering comment) includes migrations being applied by hand,
outside the formal ledger, more than once — so an accidental double-apply of 0142 specifically
is not a hypothetical scenario. **Proposed fix, not applied**: add `drop policy if exists
"select own birth year changes" on public.birth_year_changes;` immediately before the `create
policy` line — changes nothing about a first application (a DROP IF EXISTS on a policy that
doesn't exist yet is a silent no-op) and makes a second, accidental one safe instead of a hard
stop. Not applied here because 0142 is already merged to `main` and isn't a migration this lane
owns — flagged for CEO/founder to decide, same as every other migration-content decision today.

## Answering CEO's question directly

Every one of the eight applies cleanly in the founder's real order, against the schema that is
actually live today (not a from-scratch schema). 0141's GRANT/REVOKE genuinely operates on a
different layer than the other seven's triggers/policies, and empirically does not disturb them
— proven, not reasoned from reading. Re-running the whole chain a second time is safe for seven
of the eight and cleanly, loudly blocked (not silently corrupting) for the eighth, with a
one-line fix identified and left for a founder decision. No new migration number was needed or
requested for any of this — the one finding (0142) is a proposed edit to a migration's own
content, not a new gap needing a new number, following this session's own standing rule to ask
before touching migration content rather than deciding it unilaterally.

## A note on `posts-schema.test.ts`'s ceiling, since CEO asked for it to be folded into this test's own scope

The test pins `expect(Math.max(...numbers.map(Number))).toBe(142)` — the true maximum migration
number physically on disk, not a hand-maintained range and not contiguity-checked. One precision
worth adding to CEO's own framing ("her yeni migration onu kırıyor," every new migration breaks
it): it only breaks on a migration numbered **above** the current pinned ceiling. 0140 and 0141
are both *below* 142 — when they land on `main` for real, the true maximum on disk stays 142, so
this specific assertion will **not** need bumping for them, and will not re-break `main` the way
0142 did. The wall CEO is right to flag is for whichever migration is numbered **143 or higher**
next — that lane needs to bump this literal in the same PR, and (the actual four-minute-red
lesson) run the full suite before merging, not just its own feature's tests.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
