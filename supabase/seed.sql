-- Development-only fixtures. Supabase's local CLI (`supabase db reset` / `supabase start`)
-- applies this automatically after migrations; it is NEVER applied to a linked hosted
-- project by any command in this repo. See PHASE_STATUS.md / README.md.
--
-- Only well-known, low-risk-of-being-wrong facts are included (name, country, city,
-- official website, institution type) so this can never be mistaken for a fabricated
-- statistic — admission rates, test-score ranges, and costs are deliberately left out of
-- the seed. Real numbers come from supabase/migrations + the College Scorecard sync job
-- (POST /api/jobs/sync-university-data) once COLLEGE_SCORECARD_API_KEY is configured.

-- Chat 4 (data-readiness pass): the initial 15-institution list under-covered the
-- founder's own stated initial market (Turkey-based students targeting international
-- universities, AGENTS.md section 0) — only 2 Turkish universities, and none of the UK's
-- next tier below Oxbridge/LSE that this exact student profile realistically targets.
-- Added 6: three more elite Turkish private universities (Bilkent/Koç/Sabancı — all
-- verified against their own official sites during this pass) and Imperial/UCL/Amsterdam.
-- Boğaziçi's URL corrected to the canonical bogazici.edu.tr — the www. host is a working
-- redirect, not the canonical domain a source citation should point at.
insert into public.universities (name, country, city, institution_type, website_url, data_confidence, data_status)
values
  ('Harvard University', 'United States', 'Cambridge', 'Private nonprofit', 'https://www.harvard.edu', 'high', 'fresh'),
  ('Massachusetts Institute of Technology', 'United States', 'Cambridge', 'Private nonprofit', 'https://web.mit.edu', 'high', 'fresh'),
  ('Stanford University', 'United States', 'Stanford', 'Private nonprofit', 'https://www.stanford.edu', 'high', 'fresh'),
  ('University of Oxford', 'United Kingdom', 'Oxford', 'Public', 'https://www.ox.ac.uk', 'high', 'fresh'),
  ('University of Cambridge', 'United Kingdom', 'Cambridge', 'Public', 'https://www.cam.ac.uk', 'high', 'fresh'),
  ('London School of Economics and Political Science', 'United Kingdom', 'London', 'Public', 'https://www.lse.ac.uk', 'high', 'fresh'),
  ('Imperial College London', 'United Kingdom', 'London', 'Public', 'https://www.imperial.ac.uk', 'high', 'fresh'),
  ('University College London', 'United Kingdom', 'London', 'Public', 'https://www.ucl.ac.uk', 'high', 'fresh'),
  ('Bocconi University', 'Italy', 'Milan', 'Private nonprofit', 'https://www.unibocconi.it', 'high', 'fresh'),
  ('Sciences Po', 'France', 'Paris', 'Public', 'https://www.sciencespo.fr', 'high', 'fresh'),
  ('Erasmus University Rotterdam', 'Netherlands', 'Rotterdam', 'Public', 'https://www.eur.nl', 'high', 'fresh'),
  ('Delft University of Technology', 'Netherlands', 'Delft', 'Public', 'https://www.tudelft.nl', 'high', 'fresh'),
  ('University of Amsterdam', 'Netherlands', 'Amsterdam', 'Public', 'https://www.uva.nl', 'high', 'fresh'),
  ('ETH Zurich', 'Switzerland', 'Zurich', 'Public', 'https://ethz.ch', 'high', 'fresh'),
  ('Boğaziçi University', 'Turkey', 'Istanbul', 'Public', 'https://bogazici.edu.tr', 'high', 'fresh'),
  ('Middle East Technical University', 'Turkey', 'Ankara', 'Public', 'https://www.metu.edu.tr', 'high', 'fresh'),
  ('Bilkent University', 'Turkey', 'Ankara', 'Private nonprofit', 'https://www.bilkent.edu.tr', 'high', 'fresh'),
  ('Koç University', 'Turkey', 'Istanbul', 'Private nonprofit', 'https://www.ku.edu.tr', 'high', 'fresh'),
  ('Sabancı University', 'Turkey', 'Istanbul', 'Private nonprofit', 'https://www.sabanciuniv.edu', 'high', 'fresh'),
  ('University of Toronto', 'Canada', 'Toronto', 'Public', 'https://www.utoronto.ca', 'high', 'fresh'),
  ('McGill University', 'Canada', 'Montreal', 'Public', 'https://www.mcgill.ca', 'high', 'fresh')
on conflict (lower(name), country) do nothing;

-- Provenance for every row above — this product's own SourceBadge component (Phase 36)
-- has nothing to show without at least one supabase.university_sources row per
-- university. One row per institution, pointing at the same official site the identity
-- facts came from.
insert into public.university_sources (university_id, source_url, source_domain, source_type, confidence, raw_excerpt)
select u.id, u.website_url, regexp_replace(u.website_url, '^https?://(www\.)?', ''), 'official_institution_website', 'high',
  'Institution identity (name/city/country/official site) taken from the university''s own official website. No admissions statistics, requirements, or deadlines are asserted from this source — none were verified to a standard this product is willing to publish as fact.'
from public.universities u
where u.website_url is not null
on conflict do nothing;
