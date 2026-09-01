# What Phase 50 asks for, and what exists

Measured 2026-09-01. 193 test files, 2,934 tests, all green. This file is about the shape of
that coverage rather than its size — a launch-readiness fact worth having before launch
rather than after.

## The spec's own list

Phase 50 names seven integration tests and one end-to-end path. Against the suite today:

| Phase 50 asks for | State |
|---|---|
| authentication | **partial** — `legal/consent.test.ts` covers the signup consent gate. No test exercises sign-in or session handling. |
| CV import workflow | covered at the write step as of 2026-09-01 — `profile/cv-import-action.test.ts`, including partial-import honesty. The upload and extraction steps remain untested (they need a model call). |
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

The CV import workflow is now covered at the step where data reaches a profile, including
the partial-import case the action's own comment insists on. What remains untested there is
upload and extraction, which need a real model call — the same credit constraint as the
Turkish eval pass.

## Three tests fail under heavy parallel load, and that is not a defect

Recorded because four separate lanes have now each independently diagnosed it, which is four
times the same re-derivation.

With five or more sessions building and testing on this machine at once, load average runs
26–59 on 8 cores and three tests exceed vitest's 5s default:
`__tests__/entities/entity-combobox.test.tsx`, `__tests__/onboarding/onboarding-wizard.test.tsx`,
and (until `7fee3a11`) `__tests__/opportunities/refresh-matches-admin-degradation.test.ts`.
All pass in isolation. CI has been green throughout — GitHub's runners are not under this load.

**Two different mechanisms, and only one was worth fixing.** The refresh-matches one was
specific: whichever test imports `persist-matches` first pays for the whole module graph, so
it failed on the *first* test in each `describe` and never the second — which is also the
proof it was not a logic regression, since a broken guard fails both. That one is fixed with
a raised timeout on the two first-import tests and the reasoning at the call site.

The other two have no such shape — they are `findBy*`/`waitFor`-heavy component tests, and
what is slow is everything. Raising the suite's timeout to accommodate them would trade a
known false alarm for a blind spot on real hangs, so they are documented rather than
silenced.

**If you see one of these red:** check the load average before investigating. If it is above
about 15, re-run the file alone.

## What the suite is unusually good at

Worth saying, because a gap list reads worse than the truth. The strongest coverage in this
codebase is on the things that have actually gone wrong: scoring honesty
(`scoring/dashboard-hero`, `scoring/signal`), opportunity lifecycle and eligibility contracts,
migration numbering, catalog parity and ICU plural formatting, export table coverage derived
from the migrations rather than hand-listed, and a growing set of regression tests each
naming the live incident it came from. That is a suite shaped by real failures rather than by
coverage percentage, which is the more useful shape — it is simply not the same thing as
knowing the whole path works.
