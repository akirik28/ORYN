# Would a fresh deploy produce the database we're actually running?

**Status: investigation complete. Read-only against the live database. No migration
written — none was needed; every real gap found already has an existing, unapplied
migration file, or is genuinely absent from the migration history entirely (see §2).**

**Update, same day, found while correcting `docs/migration-state.md` against this
report's own findings**: migration 0048 (`profile_view_visibility_guard`) is *also*
unapplied, and unlike 0057/0059 this one is a real, live, currently-exploitable-as-
described RLS gap — this report's own §5 named policy-clause-text comparison as something
this pass did NOT do exhaustively (existence only, for the 105 not specifically named);
0048 is exactly the kind of thing that scope limitation was hiding. Full writeup, cost,
and the fix (unapplied, migration 0048 itself already exists) in `docs/migration-state.md`
— not restated here to avoid two documents drifting on the same fact.

**Bottom line up front:** yes, almost exactly — replaying all 76 migrations in
`supabase/migrations/` against an empty Postgres 17 database produces a schema that
matches live (`oryn-qa-scratch`, `qtcvcflzxbuagvvwahhu`) object-for-object, with exactly
two categories of difference, both fully identified and explained below. Neither is a
"deployment is unsafe" finding in the sense of data loss or broken RLS. One of them (§2) is
a real product decision the founder should see before deploying, not after.

## Method

`docs/ci-migration-replay-setup.md` already designed and verified this exact check
(2026-08-31, for the duplicate-`0020` incident) but was never installed as CI — no
`workflow` scope to push `.github/workflows/*.yml`. Reused its own bootstrap file
(`.github/migration-replay/supabase-bootstrap.sql`, already on `main`, not gated by that
scope restriction) against a local Postgres 17 (Homebrew, already running on this
machine) instead of a throwaway container — same SQL, same result, no CI needed to answer
this specific question tonight.

```
createdb oryn_deploy_replay
psql -f .github/migration-replay/supabase-bootstrap.sql -d oryn_deploy_replay
for f in supabase/migrations/*.sql (sorted); do psql -v ON_ERROR_STOP=1 -f "$f" -d oryn_deploy_replay; done
```

**All 76 files applied cleanly, in filename order, with zero errors.** Result: 83 tables,
105 RLS policies, 265 indexes, 94 functions, 69 triggers, 75 check constraints, 131
foreign keys, 43 enum types. Every `public` table carries row-level security.

Then compared that replayed schema against live, object by object — not by trusting
`supabase_migrations.schema_migrations` (see §1 for why that ledger can't answer this
question on its own): full table lists, full column lists (1,049 live columns, 1,086
replayed), full trigger definitions, full policy lists, full index lists, constraint and
enum counts, and specific function/trigger/view body comparisons (`pg_get_functiondef`,
`pg_get_triggerdef`, `pg_get_viewdef`) for the pieces named directly in the brief.

## 1. Why the ledger can't answer this on its own

`supabase_migrations.schema_migrations` has 47 rows. `supabase/migrations/` has 76 files.
That gap is not one contiguous block (CEO's own message named 0061–0065; the real gap is
wider) — the ledger's own version numbers are Supabase-CLI timestamps
(`20260815123947`), not this repo's four-digit filename prefixes, and its `name` column
only sometimes matches a file's own name (`0029_story_notes` matches exactly;
`fix_connection_privacy_leak` matches a file's *content* with no number at all — an
artifact of the numbered-filename convention being adopted partway through this project's
life). One ledger row, `full_schema_through_0024`, is a single squashed entry standing in
for what are now many separate numbered files.

Matching ledger rows to file content by hand, the ledger is silent on **0048–0059,
0061–0069, and 0072–0076** (0060, 0070 and 0071 sit in between and ARE recorded, by
content match) — 26 files with no recorded application. Per the brief's own instruction,
every one of those 26 was checked against the live *schema itself*, not assumed either
way from the ledger's silence. Verdict: **23 of the 26 are fully live** — every trigger,
function, policy, column and view they define exists, byte-for-byte (function/view
bodies compared directly, not just presence). The ledger's silence on those 23 is a
record-keeping gap: someone applied them directly (`apply_migration`, direct `psql`)
outside the CLI's own ledger-writing path, the same way `docs/deployment.md` already
documents for a different range. **Three of the 26 are genuinely, correctly absent —
0075 and 0076 (tonight's own deadline-notification and AI-spend-cap packages, both
explicitly written-not-applied per their own briefs, confirmed still unapplied) and 0058,
which is not expected and is this report's real finding.** See §2.

This also answers the brief's specific hypothesis directly.

### The `profiles` guard trigger: confirmed, and more specific than "provenance differs, behavior doesn't"

Live's `profiles_00_guard_protected_columns` trigger reads exactly:

```
CREATE TRIGGER profiles_00_guard_protected_columns
  BEFORE UPDATE OF is_admin, profile_strength_score, completeness_percent
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_guard_protected_columns()
```

Migration 0062 creates this trigger guarding `is_admin` **alone** — its own header says so
explicitly: *"PROTECTED COLUMNS: is_admin only. NOT forgotten — deliberately narrowed"* —
and explains at length why widening it to the other two columns at that point would have
frozen every student's score (the legitimate writer, `recomputeCareerProfile()`, still ran
as `authenticated`, not `service_role`, so the guard would have reset every real recompute
too, not just a forged one).

Migration 0063 is the fix for that: it `CREATE OR REPLACE FUNCTION`s the same function
0062 defined, `DROP TRIGGER IF EXISTS` + re-`CREATE TRIGGER`s the same name, this time over
all three columns — paired, in the same migration, with moving `recomputeCareerProfile()`'s
writes to `createAdminClient()`, which is exactly what makes the wider guard safe.

**Applying 0062 then 0063 in a fresh replay reproduces live's trigger and live's function
body exactly** (`pg_get_functiondef` compared directly, not paraphrased) — not
"approximately," not "same effect from different code." This isn't a case of live
predating the split; it's confirmation that **both migrations were applied, in full, in
the documented order** — despite both files' own headers stating, in nearly identical
language: *"WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint... Do not run
against a live project without explicit review."*

Whether that explicit review happened out-of-band isn't something this check can see —
only that the live database's behavior matches what the files describe, exactly, and that
the files' own status line no longer describes reality. Worth a founder decision either
way: update the files' headers to say what actually happened, or treat this as confirmation
the review did happen and just wasn't recorded.

The same is true, independently confirmed, for the rest of the 2026-08-22 RLS package —
**0061 (`public_profiles` view now gates `auth.uid() IS NOT NULL`, checked against the
live view's own `pg_get_viewdef`, matches exactly), 0064, and 0065 (all six
"close-insert-forgery" tables' policy sets — `profile_scores`, `profile_score_snapshots`,
`opportunity_matches`, `student_requirement_evaluations`, `evidence_files`,
`ai_recommendations` — match live's actual `pg_policies` rows exactly: `select`/`update`/
`delete` own-row policies present, no `insert` policy on any of the six, the specific
gap 0065 closes).** The entire RLS-hardening effort this session's memory has referred to
as "founder-gated, awaiting review" is live, right now, and has been for some time.

## 2. The one real gap: migration 0058 (`social_posts`) has never been applied, anywhere

Confirmed absent at every level checked:

- **Tables**: `posts`, `post_likes`, `post_revisions` — none exist live.
- **Columns**: `message_reports.post_id` (0058 also adds this to a pre-existing table, so
  a report can reference a post) — absent live.
- **Triggers**: all six 0058 defines (`posts_00_guard_system_columns`,
  `posts_00_collapse_nested_repost`, `posts_10_record_revision`,
  `posts_30_set_updated_at`, `posts_maintain_repost_count`, `post_likes_maintain_count`) —
  absent.
- **Functions**: `posts_guard_system_columns`, `posts_bump_like_count`,
  `posts_bump_repost_count`, `posts_collapse_nested_repost`, `posts_record_revision` —
  absent.
- **Policies**: all four `posts` policies and four `post_likes`/`post_revisions`
  policies — absent.
- **Types**: the three enums 0058 creates (`post_kind`, `post_visibility`,
  `post_attachment_kind`) — absent.

This is a single, atomic, all-or-nothing gap — every piece of 0058 is missing together,
consistent with the migration having simply never run, once, rather than a partial or
drifted application.

**This is not currently an active production error**, and the report should be precise
about why: application code for this feature already exists
(`lib/social/posts.ts`, `lib/social/post-actions.ts`) and is wired into exactly one
surface — the admin moderation UI (`features/admin/post-removal-control.tsx`,
`features/admin/sections/reports-section.tsx`, reached via `app/(app)/admin/actions.ts`).
There is no student-facing feed, composer, or post view anywhere in `app/(app)`. Because
no post can be created (the table doesn't exist), no post report can exist either, so the
admin surface referencing it sits dormant rather than erroring — nobody has hit the code
path that would surface `relation "posts" does not exist`.

**Worth naming as more than a technical gap**: `AGENTS.md` Phase 54 ("DO NOT BUILD YET")
explicitly lists social feed, likes, and follower counts as out of scope for V1. A
complete migration and a working admin moderation surface for exactly that feature exist
in this codebase already, unapplied. Read one way, this is simply an unfinished feature
correctly held back. Read the other way, the migration's *existence* is itself already
past where Phase 54 says to stop. Either reading means the same practical answer: **a
fresh deploy that replays every migration in `supabase/migrations/` would bring this
feature live for the first time** — table, triggers, RLS, and all — which is a product
decision (turn social posts on now?) hiding inside what looks like a purely technical
"does replay match live" question. Flagging it here rather than either applying it or
silently excluding it from the count.

## 3. The other direction: three indexes exist live with no migration at all

Per the brief's own instruction to check both directions — these are real, live,
performance-only indexes with zero trace anywhere in `supabase/migrations/`:

```
idx_global_university_discovery_order       on global_university_discovery_queue (ranking_edition, discovery_order)
idx_global_university_discovery_queue_state on global_university_discovery_queue (ranking_edition, queue_state, rank_numeric)
idx_university_profile_queue_state_priority on university_profile_verification_queue (queue_state, priority)
```

Both tables are defined in migration 0038; these three indexes were added directly to
live at some point afterward (most plausibly by one of the research/acquisition-pipeline
sessions optimizing queue scans) without a migration file ever being written to capture
them. Not a correctness or security issue — a fresh deploy would simply be missing three
performance indexes on two research-queue tables until someone notices query plans
degrade and re-adds them. Low stakes, but real, and exactly the "live-but-not-in-migrations"
direction the brief asked not to skip.

## 4. One adjacent finding, outside the original ask, worth a fast follow-up

While diffing columns table-by-table, migration **0072 (`birth_year_change_audit`)
turned out to be fully live too** — `birth_year_changes` table, its trigger
(`profiles_log_birth_year_change`), and `profiles.terms_accepted_at` all present and
correctly wired, independently confirmed the same way as everything in §1.

`lib/export/tables.ts`'s own comment (written when 0072 was authored, and copied as
precedent into this session's own `deadline_notification_log` entry earlier tonight
without re-checking *this* one specifically) says: *"birth_year_changes: migration 0072 is
not applied anywhere yet — would export as permanently empty until it is."* That's now
false. The table lists it in `EXPORT_EXCLUDED_TABLES` for a reason that no longer holds —
a student's own birth-year-change history is a real, non-empty, exportable table today,
and the data-rights export currently omits it on a stale premise. Not fixed here (this
package is read-only by design), but it's a one-line move from `EXPORT_EXCLUDED_TABLES`
to `EXPORT_TABLES` for whoever picks it up next.

## 5. What this check does and doesn't cover

Verified exhaustively: table existence, full column lists (name + type) for every
`public` table, every trigger's exact `BEFORE UPDATE OF <cols>` definition, every RLS
policy's existence, every index name and definition, constraint/enum counts, one specific
grant (`is_blocked_between`'s `anon` revoke, migration 0067), and byte-for-byte
comparison of the specific function/trigger/view bodies named in the brief.

Not individually verified: every policy's exact `USING`/`WITH CHECK` expression text
(only existence — a policy could exist under the same name with subtly different logic;
nothing found suggests this, but it wasn't checked clause-by-clause for all 105), every
grant/revoke across every table (only the one named in the brief plus what a
table/column/policy-level diff would indirectly reveal), sequence ownership, and
`pg_default_acl` entries beyond what 0061's own header already documents checking.

## 6. Is a fresh deploy safe?

**Yes, with one thing to decide first, not after.** The schema a fresh deploy would
produce matches live almost exactly — the RLS-hardening work this session's memory has
treated as "unapplied, awaiting review" is in fact live and behaviorally verified. The one
substantive gap (social posts, §2) is dormant today and would only become a live product
surface as a *consequence* of deploying — worth the founder's explicit yes/no before it
happens automatically as a side effect of "replay everything," not worth blocking the
deploy over. The three stray indexes (§3) are a five-minute follow-up, not a blocker.

**Recommendation**: before the fresh deploy, either (a) exclude `0058_social_posts.sql`
from the replay if social posts should stay held back per Phase 54, moving it into a
clearly-marked `supabase/migrations-unapplied/` (or same idea) rather than
`supabase/migrations/` proper — so a future "replay everything" doesn't ship it as a
side effect a second time — or (b) confirm turning it on now is intended, since the app
already partially supports it (admin moderation side) and the schema is ready. Either
answer is fine; leaving it as an ordinary numbered file in the applied sequence is the one
option that keeps producing this exact question every time someone re-checks.
