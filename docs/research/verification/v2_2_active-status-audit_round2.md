# Package V2-2 — round 2: two instruments, reported separately

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`

Continuing the audit of the 66 live `opportunities` rows with `status='active'` and
`cycle_status IN ('open','upcoming')`. Round 1 (`v2_2_active-status-audit_subbatch1.md`)
found a 40% confirmed-defect rate on a staleness-weighted sample and stopped per standing
instruction. Per BASORG: continue with **two instruments, never blended** — an
oldest-`updated_at`-first remediation pass (biased by design, highest student value) and
a seeded random draw for an unbiased population estimate.

**Corrected pool**: precise re-count against all 66 rows (not estimated) — 37 already
audited across both packages, 3 genuine robots.txt policy blocks not being reattempted
(Wall Street 101, Tufts, Boston University), leaving **26 truly untouched**. Random draw
(seed `2026082202`, distinct from the DLOPP package's seed) and the next
oldest-`updated_at` 15 together cover 21 of those 26 (6 landed in both by chance —
reported under both instruments, not double-counted in spirit). 5 rows remain in neither
instrument this round (listed at the end).

Method unchanged: robots.txt fetched and evaluated as its own step before any other
request to that host (per the standing rule this org adopted today), direct fetch first,
rendered browser on tooling-level bot-detection (clean robots.txt), genuine policy blocks
and active Cloudflare-style challenges deferred outright, never solved or routed around.

## Instrument 1 — random draw (n=12, seed 2026082202): the population estimate

| Row | Claimed | Verdict | Evidence |
|---|---|---|---|
| International Journal of High School Research (IJHSR) | `open`, rolling | **CLEAN** | "There is no deadline for submission for any issue... accepts submissions all year long without a deadline." — exact |
| International Young Physicists' Tournament (IYPT) | `upcoming`, 40th, Auckland Jul 5-12 2027 | **CLEAN** | "Dates of the 40th IYPT in Auckland, New Zealand: 5th of July to the 12th of July 2027" — exact |
| Inspirit AI Scholars Live Online | `upcoming`, Fall deadline Sep 1 2026 / Winter Oct 1 2026 | **CLEAN** | "Fall 2026: September 1, 2026 / Winter 2026: October 1, 2026" — exact |
| Schoolhouse.world Tutor Certification | `open`, rolling | **CLEAN** | Live, functioning certification module list, no dates anywhere — via rendered browser (curl 403, clean robots.txt, tooling-level) |
| Tisch Summer High School | `open`, deadline 2026-12-01, 2027 | **CLEAN** | Linked Admissions Calendar sub-page: "SUMMER HIGH SCHOOL RESIDENTIAL PROGRAM 2027 / APPLICATION LIVE Wednesday, July 1, 2026 / APPLICATION DEADLINE Tuesday, December 1, 2026" — exact |
| Girl Up Club (found and lead a chapter) | `open`, ongoing | **CLEAN** | "Start a Girl Up Club — Gather a team and join a network of 7,850+ clubs... REGISTER" — no close date; source_url loads fine (the application-portal subdomain, `clubs.girlup.org`, timed out completely on both curl and a rendered browser — a connectivity issue distinct from a policy or bot-detection block, noted for a future retry, not counted as a defect) |
| İBB Genç Gönüllü Programı | `open`, "6. Dönem" | **CLEAN** | Actual application page: "İBB Genç Gönüllü 6. Dönem Başvuru Formu" — exact |
| İstanbul Kent Konseyi Gençlik Meclisi | `open`, form live, birth-year dropdown from 2010 | **CLEAN** | Dropdown starts exactly at 2010 — exact |
| **UNO (United Nations Online, stanleyprep.com)** | `open`, "rolling, deadlines vary by cohort" | **DEFECT** | Every cohort-specific mention on the page — 3 repeated application-step blocks plus a standalone reference — names only **"Spring 2026,"** a cohort that already concluded; zero mention of Fall 2026, Winter 2026, or any 2027 cohort anywhere. Same shape as round 1's staleness cluster: a rolling-admission claim resting on a page that hasn't been updated past its most recent already-elapsed cohort. |
| InvestIN — Immersive Career Experiences | `open`, "rolling, no formal deadline by design" | **INCONCLUSIVE** | The `source_url` (a Shopify collection/category index) is pure navigation — 373KB of HTML, zero date or deadline language anywhere. Can't confirm or contradict from this page; the claim likely rests on individual programme sub-pages this URL doesn't reach. |
| JA Company Programme (Europe) | `upcoming`, "running, ongoing" | **INCONCLUSIVE** | Page is a generic programme-overview (811 words); "for one academic year" describes programme *duration*, not registration timing. No registration/cycle language found. |
| Young Enterprise Company Programme | `upcoming`, "Sept-March launch window" | **INCONCLUSIVE** | "Register" button live, durational description present ("12 weeks up to one academic year"), but the specific Sept-March window isn't stated on this page. Weak, non-dispositive staleness hint: page footer reads "© 2025." |

**Random instrument result: 8 clean, 1 confirmed defect, 3 inconclusive (source silent —
neither confirmed nor contradicted, per the 120-Hours convention: silence isn't evidence
of wrongness). Confirmed-defect rate: 1/12 = 8.3%.**

This is the number that matters for your escalation shape: **far closer to the ~10%
"staleness tail" scenario than the ~40% "corpus-wide freshness failure" scenario.** The
inconclusive 3 could in principle hide more defects if I chased down deeper pages for
each — I'm not doing that unprompted since it would turn an unbiased population estimate
into a directed one, exactly the conflation you asked me to avoid. Flagging it as a real
limit on this instrument's precision, not rounding it away.

## Instrument 2 — remediation pass (oldest-`updated_at`-first, biased by design)

| Row | Claimed | Verdict | Evidence |
|---|---|---|---|
| Tisch Summer High School | (see above) | **CLEAN** | (shared with random draw) |
| UWC Short Courses | `open`, dozens of courses live, several through Dec 2026 | **CLEAN** | Live course directory via rendered browser (curl 403, clean robots.txt): "Online: Write Women's Worlds / 5th Sep – 5th Dec 2026," several more running into Q4 2026 — exact |
| Science Olympiad (Division C) | `upcoming`, 43rd season, rules released Sep 8 2026 | **CLEAN** | "Countdown to the 43rd Science Olympiad Season!... 2027 Rules available as free PDFs Tuesday, 9/8/26!" — exact |
| **Interlochen Arts Camp** | `upcoming`, deadline 2027-01-15 | **DEFECT** | The page's entire "Admission Deadlines and Dates" section is headed **"Key dates for Camp 2026"** — Priority Application Deadline "Jan. 15" (already passed) and every camp session date falls in already-elapsed Summer 2026 (June 20 – Aug 9). Zero mention of "2027" anywhere on the page. Same shape as Ron Brown: the live 2027-01-15 deadline is a reasonable same-day-next-year projection from an annual pattern, not a date the source currently states. |
| International Journal of High School Research (IJHSR) | (see above) | **CLEAN** | (shared with random draw) |
| Journal of Research High School (JRHS) | `open`, rolling | **CLEAN** | "publishes as a rolling base... published immediately once approved" — exact |
| InvestIN | (see above) | **INCONCLUSIVE** | (shared with random draw) |
| Alpha Leo Club (Lions Clubs International) | `open`, ongoing | **CLEAN** | Via `about-leos` (rendered browser): "use our Club Locator to find a local Leo club" / "Visit the Start a Leo Club page" — no dates anywhere. **Process note**: the specific `start-a-leo-club` sub-page hit an active Cloudflare "Just a moment..." interstitial on the same domain — genuine shape-3 per the new rule, deferred outright, not solved or retried; verdict rests on the sibling page's content instead, which loaded cleanly. |
| İBB Genç Gönüllü Programı | (see above) | **CLEAN** | (shared with random draw) |
| Rotary Interact Club | `open`, ongoing | **CLEAN** | Structurally an evergreen "check with your school or a local Rotary club" join model; thorough page has zero dates/cycles anywhere, consistent with (not merely silent on) an ongoing model |
| The Duke of Edinburgh's International Award — Türkiye | `open`, operating since 1 June 2013 | **CLEAN** | "Since the 1st of June 2013, the Award has been delivered under... TİKAV... sole National Authority" — exact |
| Gençlik Merkezleri (Youth Centres) — e-Genç | `open`, continuous | **CLEAN** | "YENİ BAŞVURU" (new application) live and prominent; FAQ confirms the portal handles registration on an ongoing basis |
| Girl Up Club | (see above) | **CLEAN** | (shared with random draw) |
| İstanbul Kent Konseyi Gençlik Meclisi | (see above) | **CLEAN** | (shared with random draw) |
| Coursera | `open`, rolling | **CLEAN** | "Join for Free" evergreen throughout, zero dates/cycles anywhere — exact |

**Remediation instrument result: 13 clean, 1 confirmed defect, 1 inconclusive.
Confirmed-defect rate: 1/15 = 6.7%.**

**This is a meaningful shift from round 1's 40%.** Round 1 swept the very oldest tier
(`updated_at` 2026-08-17/18) and found the staleness cluster concentrated there. This
round's tier (2026-08-20/21) is markedly healthier — one defect (Interlochen, same
shape as before) against fourteen clean or inconclusive. That's consistent with the
staleness problem being **front-loaded into a specific older batch rather than spread
evenly across the whole corpus** — which, combined with the random instrument's 8.3%,
points toward the staleness-tail read rather than a corpus-wide failure, though two
data points is not a lot to hang a firm conclusion on.

## Rows in neither instrument this round (5, untouched)

Geleceği Eşitle, CyberPatriot, NFTE Youth Entrepreneurship Showcase Series, The Concord
Review - Emerson Prize, THIMUN The Hague Conference — plus the 3 known-blocked
(Wall Street 101, Tufts, Boston University). **8 of 66 remain outside any instrument.**

## Running total across both packages

37 (DLOPP overlap + round-1 fresh) + 21 (this round, union of both instruments) = **58
of 66 rows now have a verdict.** 8 remain: 5 untouched, 3 genuinely blocked.

## Recommendation

The random instrument's 8.3% is the number to escalate on, not round 1's 40% — that was
always going to be the point of running it. Two new confirmed defects, both the same
shape as the pattern already named (a page whose only concrete dates describe an
already-elapsed cycle: UNO/stanleyprep and Interlochen), and Interlochen specifically
carries the same "well-reasoned-projection-is-still-a-projection" issue just ruled on for
Ron Brown — flagging it as a second instance of that exact class for RES-I2's
monotonicity guard, not something I'm resolving unilaterally.

Holding here again rather than continuing unprompted through the final 8 — small enough
that a single short pass would finish the package, but that's your call given the shape
of what's left (2 already-classified blocks, 3 tiny/thin remainders, and Girl Up's
`clubs.girlup.org` connectivity retry).
