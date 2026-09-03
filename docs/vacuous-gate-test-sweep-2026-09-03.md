# Vacuous-gate-test sweep — where the state.ts shape recurs

Report only, no fixes. Scoped to be tractable rather than reading all 5,906 tests: every
consumer of `lib/opportunities/lifecycle.ts`'s and `lib/opportunities/commercial.ts`'s
shared gate functions (`isOpportunityActionable`, `isOpportunityRecommendable`,
`isOpportunitySufficientlyVerified`, `competesInCoreRecommendations`, `isPayToEnroll`,
`resolveStoredEligibility`, `filterActionableOpportunities`) — the exact family the
digest/counselor bug belonged to — checked against whether that consumer's own test file(s)
actually construct a fixture that fails the gate and assert on the exclusion, or whether
every test uses a uniform/passing shape the gate's presence or absence couldn't affect.

**Method note, since it matters for how much to trust "clean":** a quick quantitative pass
first (counting mentions of `cycle_status`, `deadline`, non-`active` `status` values, and
`selectivity_tier` in each candidate test file) reliably separated genuinely-covered files
from gapped ones on every case checked — every file with a near-zero count turned out to
have the gap on a full read, and every file with a real count turned out to have a genuine
exclude-and-assert test on a full read. Used as a triage signal, not a substitute for
reading the flagged ones in full.

## Confirmed gaps

### 1. `lib/counselor/candidates.ts` — the cleanest match to the pattern named

`opportunityCandidates()` filters on `competesInCoreRecommendations` (line 16), with its own
comment explaining why it matters: *"Pay-to-enroll programmes stay in Browse but do not
compete for a core recommendation slot... the ruling is categorical."* Real logic, reasoned
about carefully in the code itself.

`__tests__/counselor/candidates.test.ts`'s one `opportunity()` fixture factory hardcodes
`cost: null, selectivity_tier: "unknown"` — a shape that always passes the commercial gate
(`cost === null` maps to `cost_unverified` → `not_pay_to_enroll`, per `commercial.ts`'s own
logic) — and none of its 20 tests overrides either field. Checked every test name in the
file for anything cost/selectivity/pay-to-enroll-adjacent: none exists. **If the
`.filter(({ opportunity }) => competesInCoreRecommendations(opportunity))` call were deleted
entirely, all 20 tests would still pass, unchanged.** This is the exact shape named: a real
gate, a real reason for it, and zero tests whose outcome depends on it existing.

### 2. `lib/opportunities/persist-matches.ts` — no vacuous test, but no test at all

`filterActionableOpportunities` runs at the top of `refreshOpportunityMatches`, with its own
comment: *"A cycle that has closed... must stop producing fresh matches."* Three test files
touch `refreshOpportunityMatches` or its neighbors (`persist-matches.test.ts`,
`refresh-matches-confidence-degradation.test.ts`, `refresh-matches-no-session.test.ts`), and
each is honestly, narrowly scoped to something else specific — reason-code assignment,
migration-0086 upsert degradation, and session-parameter handling, respectively (confirmed
by reading each file's own header comment, not just its fixture shape). None constructs a
closed-cycle or past-deadline opportunity to prove a fresh match is never computed for it.
Different in kind from #1 — no test *claims* this coverage or would mislead a reader into
thinking it exists — but the behavior the lifecycle module's own comment calls out by name
has no regression test anywhere in the suite.

### 3. `lib/admin/queries.ts` — no test, and this exact function already drifted wrong once

`passesLiveVerificationGate`/`getActiveOpportunityFacts`/`getVerificationReality` (admin
health-panel diagnostics, not a student-facing surface) compute how many active
opportunities pass the real live gate. The function's own comment records a real, already-
happened failure: *"an earlier draft checked verification alone... and reported 283 of 283
passing — `isOpportunityActionable` is the check that actually excludes a closed cycle or a
passed deadline."* That earlier mistake was caught by a human checking live data by hand,
not by a test. Grepped every test file in the repo for `passesLiveVerificationGate`,
`VerificationReality`, `getVerificationReality`, `getActiveOpportunityFacts`: zero matches.
The one function in this whole sweep with a documented history of being wrong is the one
with no regression test protecting the fix.

## Checked and genuinely clean (real exclude-and-assert coverage, not vacuous)

Each confirmed by reading actual test bodies, not just the quantitative triage signal:

- **`lib/opportunities/home-strip.ts`** (`__tests__/opportunities/home-strip.test.ts`) —
  dedicated tests named "excludes a non-actionable opportunity (closed cycle)..." and
  "excludes a pay-to-enroll opportunity...", each with a real failing fixture and an
  assertion on the resulting list.
- **`lib/opportunities/browse.ts`** (`__tests__/opportunities/browse.test.ts`) — extensive,
  varied coverage (32 `cycle_status` mentions, 10 non-active-status fixtures) including
  cases like "a closed-cycle row with a higher score no longer outranks an open... row."
- **`lib/counselor/eligibility.ts`** (`__tests__/counselor/eligibility.test.ts`,
  `eligibility-and-urgency-contracts.test.ts`) — same standard, including a test that
  explicitly pins the boundary against `lifecycle.ts` by name ("matches lifecycle.ts's
  boundary exactly: a deadline that falls today is still actionable, the day after is not").
- **`lib/deadlines/scan.ts`** (`__tests__/deadlines/scan.test.ts`) — its own dedicated
  "cycle_status guard" describe block with closed/historical fixtures.
- **`lib/deadlines/upcoming.ts`** (`__tests__/deadlines/upcoming.test.ts`) — same, plus a
  disabled-status case ("Pulled Programme").
- **`lib/digest/build.ts`, `lib/counselor/state.ts`** — the two already fixed this session
  (`oryn/digest-recommendable-gate-2026-09-03`), now with dedicated coverage added as part
  of that fix.

## What this doesn't cover

Scoped to one specific, well-defined family of shared gate functions because that's what
was tractable and what the original bug belonged to. It says nothing about whether the same
"uniform passing fixture, gate never actually exercised" shape exists around a *different*
shared function elsewhere in the 5,906-test suite — only that within this specific family,
it recurs twice more (candidates.ts, admin/queries.ts) and one place has no coverage at all
rather than misleading coverage (persist-matches.ts).
