-- Canonical Entity Autocomplete System — one real, verified seed row (Professional
-- Profile pack acceptance-gap pass, 2026-08-16).
--
-- Üsküdar American Academy (UAA) is not an arbitrary example: it's the founder's own
-- school and the source of the counselor documents behind this app's existing
-- opportunity/program corpus (see docs/data-readiness.md and
-- scripts/drive-import/README.md — the Drive corpus's own source manifest names
-- "05_UAA_Source_Files" as the origin of the summer-program/internship data already
-- seeded from supabase/seed_drive_batch1.sql). Confirmed real via that same corpus, not
-- fabricated to fill out an example. Aliases are the exact ones the spec itself names.
--
-- Deliberately just this one row — this pass found no bulk schools/aliases dataset in
-- the founder's Drive to import (only the university/program/opportunity corpus already
-- handled by seed_drive_batch1.sql), so the `institutions` registry otherwise starts
-- empty and grows through the custom-fallback path (spec section 6) plus future admin
-- curation, not a bulk seed.
--
-- This session has no working SUPABASE_SECRET_KEY / applied migrations (this pack's own
-- 0038 included — see docs/founder-blocked-backlog.md), so this file was never applied
-- to any live database. Apply it (after 0038) by hand via the Supabase SQL editor, or
-- via the CLI once a key is available. Idempotent: the `on conflict do nothing` matches
-- migration 0038's own `institutions_dedup_idx` (category, lower(name), country, city).

insert into public.institutions (category, canonical_name, institution_type, country, city, aliases, status, source)
values (
  'school',
  'Üsküdar American Academy',
  'high_school',
  'Turkey',
  'Istanbul',
  array['UAA', 'Üsküdar Amerikan', 'Üsküdar Amerikan Lisesi', 'Uskudar American Academy'],
  'verified',
  'Founder-provided; cross-referenced against the school''s own counselor document corpus already used for supabase/seed_drive_batch1.sql'
)
on conflict (category, lower(canonical_name), coalesce(country, ''), coalesce(city, '')) do nothing;
