-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the founder
-- applies. 3 of the 5 remaining "direct fetch" under_review rows, individually verified
-- against each program's own official page today. Dry-run validated live (begin/rollback
-- via the Supabase connector) before this file was written -- all 3 matched and applied
-- cleanly, confirmed rolled back after.
--
-- The other 2 of the 5 (Team Maths Challenge (Junior); Athena Summer Innovation Institute)
-- are deliberately NOT included -- genuinely unresolvable, see
-- docs/under-review-pool-audit-2026-09-03.md section 4. Left untouched, still
-- status='under_review'.
--
-- The remaining ~107 rows (the bulk 2026-08-18 Drive-corpus import) are NOT included --
-- confirmed only characterized and traced to origin, not individually re-verified. See
-- that same doc's section 7.

begin;

-- BMO Round 1 (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- checked https://ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z', deadline = '2026-11-19'
where id = 'f6dbce16-a6cb-4e8c-9ebd-01a57489879f';

-- BMO Round 2 (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- checked https://ukmt.org.uk/senior-challenges/british-maths-olympiad-round-2, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z', deadline = '2027-01-21'
where id = 'e5a8555d-7e5b-4fd4-8406-812efbe1de91';

-- Senior Team Mathematical Challenge (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- registration opens 10 Sept 2026, regional finals Nov 2026, national final Feb 2027 --
-- no single clean deadline date to store, left null rather than guessed
-- checked https://ukmt.org.uk/team-challenges/senior-team-mathematical-challenge, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z'
where id = '1cd3d046-3101-4314-b068-4d946286512e';

commit;
