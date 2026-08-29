# S7-B1 Closeout — Leadership / Fellowship / Youth Council / Social Impact / Social Entrepreneurship

**Lane:** S7-B1 (one of four parallel research agents under "S7 — Other High-Value Turkey-Accessible Opportunities")
**Scope:** Leadership programs, fellowships, youth councils, social-impact programs, social entrepreneurship. Explicitly NOT university summer programs, NOT competitions/olympiads (other lanes' scope).
**Research date:** 2026-08-26
**Target user:** Turkey-based high-school student intending to apply to universities abroad (US/UK/Europe primarily).

## STATUS

Complete for this research pass. Web search budget was exhausted (200/200 session WebSearch calls) partway through a final round of discovery searches aimed at closing the "fellowship" gap; WebFetch remained available throughout and was used for all direct-source verification. Given the budget ceiling, I stopped discovery and consolidated findings rather than push further with degraded (WebFetch-only, no new search) methodology.

## PRODUCTION-READY COUNT

**0** — per the mission brief, `verification_state:"VERIFIED"` is necessary but not sufficient; a second reviewer must cross-check before anything is marked PRODUCTION_READY. See CANDIDATE COUNT / VERIFIED breakdown below for what's ready for that review.

## CANDIDATE COUNT

**17 accepted records** across `s7b1_batch1.jsonl` (9) and `s7b1_batch2.jsonl` (8):

- `verification_state:"VERIFIED"` (10): Türkiye Öğrenci Meclisi, International Young Eco-Hero Awards, The Diana Award, Global Social Leaders*, The Knowledge Society, Round Square, TED-Ed Student Talks, GençBizz, Genç Kızılay, International Children's Peace Prize. (*GSL is VERIFIED on eligibility/mechanics but its individual price point is uncertain — see its `notes_uncertainties`.)
- `verification_state:"CANDIDATE"` (7): Malala Fund Assembly, UNICEF Voices of Youth, Roots & Shoots Türkiye, WWF-Türkiye Doğa Öncüleri, Habitat for Humanity Global Village, Türkiye İzcilik Federasyonu (Scouting), Ocean Heroes Bootcamp.

Spread across opportunity_type: youth_council (1), leadership_program (6), social_impact (8), social_entrepreneurship (2), **fellowship (0 — see Key Gaps)**.

Spread across turkey_student_access: VERIFIED_ELIGIBLE (11), ELIGIBLE_WITH_CONDITIONS (4: Malala Assembly, Round Square, Genç Kızılay, Habitat for Humanity), UNCLEAR (2: UNICEF Voices of Youth, Ocean Heroes Bootcamp), NOT_ELIGIBLE (0 in the accepted set — anything NOT_ELIGIBLE went to rejected).

## REJECTED COUNT

**27 records** in `s7b1_rejected.jsonl`, each with a specific rejection reason and evidence URL. Breakdown by reason:
- Not eligible (country/residency): 4 (Bezos Scholars, Diller Teen Fellows, Plan International UK YAP, WWF-Türkiye general volunteering — the last is an age reason but bucketed similarly)
- Age-restricted (effectively 18+ or otherwise excludes HS students): 5 (World Youth Forum Egypt, National Geographic Young Explorers, Resolution Project SVC, European Forum Alpbach, Bilim Kahramanları Derneği)
- Defunct / discontinued: 3 (Legacy International Turkey YLP track, YouthActionNet, British Council Active Citizens)
- University-only / wrong age-status: 3 (Genç TEMA, Toplum Gönüllüleri Vakfı, Resolution Project overlaps above)
- Unclear / insufficient evidence to responsibly recommend: 9 (Best Buddies Turkey chapter, Encode Justice, GYBN Turkey access, AKUT Gençlik, Common Purpose, Türkiye Gençlik Konseyi, Rotary RYLA Türkiye, Sivil Düşün individual track, Y-PEER Türkiye age)
- Out of scope: 1 (Kluz Prize for PeaceTech — targets orgs/companies, not students)
- Wrong program entirely (name collision): 1 (Aile ve Gençlik Bankası/Fonu — turned out to be a newlywed marriage-loan fund, not a youth social-impact scheme; flagged explicitly so nobody re-investigates this name)
- Org-gated / no active call: 1 (Gençlik Projeleri Destekleme Programı — Ministry youth-project grants; real, but applicant unit is an organization not an individual, and no call was open at research time)

## UNCLEAR COUNT

Within the 17 accepted records, **2** carry `turkey_student_access:"UNCLEAR"` (UNICEF Voices of Youth — platform redirect/consolidation uncertainty; Ocean Heroes Bootcamp — current-cycle and region-scoping uncertainty). Within rejected, **9** are `UNCLEAR_*` reasons rather than confirmed-ineligible (see above) — these are genuine "needs a human or a fresh research pass to resolve," not confirmed dead ends, and are worth a second look if this lane is ever revisited.

## KEY GAPS

1. **Zero clean "fellowship" entries.** This sub-type was the hardest to fill. Every genuine cohort-based, mentorship-driven "fellowship" brand I found for this age band turned out to be one of: (a) 18+ in practice (Resolution Project, European Forum Alpbach, National Geographic Young Explorers, World Youth Forum), (b) US/UK-residency-gated (Bezos Scholars, Diller Teen Fellows, Plan International UK), or (c) defunct (YouthActionNet). This appears to be a genuine structural fact about the space, not a research shortfall — true multi-month fellowships with stipends/mentorship overwhelmingly target college-age or older youth. If this gap must be filled, the most promising unexplored angle is Turkey-based corporate-foundation "fellowship"-branded programs (e.g. bank/holding-company foundations) that I did not have search budget left to explore (Koç Holding, Sabancı Holding, Vodafone Turkey Foundation, Garanti BBVA, TÜSİAD youth arms beyond what was checked here) — several dead-ended on my initial pass (see Sabancı Vakfı "Genç Değişim Elçileri," which returned no usable results) but were not exhaustively chased.
2. **Social entrepreneurship is thin (2 records).** GençBizz is Turkey-based/company-formation; Ocean Heroes Bootcamp is campaign-building. A dedicated youth micro-grant/venture-funding program (beyond the org-gated, currently-inactive Ministry youth-project fund) was not found.
3. **Several strong-looking leads dead-ended on verification** and are recorded in rejected.jsonl with reasons rather than silently dropped: GYBN (real global org, Turkey chapter unconfirmed — wwf.org.tr-style 403 blocks prevented direct confirmation), Encode Justice (domain now redirects to a rebranded site with no visible youth program — possible wind-down or restructuring, worth a fresh check), Rotary RYLA (real in Turkey but fragmented across ~3 districts with no single citable eligibility page).
4. **WebSearch budget was exhausted** before I could chase a planned final round on Turkish corporate-foundation youth fellowships and a couple more UN-adjacent youth advisory bodies. WebFetch remained available and was used to verify everything that is in the accepted batches, but no *new* candidates could be discovered via search after that point.

## KEY UNCERTAINTIES (read before using these records)

- **GençBizz duplicate risk:** Genç Başarı Eğitim Vakfı is Türkiye's Junior Achievement affiliate, and GençBizz's mechanics (zero-capital student mini-company, liquidated at year end) are the classic global "JA Company Programme" methodology already represented in the live DB as "JA Company Programme (Europe)" and "Young Enterprise Company Programme" (UK) — two other country-specific brand names for what may be the same underlying JA methodology. I judged GençBizz distinct enough (Türkiye's own branded, MEB-linked implementation) to include, consistent with how those two existing DB entries already treat country-branding as distinguishing, but flagged this explicitly in the record for the second reviewer.
- **Several official domains blocked our fetch tool with HTTP 403** (wwf.org.tr twice, u-report.org, gybn.org twice, tif.org.tr's PDF, rootsandshootsturkey.org's specific "Join Us" subpage): where this happened, the affected record is marked `verification_state:"CANDIDATE"` (not VERIFIED) and evidence is sourced from search-engine summaries of the same official domain rather than a direct fetch/quote. These are flagged, not hidden — a human browsing (not blocked the way our automated fetch tool was) could likely resolve most of them quickly.
- **TED-Ed Clubs has changed its facilitation model** over time: older (2014-2017) materials describe students 13+ self-applying to start a club; the current official page ("TED-Ed Student Talks") frames registration as adult/organization-facilitated. We recorded the current rules and flagged the discrepancy rather than presenting outdated self-application info as current.
- **Nomination-gated items** (The Diana Award, International Children's Peace Prize) are real and well-evidenced but are NOT self-apply — a Turkey-based student needs a third-party nominator (teacher, NGO supervisor, etc.). Worth surfacing to students as "find someone to nominate you" rather than "apply."
- **Two records (Round Square, Habitat for Humanity) carry meaningful access friction** even though technically "eligible": Round Square is gated to one specific Istanbul school (Keystone & Kilittaşı); Habitat for Humanity Global Village requires a funded international trip plus mandatory adult/institutional accompaniment for a 16-17 year old. Neither should be presented to a general student audience without these caveats up front.
- Per the mission's evidence rule, every accepted record cites at least one source with `retrieved_at:"2026-08-26"`; where a record relies partly or wholly on a search-engine summary rather than a direct fetch, `confidence` is marked `medium` or `low` and this is called out in `notes_uncertainties`.

## WHAT THE NEXT OWNER SHOULD DO

1. **Cross-check the GençBizz duplicate-risk flag** against the existing "JA Company Programme (Europe)" and "Young Enterprise Company Programme" DB records before marking PRODUCTION_READY — confirm they're genuinely distinct entities/brands, not the same underlying JA program triple-counted.
2. **Re-fetch the 403-blocked official pages** (wwf.org.tr/kesfet/egitim/doga_onculeri/, gybn.org and gybn.org/get-involved/, u-report.org, tif.org.tr's course PDF, rootsandshootsturkey.org/bize-katil/) via a browser or different tool to upgrade those 7 CANDIDATE records to VERIFIED (or to disconfirm them) — these blocks appear to be bot-protection on the target sites, not genuinely missing content.
3. **Resolve the UNICEF Voices of Youth redirect** (voicesofyouth.org submission page now 301s to u-report.org) before using that record — determine whether the youth-blogging platform still exists as described or has been absorbed into U-Report with a different submission process.
4. **Reconfirm Ocean Heroes Bootcamp's current operating status** — most detail found dates to 2019-2020; confirm it is still running a general (non-regional) cycle in 2026/2027 with a live application link before treating as production-ready.
5. **If pushed to close the fellowship gap**, the highest-leverage next moves are: (a) systematically check Turkish corporate-foundation youth programs (Koç, Sabancı, Vodafone Turkey, Garanti BBVA, TÜSİAD) for a genuine multi-month mentorship/stipend fellowship open to high schoolers rather than university students; (b) directly ask KidsRights, Diana Award, and similar UK/EU child-rights orgs whether any of them run an actual ongoing *fellowship* (as opposed to a one-time nomination award) for alumni of their prizes.
6. **Confirm Genç Kızılay and Türkiye İzcilik Federasyonu's exact under-18 join/leadership process** with a specific local branch/troop — both are real and nationally official, but the precise day-one steps and depth of leadership responsibility available to a 15-17 year old (as opposed to an 18+ member) were not fully documented on the pages we reached.
7. Do not re-research anything in `s7b1_rejected.jsonl` without new information — each entry there already has a specific, evidenced reason it was excluded.
