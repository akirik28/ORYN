# Final Product Audit — Chat 3 (Adversarial QA)

Date: 2026-08-15. Scope: complete and verify the in-progress connection-privacy fix, then
continue an adversarial audit across the codebase. This document is the honest record of
what was found, fixed, and verified, and what remains — not a completion celebration.

## 1. Product — does Oryn clearly answer "what should I do next?"

Yes, mechanically. The dashboard's top-3-actions + one biggest-gap + one
"don't do this" layout (`app/(app)/dashboard/page.tsx`,
`features/dashboard/dashboard-view.tsx`) matches the founder spec's worked example closely,
and the underlying data is real (not fabricated): the opportunity preview is now a genuine
query (verified this pass, was already fixed by Chat 2), weekly-plan generation is
idempotent per week, and the advisor's prompt explicitly instructs weighing opportunity
cost rather than listing every gap equally (verified this pass — see section 3).

Not independently verified this pass: whether the *quality* of AI-generated weekly
priorities holds up across a wide range of real student profiles. No ANTHROPIC_API_KEY is
configured in this sandbox, so no live advisor/weekly-plan call was made. The prompt
construction and context-assembly logic were read in full and checked against six named
scenarios (below); actual model output was not observed.

## 2. UX — can a first-time 16-year-old understand this without instruction?

Not independently re-verified this pass beyond what Chat 2 already checked (see
`chat-2-handoff.md`'s own "what was and wasn't live-verified" breakdown — most authenticated
pages are typecheck/build-verified, not opened in a browser, because this sandbox has no
app-level Supabase credentials to actually authenticate against). One real, contained UX
bug was found and fixed adjacent to the security work: `features/connections/connection-row.tsx`
could render a dead `/u/` link for a stale outgoing connection request; it now renders a
plain, non-clickable row in that case.

## 3. AI — are recommendations actually personalized, not superficial?

Audited `lib/ai/advisor-prompt.ts`, `lib/ai/weekly-plan.ts`, and `lib/ai/student-context.ts`
against six scenarios from the operating brief:

| Scenario | Verdict | Detail |
|---|---|---|
| Weigh opportunity cost (don't recommend another club when leadership is already strong) | **Pass** | System prompt states the exact scenario near-literally. |
| Respect a low weekly time budget | **Pass, prompt-level only** | Budget is read into context and the prompt instructs respecting it; nothing in `WeeklyPlanSchema` mechanically caps action count/size by budget — this is model compliance, not a hard constraint. |
| Reduce workload in busy/exam mode | **Pass** | `busy_mode` is read and instructs reducing recommendations. `busy_mode_until` was written by Settings but never reached the advisor — fixed this pass. |
| Don't repeat a rejected recommendation | **Fixed this pass** | The query pulling "don't repeat this" context had no `recommendation_class` filter, relying on an unstated invariant (only one class is ever written today). Made explicit. |
| Prefer finishing existing work over starting new | **Pass** | Ongoing projects/activities are tagged in context; the prompt instructs preferring them. |
| Recognize deadline urgency | **Pass** | Upcoming deadlines (the unified cross-source engine) are in context with an explicit urgency instruction. |

None of this was exercised against a live model this pass (no `ANTHROPIC_API_KEY`
configured) — the above is a static audit of the mechanism, not observed model behavior.

## 4. Data — can important claims be traced to sources, and is external data handled safely?

- University/opportunity facts retain source URL, confidence, and retrieval timestamp per
  the existing schema (`university_sources`, `opportunity_sources`) — unchanged this pass.
- **Real gap found and fixed**: AI extraction of opportunities and requirements from
  scraped web pages (`lib/ai/opportunity-extraction.ts`, `lib/ai/requirement-extraction.ts`)
  concatenated page content directly into the prompt with no delimiter and no
  untrusted-data framing — a plausible prompt-injection surface for a product whose spec
  explicitly names "external website text is untrusted data" as a rule. Fixed: content is
  now wrapped in `<page_content>` tags with an explicit system-prompt instruction. Not
  red-teamed against a real adversarial page (no live Tavily/Anthropic access here).
- **Real gap found and fixed**: `lib/requirements/evaluate.ts` compared GPAs across
  incompatible grading scales with a flat linear ratio, producing a confident `met`/`not_met`
  verdict for a comparison that isn't actually valid — directly contradicting a principle
  the codebase already states elsewhere (`lib/scoring/dimensions/academics.ts`). This
  specifically risked wrong, overconfident requirement statuses for non-US/international
  students (Turkish, IB, etc.) — the exact population this product's initial market
  targets. Fixed: only same-scale GPAs are compared; otherwise the result is
  `needs_manual_review`, honestly.
- International-student handling elsewhere checked out: missing curriculum/grade/test data
  correctly resolves to `unknown`, never a guessed `not_met`; no hardcoded `"usa"` defaults
  found; curriculum-neutral scoring confirmed (AP/IB/A-Level weighted identically).
  `profiles.target_geography` is collected but never read back into matching/outlook logic
  — a real, scoped-out gap, not a trust violation (it simply isn't used yet).

## 5. Trust — does the product avoid fake precision and invented data, and is private data actually private?

This is where this pass concentrated. Summary — full detail in `known-issues.md` and
`SECURITY.md`:

- **A real, already-shipped privacy vulnerability was found in progress and completed**:
  `public_profiles`' connection carve-out matched a connection of *any* status, and
  `sendConnectionRequest` didn't re-verify the recipient was public. A single unsolicited
  connection request — zero consent — could permanently unlock a private minor's basic
  profile, portfolio, and skills. Fixed with a status-and-direction-aware carve-out;
  server-side re-verification added.
- **A second, independent bug was found *by trying to verify the first fix live***:
  `0023_social_v1.sql` could never actually apply to a real Postgres database — a
  `CREATE VIEW` referenced a table created later in the same file. This means the entire
  V1 social feature had never successfully deployed anywhere, a fact invisible to code
  review and undiscovered across two prior sessions specifically because neither had
  database access to actually try. Fixed in place (justified exception to this repo's
  migration-editing discipline — see `product-decisions.md`).
- **Both fixes, and the surrounding RLS/social layer, are now live-verified** against a
  disposable Supabase project (created via the Supabase MCP, with explicit founder
  approval at each step) — not just reviewed by eye, for the first time in this product's
  history. Eight invariant-matrix assertions, full RLS coverage across 44 tables, storage
  signed-URL enforcement, and the AI rate limiter all confirmed by direct query against a
  real database. Methodology and results in `SECURITY.md`'s "Social / connections"
  section; a reproducible manual script is in `supabase/tests/connection_privacy_manual.sql`.
- No new instances of false admissions precision, fabricated opportunities, or invented
  requirements were introduced or found this pass. The existing transparent-heuristic
  admission outlook (`lib/admissions/outlook.ts`) and evidence-status model were not
  touched and were not re-audited beyond what's covered above.

## Integrations

| Integration | Status |
|---|---|
| Supabase (this app's own credentials) | Missing credential (expected — no `.env.local` in this sandbox) |
| Supabase (via MCP, this session's own access) | Working — used to create a scratch project and live-verify migrations 0001–0025 |
| Anthropic | Missing credential |
| Tavily | Missing credential |
| College Scorecard | Missing credential |
| OpenAlex | Working (keyless) |

`npm run check:integrations` reports the app-level state accurately and degrades
gracefully — unchanged behavior, re-confirmed this pass.

## Database

44 tables (up from the previously-documented 43 — `connections`, added by `0023`, had
never been counted), 25 migrations. `0023` reordered in place (a genuine, justified
exception — see above); `0024` completed and hardened (direction-aware carve-out); `0025`
added (function `search_path` hardening). Full schema, all 25 migrations, live-applied to
a real Postgres this pass and confirmed structurally sound end to end — the first time
that's been true. RLS: 44/44 tables enabled, live-verified. Storage: both buckets'
owner-scoped policies live-verified. A real, pervasive, pre-existing RLS performance
pattern (40 policies re-evaluating `auth.uid()` per row instead of once per query) was
found via Supabase's own advisor and logged as a deliberate, scoped-out follow-up — see
`known-issues.md`.

## Tests

```
npm run typecheck            -> clean
npm run lint                 -> clean
npm run test                  -> 113/113 passing, 19 files (up from 108/18)
npm run build                  -> succeeds, all 33 app routes compile
npm run check:integrations     -> OpenAlex OK; everything else correctly reports
                                   Missing credential
```

New this pass: `__tests__/validation/uuid.test.ts` (extracted `isUuidLike` out of a
`server-only`-marked module so it's unit-testable, matching this repo's existing
pure-function-vs-server-module separation convention); two `__tests__/requirements/evaluate.test.ts`
cases replacing the one that encoded the now-fixed cross-scale GPA behavior as correct.
`supabase/tests/connection_privacy_manual.sql` is a manual reproduction script, not an
automated suite — no pgTAP extension was confirmed available anywhere this repo has run.

## Performance

Not a focus of this pass beyond what Supabase's advisor surfaced (the `auth_rls_initplan`
pattern above). No new heavy dependencies, no new client-side bundles of consequence.

## External blockers

- **Update, same session, after this document's main body was written**: the founder
  chose to keep the scratch Supabase project as ORYN's real dev backend rather than
  delete it. `.env.local` now has real `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values — `npm run check:integrations` confirms
  `Supabase OK` for the first time in this product's history (not just the MCP access
  used for the live-verification work above; the *app itself* can now reach a real
  Postgres). `SUPABASE_SECRET_KEY` is still blank — the MCP server that provisioned this
  project deliberately doesn't expose service-role/secret keys as a retrievable value
  (for the founder's own security), so admin-client-backed features (background jobs,
  account deletion, analytics, benchmarking cohorts) still report "Missing credential"
  until the founder pastes it in from the Supabase dashboard. A live browser smoke test
  was attempted but skipped: another session already had a `next dev` server running
  against this same project directory, and Next.js refuses a second instance against one
  `.next` build dir regardless of port — killing another session's active process wasn't
  a reasonable tradeoff for one smoke check. `.env.example` was also added (referenced by
  `.gitignore` but never actually created — a real Phase 32 gap, closed here).
- `ANTHROPIC_API_KEY`/`TAVILY_API_KEY`/`COLLEGE_SCORECARD_API_KEY` remain unconfigured —
  every AI call path and every non-Supabase provider is still typecheck/build-verified
  only, not observed running for real.
- No professional legal review of minor-safe/privacy claims — unchanged, still required
  before public launch.

## Non-critical debt (see `known-issues.md` for full detail)

- `handle_new_user()`'s PostgREST-executable grant (proven non-exploitable live; a fix was
  drafted and deliberately reverted for lack of a real GoTrue instance to verify against).
- The `auth_rls_initplan` performance pattern across ~40 policies.
- `profiles.target_geography` collected but never read into matching/outlook logic.
- `RecommendationClass`'s `consider`/`deprioritize` values still never produced (pre-existing,
  not this pass's scope).
- Peer benchmarking cohorts are genuinely `n=0` pre-launch (architecture is correct, not a
  stub).
- No content moderation on free-text fields beyond the AI system prompt's own discouragement.

## Launch-critical issues

None outstanding as of this document. The one launch-critical issue this pass addressed —
a real, exploitable privacy vulnerability affecting a product whose primary users may be
minors — is fixed and, uniquely among this product's security work so far, live-verified
rather than only reviewed.

## Recommended next phase

Two candidates, genuinely close enough to need founder input rather than a unilateral
pick:

1. **Provision a real (non-scratch) Supabase project and the remaining API credentials**,
   so the next session can finally live-verify UI/UX end to end (Chat 2's largest
   documented gap) and exercise the AI Advisor against a real model instead of auditing
   its prompt construction in the abstract.
2. **The `auth_rls_initplan` performance pass** (~40 policies) — mechanical, low-risk,
   and now has a real, live-tested project available to verify each change against rather
   than reviewing by eye, if the scratch project (or a successor) is kept around.

This session's own scratch Supabase project (`oryn-qa-scratch`) is left active; an
unrelated project in the same org (`menter-chatbot`) was paused to make room for it under
the org's free-tier limit and has not yet been restored — see the session's final message
for exact current state and what's needed to resolve it.
