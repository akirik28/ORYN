-- Two small, related additions for the deadline-change-detection package (2026-09-02):
--
-- 1. Gives university_statistics the same last_changed_at universities already has
--    (migration 0006), so lib/universities/sync-us-universities.ts's Job C sync can stop
--    conflating "re-synced" with "actually different" for admission numbers the same way
--    it already stopped doing for universities' own core facts. Null for every existing
--    row rather than backfilled to now(): a timestamp asserts a change was observed, and
--    no change has been observed for any row that predates this column — same reasoning
--    migration 0074's own header gives for last_checked_at on university_deadlines.
--
-- 2. Widens university_notification_log's source check (migration 0078) from
--    ('university', 'requirement') to also allow 'deadline' and 'statistics' — the two new
--    sources lib/universities/data-change-scan.ts's own top comment documents. 'statistics'
--    mirrors 'university' exactly (a value genuinely differed, per hasStatisticsChanged).
--    'deadline' is narrower than a full parallel to 'university' would be: it fires on a
--    brand-new university_deadlines row appearing (created_at after the student started
--    tracking), not on an existing deadline's date changing — every write to
--    university_deadlines in this codebase is a plain insert, never an update, so there is
--    no row whose last_changed_at could ever advance the way universities' or
--    university_statistics' can. Detecting an existing deadline changing needs a real
--    redesign of how re-researched facts land (a supersession/update strategy), not a
--    column-and-comparator pair -- see the handoff doc / CEO thread for the live evidence
--    this rests on (every current multi-row group sharing (university, type, cycle) turns
--    out to be distinct programs sharing a program_id=null generic type, not one fact
--    re-researched and corrected) -- so university_deadlines is not touched by this
--    migration at all.
alter table public.university_statistics
  add column if not exists last_changed_at timestamptz;

comment on column public.university_statistics.last_changed_at is
  'When an admission number here (admission_rate, SAT/ACT range, graduation_rate, cost_of_attendance) last genuinely differed from what was already stored, per lib/universities/sync-us-universities.ts''s hasStatisticsChanged. NULL means never observed to change since this column existed -- not a failure, and never backfilled to assert a change that was never actually seen.';

alter table public.university_notification_log
  drop constraint if exists university_notification_log_source_check;

alter table public.university_notification_log
  add constraint university_notification_log_source_check
  check (source in ('university', 'requirement', 'deadline', 'statistics'));
