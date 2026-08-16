-- Professional Profile & Networking Pack, Batch A follow-up. `headline`/`about`
-- (migration 0033) are part of the public-facing identity header/About sections (spec
-- hierarchy positions 1-2), so they belong in the same visibility tier as
-- display_name/curriculum/graduation_year/looking_for below -- not gated behind
-- portfolio visibility (lib/social/public-profile-authorization.ts's stricter
-- canViewPortfolio), which only ever applied to achievement data. `CREATE OR REPLACE
-- VIEW` is additive and non-destructive: the WHERE clause (migration 0024's direction-
-- aware fix) is unchanged, only the SELECT list grows.
create or replace view public.public_profiles as
  select id, display_name, headline, about, country, curriculum, graduation_year, looking_for, created_at
  from public.profiles
  where is_public = true
     or id in (
       select case when requester_id = auth.uid() then recipient_id else requester_id end
       from public.connections
       where auth.uid() in (requester_id, recipient_id)
         and status = 'accepted'
     )
     or id in (
       select requester_id
       from public.connections
       where recipient_id = auth.uid()
         and status = 'pending'
     );
