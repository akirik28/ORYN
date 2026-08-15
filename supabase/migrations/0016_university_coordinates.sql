-- Coordinates for the map-based university exploration view. Nullable: populated from
-- provider data (College Scorecard exposes school.latitude/longitude; other sources are
-- geocoded from official addresses at ingestion time). Never fabricated — a university
-- with no known coordinates simply doesn't render as a pin until a source supplies one.

alter table public.universities
  add column latitude numeric(9,6),
  add column longitude numeric(9,6);
