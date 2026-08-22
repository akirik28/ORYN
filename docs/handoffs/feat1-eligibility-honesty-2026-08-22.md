# Handoff: FEAT-1 Package 1 — honest eligibility copy for unverified `eligible_countries`

STATUS:
COMPLETE. Branch `oryn/feat1-eligibility-honesty`, PR open to `main` (never merged by this
lane). Full gate green: lint clean, typecheck clean, 121 test files / 1,835 tests (+11 new
over this branch's own 1,824 baseline), `npm run build` succeeds. Migration 0060 written,
**NOT applied** to the live DB.

THE DEFECT (strategy priority #1, verified in code before designing):
`opportunities.eligible_countries` is empty on ~352/391 live rows, and both eligibility
read paths — `lib/opportunities/matching.ts` `computeEligibility()` and
`lib/counselor/eligibility.ts` `evaluateOpportunityEligibility()` — skipped the country
check entirely for an empty array. Since empty overwhelmingly means "nobody researched
this yet" (not "confirmed open"), a genuinely restricted program with unresearched data
rendered as eligible to every student with zero warning. Violates AGENTS.md Phase 68,
Rule 4, and non-negotiable #5. Source finding:
`docs/handoffs/opportunities-eligible-countries-gap.md` Key Finding 1.

DESIGN SHIPPED (full reasoning in `docs/product-decisions.md`, "FEAT-1 Package 1" entry):

The smallest change honest in BOTH directions — a tri-state completed by one boolean:

| Row state | Behavior (both call sites) |
|---|---|
| `eligible_countries` populated | Unchanged — the existing hard check runs. |
| empty + `country_eligibility_confirmed_open = true` | Silence, honestly earned — research confirmed open worldwide. |
| empty + not confirmed + no other eligibility signal | Advisory unknown-note: matching.ts pushes "Country eligibility not verified yet — check the official page for restrictions." (existing `unknownNotes` pattern, `eligible` stays `true`); counselor pushes "Country eligibility hasn't been verified for this opportunity yet — check the official page for restrictions." (existing advisory-notes pattern → verdict `unknown`, never `known_ineligible`). |
| empty + not confirmed, but a structured citizenship list or citizenship/residency prose exists | No new note — the row WAS researched; its own restriction evidence already surfaces (citizenship check / prose advisory notes / the detail page's "Eligibility notes" section), and "not verified" would be false for it. |

Key properties:
- **No rows marked ineligible.** The note is advisory only; absence of research is never
  treated as evidence of a restriction.
- **No migration required for the behavior.** Both call sites read
  `country_eligibility_confirmed_open ?? false` (the 0047 `eligible_citizenships`
  precedent), so every environment behaves identically — and honestly — whether or not
  0060 is applied. Unapplied-0060 environments simply have no way to record a
  confirmation yet.
- **Existing UI plumbing renders it end-to-end with zero UI changes**: the opportunity
  card (`features/opportunities/opportunity-card.tsx`) and detail page
  (`app/(app)/opportunities/[id]/page.tsx`) already show an "Eligibility unknown" warning
  badge + the note text whenever `eligible && eligibility_notes`; the counselor's
  `lib/counselor/evidence.ts` already surfaces `unknown`-verdict notes as warnings.
- **Deliberate, accepted consequence**: most opportunity cards now carry the badge, and
  most counselor opportunity candidates carry verdict `unknown` (which already
  down-weights the data-quality score component ×0.6 in `lib/counselor/scoring.ts`).
  That is the honest state of today's catalogue, and it converges back to silence exactly
  as fast as research fills in `eligible_countries` or the confirmed-open marker.

MIGRATION 0060 (`supabase/migrations/0060_opportunity_country_eligibility_confirmed_open.sql`):
- **NOT applied. Do not apply as a side effect of anything else.** Numbering checked
  against both the live migration list (read-only Supabase MCP against
  `qtcvcflzxbuagvvwahhu`, 2026-08-22: live DB ends at 0056 `requirement_shape_
  representability`; 0057/0058/0059 are written-unapplied on `main`) and
  `docs/ORYN_WORKSTREAMS.md`'s numbering notes. The migration-number collision-guard test
  (`__tests__/social/posts-schema.test.ts`) bumped to 0060 per its own instruction.
- Adds `opportunities.country_eligibility_confirmed_open boolean not null default false`
  plus a CHECK that a row can't claim confirmed-open while carrying a structured
  country/citizenship restriction.
- Contains **no data backfill**, deliberately: the rows a research pass confirmed open
  (see `docs/research/opportunities-eligible-countries/README.md` — ~5 confirmed-open
  rows from Step 2, e.g. the Diamond Challenge pair) should be flagged by the research
  org / coordinator with per-row evidence, not asserted wholesale by DDL.

FILES TOUCHED:
- `supabase/migrations/0060_opportunity_country_eligibility_confirmed_open.sql` (new, unapplied)
- `types/database.ts` (field + Insert-defaultable list — the repo's convention for
  designed-but-unapplied migrations, per 0057/0059 precedent)
- `lib/opportunities/matching.ts` (two optional `OpportunityForMatching` inputs + the rule)
- `lib/counselor/eligibility.ts` (the rule, extending the existing advisory-notes pattern)
- `lib/opportunities/persist-matches.ts` (passes the two new inputs from the row)
- `lib/dev/fixtures.ts` (fixture 1 confirmed-open — matches its own "worldwide"
  description; fixture 2 deliberately unconfirmed so dev preview exercises the note)
- Tests: `__tests__/opportunities/matching.test.ts` (+6), `__tests__/counselor/
  eligibility.test.ts` (+5, and 3 existing "fully known row" tests now set confirmed-open
  explicitly), `__tests__/counselor/dashboard-contract.test.ts` (1 fixture),
  `__tests__/social/posts-schema.test.ts` (guard bump), plus the mechanical
  new-required-field addition to every full-`Opportunity` test fixture (9 files).
- `docs/product-decisions.md` (decision entry), `docs/ORYN_WORKSTREAMS.md` (lane row).

WHAT THIS LANE DID NOT DO (and who should):
1. **Apply 0060** — founder/coordinator decision, flagged in the PR body.
2. **Backfill confirmed-open rows** — research org (RES-R3 / opportunities ingester),
   per-row with evidence, once 0060 is applied. Until then the handful of genuinely
   confirmed-open rows carry the same "not verified" note as everyone else — a small,
   known, self-correcting dishonesty in the cautious direction.
3. **Intake-time capture**: `lib/ai/opportunity-extraction.ts` / the discovery pipeline
   could set the marker at ingestion when an official source explicitly states "open to
   students worldwide" — worth a future package, not started here (data-acquisition
   territory).
4. **Package 2 (admissionSystemType)** — separate later assignment per the brief, not
   started.

CONTRADICTIONS WITH THE BRIEF: none found. Both constraints the brief asked to verify
were confirmed in code before designing: (a) empty-means-open is load-bearing in both
call sites; (b) the advisory-notes pattern in `evaluateOpportunityEligibility` was
extended, not paralleled. The one judgment call the brief left open (copy-only vs.
tri-state) went to tri-state; the copy-only option was rejected because it permanently
stamps genuinely-confirmed-open programs with a false "not verified" and gives future
research passes nowhere to record a confirmation — reasoning recorded in
`docs/product-decisions.md`.
