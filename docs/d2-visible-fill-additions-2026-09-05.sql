-- D2 visible-27 fill (2026-09-05) — additions/corrections needing NO unapplied migration.
-- Prepared, NOT applied — CEO packages. Every WHERE clause re-guards on the exact current
-- value so this file is safe to apply even if a row changes again before it's run.
--
-- Scope: the 27 currently-gapped rows in the 28-opportunity visible set (saved_opportunities
-- ∪ each student's real top-5 via home-strip.ts's own filter chain) — see
-- docs/d2-visible-set-fill-2026-09-05.md for the full measurement and per-row visibility
-- context. This file is the half needing nothing beyond live columns
-- (minimum_age/maximum_age/eligible_grades, plus country_eligibility_confirmed_open, which
-- IS live — migration 0060). The other half needs 0126/0129/0133 first — see the sibling
-- file's own header, and CEO's explicit instruction: migrations before fills, always.
--
-- Evidentiary rule: every value below comes from an explicit statement on the row's own
-- official_url, fetched directly. "Doesn't state a limit" and "has no limit" are never
-- treated as the same claim — a page that's silent gets nothing written here at all (it
-- goes in the 0126/0129/0133-dependent file as checked_not_stated instead, once that's
-- possible).
--
-- A real methodology note, not a footnote: the fetch tool's own summaries repeatedly
-- mislabeled a grade-worded quote ("rising juniors and seniors", "grades 9-12") as an "age
-- requirement" answer. Every value below was checked against the verbatim quoted sentence
-- itself, not the tool's own framing of it — this caught the Wall Street 101 and Interlochen
-- age question specifically (neither page states a numeric age at all; both only ever state
-- grade), which would otherwise have become a fabricated age fill from a grade statement.

-- ============================================================================
-- ADDITIONS (filling a genuine blank)
-- ============================================================================

-- 1. Yale Young Global Scholars — age. Official page: "Be between the ages of 16-18 years
-- old." (yale.edu/eligibility, re-verified 2026-09-05, same finding as the prior session's
-- own draft, never applied.)
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    source_url = 'https://globalscholars.yale.edu/eligibility',
    last_verified_at = now()
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358'
  and minimum_age is null and maximum_age is null;

-- 2. The Earth Prize Competition — age. Official page: "A global environmental
-- sustainability competition for students between the ages of 13 and 19."
update public.opportunities
set minimum_age = 13,
    maximum_age = 19,
    last_verified_at = now()
where id = '00aaf965-016f-42ef-a4a1-3a825f104a6d'
  and minimum_age is null and maximum_age is null;

-- 3. Interlochen Review — grade (age is NOT addressed by this same sentence — see the
-- 0129-dependent file for age's own checked_not_stated). Official page: "high school
-- writers, singer-songwriters and artists (grades 9-12 or high school postgraduate year)."
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44'
  and (eligible_grades is null or eligible_grades = '{}');

-- 4. Interlochen Review — country. CORRECTED classification (superseding the prior
-- session's own first-draft confirmed_open=true for this row, per its own withdrawal note):
-- "from around the world" is descriptive attendee makeup, not an affirmative policy
-- statement — the same bar Immerse/Oxford Scholastica/UCSB failed on, judged consistently.
-- Recorded here as an explicit false rather than left implicit, so no later pass can read
-- an absent value as "never decided."
update public.opportunities
set country_eligibility_confirmed_open = false
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- 5. The Wall Street 101 Summer Pre-College Program — grade. Official page: "a competitive
-- experiential learning program for rising high school juniors and seniors" — junior=11,
-- senior=12. Not an age statement (no number given anywhere on the page).
update public.opportunities
set eligible_grades = array['11','12'],
    last_verified_at = now()
where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514'
  and (eligible_grades is null or eligible_grades = '{}');

-- 6. Purdue University (Think Summer) — age (grade/country genuinely unaddressed by this
-- page — see 0129/0133-dependent file). Official page: "high school students age 15 and
-- older" — no stated maximum.
update public.opportunities
set minimum_age = 15,
    last_verified_at = now()
where id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068'
  and minimum_age is null and maximum_age is null;

-- ============================================================================
-- CORRECTIONS (the existing stored value conflicts with the official source)
-- ============================================================================

-- 7. Yale Young Global Scholars — eligible_grades was stored as ['11','12']. Official page:
-- "Be a current high school sophomore or junior (or international equivalent)" —
-- sophomore=10, junior=11. Re-verified live 2026-09-05, unchanged from the prior session's
-- own finding.
update public.opportunities
set eligible_grades = array['10','11']
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358'
  and eligible_grades = array['11','12'];

-- 8. Student Science Training Program (UF SSTP) — eligible_grades was stored as ['12'].
-- Official page states plainly: "Students currently in the 11th grade and who will be 16
-- years old or older by the start of the program are eligible for UF SSTP." The stored
-- value and the official source disagree — this program is for rising seniors (current
-- 11th-graders), not current 12th-graders. Age (minimum_age, genuinely blank before) is a
-- real addition from the same sentence, bundled in the same statement since both facts come
-- from one verified source.
update public.opportunities
set eligible_grades = array['11'],
    minimum_age = 16,
    source_url = 'https://www.cpet.ufl.edu/students/uf-cpet-summer-programs/student-science-training-program/',
    last_verified_at = now()
where id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55'
  and eligible_grades = array['12']
  and minimum_age is null;
