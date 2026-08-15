-- Real privacy bug found during audit: public_profiles' "continuity carve-out" matched a
-- connections row of ANY status (pending or declined, not just accepted). Combined with
-- sendConnectionRequest never checking the recipient was actually public, this meant a
-- single unsolicited connection request -- zero consent from the target -- permanently
-- unlocked their basic profile via this view, and (via lib/social/public-profile.ts's
-- getPublicPortfolio/getPublicSkills, which trusted the view's result as its only gate)
-- their full portfolio and skills too. A declined request kept the same leak forever,
-- since the row still exists. This defeats the entire reason mutual-consent connections
-- were chosen over an open follow (see product-decisions.md).
--
-- Fix has two clauses, both direction-aware -- collapsing them into one
-- status-independent, direction-independent carve-out is exactly how the original bug
-- happened, so the two cases are kept deliberately separate:
--
--   1. status = 'accepted', either direction -- a genuinely mutual, consented
--      relationship. Safe to expose to either party.
--   2. status = 'pending' AND the caller is the recipient of that specific request --
--      you must be able to see who is asking before "accept" or "decline" is a
--      meaningful choice (lib/social/connections.ts feeds this into the incoming-requests
--      list; features/connections/connection-row.tsx renders it). This is a narrow,
--      one-directional disclosure the requester made of themselves by choosing to
--      contact this specific recipient -- not a route back to the bug, which was the
--      *requester* using their own outgoing (or a stale, target-since-gone-private)
--      request to see the *recipient*. That direction is deliberately still closed: a
--      pending row where the caller is the requester never matches either clause below.
--
-- A declined row matches neither clause, so it goes back to being invisible (fixing the
-- "declined kept the leak forever" bug) even though the row itself still exists to
-- satisfy the connections_unique_pair constraint.
create or replace view public.public_profiles as
  select id, display_name, country, curriculum, graduation_year, looking_for, created_at
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
