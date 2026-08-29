# S7-A2 Closeout — Research-Paper / Essay / Literary Publication Venues for HS Students

Lane: S7-A2 ("S7 — Other High-Value Turkey-Accessible Opportunities" mission)
Scope: publication/submission venues (research journals, essay publication, literary/creative-writing venues) and standalone research-paper/essay competitions for high schoolers. NOT summer research programs.
Research date: 2026-08-26

## STATUS

Complete for this session, within tool budget limits (WebSearch quota was exhausted — 200/200 calls used — partway through the final "reach for more diversity" pass; see Key Gaps). All output files written:
- `s7a2_batch1.jsonl` — 8 records (STEM/science journals)
- `s7a2_batch2.jsonl` — 7 records (humanities / essay / philosophy)
- `s7a2_batch3.jsonl` — 14 records (creative writing / literary)
- `s7a2_rejected.jsonl` — 4 records (3 substantive exclusions + 1 dedup/traceability note)

## PRODUCTION-READY COUNT

**0.** Per the task instructions, `verification_state` in my schema only goes up to `VERIFIED` (I fetched the publisher's own page and it supports every material field) — `PRODUCTION_READY` is explicitly a second-reviewer designation I am not authorized to assign. See VERIFIED count below as the closest analog.

## CANDIDATE COUNT / VERIFIED COUNT (accepted batch, 29 total)

- **VERIFIED: 18** — direct first-party fetch obtained and quoted for the material fields (NHSJS, The Curieux Review, Young Scientist Journal/Vanderbilt, Whitman Journal of Psychology, IYNA Journal, The Concord Review, HIR Academic Writing Contest, John Locke Institute Essay Competition, Polyphony Lit, Bow Seat Ocean Awareness Contest, Skipping Stones, Cathartic Youth Literary Magazine, The WEIGHT Journal, Apprentice Writer, The Adroit Journal general submissions, Teen Ink, One Teen Story, Sine Theta Magazine).
- **CANDIDATE: 11** — real and (in most cases) clearly legitimate, but direct first-party fetch was blocked or failed this session (mix of bot-protection 403s, Cloudflare 522/523 origin-unreachable errors, one invalid-TLS-certificate site, and one domain this session's tools refuse to fetch at all): Journal of Student Research–HS Edition, Journal of High School Science, Youth Medical Journal, The Schola, NYT Learning Network Student Contests, Cogito, High School Journal of Contemporary Philosophy, Blue Marble Review, Foyle Young Poets of the Year Award, Hanging Loose, Rattle Young Poets Anthology.

A second reviewer should prioritize re-fetching the CANDIDATE list with an unrestricted browser before granting PRODUCTION_READY — most of these are almost certainly legitimate (well-known organizations, e.g. Poetry Society UK for Foyle, Harvard/Vanderbilt-adjacent naming patterns aren't at play here but Rattle and Hanging Loose are decades-old respected literary presses), the blockage looks like generic anti-bot tooling on their end rather than a red flag, with two explicit exceptions flagged below.

## REJECTED COUNT

**3 substantive exclusions** in `s7a2_rejected.jsonl`:
1. **Scholastic Art & Writing Awards** — `not_eligible_for_target_user`. Confirmed via official Participation Terms: students residing outside the US/territories/Canada are explicitly ineligible, no exception for US-curriculum schools abroad. Recorded deliberately (not silently dropped) because it's famous enough that a family will ask about it by name.
2. **Canvas Teen Literary Journal** — `defunct_or_dormant` since 2020.
3. **The Incandescent Review** — `defunct_or_dormant`, per Duotrope as of May 2026.

Plus **1 traceability/dedup note** (not a true rejection): the original `curieuxacademicjournal.com` domain is now a read-only archive superseded by `curieuxreview.com`, which IS in the accepted batch — flagged so a future researcher doesn't treat the old domain as a separate live opportunity.

## UNCLEAR COUNT

**2 records** carry `turkey_student_access: "UNCLEAR"` because too many material facts were unconfirmable this session: **Journal of High School Science** (JHSS — JavaScript-rendered site returned only bare page titles to the fetch tool, three attempts) and **Youth Medical Journal** (official `.com` domain 403-blocked twice; see the sharp safety flag below). Several other CANDIDATE records use `ELIGIBLE_WITH_CONDITIONS` rather than a clean `VERIFIED_ELIGIBLE` specifically because geography was never explicitly contradicted but also never confirmed first-party (Blue Marble Review, Hanging Loose, Rattle Young Poets Anthology, Teen Ink's boilerplate US-jurisdiction ToS clause, Sine Theta's identity-based rather than geography-based gate).

## KEY GAPS

1. **WebSearch budget was exhausted (200/200) before I could do a final push for 3-6 more candidates** (was specifically chasing a second economics-focused journal and the Louisville Review's "Children's Corner"). Landed at **29 accepted records**, just under the 30-40 target. Given genuine time/tool constraints rather than true topic saturation, I'd estimate a few more solid candidates exist (I'd specifically suggest checking: additional single-subject HS journals in economics/business, a second dedicated poetry-only venue, and re-attempting Interlochen's Blue Pencil Online — though note `cr1_interlochen_review_eval.jsonl` already exists elsewhere in this data directory, meaning another lane has already evaluated Interlochen; do not duplicate that work).
2. **Coverage is STEM-heavy but creative-writing-heaviest by count** (8 STEM / 7 humanities-essay-philosophy / 14 creative writing) — this reflects genuine relative abundance of real, verifiable venues in each category, not a deliberate skew, but a reviewer wanting stricter balance could look for 2-3 more STEM options (e.g., a dedicated chemistry- or CS-specific journal was not found).
3. **Several sites were completely or partially unreachable by this session's tools** for reasons that look tool/environment-specific rather than site-side problems: `nytimes.com` is entirely blocked at the tool level (not the NYT's doing); `theschola.org`, `theadroitjournal.org` (root), `foyleyoungpoets.org`, `poetrysociety.org.uk`, `hangingloosepress.com`, `rattle.com`, `bluemarblereview.com`, and `theweightjournal.com`'s sibling pages all returned HTTP 403 (generic anti-bot WAF behavior); `jsr.org` returned Cloudflare 522/523 "origin unreachable" three times (looks like a real outage); `cogitojournal.org` failed TLS certificate verification outright. None of this should be read as evidence against the organizations' legitimacy — it's a tooling limitation of this research session.

## KEY UNCERTAINTIES (the ones that matter most)

1. **Youth Medical Journal — domain safety flag.** `youthmedicaljournal.ORG` (a plausible-looking, similarly-named domain) currently **redirects to an unrelated online gambling/lottery site**. The real, independently-indexed-as-legitimate site is `youthmedicaljournal.COM` — a different domain. This is exactly the kind of thing a minor-safety-conscious product must get right: never surface the `.org` URL. I could not get a direct fetch of `.com` either (403 twice), so treat the whole record as CANDIDATE pending a human visiting `.com` directly in a real browser.
2. **Cogito (`cogitojournal.org`)** currently fails TLS certificate verification — a concrete, checkable technical red flag (not a bot-block) that could mean the site is neglected, mid-migration, or worse. Recommend a human check before this is ever surfaced to a student.
3. **Fee-charging "pay upon acceptance" journals are common in this category and materially important to disclose**: The Curieux Review ($200-250), The Schola ($180, third-party-sourced only), Journal of Student Research–HS Edition ($349 total across two phases, third-party-sourced only). None of these struck me as outright predatory scams (Curieux explicitly offers financial aid on request; all describe some real editorial process; all are frequently recommended by independent college-counseling sources rather than appearing on scam-warning lists) — but the fee-for-publication model itself is worth a second reviewer's explicit judgment call, especially for The Schola and JSR where I could never get the publisher's own page to load and had to rely on third-party synthesis for the exact fee figures.
4. **Several "2026" deadlines I found during research had already elapsed relative to the research date (2026-08-26)** — e.g., Bow Seat's June 8 2026 deadline, Foyle's July 31 2026 deadline, John Locke's entire 2026 cycle, Adroit Prizes' April-May 2026 window. I deliberately did NOT project forward a guessed 2027 date in any of these cases — every such record has `deadline: null` and `deadline_status: "next_cycle_not_published"` per the no-guessing rule, with the elapsed date preserved only in `current_cycle_label`/notes for context. **A reviewer refreshing this data closer to when it goes live should expect several of these next-cycle dates to now be publicly known** and should re-check rather than assume they're still unpublished.
5. **The Schola and Cogito in particular have unusually thin verification** — every material fact for The Schola traces to a paid third-party admissions-consultancy's internal PDF guide (not the publisher), and Cogito's facts trace to a single Stanford Online High School student-newspaper article. Both are plausibly real and legitimate but sit on weaker evidentiary footing than everything else in this delivery — flagged individually in their records, flagging again here since they're the two weakest links.

## WHAT THE NEXT OWNER SHOULD DO

1. **Re-fetch the 11 CANDIDATE records with a real/unrestricted browser** (not this session's WebFetch tool) to upgrade them to VERIFIED or surface real problems — most are one successful page-load away from being solid.
2. **Resolve the Youth Medical Journal domain situation by hand** before this ever reaches a student — visit `youthmedicaljournal.com` directly, confirm it's the legitimate org described in search indexes, and never use the `.org` URL anywhere downstream.
3. **Get a second reviewer's explicit sign-off on the three fee-charging journals** (Curieux Review, The Schola, JSR–HS Edition) — decide product-side whether/how to present "pay $180-349 to publish" venues alongside free ones like NHSJS, Polyphony Lit, or Teen Ink, so a family isn't surprised.
4. **If more records are wanted to comfortably clear 30-40**, the most promising unexplored leads (by name, not yet verified) are: additional single-subject economics/business HS journals, Louisville Review's "Children's Corner," and general re-sweeps of any category once WebSearch quota resets — I ran out of search budget, not out of real candidates.
5. **Cross-check against other S7 lanes before merging into the DB** — per project convention (see `project_opportunity_engine_priorities` / dedup norms in memory), confirm none of S7-A1/A3/A4's output overlaps these 29 (e.g., if another lane also touched Regeneron STS, ISEF, or general "research programs," note I deliberately excluded both as out-of-scope-for-this-lane competition/fair formats rather than publication venues, so they should appear only in a competition-focused lane's output, not duplicated here).
