-- Opportunity duplicate consolidation -- CEO's decisions on docs/opportunity-duplicate-
-- scan-2026-09-04.md's three real split-duplicate pairs. Prepared, NOT applied -- goes into
-- Package 16. Order within each pair: data migration first, retirement second (CEO's own
-- explicit rule, same as Waterloo/CEMC). Nothing deleted -- status='disabled', same pattern.
--
-- ═══ KAYNAK SAĞLAMASI (Paket 15'in aynı sınıftaki bayatlama hatasından sonra CEO'nun
-- açık talebi: "aynı riski taşıyor") ═══
-- Bu dosya şu commit'ten üretildi: f7247e2132b0a072a59802a9120b44922a595b5e
-- Asıl kaynağın (docs/opportunity-duplicate-scan-2026-09-04.md) üretim anındaki SHA-256'sı:
--   85464edb311472834d3fa40923b6ec74004328a1b23b3ed6e900ef1a9475a8fe
-- scripts/check-package-16-sequence.sh'in kendi "provenance check" adımı bunu yeniden
-- hesaplayıp karşılaştırıyor -- tarama dokümanı değişirse (örn. WYSE'nin eligible_countries
-- iddiası düzeltilirse) test SESSİZCE geçmiyor, açıkça uyarıyor. Bu dosyanın kendi SQL
-- içeriği tarama dokümanına DEĞİL, doğrudan canlı veritabanı ölçümüne dayanıyor (her satırın
-- alan değerleri execute_sql ile okunmuş) -- yani bir tarama-dokümanı düzeltmesi bu SQL'in
-- kendisini YANLIŞ yapmaz, ama üstündeki YORUMLARIN (özellikle WYSE bölümü, "scan doc'un
-- iddiası" diye referans veriyor) hangi tarama-doküman sürümüne göre yazıldığını bilmek
-- gelecekte bir okuyucu için değerli -- bu yüzden uyarı, hata değil.
--
-- Measured before writing anything (CEO's explicit ask: does this self-heal like Waterloo/
-- CEMC did?): saved_opportunities = 0 for all six rows across all three pairs -- nothing to
-- migrate there, for any pair. opportunity_matches has 8 stale rows per opportunity (normal --
-- matches are computed for every eligible opportunity per student, not just visible ones),
-- which the existing isOpportunityActionable gate already excludes from every recommendation
-- surface the moment status='disabled', with zero further action needed -- same self-healing
-- mechanism as Waterloo/CEMC, confirmed directly rather than assumed.
--
-- HONEST NOTE on "which side is visible," found re-measuring with the REAL selection logic
-- (lib/opportunities/home-strip.ts's selectHomeStripCandidates, imported directly against
-- real per-student data, not approximated in raw SQL): Edinburgh's visible/invisible call is
-- solid -- dc762fce has verification_state='unverified' at the ROW level (a hard, non-tie-
-- dependent gate on the home-strip surface), 30436a92 is 'verified_current'. Garcia's call is
-- genuinely closer than the scan doc's own framing suggested: BOTH d83d7048 and a37fa810 are
-- verified_current, eligible for every one of the 8 onboarded students, and neither one lands
-- in anyone's real top-5 under a rigorous re-check (ties/ranking volatility, not a clean
-- signal either way) -- match_score comparisons per student are close and inconsistent in
-- direction. This does NOT change which fix is needed: consolidating the real research onto
-- one canonical row and retiring the redundant duplicate is correct regardless of which
-- specific id currently wins a fragile top-30 tie-break, since the end state (one row, full
-- data) is identical either way. Implementing CEO's own explicit choice of surviving id
-- (d83d7048, "Garcia Summer Scholars") below, not overriding it on a measurement nuance that
-- doesn't change the outcome -- flagged here, and in the founder-facing README, for the
-- record.

begin;

-- ══════════════════════════════════════════════════════════
-- 1/3 — University of Edinburgh: complete the parity fix already applied
-- ══════════════════════════════════════════════════════════
-- docs/edinburgh-duplicate-row-parity-fix-2026-09-04.sql already copied country_eligibility_
-- basis onto 30436a92 (the visible row). This completes the migration with the remaining real
-- fields dc762fce (the invisible twin) carries that 30436a92 still lacks: age bound, deadline,
-- programme dates, and the fuller, more recently re-checked description (dc762fce's own
-- description notes a 2026-08-24 direct source re-check confirming the 2026 dates; 30436a92's
-- own description still describes the stale 2025 session). Guarded on minimum_age is null --
-- 30436a92's own real, distinguishing "hasn't been migrated yet" signal.
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    deadline = '2026-05-19',
    start_date = '2026-06-29',
    end_date = '2026-07-10',
    description = 'The University of Edinburgh''s Pre-University Summer School is a non-credit, two-week programme covering Social Sciences, Humanities, and Foundation Design, for students in their penultimate or final year of high school (ages 16-18), requiring an IELTS score of 6.5 or equivalent. A 2026-08-24 direct source re-check confirmed the 2026 programme runs June 29-July 10, 2026, with an application deadline of May 19, 2026 (superseding stale 2023/2024 dates that had appeared in earlier source material). Two related programmes on the same official page -- a Sutton Trust-funded summer school and SUISS -- are separate offerings not covered by this record.',
    source_url = 'https://study.ed.ac.uk/summer-school',
    last_verified_at = now()
where id = '30436a92-26fd-4972-a8b3-dce8ad454943'
  and minimum_age is null;

-- Retire the now-redundant duplicate -- only after the migration above has landed.
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = 'dc762fce-b83a-4217-a610-290ac2f65f17'
  and status = 'active';

-- ══════════════════════════════════════════════════════════
-- 2/3 — Garcia (Stony Brook): move the real research onto the surviving row
-- ══════════════════════════════════════════════════════════
-- a37fa810 ("Garcia Summer Research Program") carries the real minimum_age, the real
-- citizenship_restrictions text lib/opportunities/matching.ts's own code comment names as its
-- live-confirmed example (see the fix to that file alongside this package), a real cost,
-- location_mode, subject fields, and a higher-confidence, official-primary source. d83d7048
-- ("Garcia Summer Scholars") -- CEO's chosen surviving row -- has none of this. Guarded on
-- minimum_age is null, same "hasn't been migrated yet" signal as Edinburgh above.
update public.opportunities
set minimum_age = 16,
    citizenship_restrictions = 'International students may apply only if they already hold legal documentation to be in the U.S. during the program; the center does not sponsor visas.',
    cost = 4116.00,
    financial_aid_available = false,
    location_mode = 'in_person',
    fields = array['materials science', 'polymer science', 'chemistry', 'engineering'],
    source = 'official_primary',
    source_url = 'https://www.stonybrook.edu/garcia/summer-program/eligibility.html',
    source_confidence = 'high',
    description = 'A seven-week, in-person research program at Stony Brook University''s Garcia Center for Polymers at Engineered Interfaces, run in separate tracks for high school students, undergraduates, and teachers. High-school participants combine formal instruction with an independent, original research project designed with guidance from Garcia Center faculty, staff, and graduate students, working alongside undergraduates, teachers, and postdocs in shared research teams; research areas include polymer blends and composites, polymer/inorganic surfaces, protein and DNA interactions, polymer recycling, materials engineering, and related theoretical modeling and analytical techniques such as x-ray/neutron scattering, microscopy, and spectroscopy. Participants who complete a successful project may go on to publish in a research journal or present at a professional conference such as the Materials Research Society Fall Meeting, and high-school Scholars can continue afterward in an optional year-round mentor program.',
    last_verified_at = now()
where id = 'd83d7048-537b-4450-8dfa-69e709cdb48f'
  and minimum_age is null;

-- Retire the now-redundant duplicate -- only after the migration above has landed.
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = 'a37fa810-d142-4c07-b272-b3d58a6e6ea5'
  and status = 'active';

-- ══════════════════════════════════════════════════════════
-- 3/3 — Lehigh University: symmetric duplicate, no data to migrate
-- ══════════════════════════════════════════════════════════
-- Both rows carry zero structured eligibility data (confirmed live) -- no migration needed,
-- per CEO's own framing ("no differential impact"). Keeping d12506f1 ("Lehigh University"),
-- per the scan doc's own visible-row column; retiring a7a89e1e ("Lehigh University:
-- Bethlehem, PA"). NOT migrating either row's description text -- CEO's own instruction for
-- this pair was retire-and-justify-which, not migrate-content (unlike Edinburgh/Garcia, where
-- she explicitly asked for a data migration); the two descriptions have some non-overlapping
-- prose (Bethlehem's "four-week, 64 countries" vs. the survivor's "no older than 17,
-- rolling admission") but neither is structured data any code path reads, and merging prose
-- neither row's own research pass asked for is out of this task's scope.
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d'
  and status = 'active';

commit;

-- Re-run safe by two different mechanisms, not the same one twice -- worth being precise
-- about which, since they protect against different failures:
--   * The two migration UPDATEs (Edinburgh, Garcia) set hardcoded literal values, so a bare
--     re-run is harmless with or without a guard -- confirmed directly, not assumed: removing
--     the `minimum_age is null` guard and running the real two-run test still passed cleanly,
--     because SET-ing the same literals twice produces the identical row either way (unlike
--     Package 15's Waterloo INSERTs, where a missing ON CONFLICT genuinely caused duplicate
--     rows or an outright error on the second run -- an UPDATE with no dynamic values like
--     gen_random_uuid() structurally can't do that). The guard's real job here is different:
--     it stops this file from re-asserting a stale literal value over a row someone else has
--     since corrected further by hand -- a real property, just not a re-run-safety one.
--   * The three retirement UPDATEs are guarded on status = 'active', which IS a genuine
--     re-run-safety guard in the ordinary sense (without it, `updated_at = now()` would still
--     harmlessly re-fire every run, so even this one is closer to "keeps the timestamp honest"
--     than "prevents a failure" -- there's no unique constraint here to violate).
-- Verified by scripts/check-package-16-sequence.sh, twice in direct succession, both with and
-- without the migration guards present.
