# S7-A1 Closeout — Scholarships & Student/Merit Awards (Turkey-accessible)

Lane: S7-A1, mission "S7 — Other High-Value Turkey-Accessible Opportunities"
Scope: scholarships and student/merit awards only (not summer programs, not competitions/olympiads)
Research date: 2026-08-26

## STATUS

Research is **complete for this session, not exhaustive for the category**. I stopped short of the 30-40 target and am reporting this honestly rather than padding with weak/duplicate/ineligible entries, per the brief's explicit instruction to prefer quality over quantity.

Two independent factors drove the stop:
1. **Genuine, well-documented category thinness.** Across ~40 candidate names investigated (27 written up as formal rejections, several more ruled out from general knowledge — see below), a clear pattern emerged: the vast majority of "famous" scholarship/award names are either (a) graduate/postgraduate-only (MEB/YLSY, TEV overseas, Özyeğin overseas, most Italian/Czech/Polish government programs, DAAD, Fulbright), (b) citizenship-restricted to the US/Canada/a specific region excluding Türkiye (Barron Prize, PVSA, Bezos Scholars, Horatio Alger, Scholastic Awards, Al-Ghurair, Ashoka, FLEX, NAWA), (c) domestic-Turkey-only despite being run by well-resourced Turkish foundations (Sabancı, Koç, Yaşar, and likely TEV's Üstün Başarı Bursu), or (d) not a genuinely distinct "opportunity" (Reach Oxford is just standard Oxford admission + auto financial assessment). This is a real finding, not a research shortfall: **Turkish private foundations essentially do not fund undergraduate study abroad** — only the Turkish state (graduate-level only, via MEB/YLSY) and a handful of foreign governments' own scholarship programs (Hungary, Japan, Taiwan, Netherlands, and probably a few more not yet checked) reach a Türkiye-based high schooler headed for a bachelor's degree abroad.
2. **Hard tool constraint**: this session's WebSearch budget (200 calls) was exhausted partway through research (shared session-level limit, not something I could raise). All research after that point relied on WebFetch only (no new discovery search), which sharply limits finding genuinely new candidate names versus verifying/deepening already-surfaced ones. This is a real, reportable gap — not a claim that the category is fully mined.

## PRODUCTION-READY COUNT (records marked VERIFIED by me — pending required second-reviewer cross-check, not self-declared production-ready)

**10 records**, split across `s7a1_batch1.jsonl` (9) and `s7a1_batch3.jsonl` (1):
1. The International Award for Young People / Duke of Edinburgh's International Award (Türkiye via TİKAV) — `VERIFIED_ELIGIBLE`
2. Rising Explorer Grant (The Explorers Club) — `VERIFIED_ELIGIBLE`
3. Global Student Prize (Varkey Foundation / Chegg.org) — `VERIFIED_ELIGIBLE`
4. Stipendium Hungaricum Scholarship Programme (Hungary) — `VERIFIED_ELIGIBLE`
5. MEXT Japanese Government Scholarship — Undergraduate — `VERIFIED_ELIGIBLE`
6. Three Dot Dash: Global Teen Leaders Program (We Are Family Foundation) — `ELIGIBLE_WITH_CONDITIONS`
7. International Young Eco-Hero Awards (Action For Nature) — `ELIGIBLE_WITH_CONDITIONS`
8. The Diana Award — `ELIGIBLE_WITH_CONDITIONS`
9. Taiwan Scholarship Program (MOE) — `VERIFIED_ELIGIBLE`
10. NL Scholarship / formerly Holland Scholarship (Netherlands/Nuffic) — `VERIFIED_ELIGIBLE`

Even within "VERIFIED," several records carry a flagged sub-gap (e.g., exact current TİKAV fee amount, exact 2027-cycle MEXT-Türkiye deadline, per-institution NL Scholarship deadlines) — these are documented in each record's `notes_uncertainties`, not hidden.

## CANDIDATE COUNT (verification_state=CANDIDATE, evidence incomplete)

**5 records**, in `s7a1_batch2.jsonl`:
1. International Children's Peace Prize (KidsRights) — official page confirmed founding/scope/past winners directly, but exact current age range and 2026 deadline came from third-party summaries only (the official PDF guidance booklet failed to parse via WebFetch, and a dedicated eligibility URL 404'd repeatedly).
2. UWC (United World Colleges) — Türkiye National Committee Selection — **this is the single highest-value candidate to re-verify**: genuinely real and substantive (confirmed via multiple independent signals including the official Turkish account's own social posts), but our WebFetch tool could not load tr.uwc.org or uwc.org at all (repeated HTTP 403 / socket-hang-up across 4+ attempts on different pages/tools) — the site appears to actively block automated fetches. Facts recorded came from WebSearch's own synthesis of the official pages' content, not text we personally read.
3. Zonta Young Women in Leadership Award — mechanics look solid but **Türkiye's current Zonta club/district presence is genuinely unconfirmed** (also blocked by repeated zonta.org fetch failures) — this is a binary eligibility gate, not a minor detail, so it's marked `turkey_student_access: UNCLEAR` rather than guessed.
4. Global Korea Scholarship (GKS) — Undergraduate — program mechanics VERIFIED-quality (age/GPA/coverage/deadline read directly off the official page), but Türkiye's specific per-cycle quota allocation among the ~71 invited countries was not independently confirmed on an official document — flagged `UNCLEAR` specifically because a very similar-looking aggregator claim (for a different country, Stipendium Hungaricum) initially looked wrong before official cross-checking proved it right, and a separate one (Czech Republic) was outright wrong when checked — this pattern makes me deliberately conservative about GKS's unconfirmed Turkey-quota claim.
5. Peace First Grants — official page fetched directly but is unusually vague on its own site (no dollar figures, no fixed deadline, tiers not enumerated) — likely a genuinely informal/rolling program rather than a research gap, but recorded as CANDIDATE since key planning facts are missing.

## REJECTED COUNT

**27 records** in `s7a1_rejected.jsonl`, each with a specific `reason_category` and cited evidence:
- `domestic_study_only` (4): Sabancı Vakfı, Vehbi Koç Vakfı, Yaşar Eğitim ve Kültür Vakfı, + TEV Üstün Başarı Bursu (flagged `could_not_verify` but strongly suspected domestic)
- `citizenship_restricted` / `country_restricted` (13): Al-Ghurair, Barron Prize, Scholastic Awards, Ashoka Young Changemakers, FLEX, NAWA Banach, Poland My First Choice, PVSA, Bezos Scholars, Horatio Alger, Czech Government Scholarships, Sutton Trust US Programme, (+ Al-Ghurair counted once)
- `wrong_age_stage` (5): L'Oréal-UNESCO FWIS Türkiye, MEB 1416/YLSY, TEV Yurt Dışı, Özyeğin Vakfı overseas, Invest Your Talent in Italy, Global Study Awards
- `not_a_distinct_opportunity` / structural (1): Reach Oxford Scholarship
- `low_credibility_pay_to_play` (1): NSHSS
- `wrong_audience` (1): Malala Fund Gulmakai/ECN
- `not_a_single_canonical_opportunity` (1): Rotary Youth Exchange
- `out_of_lane_scope` / competition-format overlap (1): Young Reporters for the Environment / Çevrenin Genç Sözcüleri — real and Türkiye-active (44 schools), but its submit-and-judge format overlaps with the competitions lane, not this one; flagged for that lane's awareness rather than duplicated here.

Two additional well-known names (DAAD, Fulbright Turkey) were checked via direct WebFetch this session but both fetches returned inconclusive/error content (a scholarship-database landing page with no undergraduate-specific detail visible, and a 404 respectively) — **not** written up as formal rejected.jsonl entries because I could not cite a clean direct quote, but flagged here from strong general knowledge: both are essentially graduate/postgraduate/researcher/teacher programs with no standard bachelor's-entry route for a Türkiye-based high schooler. Next owner should give these a clean direct-source check if they want a formal citation.

## UNCLEAR COUNT

**2 records** with `turkey_student_access: UNCLEAR` (Zonta Young Women in Leadership Award; Global Korea Scholarship Undergraduate) — both described above under CANDIDATE COUNT. Per the brief, these should **not** be treated as production-ready until the specific open question (Zonta Türkiye club presence; GKS Türkiye quota line item) is resolved against an official source.

## KEY GAPS

1. **UWC Türkiye and Zonta could not be directly fetched at all** (both domains returned persistent 403/connection errors across many attempts, possibly Cloudflare or similar bot protection) — this is a tooling limitation, not evidence against the programs. Worth a retry from a different environment/tool before the next reviewer discounts either.
2. **WebSearch budget was exhausted mid-session** (200/200), cutting off discovery of new candidate names for the back half of the work. Categories not yet explored that could plausibly yield 1-3 more legitimate records: other EU-country government undergraduate scholarships (Greece/IKY was left unchecked; a few Nordic and Baltic programs untried), a few more worldwide teen social-impact award programs in the Diana-Award/Global-Student-Prize style, and Turkish diaspora/bilateral cultural-society scholarships (e.g., American Turkish Society) that were deprioritized rather than ruled out.
3. **Photos**: not pursued for any record (per the brief, this is explicitly secondary/optional) — all `image_url` fields are null.
4. **Deadlines are unusually "null-heavy" in this batch** — not a research gap but a real characteristic of this category: nearly every strong candidate's most recent cycle had already closed by this research date (2026-08-26), and next-cycle dates are genuinely not yet published for most of them (Diana Award, Global Student Prize, MEXT, Taiwan, Stipendium Hungaricum, UWC, We Are Family GTL, Action for Nature all fall in this bucket). This is expected/correct behavior under the "unknown is allowed, never guess" rule, but means this batch will need a **freshness re-check closer to each program's actual announcement window** (roughly autumn 2026 through spring 2027) before deadlines can be shown to users.

## KEY UNCERTAINTIES

- Whether TİKAV's Turkey participation fee is genuinely ~150 TL (secondary-sourced only) or a different/updated amount.
- Whether KidsRights ICPP carries a monetary component at all (some aggregators say "€50,000"; not found on any official page we could read — treated as unconfirmed, not fact).
- Whether Peace First's grants have any concrete, plannable dollar figures or deadlines (their own site is vague).
- Whether TEV's "Üstün Başarı Bursu" is truly domestic-only (strong circumstantial case, not a direct citation).

## WHAT THE NEXT OWNER SHOULD DO

1. **Re-attempt direct fetches of tr.uwc.org and zonta.org** (ideally from a different tool/network than plain WebFetch, which was consistently blocked) to upgrade UWC Türkiye to VERIFIED and resolve Zonta's Türkiye-eligibility question one way or the other. UWC in particular is worth the effort — it is arguably the single most substantive, on-brand opportunity in this whole batch for a Türkiye-based student aiming at international universities.
2. **Pull the official GKS 2026/2027 Undergraduate Application Guidelines PDF** (via NIIED or studyinkorea.go.kr directly, using a proper PDF reader rather than WebFetch, which garbled a different PDF this session) and check the Türkiye line item.
3. **Re-verify all null-deadline records in Q4 2026 / Q1 2027** as new application cycles are announced (see Key Gaps #4).
4. **If more records are wanted to approach the 30-40 target**, the highest-probability unexplored veins are: (a) other individual EU-country government scholarships for foreign bachelor's students (check each one directly against an official eligible-country list before including — this session found real, non-obvious traps where aggregators claimed Turkey was eligible and the official source said otherwise for Czech Republic, and the reverse pattern where an official source's own page appeared to omit Turkey but was actually just truncated for Stipendium Hungaricum), and (b) more worldwide (not US-only) teen social-impact/leadership award programs in the same family as the Diana Award / Global Student Prize / Global Teen Leaders already found.
5. **Do not re-search** the 27 rejected names or the do-not-duplicate list from the original brief.
