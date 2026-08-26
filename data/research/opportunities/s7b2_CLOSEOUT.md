# S7-B2 Closeout — Online / Year-Round Academic / Turkey-Based-International-Relevance

**Lane:** S7-B2 (sub-agent under "S7 — Other High-Value Turkey-Accessible Opportunities")
**Scope:** year-round academic programs, online programs, online mentorship, and
Türkiye-based opportunities with credible international relevance.
**Date:** 2026-08-26

## STATUS

Complete. Research budget exhausted responsibly (WebSearch hit its 200-call session cap;
many WebFetch calls to official sites returned 403/socket errors, especially cty.jhu.edu,
athenasacademy.com, artofproblemsolving.com, m3challenge.siam.org, usaco.org subpages).
Stopped adding candidates once the remaining leads were either genuinely redundant with
ORYN's existing (very extensive) research corpus, ineligible for a Turkey-based student, or
below this category's substantive-output bar — rather than padding the accepted batch.

## PRODUCTION-READY COUNT

**0 formally "PRODUCTION_READY"** — that status is explicitly reserved for after a second
reviewer cross-checks (per the task brief). Of the 9 accepted candidates, **6 are
`verification_state: VERIFIED`** in the sense defined for this task (a directly-fetched
official provider page supports every material field): TKS, picoCTF, Science Mentorship
Institute (sci-MI), Northwestern CTD Online Learning, Türkiye Ekonomi Olimpiyatları (TEO),
and WRO Türkiye. These are the closest to reviewer-ready.

## CANDIDATE COUNT

**3** records are `verification_state: CANDIDATE` (real and substantive, but at least one
material field — usually international-access confirmation or current-cycle specifics —
relies on strong secondary corroboration rather than a second official-page fetch, because
the official source blocked WebFetch or was otherwise inaccessible this pass): USA Computing
Olympiad (USACO), Johns Hopkins CTY Online Programs, and the Turkish National Linguistics
Olympiad (Ulusal Linguistik Olimpiyatı). Each has a specific, actionable note on exactly what
a reviewer should re-check.

## REJECTED COUNT

**17** records in `s7b2_rejected.jsonl`, split roughly into four reasons:
- **Ineligible for a Turkey-based student** (4): AI4ALL Ignite (wrong level + US-only),
  MIT PRIMES Circle (Boston-commuting-distance only), NASA SEES (US citizens only),
  National History Day (no confirmed Turkey affiliate).
- **Quality/integrity concerns** (3): Scholar Launch (ProPublica-documented undisclosed
  conflict of interest — founded its own "peer-reviewed" journal without disclosure),
  Harvard Medical School Pre-College Online (open enrollment, certificate-only output —
  the exact "prestigious brand, no real selection or output" pattern this task warned
  against), Bebras Turkey (legitimate but a single 45-minute multiple-choice test with no
  project/output — fails this category's substantive-output bar).
- **Redundant with ORYN's existing coverage** (3): Cambridge Centre for International
  Research / CCIR and Veritas AI (both duplicate niches ORYN's live DB already covers —
  Polygence/Lumiere/Pioneer for general paid research mentorship, Inspirit AI for
  AI-specific paid research mentorship), FIRST LEGO League Turkey (same organizer as WRO
  Türkiye but a worse age fit for 14-18).
- **Not program-shaped or unverifiable this pass** (7): Kaggle and Zooniverse (real
  substance but don't fit the "opportunity with eligibility/deadline/application" shape, or
  are structurally passive for a typical participant); Athena's Advanced Academy, AoPS
  Online School, Girls Go CyberStart, TREES, and M3 Challenge (access/search-budget blocked
  this pass, not rejected on the merits — each has a specific retry note).

## UNCLEAR COUNT

**0** left fully unresolved — every candidate that reached a written record was placed into
either the accepted batch (with VERIFIED or CANDIDATE status) or the rejected file (with a
specific reason code), so nothing was left in limbo. Within the accepted batch, 3 records
carry genuine unresolved sub-fields (see CANDIDATE COUNT above and each record's
`notes_uncertainties`).

## KEY GAPS

1. **The "paid research-mentorship-for-publication" niche is already saturated in ORYN's
   DB** (Polygence, Lumiere, Pioneer, Inspirit AI) and has documented industry-wide quality
   problems (see ProPublica's investigation, cited in the Scholar Launch and CCIR rejected
   entries). This lane deliberately did not add a 5th/6th company in this niche rather than
   pad the count — if the ingestion lane disagrees with that judgment call, CCIR is the most
   defensible one to reconsider (real disclaimer of non-affiliation with Cambridge
   University already on file, <20% acceptance, cost/eligibility partially verified).
2. **Turkey-based-international-relevance coverage is thinner than the West-side online
   coverage** (3 of 9 accepted: TEO, Ulusal Linguistik Olimpiyatı, WRO Türkiye). TÜBİTAK's
   own science-olympiad umbrella (2202, confirmed to cover Math/Geography/CS/Physics/
   Chemistry/Astronomy-Astrophysics/Biology) and TEKNOFEST are already well covered by prior
   research in this worktree (see `turkey_batch2_2026-08-21.jsonl`), which is why this lane's
   two Turkey-based finds are deliberately in adjacent niches (Economics, Linguistics) that
   TÜBİTAK's own site confirmed it does NOT cover.
3. **Three strong-looking candidates could not be verified due to tooling access issues, not
   substantive concerns**: Art of Problem Solving (AoPS) Online School, Athena's Advanced
   Academy, and M3 Challenge all returned HTTP 403 on every WebFetch attempt against their
   official domains. AoPS in particular looks like a strong, legitimate, internationally-used
   candidate structurally similar to the two accepted university online-course programs (JHU
   CTY, Northwestern CTD) — worth a priority retry.

## KEY UNCERTAINTIES

- **USACO's international-access claim** is corroborated by 4+ independent secondary
  sources but was not itself found verbatim on a directly-fetched official usaco.org page
  this pass (the site returned intermittent socket errors on FAQ/eligibility subpages after
  the About page succeeded). This is a very well-known, low-risk fact in the competitive
  programming community — a single successful re-fetch should be enough to flip it to
  VERIFIED.
- **CTY Online's cost and international-fee/no-financial-aid details** rely on secondary
  sources (PrepScholar, Institute for Educational Advancement) because cty.jhu.edu blocked
  WebFetch on its admissions/eligibility subpages (only the online-programming overview page
  succeeded).
- **The Turkish National Linguistics Olympiad's current-cycle mechanics** (deadline, cost,
  exact eligibility) could not be confirmed because the Turkish committee's own page
  (linguisticturkey.wordpress.com) returned HTTP 403. Its existence and continued activity
  (Turkey competed as recently as 2026) is solidly confirmed via the official international
  body's site (ioling.org) instead.
- **TEO's cost/fee** was not found on turkecon.com (the domain that did resolve); the
  alternate domain turkecon.org repeatedly failed to fetch and may carry different/more
  complete information.
- **WRO Türkiye's registration fee and exact regional-heat dates** are stated by the
  official site to live in a separate "katılım şartnamesi" (participation-terms) PDF/page
  that was not retrieved this pass.
- **This worktree's `data/research/opportunities/` directory already contains ~200+
  distinct opportunity titles referenced across `dlopp_*`/`ecw*_*` DB-audit files** (files
  that reference live `opportunity_id` UUIDs, meaning they are already in ORYN's production
  database, not just proposals). A very large share of this lane's natural first-instinct
  candidate list (Polygence, Lumiere, Pioneer Research Institute, MIT PRIMES, Technovation,
  Johns Hopkins CTY Summer/Residential, Duke Pre-College, Inspirit AI, Girls Who Code,
  Northwestern CTD summer camps, TEKNOFEST UAV/Tech-for-Humanity/Rocket, TÜBİTAK 2202/2204,
  iGEM, Zero Robotics, and more) turned out to already be live before any external research
  began — this is the main reason the accepted count (9) is well under this task's 30-40
  target. This was verified by grepping every existing `.jsonl` file in the directory for
  each candidate name before researching it externally (see method note below), not assumed.

## WHAT THE NEXT OWNER SHOULD DO

1. **Quick wins (single re-fetch likely to flip CANDIDATE → VERIFIED):** retry
   `usaco.org` FAQ/eligibility pages, `cty.jhu.edu/get-started` and
   `cty.jhu.edu/admissions`, and `linguisticturkey.wordpress.com` (all 403'd or errored in
   this pass, possibly transient bot-blocks rather than permanent).
2. **Priority retry candidates from the rejected file** (access-blocked, not merits-rejected):
   Art of Problem Solving Online School (`artofproblemsolving.com`), Athena's Advanced
   Academy (`athenasacademy.com`), M3 Challenge (`m3challenge.siam.org`), TREES (needs a
   fresh web search to find the correct official domain — a guessed one had an SSL error).
3. **Before ingesting, re-run the same grep-against-existing-files dedup check** this lane
   used (`grep -l "<candidate name>" data/research/opportunities/*.jsonl`) against whatever
   the other three S7 sub-agents (S7-A1, S7-A2, S7-B1) produced, since this lane could not
   see their in-progress output and file-prefix isolation only prevents overwrite, not
   semantic duplication (e.g., confirm S7-B1's leadership/fellowship candidates don't overlap
   the "online mentorship" framing used here).
4. **Decide the CCIR question** (see KEY GAPS #1) — add it as a 4th paid-research-mentorship
   company, or leave ORYN's coverage of that niche at 3 (Polygence/Lumiere/Pioneer) +1
   AI-specific (Inspirit AI). This lane's default was "leave it," but it's a judgment call
   the ingestion lane may want to revisit.
5. **Note for the DENEYAP Teknoloji Atölyeleri record already sitting in
   `thincat_academic_program_2026-08-21.jsonl`** (VERIFIED_CURRENT, Turkey-based, free,
   36-month nationwide tech-education program) — this lane did not duplicate it since it was
   already thoroughly researched, but flags it here as a strong Turkey-based candidate the
   ingestion lane should pull from that file rather than mine. Its own notes flag that only
   the "lise hazırlık" and grade-9 tracks fall inside the 14-18 band and that a residency
   restriction is plausible but unconfirmed.
6. **sci-MI's seasonal framing** — the official 2026 page frames all five tracks as
   "summer-long," which creates a possible cross-lane overlap with whichever sibling lane
   covers pure summer programs. Recommend a quick check that it wasn't also captured there
   before final ingestion.

## METHOD NOTE (for transparency)

Before any external research, this lane grepped every `.jsonl`/`.md` file already present in
`data/research/opportunities/` (all committed to the repo as of this worktree's branch point,
`origin/main@f7af914`) for each candidate name, and specifically identified files containing
literal `"opportunity_id"` fields (25 files, referencing 203 unique `opportunity_title`
values) as live-database audit dumps rather than mere proposals. This is why several
initially-promising ideas (Polygence, Lumiere, Pioneer, MIT PRIMES, Technovation, CTY
Summer/Residential, Duke Pre-College, Northwestern CTD summer camps, TEKNOFEST UAV/Tech-for-
Humanity/Rocket, TÜBİTAK 2202/2204-A/B/C/D, iGEM, Girls Who Code, Inspirit AI) were dropped
before any WebSearch/WebFetch budget was spent on them. All 9 accepted records and all 17
rejected records in this closeout were confirmed absent from that existing corpus before
being researched externally.
