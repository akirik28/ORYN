# Which migrations are actually live

Measured 2026-09-01 against `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), with 0072 corrected
and 0073 added on 2026-09-02 — see the note on 0072 below for why this table's own history
is the sharpest illustration of point 1 above.

## Two ways I got this wrong before getting it right

Both are worth writing down, because both are cheap to repeat.

**1. The ledger is not the authority.** `supabase_migrations.schema_migrations` has no row
for twelve of our migrations, and nine of those twelve are demonstrably applied. Reading
the ledger to answer "what is live?" reports finished work as missing.

**2. A probe that matches a *conventional* name proves nothing.** Having learned (1), I
probed the schema instead — and still got 0059 backwards, twice:

- I checked `university_requirements.scope`. 0059 adds `scope` to
  `university_deadlines`. The column I found was a different column that happens to share
  a name.
- I checked for the constraints `university_requirements_verification_state_check` and
  `..._evaluation_gate_check` and found both. But Postgres auto-names check constraints
  `<table>_<column>_check`, so those exact names exist whether or not 0059 ever ran. Only
  reading `pg_get_constraintdef` settled it: the live constraint allows five values, 0059's
  allows six. 0059 has not run.

The rule: probe for something the migration and *only* the migration produces, and compare
the definition, not the name.

## State

| Migration | Live | How it was established |
|---|---|---|
| 0057 university_program_kilavuz_kodu | **no** | `university_programs.kilavuz_kodu` absent |
| 0058 social_posts | **no — deliberately** | `public.posts` absent |
| 0059 schema_gaps_2026-08-22 | **no** | all four of its columns absent; both CHECK definitions are the pre-0059 vocabularies |
| 0061 public_profiles_require_authenticated | yes | no `anon` SELECT policy on `profiles` |
| 0062 profiles_guard_protected_columns | yes | `profiles_00_guard_protected_columns` trigger |
| 0063 guard_computed_score_columns | yes | `profile_scores_00_guard_computed_columns` trigger |
| 0064 message_reports_verify_reported_user | yes | `create own report` policy |
| 0065 close_insert_forgery_six_tables | yes | 3 own-row policies on `profile_scores` |
| 0067 revoke_anon_is_blocked_between | yes | no `anon` EXECUTE privilege |
| 0068 target_university_null_program_dedup | yes | named unique index present |
| 0069 drop_ad_hoc_backup_tables | yes | zero `public._backup_*` tables remain |
| 0070, 0071 | yes | recorded in the ledger |
| 0072 birth_year_change_audit | **yes (as of 2026-09-02)** | `to_regclass('public.birth_year_changes')` resolves; RLS enabled, zero policies — matches the migration exactly. Recorded here as "no" the day before, from a probe run 2026-09-01; this table went live in the roughly 24 hours between that probe and this correction. If you are reading this after some time has passed, re-probe — don't trust either date. |
| 0073 product_events_select_own | **yes (as of 2026-09-02)** | `pg_policies` shows `"select own product_events"`, `SELECT`, `{authenticated}`, `user_id = auth.uid()` — the policy 0073 creates, by name and definition, not just by a table existing. |

All five security-hardening migrations (0061–0065) plus 0067 are live. That was checked
here rather than carried forward from memory.

## What each gap actually costs

**0072 — no longer a gap, confirmed 2026-09-02.** `profiles.terms_accepted_at`, the
`birth_year_changes` table, and the `profiles_log_birth_year_change` trigger (enabled) are
all live. A birth-year change is now recorded. What's *not* resolved is a separate
question this migration deliberately left open rather than one it missed: `birth_year_changes`
carries RLS with zero policies, so nothing can read it back yet, including the data export
(see lib/export/tables.ts's EXPORT_EXCLUDED_TABLES entry and DATA_RIGHTS_AUDIT.md Part 3a).
That's a real, still-open item — just a different one than "does this get logged at all."

Signup is *not* affected: `app/(auth)/actions.ts` writes consent into the auth user's
metadata, not the profiles column, and says so in its own comment. 0072's column is a
second, currently-unread copy.

**0059 — costs nothing today.** Its four columns (`university_deadlines.scope`,
`opportunities.access_channel`, `university_requirements.unmet_consequence`,
`university_programs.ucas_code`) are referenced only by `types/database.ts`, dev fixtures
and one analysis script. Its two widened vocabularies (`staleness_suspected`,
`cycle_contingent`) have no writer: `lib/requirements/ingest.ts` documents the constraint
gap in its own header and types around it deliberately. Applying 0059 unblocks the
requirement-research vocabulary; not applying it breaks nothing.

**0057 — costs nothing today.** `kilavuz_kodu` is read only by
`lib/programs/yok-atlas-matching.ts`, `lib/programs/tr-bilingual-name-bridge.ts` and a
measurement script. No route touches it. It blocks the YÖK matching work from persisting.

**0058 — genuinely contested; the founder's call.** It is named as layer 5 of a deliberate
five-layer kill switch on the social feature (`lib/social/posts-feature-flag.ts`, with
`__tests__/social/posts-hidden.test.ts` asserting layers 1–4 mechanically). I first wrote
here that it must therefore stay unapplied. That was too quick: `docs/migration-gap-audit-2026-08-31.md`
§2 argues the opposite, and argues it better than I had. Its case — 0058 is purely additive
DDL touching no existing row; the flag file's own text says the five layers are independent,
so removing one leaves route, nav, Server-Action and flag intact; the legal gate is about
turning the feature *on for students*, which applying tables does not do; and the
alternative is permanent defensive code for a precondition that audit proved cannot occur.

Both readings agree on the constraint that actually matters — nothing reachable by a
logged-in student — and disagree only on whether the schema gap is a safeguard or a liability.
Removing a layer from a deliberate defence-in-depth is a decision to take deliberately, so
it belongs to the founder rather than to either document.

## Operational consequence

`supabase db push` against **this** project will fail: the ledger's twelve missing rows
mean it re-runs migrations already applied, and 0065's `create policy` statements have no
`if not exists`. A fresh project — production — is unaffected; its ledger starts empty and
the whole sequence replays cleanly, which the `Migrations` CI workflow proves on every push.
