-- NOT APPLIED. Founder-gated like every migration in this repo's history -- write and leave
-- unapplied. CEO decision, 2026-09-02: remove 'system' from notification_category rather than
-- build it, per docs/handoffs/notification-categories-audit-2026-09-01.md's own recommendation
-- ("Recommending deletion, not proposing a migration file"), which this migration is.
--
-- The case for removal, checked live rather than assumed:
--   * 'system' has existed since the enum's creation (migration 0012) and has never had a
--     writer -- confirmed again today by grepping every .ts/.tsx file for the literal string;
--     the only match is the NotificationCategory union type itself.
--   * Zero of 113 live notifications rows use it (oryn-qa-scratch, checked live). Removing it
--     drops no data and needs no backfill.
--   * It was never in Phase 24's own spec list (deadline / new opportunity / weekly plan /
--     profile update / university data changed) -- unlike `connection`/`message`, which are
--     legitimate later additions for the social layer with real writers, `system` has no
--     spec basis at all. It drifted in with the table, not designed in for a purpose.
--   * Considered the two concrete uses raised before deciding, not just the abstract "might
--     need a catch-all someday": (1) "your data export is ready" -- doesn't apply, checked
--     app/api/export-data/route.ts directly: export is a synchronous GET that returns the
--     file in the same request, there is no async job and therefore no later "ready" moment
--     to notify about. (2) "we couldn't refresh X" -- doesn't apply either: Phase 45 already
--     handles a failed refresh inline, on the page showing the stale data ("the last verified
--     data is still shown below"), and a scheduled job's own failure already has a real,
--     purpose-built home -- features/admin/sections/scheduled-jobs-section.tsx and
--     provider-health-section.tsx -- that has nothing to do with this student-facing,
--     per-user notifications table. No concrete need surfaced, so none was invented.
--   * The removal itself is a contained, single-table operation: `select column_name from
--     information_schema.columns where udt_name = 'notification_category'` returns exactly
--     one row (notifications.category) -- there is no cross-table fan-out to reason about,
--     and with zero rows to recast, the type-swap below cannot fail on data it wasn't
--     expecting. The "removing an enum value is awkward" cost that would justify leaving an
--     unused value in place with a comment instead doesn't weigh much here; it would if this
--     enum were shared across several tables or had rows to migrate off the value first.
--
-- Postgres has no direct `DROP VALUE` for an enum -- recreate the type without it, the
-- standard workaround. Safe by construction given the zero-rows fact above: the `using`
-- cast below can only fail if a row held a value the new type doesn't have, and no row does.
alter type notification_category rename to notification_category_old;

create type notification_category as enum (
  'deadline',
  'new_opportunity',
  'weekly_plan',
  'profile_update',
  'university_data_changed',
  'connection',
  'message'
);

alter table public.notifications
  alter column category type notification_category
  using category::text::notification_category;

drop type notification_category_old;
