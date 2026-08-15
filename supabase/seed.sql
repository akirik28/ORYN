-- Development-only fixtures. Supabase's local CLI (`supabase db reset` / `supabase start`)
-- applies this automatically after migrations; it is NEVER applied to a linked hosted
-- project by any command in this repo. See PHASE_STATUS.md / README.md.
--
-- Only well-known, low-risk-of-being-wrong facts are included (name, country, city,
-- official website, institution type) so this can never be mistaken for a fabricated
-- statistic — admission rates, test-score ranges, and costs are deliberately left out of
-- the seed. Real numbers come from supabase/migrations + the College Scorecard sync job
-- (POST /api/jobs/sync-university-data) once COLLEGE_SCORECARD_API_KEY is configured.

insert into public.universities (name, country, city, institution_type, website_url, data_confidence, data_status)
values
  ('Harvard University', 'United States', 'Cambridge', 'Private nonprofit', 'https://www.harvard.edu', 'high', 'fresh'),
  ('Massachusetts Institute of Technology', 'United States', 'Cambridge', 'Private nonprofit', 'https://web.mit.edu', 'high', 'fresh'),
  ('Stanford University', 'United States', 'Stanford', 'Private nonprofit', 'https://www.stanford.edu', 'high', 'fresh'),
  ('University of Oxford', 'United Kingdom', 'Oxford', 'Public', 'https://www.ox.ac.uk', 'high', 'fresh'),
  ('University of Cambridge', 'United Kingdom', 'Cambridge', 'Public', 'https://www.cam.ac.uk', 'high', 'fresh'),
  ('London School of Economics and Political Science', 'United Kingdom', 'London', 'Public', 'https://www.lse.ac.uk', 'high', 'fresh'),
  ('Bocconi University', 'Italy', 'Milan', 'Private nonprofit', 'https://www.unibocconi.it', 'high', 'fresh'),
  ('Sciences Po', 'France', 'Paris', 'Public', 'https://www.sciencespo.fr', 'high', 'fresh'),
  ('Erasmus University Rotterdam', 'Netherlands', 'Rotterdam', 'Public', 'https://www.eur.nl', 'high', 'fresh'),
  ('Delft University of Technology', 'Netherlands', 'Delft', 'Public', 'https://www.tudelft.nl', 'high', 'fresh'),
  ('ETH Zurich', 'Switzerland', 'Zurich', 'Public', 'https://ethz.ch', 'high', 'fresh'),
  ('Boğaziçi University', 'Turkey', 'Istanbul', 'Public', 'https://www.bogazici.edu.tr', 'high', 'fresh'),
  ('Middle East Technical University', 'Turkey', 'Ankara', 'Public', 'https://www.metu.edu.tr', 'high', 'fresh'),
  ('University of Toronto', 'Canada', 'Toronto', 'Public', 'https://www.utoronto.ca', 'high', 'fresh'),
  ('McGill University', 'Canada', 'Montreal', 'Public', 'https://www.mcgill.ca', 'high', 'fresh')
on conflict (lower(name), country) do nothing;
