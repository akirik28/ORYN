# Data batch — Economics / Business / Entrepreneurship

Applied 2026-08-19 to `qtcvcflzxbuagvvwahhu` via `SUPABASE_SECRET_KEY` (admin client, direct
`UPDATE` by matched `id` — same mechanism as `scripts/audit-recommendation-readiness.ts`, no new
tooling). Every fact below traces to a page fetched live this session (research agent transcripts
retained in this session's history); anything the source didn't explicitly state was left
`unknown`/unchanged, never inferred.

## Harvard Pre-Collegiate Economics Challenge (HPEC)
- Source: https://www.thehuea.org/competitions/hpec (301-redirect target of the DB's prior URL)
- organization: "Harvard Undergraduate Economics Association (HUEA)"
- verification_state: verified_current — cycle_status: date_not_announced (org's own page: "full
  2026-27 rules... will be posted when registration opens")
- fields: [economics] · location_mode: in_person · country: United States
- deadline/cost/grade/age/country-eligibility: left unknown — not published by the organizer yet

## Conrad Challenge — duplicate resolved
Two existing rows represented the same real program from two different import batches:
- `Conrad Challenge` (id `ac53340c-...`, org "Conrad Foundation", official_url
  `conradchallenge.org` — **unreachable this session**, persistent SSL error on every attempt) →
  set `status = 'disabled'`. No opportunity-level canonical/supersede column exists (only
  `universities` has one, migration 0043) — `disabled` is the existing `opportunity_status` value
  for exactly this case (AGENTS.md Phase 51), non-destructive, reversible.
- `Conrad Challenge (Space Center Houston)` (id `1f7b2e52-...`) kept as canonical, updated:
  - Source: https://conrad.spacecenter.org/ (+ /the-challenge/, /the-challenge/rules-and-regulations/)
  - organization: "Space Center Houston" · verification_state: verified_current
  - cycle_status: upcoming (Activation Stage Aug 27 - Oct 29/30, 2026 — **official pages disagree
    by one day on the exact close date**; recorded 2026-10-29, flagged medium confidence)
  - fields: [entrepreneurship, engineering, computer_science] · age 13-18 · cost: 0 (Activation
    free; Innovation Stage $499/team; financial aid available) · hybrid mode
  - citizenship_restrictions: "Open to international participants; self-verify no conflict with
    home country's laws."

## Blue Ocean Competition
- Source: https://blueoceancompetition.org/, /faq/
- organization: "Blue Ocean Student Entrepreneurs Corporation" · verified_current
- cycle_status: date_not_announced (site invites "Register for 2027", no date given)
- fields: [entrepreneurship, business] · location_mode: online
- deadline/cost: not published

## The Diamond Challenge
- Source: https://diamondchallenge.org/competition/
- organization: "Horn Entrepreneurship, University of Delaware" · verified_current ·
  cycle_status: upcoming
- fields: [entrepreneurship, business] · age 14-18 · deadline: 2027-01-14 · end_date: 2027-04-30
  (Limitless World Summit) · hybrid mode
- cost: not published (FAQ page 404s)

## Wharton Data Science Competition
- Source: https://globalyouth.wharton.upenn.edu/competitions/data-science/
- organization: "Wharton Sports Analytics and Business Initiative / Wharton Global Youth
  Program" · verified_current · cycle_status: date_not_announced (2026 registration explicitly
  closed, no 2027 date yet — site offers an interest list)
- fields: [computer_science, mathematics] · cost: 0 (explicitly free)

## Upenn Wharton Hack-AI-thon
- Source: https://ai-analytics.wharton.upenn.edu/for-students/wharton-hack-ai-thon/
- organization: "Wharton AI & Analytics Initiative, University of Pennsylvania" ·
  verified_current · cycle_status: upcoming
- fields: [artificial_intelligence, computer_science] · start_date: 2027-03-29 ·
  end_date: 2027-04-02 · hybrid mode (virtual kickoff/submission, in-person Finals)
- deadline: not published (registration opens Feb 2027, no exact date yet)

## Deliberately NOT updated this batch (genuine, source-level ambiguity — left as-is)

- **LaunchX** — official site shows two different, mutually-inconsistent deadline schedules on
  two different official pages (`/admissions` vs `/admissions/financial-awards`), one of which is
  already fully expired. Not safe to pick one without a human re-check of the live site.
- **Wharton Global Youth Program** — 2026 cycle fully closed, explicit and detailed (kept
  as-is); no 2027 information published anywhere on the site yet.
- **Young Investors Society** / **YIS Stock Pitch Competition** — kept as two separate records
  (parent org vs. specific program, consistent with how Wharton Global Youth Program / Wharton
  Data Science Competition already coexist). Stock Pitch's next-cycle deadline could not be
  confirmed: a search-engine snippet claimed Feb 21, 2027, but neither official page it cited
  actually stated that date when fetched directly (one had no year in its content, the other was
  dated April 2022). Not written.
