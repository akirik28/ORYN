# S7-B1-WAVE2 Closeout — Targeted Follow-Up on Corporate Fellowships, Social-Entrepreneurship Funding, UN Bodies, and 3 Retry Leads

**Lane:** S7-B1-WAVE2 (scoped follow-up to S7-B1 Wave 1)
**Scope:** 5 specific numbered targets handed down from Wave 1's closeout, NOT a broad re-search.
**Research date:** 2026-08-26
**Target user:** Turkey-based high-school student intending to apply to universities abroad.

## STATUS

Complete. All 5 numbered targets were worked. WebSearch and WebFetch budgets were both used efficiently and neither was exhausted (unlike Wave 1, which ran out of WebSearch budget). Did not touch any Wave 1 files.

## HEADLINE ANSWER TO TARGET #1 (the priority question)

**The structural gap is NOT total. One genuine Turkish corporate-foundation program was found: Vodafone Türkiye Vakfı's "AI Startup Studio."** It has real selection (119 applicants → 25 selected in the most recent cohort), real mentorship (Vodafone Volunteers), a genuine 3-month duration, and explicit 14-18 high-school-age eligibility — the first program across everything checked in Wave 1 + Wave 2 that cleanly clears all four of the bars target #1 set (real selection + real mentorship/stipend + genuine multi-month duration + high-school-age eligibility).

That said, this is **1 real find out of 5 corporate foundations systematically checked** (Koç, Sabancı, Vodafone, Garanti BBVA, TÜSİAD) — the other 4 confirmed no qualifying program (see REJECTED). So the honest framing is: **the gap is real and mostly holds, but it is not absolute** — it took checking 5 foundations to find 1 genuine hit, and that hit is branded as a tech/AI startup incubator, not as a "fellowship." A student-facing product should probably not promise "Turkish corporate fellowships are common" off the back of this — one strong example exists, not a category.

## NEW ACCEPTED COUNT

**4 records** in `s7b1w2_batch1.jsonl`, all `verification_state` CANDIDATE except one VERIFIED:

1. **AI Startup Studio (Vodafone Türkiye Vakfı / Habitat Derneği)** — CANDIDATE. Answers target #1 (see above) and partially target #2 (has a real cash-prize/seed-funding component).
2. **The Pollination Project — Daily Seed Grant** — **VERIFIED**. Answers target #2 cleanly: a genuine ongoing (rolling, not a one-time competition), worldwide, individually-applied $500 micro-grant program for volunteer-led social/environmental projects, with no institutional gatekeeping and no age floor found across two directly-fetched, quoted official pages. This is the strongest, cleanest find of this pass.
3. **UN Major Group for Children and Youth (MGCY)** — CANDIDATE. Answers target #4: a genuine, individually-joinable, UN-recognized youth body (distinct from Wave 1's UNICEF Voices of Youth), open to age 30-and-under worldwide with no country restriction, though practical substance for a 16-17-year-old specifically (vs. formal in-person UN representation) is unconfirmed.
4. **KidsRights Changemakers Program** — CANDIDATE. Relevant to both target #2 and target #3: a genuine ongoing, individually-applied, staged funding program (Action Developer → Fund Catcher → Dreaming Big, ages 12-24) distinct from the annual, nomination-only International Children's Peace Prize already on file. Turkey is not confirmed among its named "State of Youth" chapter countries, and the program's own domain resisted direct WebFetch (connection resets, not a block) — evidence is search-indexed rather than directly quoted, flagged accordingly.

Spread across `opportunity_type`: social_entrepreneurship (2), youth_council (1), social_impact (1).
Spread across `turkey_student_access`: ELIGIBLE_WITH_CONDITIONS (3), and the Pollination Project is also ELIGIBLE_WITH_CONDITIONS despite the program itself being VERIFIED — geography is confirmed but minors are never explicitly named as eligible, so per the mission's capping rule it is not marked VERIFIED_ELIGIBLE.

## NEW REJECTED COUNT

**16 records** in `s7b1w2_rejected.jsonl`:

**Target #1 (corporate foundations) — 7 new rejections**, confirming the gap holds for 4 of the 5 orgs checked:
- Sabancı Vakfı — Gençlik Çalışmaları Akademisi (wrong audience: adult youth-sector workers, not students)
- Sabancı Vakfı — Fark Yaratanlar Programı (no HS-specific design; practically an established-social-enterprise recognition award)
- Koç / Vehbi Koç Vakfı — Meslek Lisesi Memleket Meselesi (school-partnership-gated, vocational track, poor product fit)
- Koç Genç Yetenek Programı (university 2nd-year+ only)
- Garanti BBVA — 5 Taş Sosyal ve Finansal Liderlik Programı (elementary/middle school, wrong age band)
- Garanti BBVA — Genç Bankacılığı / Kariyerime İlk Adım / Kampüs Elçiliği (university/graduate only)
- TÜSİAD — Bu Gençlikte İŞ Var! (explicit 18-30/18-35 minimum, confirmed via direct fetch of the official application page)

**Target #2 (social-entrepreneurship funding) — 4 rejections of other leads checked before landing on Pollination Project / KidsRights:**
- Ashoka Young Changemakers (Turkey not among the 6 countries the program operates in)
- Seeds of Fortune Scholars Program (US race/gender/school-system-specific)
- Roddenberry Foundation Catalyst Fund (explicit 18+ minimum)
- Youth Service America Grants (US-only)

**Target #4 (UN-adjacent bodies) — 1 rejection:**
- UNESCO SDG4 Youth & Student Network (age 16-30 would fit, but requires pre-existing membership in a qualifying youth NGO — individual self-application isn't possible, same structural problem as Wave 1's rejected Ministry youth-project fund)

**Target #3 (alumni fellowships) — 1 rejection:**
- The Diana Award — Development Programme (confirmed to exist as a real post-award benefit, but it's gated entirely behind already winning the Diana Award, which is already on file as its own record — not independently accessible, so not added as a separate opportunity)

**Target #5 (3 re-checks) — 3 rejections, all with substantially upgraded evidence over Wave 1 (see below), same net verdict:**
- Global Youth Biodiversity Network (GYBN) — Turkey/Europe access
- Encode Justice
- Rotary RYLA Türkiye

## TARGET #5 RE-CHECK RESULTS IN DETAIL

All three retained their Wave 1 verdict (not recommendable), but each re-check produced meaningfully better evidence than Wave 1 had — this was a worthwhile use of budget, not a wasted repeat:

- **GYBN**: Wave 1 was fully blocked (403 on gybn.org, no evidence either way). This pass found GYBN Europe's site on a *different, unblocked domain* (a Wix site) and got a direct, quoted answer: Turkey is **not** among GYBN Europe's named sub-regional chapters (Armenia, Austria, Italy, France, UK, Nordic countries, Western Balkans are named). Separately confirmed general GYBN network membership has no minimum age, but nearly all substantive programming (COP delegations, funded fellowships) requires ages 18-35. Net: technically joinable, not practically valuable for a Turkey-based high schooler, and no Turkey chapter exists. gybn.org's main domain was still 403-blocked on this pass too, confirming that's a stable characteristic of the site rather than a fluke.
- **Encode Justice**: Wave 1 found the domain redirects to encodeai.org with no visible youth program. This pass confirmed the redirect is stable (same 301, not a temporary migration state) AND directly fetched encodeai.org itself: zero mentions of "Encode Justice" anywhere, no chapters, no student program — just a ~10-person adult AI-policy advocacy team. A side search did surface evidence of at least one still-active chapter (Encode Justice NC) potentially operating off the main website (e.g. via Discord/Instagram rather than encodejustice.org), so this isn't a 100%-certain full wind-down, but the central, citable website path is confirmed dead for a student trying to find it.
- **Rotary RYLA Türkiye**: Wave 1 found real activity but no single citable eligibility page. This pass found a **fresh, dated (2026-08-18) press-confirmed instance** — District 2440's 13th Group ran a real 3-day RYLA at İzmir Ekonomi Üniversitesi in August 2026, ages 15-28 explicitly, covering AI/leadership/climate/communication. But 6 separate direct-fetch attempts across Districts 2420/2430/2440's own sites all 404'd or returned empty navigation, and a `site:rotary2440.org` search revealed *why*: that district runs as dozens of independent per-club subdomains (manisa.rotary2440.org, bornova.rotary2440.org, etc.) rather than one central page — a structural, not incidental, reason no stable citable page exists. This explains Wave 1's finding rather than resolving it.

## KEY UNCERTAINTIES (read before using these 4 new records)

- **AI Startup Studio**: the official application page (yapayzekayildizlari.org/ai-startup-studio) 403-blocked every direct-fetch attempt (tried https/http/www variants). Age range and mechanics come from a WebFetch-summarized Anadolu Ajansı (state press agency) article, not a raw quote fetched by this agent — only the co-organizer's own domain (habitatdernegi.org) was directly fetched and quoted, and it confirms existence/partners/deadline but not the exact eligibility sentence. Recommend a second reviewer try the official page via a real browser to upgrade to VERIFIED.
- **KidsRights Changemakers Program**: thekidsrightschangemakers.org connection-reset on every direct-fetch attempt (3 tries, 2 different pages) — this looks like a transient hosting/TLS problem rather than a deliberate block, but it means this record's evidence is search-indexed-snippet-based (medium confidence), not directly quoted. Also carries a real, disclosed age-range inconsistency across KidsRights' own pages (12-24 on one, 12-29 on another) and an unresolved question of whether Turkey-based applicants need an existing "State of Youth Chapter" first (none confirmed in Turkey).
- **UN MGCY**: no explicit minimum age stated on its own pages (only a ≤30 ceiling), and whether a 16-17-year-old gets treated the same as an 18+ member in the substantive UN-facing work (vs. just being nominally registered) is unconfirmed.
- **The Pollination Project**: the one clean VERIFIED record this pass, but still capped at `turkey_student_access: ELIGIBLE_WITH_CONDITIONS` per the mission's rule, because minors are never explicitly named as eligible (silence, not confirmation) and receiving the grant requires a wire transfer or PayPal in the applicant's own name — realistically needs a parent/guardian's help for a minor.

## WHAT THE NEXT OWNER SHOULD DO

1. Re-attempt the two blocked-for-this-agent official domains via a real browser (not this agent's WebFetch tool): `yapayzekayildizlari.org/ai-startup-studio` (403) and `thekidsrightschangemakers.org` (connection reset) — both are likely resolvable by a human browser and would upgrade both records toward VERIFIED.
2. Confirm whether Turkey-based individuals can register with KidsRights' Changemakers Program independent of an existing national "Chapter" (none confirmed in Turkey yet).
3. Consider adding an enrichment note to the *existing* Diana Award record (from Wave 1) mentioning its post-award Development Programme benefit, rather than treating it as a separate opportunity.
4. If further budget is ever allocated to this lane, the highest-leverage next move is probably NOT more corporate-foundation sweeping (5 checked, 1 hit, diminishing returns likely) but rather chasing the "Encode Justice NC may still be active off-domain" thread, or doing a systematic sweep of the other ~15 EU/international youth-council and delegate-style bodies analogous to MGCY/YOUNGO that were not checked here (this pass only checked MGCY, YOUNGO, and UNESCO's SDG4 network; UN-Habitat Youth, WHO youth councils, and various national UN-youth-delegate programs remain unchecked).
5. Do not re-research anything in `s7b1_rejected.jsonl` (Wave 1's 27 firm rejections, untouched) or the 13 non-retry entries implicitly reconfirmed by this closeout's target #5 discussion.
