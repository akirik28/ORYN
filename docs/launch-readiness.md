# Launch Readiness

Chat 4. Honest classification, not a status celebration. "Launch blocker" means the core
promise ("what should I do next?") cannot be safely or credibly delivered without it —
not "would be nice to have."

**Since 2026-08-16**: significant additional hardening landed (CI, moderation, rate
limiting, realtime messaging, the block-direction/disconnect-history/open-redirect/
raw-error fixes, 230 automated tests) — this file's *product-capability* assessment below
is still accurate, but for current security/test/CI status see
`docs/production-route-audit.md` and `docs/founder-blocked-backlog.md` rather than
treating this file as up to date on those dimensions.

## Product status

Functionally complete across the V1 surface (profile/digital-twin incl. Sports, university
discovery with World→Europe→country drill-down, opportunities, applications, deadlines,
AI Advisor, weekly plan, global search, shareable public profiles, mutual-consent
connections, 1:1 accepted-connection messaging). What's incomplete is **content**, not
**capability** — see `data-readiness.md`. A real Grade 9-12 Turkish student signing up
today can use every workflow end-to-end; what they'd find at the end of "explore
universities" or "browse opportunities" is thin (21 universities, identity-only; zero
opportunities) rather than broken.

## Backend / Supabase status

Real, live, wired up (`.env.local` → `oryn-qa-scratch`, first time this product has had an
actual dev backend instead of a static-analysis-only sandbox). All 27 migrations applied
and live-verified. `SUPABASE_SECRET_KEY` was requested from the founder but is not present
in `.env.local` as of this document (mtime unchanged since Chat 3 wrote the file) —
admin-client-dependent features (background jobs, account deletion, peer benchmarking,
protected ingestion triggers) degrade gracefully rather than crash (verified this pass —
see `known-issues.md`'s Chat 3 entry on the Profile-page crash this exact gap used to
cause), but don't function. **Action needed from the founder**: confirm the secret key was
saved to `/Users/direncagankirik/Desktop/Founder/ORYN/.env.local` specifically (not a
different path/environment) — see `data-readiness.md`'s credential table for the other
three still missing.

## AI status

`ANTHROPIC_API_KEY` not configured — Advisor, weekly-plan generation, CV extraction,
requirement/opportunity extraction, and AI-assisted achievement refinement all correctly
show "not configured yet" rather than failing silently or crashing (verified live this
pass across Home, Advisor, and the Profile "Improve with AI" button). Advisor system
prompt and context-assembly logic were audited in Chat 3 against six behavioral scenarios
(opportunity cost, time budget, busy mode, rejected-recommendation memory, unfinished-work
preference, deadline urgency) — all pass at the mechanism level. **Never exercised against
a live model** — this remains true after this pass too. Sports now feeds the Advisor's
time-budget reasoning (committed hours, captaincy, achievements) without touching the
scoring engine — a deliberate scope decision, see `product-decisions.md`.

## University-data status

See `data-readiness.md` in full. Headline: 21 real, sourced universities (identity only);
zero programs/requirements/statistics/deadlines. World→Europe→country exploration UI is
real and live-verified (not a mockup) — genuinely usable for what it currently indexes,
genuinely thin on what it can tell a student once they pick one.

## Opportunity-data status

Zero rows, zero categories. Pipeline architecture audited and judged ready; never run
(credential-blocked). See `data-readiness.md`.

## Application / deadline status

Code-verified this pass (not re-built): `updateApplicationStatus` persists correctly and
its UI now rolls back + shows an error on failure (a real bug fixed in Chat 3's live-QA
pass). The unified cross-source Deadline Engine (applications + saved opportunities +
target-university programs) is unchanged and correct. Neither was exercised with real
saved-opportunity or application data this pass — no opportunities exist to save yet
(see above), so "discover → save → apply → track" is architecturally verified but not
walked end-to-end with real content.

## Privacy / security status

No regressions found or introduced this pass. The Chat 3 connection-privacy invariant
(non-accepted connections never unlock private profile data) is unchanged and was not
touched. The new messaging feature was built to the same standard and **live-verified
adversarially** against a 10-scenario matrix on the actual database (not just code review):
non-participant read, forged sender, pending/declined/no-connection send attempts, both
directions of a block, sender-cannot-mark-own-message-read, and — the one this document
exists to be honest about — **disconnect preserves message history for both parties while
correctly blocking new messages**, per the founder's explicit "do not destroy evidence
needed for abuse reports" requirement. See `known-issues.md` for the one open item this
surfaced (no admin UI yet reads `message_reports`) and
`supabase/tests/messaging_authorization_manual.sql` for the reproducible matrix.

## Real-user-flow status

Live-tested this session with a real account against the real backend: signup → email-
confirm (via direct DB action, since no email provider is configured in this sandbox —
see `known-issues.md`) → login → onboarding (Turkish curriculum, 2027, Turkey) → add an
activity (persisted, score recomputed live) → Profile page (previously crashed on every
real request — Chat 3 found and fixed this; re-confirmed fixed) → Universities
(World→Europe→country, real filtering, real cards) → Sports/Messages pages render clean
empty states. **Not exercised this pass**: saving a university/opportunity through to a
tracked application (no opportunities exist to save), a real Advisor conversation (no
model key), messaging between two real accounts in the browser (verified at the database/
RLS layer instead, which is the layer that actually matters for the safety invariant, but
the UI's own send/receive round-trip was not clicked through live).

## Integrations

| Integration | Status |
|---|---|
| Supabase (app) | **OK** — first time ever for this product |
| Supabase (admin/secret key) | Missing credential |
| Anthropic | Missing credential |
| Tavily | Missing credential |
| College Scorecard | Missing credential |
| OpenAlex | OK (keyless) |

## Mobile status

Verified this session at 390px width: Universities (region/country pills, cards) and Home/
Profile render cleanly in the dark system. Messages/Sports were not separately checked at
mobile width this pass (built on the same responsive primitives every other page uses, so
low-risk, but genuinely unverified — listed as a gap below, not asserted as fine).

## Launch-critical gaps (LAUNCH BLOCKER)

1. **Zero opportunity data and near-zero university data.** The product cannot yet
   deliver its core "what should I do next" promise with substantive real-world content.
   Root cause is entirely credential access (`TAVILY_API_KEY`, `ANTHROPIC_API_KEY`,
   `COLLEGE_SCORECARD_API_KEY`), not code. This is the single blocker that matters most.
2. **No professional legal review** of minor-safe/privacy claims (COPPA/GDPR-for-minors).
   Unchanged since Chat 1; still required before any public launch with real minors.

## Post-launch high priority

- Populate programs/requirements/deadlines for the 21 seeded universities once
  `COLLEGE_SCORECARD_API_KEY` (U.S.) and manual/admin entry (non-U.S., per AGENTS.md's own
  "no single European admissions API" guidance) are available.
- `handle_new_user()`'s PostgREST-executable grant (Chat 3, proven non-exploitable live,
  fix deliberately deferred without a real GoTrue instance to verify against).
- The `auth_rls_initplan` performance pattern across ~40 RLS policies (Chat 3, found live,
  pervasive/pre-existing, correctness-neutral).
- Opportunity moderation/review-queue state before a discovered candidate is queryable as
  `active` (this pass's pipeline audit — currently stores directly as active).
- An admin surface for `message_reports` (currently write-only from the client by design;
  nothing reads it back yet).
- End-to-end real-model Advisor testing once `ANTHROPIC_API_KEY` exists.
- Messages/Sports mobile-width visual verification.

## Normal backlog

Everything in `known-issues.md`'s "Open — deliberately scoped out" section that isn't
listed above (peer-benchmarking cohorts at genuine n=0 pre-launch, `target_geography`
collected-but-unused, `RecommendationClass`'s unused `consider`/`deprioritize` values,
France/Parcoursup ingestion, group/continent drill-downs beyond Europe).

## Recommended next step

See `docs/pre-publish-checklist.md` — written the same day this document last needed
updating, so it supersedes this section's own recommendation rather than duplicating it.
Headline: a real, staged data batch (31 universities, 189 programs, 520 requirements, 273
opportunities, sourced from the founder's own Drive corpus) is ready to apply and would
close most of launch-blocker #1 below immediately, before any external API credential is
even needed — see `docs/data-readiness.md`'s "Staged batch" section.
