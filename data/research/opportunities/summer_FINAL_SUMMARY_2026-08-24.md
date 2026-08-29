# ORYN-RESEARCH-SUMMER — session wrap-up, 2026-08-24

Written at 14:31 after a priority check-in with CEO: founder is now active, merged the UI redesign
branch, and has moved team attention to "Gate 2" (AI counselor quality — not opportunities breadth).
This closes out the overnight/day research run cleanly rather than continuing to generate more raw
findings against a lower-priority lane right now. Everything below is dry-run only — no production
writes came from this lane; CEO/DATA wrote the subset of proposals below that they independently
verified.

## Headline numbers

- **394** findings (`summer_findings_2026-08-23.jsonl`) — Workstream A, selective summer programs
- **46** online-credential findings (`summer_findings_online_2026-08-23.jsonl`) — Workstream B
- **211** row-level proposals (`summer_proposals_dryrun_2026-08-23.jsonl`) — dry-run, unwritten unless
  CEO separately confirmed a write in our cross-session log
- Corpus coverage: essentially complete first-pass on both the `active` (150 rows) and `under_review`
  (90 rows) summer_program buckets, confirmed by two full coverage sweeps (not just claimed) — the
  first sweep's own false-negative rate is on record in `CHECKPOINT.md` so the "complete" claim is
  checkable, not asserted

## What's actually ready to act on

The 211 proposals are a real, usable asset, not a raw dump. They break down roughly into:

1. **Clean tier/cost fills** — a row had no `selectivity_tier`/`cost`, direct-fetch evidence closes
   it (e.g. UPenn ESAP, USC, MathILy-Er, Andover, Columbia NYC Residential, Wharton Pre-baccalaureate,
   Kode With Klossy, UCSD FUTURES). These are the highest-confidence, lowest-risk writes.
2. **URL fixes** — `official_url` pointed at unrelated content (faculty CV PDFs, wrong institutions,
   a bachelor's-degree event page); the correct page was found and dedup-checked before proposing.
   `summer_url_fix_review_2026-08-24.md` has the full batch, bucketed by risk.
2a. Downing College is the cleanest recent example: bare-homepage URL → real Specialist Programme page
    (GBP 9,000, real interview-based selection), dedup-checked first.
3. **Retirements / dedup fixes** — exact-duplicate rows (SSTP, Duke TIP, a self-caught IE University
   near-duplicate that was withdrawn before it reached CEO) and rows that are the wrong *kind* entirely
   (UWC Türkiye, several Turkish "winter camp" rows filed under summer_program).
4. **Deliberate non-writes** — real evidence found, but a single value would misrepresent the fact
   (price ladders like Harvard SSP/Terp/Andover/Emory/Polygence; the Sabancı/KUSRP "participation
   certificate" cluster where I corrected my own earlier framing rather than assert selectivity that
   isn't there).
5. **Judgment-call flags, not proposals** — e.g. Leangap's tier (capacity-sold-out vs. a soft
   personality screen — presented both readings, didn't pick one), the IE University tier tension
   (fresh evidence vs. an existing verified_current value — flagged, not overridden).

**Known gap in my own process, named honestly**: at least 4 fully-resolved findings sat unfiled as
proposals until a late-session audit caught them (Vanderbilt PTY, IE JAB, Wharton FBW, Emory, plus
XLAB caught in this final pass). Worth one more sweep of `findings.jsonl` for the same pattern before
anyone treats "211 proposals" as the complete set of what's resolved — the SQL/script for that audit
is simple and reusable, described in the `CHECKPOINT.md` entry at ~04:38-04:42.

## The findings worth the founder's/DATA's attention beyond any single row

- **`summer_schema_and_pipeline_gaps_2026-08-24.md`** — the actual leverage document. 12+ schema gaps
  (no currency column, no price-ladder representation, no deadline_mode, no way to express a financial-
  aid-only restriction vs. a participation bar, no field for a structural access barrier like "invited
  schools only") and pipeline defects, each with 2-3 *named, live* examples, not theory. The
  URL-fine/description-stale defect alone was confirmed 3 independent times tonight (Oxford Royale,
  Summer Discovery, USC) — strong enough to be worth a real re-extraction script, not one-off fixes.
- **The umbrella-row problem** (documented mid-session) is probably the single highest-leverage
  structural finding: ~20 cases where one DB row stands for a family of programs with genuinely
  different ages/prices/deadlines/geography (MIT PRIMES spans Ukraine-only, nationally-selected, and
  Greater-Boston-only sub-programs under one row). Several other findings tonight (price ladders,
  Georgetown's self-contradicting cycle_status) are really this same root cause.
- **Turkish "winter camp" miscategorization** — 5 confirmed instances of a Kış (winter) program
  sitting in `category=summer_program`. Real, repeatable, not isolated typos.
- **Girls Who Code's likely product change** — the org's flagship summer offering (Summer Immersion
  Program) appears discontinued after 2025; current live offerings don't cleanly fit this category.
  Row is dormant/0-reach so zero urgency, but worth knowing before anyone repromotes it.
- **KVKK/consent-age table** (Workstream B) — Turkey uniquely has no self-consent age at all for
  minors under 18, unlike GDPR members which range 13-16. A product/policy question, not a per-row
  fix — CEO already flagged this for the founder's own review.
- **TOEFL iBT vs IELTS Online asymmetry** — TOEFL has no age wall at all; IELTS Online is a hard 18+
  wall. For a 14-18 product this is a genuinely actionable fact if ORYN ever recommends a specific
  English test to a student.

## What's still genuinely open (not for lack of trying)

- IELTS paper/computer under-16 policy — real, repeated attempts, no ielts.org primary source ever
  reachable; 3 independent secondary sources converge but that's not being treated as verified.
- UCAS Tariff point values — the correct primary source was found, but the actual numbers are
  PDF-only and this session had no working PDF-text-extraction tool all night.
- A handful of "real but thin" rows where a cost or exact mechanism was chased across 2-3 real
  attempts and genuinely isn't published (Lumiere Education, John Locke's base tuition, IE University
  JAB's exact cost — all recorded with honest confidence levels, not guessed).

## Where everything lives

Scratchpad (session-local): `/private/tmp/claude-501/.../scratchpad/summer/`
Repo mirror (durable): `/Users/adasarpkirik/Desktop/Founder/ORYN/data/research/opportunities/`
Start with `summer_CHECKPOINT_2026-08-23.md` for the full narrated log if more detail than this
summary is ever needed — every claim above traces back to a specific dated entry there, and from
there to a verbatim-quoted `findings.jsonl` entry.
