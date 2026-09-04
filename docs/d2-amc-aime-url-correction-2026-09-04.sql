-- D2 -- AMC/AIME official_url correction. CEO's own instruction: this is wrong data, not a
-- missing field -- a student clicks through and lands on an unrelated page. Prepared, NOT
-- applied -- CEO applies.
--
-- Stored official_url/source_url: https://maa.org/events/mathfest-program/special-sessions/
-- -- a MathFest special-sessions page, unrelated to AMC/AIME's own eligibility or
-- registration.
--
-- Confirmed via redirect resolution (maa.org itself blocks direct content fetches, 403 on
-- every path tried -- but the redirect chain is real, server-returned evidence, not a
-- guess): amc.maa.org, the AMC-specific subdomain, resolves with a 301 to
-- https://maa.org/math-competitions -- the correct canonical landing page for AMC/AIME
-- under MAA's current site structure. Could not read that page's own eligibility text (same
-- 403 block), so age/grade/country are NOT filled here -- only the URL, which the redirect
-- itself verifies independently of being able to read the destination's content.
update public.opportunities
set official_url = 'https://maa.org/math-competitions',
    source_url = 'https://maa.org/math-competitions',
    last_verified_at = now()
where id = '4ce6fd8f-5a9b-4399-b168-e38c0f44c7b1';
