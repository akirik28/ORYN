# types/database.ts vs. the live schema — a real diff, both directions — 2026-09-02

CEO's ask, after `university_deadlines`' `data_status`/`last_checked_at` turned out to be
missing from `types/database.ts` despite migration `0074` being live: that file is
hand-authored, not generated, so a migration landing does not automatically update it — has
that happened anywhere else? Diff every table interface against the live schema, both
directions, and distinguish genuine drift from a type that legitimately carries a column
from a migration that's still, correctly, unapplied.

## Method — direct, not the ledger

`list_migrations` and `supabase_migrations.schema_migrations` are both unreliable relative to
the live schema (confirmed independently twice tonight already, migrations `0072` and `0074`
— see `reference_list_migrations_unreliable_use_direct_probe` in memory). This audit never
consults either. Every claim below is `information_schema.columns` against project
`qtcvcflzxbuagvvwahhu` (`oryn-qa-scratch`), queried directly, 2026-09-02.

`types/database.ts`'s side was parsed with the real TypeScript compiler (`ts.createSourceFile`
+ AST walk), not regex — same reliability precedent as
`__tests__/i18n/translation-keys.test.ts`. Worth naming: the first version of the extraction
script found the exact same 16-field gap on four unrelated tables (`activities`, `projects`,
`research_experiences`, `volunteering_experiences`) — which was **the script failing to follow
an `extends AchievementCommon` clause**, not four real bugs. Caught by the pattern being
implausible on its face, not by the tool being trusted. Fixed by resolving `extends` chains
recursively before diffing; the four collapsed to zero once inheritance was accounted for.
Kept here so the near-miss is on record, not just the corrected result.

## Result: 61 tables have both a live table and a type. 57 are clean. 4 have drift; 2 are real.

| Table | Direction | Column(s) | Verdict |
|---|---|---|---|
| `weekly_actions` | in type, not live | `carried_forward` | **Expected** — migration `0077`, confirmed unapplied tonight during the plan-generation SEV (see `project_confident_output_from_absent_input_pattern` instance 17). Not a new finding. |
| `message_reports` | in type, not live | `post_id` | **Expected** — migration `0058` (social posts), one of the longest-standing known-unapplied migrations in this repo. |
| `profiles` | **live, missing from type** | `country_entity_id`, `city_entity_id` | **Real, fixed here.** Migration `0038_canonical_entity_registry.sql` added these — live today, confirmed by direct query — but the ledger has no record of `0038`/`0039` at all (applied outside it, same shape as migrations `0061`-`0065`). `school_entity_id` from the same migration was already correctly typed; these two siblings were not. |
| `education_records` | **live, missing from type** | `country_entity_id` | **Real, fixed here.** Same migration, same story. This table's own `alter table` statements only add `school_entity_id`/`country_entity_id` (no city variant) — confirmed against `0038`'s literal SQL, not assumed symmetric with `profiles`. |

Fixed by adding both fields to `Profile`/`EducationRecord` (each documented inline with the
migration and the "found by this audit" provenance) and adding `country_entity_id` to
`EducationRecordInsert`'s optional-key list, matching `school_entity_id`'s existing treatment
(nullable, no meaningful "caller must supply" semantics). Four test fixtures and one QA-script
factory needed the new required field added to their literals — `tsc` found all of them; none
were silently wrong before, they just hadn't needed to model this field yet.

## The other direction: 5 typed tables that aren't live at all — all explained

`posts`, `post_likes`, `post_revisions` (migration `0058`), `deadline_notification_log`
(`0075`), `university_notification_log` (`0078`) — every one a currently-unapplied migration
already known to the fleet tonight. Not new findings; confirmed rather than assumed, since
"the type exists" alone doesn't say whether the underlying migration ever landed.

## A related, adjacent finding — not what was asked, worth naming anyway

20 live tables have **no entry at all** in `Database["public"]["Tables"]` — not a column-level
gap, the whole table was never given a type. Most are internal (`*_queue`, `*_staging`,
`entity_*` spine tables) where the cost of full typing is a real question, not an obvious yes.
But five are **actively queried through the typed Supabase client today**, compiling cleanly
only because an unlisted table name resolves to a loosely-typed result rather than a compile
error — meaning zero column-name/shape checking on any of these call sites:

- `public_profiles` (a **view**, not a base table) — 7 files, including `lib/social/connections.ts` and `lib/messaging/messages.ts`.
- `requirement_research_queue` — 5 files.
- `deadline_research_queue` — 4 files.
- `entity_external_ids`, `entity_relationships` — 1 file each.

Not fixed here — this is a materially different, larger task (up to 20 new interfaces, several
for tables whose intended access pattern may not even want full typing) than the column-diff
CEO asked for, and unilaterally typing all 20 wasn't the ask. Flagging with real usage counts
so whoever decides whether it's worth doing has actual numbers, not a guess.

## The RLS/null-`auth.uid()` angle CEO also asked to watch for

Read `lib/plan/persist.ts` and `types/database.ts` closely this session; didn't find an
instance of a type shape that would let a session-less read pass as a legitimate empty result
(oryn-31's Job D finding's own shape). Not chased separately — noting the check happened and
came back clean from what this specific pass touched, not a claim that no such instance exists
anywhere else in the codebase.

## What this doesn't cover

Only the 66 tables with `Table<...>` entries were diffed at the column level. Views/functions
outside that mapping, RLS policies, and grants are out of scope for this pass — it answers
"does the type match the columns," nothing about read/write permission on top of them.
