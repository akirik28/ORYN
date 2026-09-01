# Which migrations are actually live

Measured 2026-09-01 against `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`) by probing the
schema — columns, triggers, policies, indexes — not by reading the ledger. That
distinction is the whole point of this file.

## The ledger under-reports

`supabase_migrations.schema_migrations` is missing rows for **twelve** migrations, and
nine of those twelve are demonstrably applied. Anything that reads the ledger to answer
"what is live?" gets the wrong answer, in the direction that matters least safely: it
reports work as missing when it is done.

Two consequences:

- **Never answer "is it applied?" from the ledger.** Probe for the thing the migration
  creates. Every row below was established that way; the probe is written down so the
  check is repeatable rather than remembered.
- **`supabase db push` against this project will fail**, because it will try to re-run
  migrations already applied — `0065`'s `create policy` statements have no
  `if not exists` and will error on the second run. A *fresh* project (production) is
  unaffected: its ledger starts empty and the full sequence replays cleanly, which is
  what the `Migrations` CI workflow proves on every push.

## State

| Migration | Live | Probe |
|---|---|---|
| 0057 university_program_kilavuz_kodu | **no** | `university_programs.kilavuz_kodu` column |
| 0058 social_posts | **no — deliberately** | `public.posts` table |
| 0059 schema_gaps_2026-08-22 | yes | `university_requirements_verification_state_check` constraint |
| 0061 public_profiles_require_authenticated | yes | no `anon` SELECT policy on `profiles` |
| 0062 profiles_guard_protected_columns | yes | `profiles_00_guard_protected_columns` trigger |
| 0063 guard_computed_score_columns | yes | `profile_scores_00_guard_computed_columns` trigger |
| 0064 message_reports_verify_reported_user | yes | `create own report` policy |
| 0065 close_insert_forgery_six_tables | yes | 3 own-row policies on `profile_scores` |
| 0067 revoke_anon_is_blocked_between | yes | no `anon` EXECUTE privilege |
| 0068 target_university_null_program_dedup | yes | `target_universities_user_university_no_program_idx` |
| 0069 drop_ad_hoc_backup_tables | yes | zero `public._backup_*` tables remain |
| 0070, 0071 | yes | recorded in the ledger |
| 0072 birth_year_change_audit | **no** | `birth_year_changes` table |

## What the two real gaps cost today

**0057** adds `kilavuz_kodu` to `university_programs` — the Turkish YÖK programme code.
Referenced only by `lib/programs/yok-atlas-matching.ts`,
`lib/programs/tr-bilingual-name-bridge.ts` and a measurement script. No application route
reads it, so nothing a student can reach is affected; it blocks the YÖK matching work
from persisting its results.

**0072** adds `profiles.terms_accepted_at`, the `birth_year_changes` audit table, and the
`profiles_log_birth_year_change` trigger. Consequence: **a student can change their birth
year and the change is not recorded anywhere.** The update itself succeeds — the settings
form works and reports success — so the absence is silent, which is the failure shape
this codebase has been repeatedly bitten by.

Signup is *not* affected. `app/(auth)/actions.ts` writes consent to the auth user's
metadata (`terms_accepted_at`, `terms_version`, `terms_approved_by_counsel`), not to the
profiles column, and says so in its own comment. 0072's profiles column is a second,
currently-unread copy.

## 0058 is not drift

Migration 0058 being unapplied is layer 5 of a deliberate five-layer kill switch on the
social feature — see the header of `lib/social/posts-feature-flag.ts`, and
`__tests__/social/posts-hidden.test.ts`, which asserts layers 1–4 mechanically. Applying
it would remove a guarantee, not fix a gap. Leave it.
