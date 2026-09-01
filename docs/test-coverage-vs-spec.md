# What Phase 50 asks for, and what exists

Measured 2026-09-01. 193 test files, 2,934 tests, all green. This file is about the shape of
that coverage rather than its size — a launch-readiness fact worth having before launch
rather than after.

## The spec's own list

Phase 50 names seven integration tests and one end-to-end path. Against the suite today:

| Phase 50 asks for | State |
|---|---|
| authentication | **partial** — `legal/consent.test.ts` covers the signup consent gate. No test exercises sign-in or session handling. |
| CV import workflow | **partial** — `onboarding/import-step-flatten.test.ts` covers flattening an extraction result. The upload → extract → review → confirm → save path is untested. |
| profile creation | covered |
| weekly plan generation | covered — `ai/weekly-plan.test.ts`, including the counselor-grounding contract |
| university save | covered at the action (`addTargetUniversity`), and now removal too |
| opportunity save | covered as of 2026-09-01 — `opportunities/opportunity-actions.test.tsx`, including the optimistic-update rollback |
| evidence permissions | **gap** — `counselor/evidence.test.ts` is about evidence *gating in counsel*, not about whether one student can read another's file |
| **critical end-to-end happy path** | **absent** — there is no Playwright or equivalent suite; every test is unit, component or contract level |

## The two that matter most, and why they are hard rather than neglected

**Evidence permissions.** The boundary is real and was verified live on 2026-09-01: Storage
RLS scopes `evidence` reads to `(storage.foldername(name))[1] = auth.uid()`, which is what
made `getSignedEvidenceUrl` safe despite the application code checking nothing (see
`docs/known-issues.md`). Encoding that as a test needs a database — pgTAP against real
policies, not a mock, since a mock would assert our belief about RLS rather than RLS. The
local pgTAP path exists but Docker does not run in the agent sandbox.

**The end-to-end path.** Needs a running app, a test database, and account creation. Agents
here cannot create accounts: it writes to the founder's real project, burns Supabase's
rate-limited built-in email, and moves the denominators of every measurement in these docs.

Both are genuinely blocked on environment rather than on effort, which is worth distinguishing
from the two that are not.

## The two that are just missing

`setOpportunityStatus` had no test at all; that one is now closed, and the behaviour worth
having covered turned out to be the optimistic-update rollback rather than the happy path —
without it a failed write leaves the button showing a status nobody saved.

The CV import workflow is still tested only at its last step. It needs no infrastructure
either — mockable the way `__tests__/universities/save-university-button.test.tsx` mocks its
action — and is the cheapest remaining coverage.

## What the suite is unusually good at

Worth saying, because a gap list reads worse than the truth. The strongest coverage in this
codebase is on the things that have actually gone wrong: scoring honesty
(`scoring/dashboard-hero`, `scoring/signal`), opportunity lifecycle and eligibility contracts,
migration numbering, catalog parity and ICU plural formatting, export table coverage derived
from the migrations rather than hand-listed, and a growing set of regression tests each
naming the live incident it came from. That is a suite shaped by real failures rather than by
coverage percentage, which is the more useful shape — it is simply not the same thing as
knowing the whole path works.
