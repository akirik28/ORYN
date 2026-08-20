# Data batch — research/internship/fellowship enrichment + TechGirls dedup

Applied 2026-08-20 to `qtcvcflzxbuagvvwahhu`. Scope: the 7 usable (`status=active` AND
`verification_state=verified_current`) opportunities in ORYN's thinnest counselor-relevant
categories (research, internship, fellowship, entrepreneurship — volunteering has **zero**
usable rows today, see `docs/current-state.md`). Only fields that already exist on the live
schema were written; one finding (TechGirls' confirmed citizenship list) is recorded here for
`eligible_citizenships` (migration 0047) to be applied once that migration is live.

## Applied

- **TechGirls**: age 15-17, `cycle_status: date_not_announced`. Official source
  (`techgirlsglobal.org/apply/`) explicitly confirms 2026-cycle eligibility: "be citizens and
  current residents of 2026 participating countries (including Turkiye)" — a real, structured,
  unambiguous citizenship list (37 countries + US), the first genuinely clean candidate for
  the new `eligible_citizenships` column. **Staged, not yet written** — column doesn't exist
  live until migration 0047 applies:
  `["United States","Turkey","Cameroon","Kenya","Nigeria","Rwanda","South Africa","Zambia","Cambodia","Fiji","Indonesia","Mongolia","Taiwan","Vietnam","Albania","Cyprus","Greece","Kosovo","Montenegro","Algeria","Egypt","Jordan","Lebanon","Morocco","Palestinian Territories","Tunisia","Kazakhstan","Kyrgyzstan","Pakistan","Tajikistan","Turkmenistan","Uzbekistan","Argentina","Brazil","Costa Rica","Ecuador","Panama","Peru","Suriname"]`
  (37 non-US countries per the official region breakdown, exact list from the source, not
  independently re-verified against the current published roster beyond what was fetched).
- **TechGirls — duplicate resolved**: a second row, "TechGirls (w Virginia Tech University)
  2026" (`58d2e707-...`), was the same real program under a cycle-specific title, same
  official domain, `under_review`+`unverified`. Its richer content (the specific `/apply/`
  URL, the 2026-cycle citizenship confirmation) was merged onto the canonical
  `verified_current` row (`7081b03a-...`) before disabling the duplicate.
- **Özyeğin University Summer Research Program**: `cost: 0`, `funding_available: true`
  (official page: "All of our summer research programs are free," free housing/meals
  included), `cycle_status: date_not_announced`. Grade eligibility ("all high school levels
  can apply") not written to `eligible_grades` — no clean US-grade-number mapping confirmed
  for a Turkish-curriculum framing, left unset rather than guessed.
- **InvestIN - Immersive Career Experiences**: age 12-18 (site: "ages 15-18" for the main
  programmes, a separate "Career Discovery programme" for "ages 12-14" — recorded as the
  union range across InvestIN's offerings generally, not one specific programme).
  `cycle_status: date_not_announced`.
- **BRI Student Fellowship**: age 15-18 (site: "open to 15-18 year old's who are currently
  Juniors or Seniors"). `cycle_status: date_not_announced` — the only confirmed application
  window found, "October 15-November 30," was explicitly labeled the "2025-2026" cycle (i.e.
  Oct-Nov 2025, already elapsed as of this session); not copied forward as a 2026-2027 date.

## Deliberately not updated — official pages didn't surface deadline/eligibility on the fetched page

- **SIP (Science Internship Program), UC Santa Cruz** — deadline/eligibility live on
  `sip.ucsc.edu/applying-to-sip/`, not the homepage fetched this session; not followed up
  within this pass.
- **Pioneer Research Institute** — cost/deadline/eligibility gated behind an interest-form/
  info-session flow, not published as static page content.
- **LaunchX** — re-checked (already flagged as ambiguous in
  `2026-08-19-economics-business.md`): still no deadline/eligibility on the fetched page;
  deadline/cost live on separate `/admissions/*` pages not fetched this session. Left
  untouched, consistent with the earlier batch's decision.

## Coverage note

This batch closes real gaps but the category-depth targets in the sprint prompt (35-50
research / 20-30 internship / 20 volunteering opportunities) were **not** attempted at that
scale this session — each new record needs the same per-source research rigor as every batch
in this directory, and fabricating count without it would violate the product's own data
rules. See the session's completion report for the honest current count and this as the
top-ranked next action.
