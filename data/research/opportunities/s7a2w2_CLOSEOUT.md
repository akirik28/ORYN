# S7-A2-WAVE2 Closeout — Scoped Follow-Up on 5 Named Leads

Lane: S7-A2-WAVE2 (follow-up to S7-A2, "Research-Paper / Essay / Literary Publication Venues for HS Students")
Scope: NOT a broad re-search. Chased exactly the 5 numbered targets S7-A2 flagged in its own Key Gaps as things it ran out of budget to chase, plus the S7 parent session's re-verification results for A2's 11 blocked CANDIDATE URLs.
Research date: 2026-08-26

## STATUS

Complete. All 5 numbered targets investigated and resolved (found-and-accepted, found-and-rejected, or confirmed-negative-result). Output files:
- `s7a2w2_batch1.jsonl` — 4 accepted records
- `s7a2w2_rejected.jsonl` — 3 rejected records
- `s7a2w2_CLOSEOUT.md` — this file

Did not attempt fresh re-fetches of Wave 1's 11 blocked CANDIDATE URLs beyond what's noted below — the task brief said the parent session had already re-attempted all 11 and that repeating identical root-URL fetches was low-value; effort went into the 5 numbered targets instead, per instruction.

## RESULTS BY TARGET

**1. Economics/business-specific HS journal — FOUND, 1 added.**
**Student Journal of Business and Economics** (studentjournalofbusiness.com), CANDIDATE. Explicitly "dedicated exclusively to high school students passionate about business and economics," reviewed by MBA/MS students. Fee, deadline, and geographic eligibility could not be confirmed (three sub-pages 404'd) — recorded honestly as unknown rather than guessed. Also chased a second-looking lead, "Young Economists Journal" (youngeconomistsjournal.com), claimed by SEO blog-aggregator sites to be a University of Birmingham Economics Society publication for ages 14-18 — could not corroborate this at all independently, direct fetch failed, and the only verifiable journal by that name is an unrelated Romanian academic journal (University of Craiova, est. 2003, not high-school-facing). Rejected as unverifiable/likely misattributed rather than included on aggregator say-so — see rejected file.

**2. Louisville Review's "Children's Corner" — RESOLVED, 1 added with a clear fit caveat.**
Directly fetched louisvillereview.org/submissions. The section has been renamed **"Cornerstone"** and accepts **grades K-12 in one combined section** — poetry only, free, next window Sept 1 - Nov 1 2026 (deadline 2026-11-01, published and confirmed). The age-skew concern in the task brief was warranted: this is not a high-school-specific track. A 17-18 year old's poem is read and published alongside elementary-age work in the same section. Included as VERIFIED (real, free, university-affiliated via Spalding University) but flagged clearly as a lower-prestige/backup credit, weaker than Foyle Young Poets or Rattle Young Poets Anthology already in the corpus, best suited to a younger high schooler wanting an easy first publication credit.

**3. Second dedicated poetry-only venue — FOUND, 1 added, 1 near-miss rejected, 1 set aside.**
**Young Poets Network** (The Poetry Society UK, ypn.poetrysociety.org.uk), CANDIDATE — poetry-only, ages 5-25 worldwide, always free, a year-round rolling platform of themed challenges rather than a single annual award (structurally distinct from Foyle Young Poets despite sharing an organizer). Root domain and /about page both 403'd on direct fetch (matches the exact blocking pattern Wave 1 hit on Foyle/foyleyoungpoets.org), so sourced via search snippets attributed to the official domain, capped at CANDIDATE/ELIGIBLE_WITH_CONDITIONS accordingly — but one live Submittable sub-page for a specific current challenge WAS fetched directly, confirming the platform is genuinely active. Also investigated: **Nancy Thorp Poetry Contest** (Hollins University) — real and well-regarded poetry-only contest, but restricted to "high school girls in their sophomore or junior year" who are "U.S. citizens" — rejected as ineligible for the Turkey-based target user (citizenship requirement is an absolute bar regardless of gender). **Kalopsia Literary Journal** was also investigated (a "poetry-mostly" teen-run magazine) but every fetch attempt (kalopsialit.org, pw.org, duotrope.com) failed or returned empty, and one secondary source described it as "believed to be defunct" — set aside with neither an accept nor a formal reject, insufficient evidence either way.

**4. Chemistry- or CS-specific journal — CS FOUND, chemistry confirmed NOT FOUND.**
**International Journal of Secondary Computing and Applications Research (IJSCAR)**, ijscar.org, VERIFIED. Genuinely CS-specific (ML/AI, systems, algorithms, security, HCI — explicitly not a broad-science journal). Named Editor-in-Chief (Dr. Maria Hwang, Fashion Institute of Technology) plus four named professors at named universities (Yale, UT Tyler, Queensland University of Technology), ~30% acceptance rate, single-blind peer review by paid PhD reviewers, and a multi-year Zenodo-indexed publication history through Volume 3 (2026) — real, sustained operation. Fee is steep: **$450 USD, charged only on acceptance** (no submission fee); a 2025-cycle scholarship program offered fee relief but current-cycle terms weren't confirmed. A competing CS lead, **Journal of High School Computer Science (JHCS)**, was investigated in comparable depth (comparably rigorous submission bar, arguably more so — requires a public GitHub repo and reproducible code) but its editorial board could never be identified (/about and /editorial-board both 404'd, no named reviewer surfaced anywhere) and its fee is also substantial ($100/round, up to 3 rounds = up to $300). IJSCAR's named, verifiable editorial board made it the stronger add; JHCS was not included but is noted here in case a future reviewer wants to revisit it with better tooling. **Chemistry-specific: after 3 rounds of differently-worded searches, no dedicated chemistry-only equivalent was found** — every result was either a broad-science journal already in or adjacent to the existing corpus (JEI, NHSJS, JHSS, AJUR, AJSR, Curieux) or a general-STEM listicle. Recording this as a genuine gap in the current landscape, not a search failure.

**5. Interlochen's Blue Pencil Online — RESOLVED, rejected (currently inactive).**
Per instructions, checked `cr1_interlochen_review_eval.jsonl` first. That file evaluates **The Interlochen Review** (interlochenreview.org) — a *different* publication that happens to share the same parent institution (Interlochen Arts Academy creative writing students). It never mentions Blue Pencil Online, so it was not usable for this target, and Blue Pencil Online was independently researched per the task's fallback instruction. Directly fetched thebluepencil.submittable.com/submit: **"There are presently no open calls for submissions"** — corroborated independently by a secondary source describing it as "on indefinite hiatus from publication and/or submissions." When last active, eligibility was well-matched to high schoolers specifically ("a writer between the ages of 12 and 18 who has not yet graduated high school") — the task's age-skew concern was not the issue here, activity status was. No reopening date found anywhere. Moved to rejected (`defunct_or_dormant`) rather than accepted, since it is not currently an actionable opportunity for a student today.

## ACCEPTED COUNT (4 total)

- **VERIFIED: 2** — The Louisville Review Cornerstone, IJSCAR (both directly fetched and quoted for all material fields).
- **CANDIDATE: 2** — Student Journal of Business and Economics (key sub-pages 404'd), Young Poets Network (root domain 403'd, same pattern as Foyle in Wave 1).

## REJECTED COUNT (3 total)

1. **Young Economists Journal (youngeconomistsjournal.com)** — `unverifiable_or_misattributed`. Aggregator-claimed details could not be corroborated; likely confused with an unrelated Romanian academic journal of the same name.
2. **Nancy Thorp Poetry Contest** — `not_eligible_for_target_user`. U.S.-citizens-only plus girls-only.
3. **The Blue Pencil Online** — `defunct_or_dormant`. Confirmed via direct fetch of its own submission manager: no open calls, indefinite hiatus.

## DUPLICATE CHECK

Cross-checked all 4 accepted canonical_names and all 3 rejected names against `s7_MASTER_consolidated.jsonl` (67 names) and all other `s7a*_rejected.jsonl` / `s7b*_rejected.jsonl` files. No collisions — all 7 names are new to the corpus.

## KEY UNCERTAINTIES FOR THE NEXT REVIEWER

1. **Student Journal of Business and Economics** has no disclosed institutional affiliation (Gmail contact, San Francisco address only) — not disqualifying, but weaker legitimacy footing than IJSCAR or Whitman Journal of Psychology. Fee genuinely unknown (not assumed free) because /submit, /for-authors, and /faq all 404'd this session. Worth one more fetch attempt at the correct URL before upgrading to VERIFIED.
2. **IJSCAR's $450 acceptance fee** (and JHCS's $100-300, not included but noted) are both substantial for a Turkey-based family and should be surfaced plainly in-product, not buried — consistent with the fee-disclosure concern Wave 1 already raised for The Curieux Review, The Schola, and JSR-HS Edition.
3. **Young Poets Network's `publication_selectivity` is recorded as "open"** rather than "student_facing_selective" — the platform reads as participatory/educational ("helps young people discover new authors, techniques and ideas for writing") rather than prestige-competitive, unlike Foyle's explicit "competition" framing, but this is a judgment call a second reviewer may want to revisit once the domain block clears and the page can be read directly.
4. **Kalopsia Literary Journal** remains a genuine unknown (possibly a legitimate poetry-heavy teen venue, possibly defunct) — worth a real-browser check rather than continued automated-fetch attempts, which failed 3/3 times this session across 3 different source domains.

## WHAT THE NEXT OWNER SHOULD DO

1. Re-fetch `studentjournalofbusiness.com`'s actual submission-guidelines URL (not guessed paths) and `ypn.poetrysociety.org.uk` with an unrestricted browser to upgrade both CANDIDATEs toward VERIFIED.
2. If a second CS-specific journal is still wanted, JHCS is one editorial-board confirmation away from being addable — worth a direct human check of highschoolcomputerscience.com/editorial-board.
3. No further chemistry-specific search recommended without a materially different search strategy (e.g. direct outreach to ACS or a chemistry-education body) — three rounds of web search this session converged on the same broad-science set every time.
4. Merge these 4 records into `s7_MASTER_consolidated.jsonl` alongside the rest of S7-A2's output, following the same cross-review process already applied to the original batches (see `s7a2_S7_CROSSREVIEW.md`).
