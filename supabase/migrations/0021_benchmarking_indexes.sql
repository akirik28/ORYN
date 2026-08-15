-- Phase 19 peer benchmarking (lib/benchmarking/): cohort membership queries filter
-- `profiles` by graduation_year and curriculum across ALL users, not scoped to one
-- user_id like nearly every other query in this app — so, unlike most tables here, these
-- columns need their own indexes now rather than waiting for a "found under load" pass.
create index profiles_graduation_year_idx on public.profiles(graduation_year) where graduation_year is not null;
create index profiles_curriculum_idx on public.profiles(curriculum) where curriculum is not null;
