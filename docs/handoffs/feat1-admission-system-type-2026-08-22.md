# Handoff: FEAT-1 Package 2 — Gate 1's outlook explanation

STATUS:
COMPLETE. Two stacked PRs to `main` (never merged by this lane), per CEO directive to split
logic from render: [#18](https://github.com/akirik28/ORYN/pull/18)
(`oryn/feat1-outlook-explanation-gate1`, logic only) must merge before
[#19](https://github.com/akirik28/ORYN/pull/19) (`oryn/feat1-outlook-explanation-render`,
behavioral render change, no restructuring/restyling). Full gate green on both: lint clean,
typecheck clean, 122 test files / 1,872 tests (+11 over the 1,861 baseline from PR #5 landing),
`npm run build` succeeds. Both changes additionally verified live in a browser against a real
dev server (see "Live verification" below) — not just unit-tested.

## The brief's premise was partly stale — verified, not assumed

The assigned brief (`docs/ORYN-ORG-BRIEFS.md` §FEAT-1 Package 2) said `admissionSystemType` "is
built but dead... never populated by any real production caller — zero live effect," citing the
implementation-gap analysis (`docs/research/admissions-systems/implementation-gap/README.md`,
pinned at `origin/main@0756b3e`). That was true when written. It was **not** true by the time
this lane started: commit `40d9c7e` ("fix(admissions): wire Gate 1 into both outlook callers,
add field-existence check", 2026-08-21 — one day *before* the brief) had already:

- Built `lib/admissions/system-shape.ts` (`resolveAdmissionSystem` — three shapes, not the
  original binary `admissionSystemType`; pathway-keyed for France/Hong Kong/Ireland/Turkey;
  institution-level overrides) and `lib/admissions/field-availability.ts`
  (`checkUndergraduateFieldAvailability` — RULE-ADMISSIONS-021, Medicine/Law graduate-entry-only
  in US/Canada). Together these close the implementation-gap analysis's Gaps 1-4, not just its
  top-line wiring finding.
- Wired both into **both** real callers: `lib/admissions/persist.ts` (`refreshAdmissionOutlook`,
  the target-university page) and `lib/universities/counseling-adapter.ts`
  (`buildUniversityCounselingView`).
- All 15 researched countries in `data/research/admissions-systems/admissions-systems-v1.json`
  are present in the `system-shape.ts` registry (checked directly — `grep -n "countryNames: \["`
  against the JSON's country list). The research data is consumed by transcription into the
  registry, not read from the JSON at runtime — there is no ingestion step, so this needed no
  coordination with ORYN-BASORG.

**One correction to the analysis itself**, worth other lanes knowing: the analysis's backlog
names `lib/universities/counseling-adapter.ts:342-346` as "production caller #2." It is not —
`buildUniversityCounselingView` has zero non-test callers (confirmed by `grep`); the
`OUTLOOK-EXPLAIN-SELECT-FIX` row already on `ORYN_WORKSTREAMS.md` independently calls it
"not-yet-wired-to-any-page." There is exactly one production caller
(`app/(app)/universities/[id]/page.tsx`, via `refreshAdmissionOutlook`), and it is correctly wired.

## What was actually still broken (verified by running the real code path, not by reading)

The brief's own third clause — "make the outlook explanation actually use it" — was genuinely
undone, and it's the same failure family as Package 1 (a genuinely-known fact silently discarded
in the render path). Ran the production functions directly for a Turkish student targeting
Boğaziçi University (`scripts/.probe-tmp.ts`, not committed — throwaway verification):

- `computeAdmissionOutlook` correctly resolves `admissionSystemShape:
  "academic_rank_competitive"`, `outlook: "not_applicable"`, and a 746-character
  `notApplicableReason` sourced to `turkey.md`, the design spec, and the Turkish-exams research.
- The university detail page rendered **none of that reason**. It showed the correct badge
  ("Not a profile-review system") directly above a strengths/gaps/unknowns grid computed as if
  a US-style holistic reviewer existed: the student's leadership as a "Strength," and — the
  sharpest part — "Unknowns: ? Essays ? Recommendations ? Applicant pool," for a mechanism
  (ÖSYM's YKS) that takes no essay and no reference letter at all.

Root cause: `lib/admissions/explain.ts`'s `explainOutlook` took only raw dimension scores, no
admissions-system context, and hardcoded `ALWAYS_UNKNOWN = ["Essays", "Recommendations",
"Applicant pool in this admission cycle"]` — a US-holistic list — for every target on earth.
This also breaches AGENTS.md Phase 16.2, which makes the outlook explanation mandatory: for
every `not_applicable` target, the mandatory explanation was in practice absent (a grid that
doesn't apply, standing in for it).

## Fix shipped

`explainOutlook(scores, admissionSystemShape?)` — new optional second parameter:

| Resolved shape | Strengths/Gaps | Unknowns |
|---|---|---|
| omitted / `null` / `"holistic_review"` / `"unknown"` | unchanged (existing logic) | unchanged: Essays, Recommendations, Applicant pool |
| `"academic_rank_competitive"` (YKS, CAO, ATAR, NC subjects...) | none — `profileNotAnInput: true` | **only** "Where this cycle's score cutoff lands" |
| `"academic_threshold"` (Dutch/Italian open programmes, German non-NC) | none — `profileNotAnInput: true` | **none at all** — RULE-ADMISSIONS-001: once published requirements are met, admission follows; inventing an unknown here would manufacture doubt the mechanism doesn't have |

Keyed entirely on the shape `system-shape.ts` already resolved — no second hardcoded
country/mechanism table, per the CEO's explicit constraint. `"unknown"` (unresolved country, or
a country whose pathways disagree and Oryn lacks the deciding fact) is never treated as
"established non-holistic" — same tri-state discipline `reviewsNonAcademicEvidence` already
keeps elsewhere in this module.

New `profileNotAnInput` flag on `OutlookExplanation`/`AdmissionOutlookSummary`: true only when
Gate 1 *established* the mechanism doesn't read non-academic evidence, so a caller can tell
"empty by construction" from "empty for want of profile data" (`insufficientData`) and never
show "we don't know enough about you yet" for a target where more profile data wouldn't change
the answer.

Render change (PR #19, isolated from the logic per CEO directive so a revert of one can't take
the other down): the detail page now passes the resolved shape into `explainOutlook`, renders
`notApplicableReason` in place of the grid when non-null, and uses the freshly-computed estimate
range instead of the persisted (one-render-stale) row — same staleness reasoning the existing
badge already used, extended to the range so "Oryn estimate: 15–25%" can never print directly
under "Not rated on this scale."

## Live verification (dev server, real Supabase-backed QA account, not just unit tests)

Per the CEO's explicit ask to verify in a browser on a current-branch dev server rather than
trust unit tests alone. Ran `next dev` on a fresh port against the `oryn-qa-scratch` project
(`qtcvcflzxbuagvvwahhu`) using the `oryn.qa.a` persisted QA persona (not the founder's account —
confirmed by the org doc's own account-identification rule).

- **Boğaziçi target (the fix)**: badge "Not a profile-review system"; reason rendered verbatim
  ("ÖSYM's YKS placement algorithm is the admission decision itself..."); strengths/gaps grid
  correctly absent; unknowns list correctly reduced to one item, "Where this cycle's score
  cutoff lands" — no Essays, no Recommendations.
- **Yale target (non-regression)**: badge "Extreme Reach"; numeric estimate "1–11% (low
  confidence)"; full strengths/gaps/unknowns grid present, all three original unknowns
  (Essays, Recommendations, Applicant pool) unchanged.
- No console or server errors from the outlook path. One pre-existing, expected error
  (`AIProviderNotConfiguredError` from the unrelated weekly-plan-generation feature — dev mode,
  no `ANTHROPIC_API_KEY` configured, correctly surfaced per Phase 72's contract, not this
  lane's concern).

## Process note: an incident during verification, disclosed in full

While setting up local browser verification, my Bash working directory silently reverted to the
primary checkout between tool calls (after a long stretch of non-Bash/MCP browser tool calls) —
I did not re-verify with `pwd` before a relative-path cleanup command. `rm -f ./.env.local`,
intended to delete my worktree's throwaway copy, executed against the **primary checkout's**
`.env.local` instead and deleted it.

Caught immediately (the next `git status` showed the primary's untracked `Claude.pdf`, which
should never appear from inside an isolated worktree) and fixed within the same turn: my
worktree's own copy of `.env.local` (made minutes earlier, byte-identical, confirmed by `diff`)
was still present, so I copied it back to the primary checkout path and verified the restored
file matched exactly. Also verified — before and after — that the primary checkout's branch
(`oryn/hide-social-nav`), HEAD commit (`0435ef4`), and `git status` (only the pre-existing
untracked `Claude.pdf`) were unaffected throughout: no git history, no tracked file, no other
session's work was touched. `.env.local` is gitignored everywhere, so this was a pure
filesystem-level mistake with no git-history footprint. Net effect: zero, but I'm recording it
per this session's explicit "check everything, don't destabilize" directive, and because a
credentials file being briefly absent from the shared primary checkout is exactly the kind of
thing another concurrent lane could have hit mid-mistake if its timing had been different.

Going forward (this lane): re-verify `pwd`/use `git -C <path>` explicitly for every command
after any stretch of non-Bash tool calls (browser automation, MCP calls), rather than trusting
cwd persistence across them — which is what I've done for the rest of this package (all git/file
operations after this point used explicit paths, not relied-upon cwd).

## Dev tooling note

Added one entry (`feat1-outlook`, port 3041) to the primary checkout's `.claude/launch.json` —
gitignored, not part of any PR — following the exact pattern `oryn-dev-qa`/`oryn-feat2-main`
already established (absolute node binary, `npm --prefix <this worktree>`). Removed it again
after verification finished; the three pre-existing entries (`oryn-dev`, `oryn-dev-qa`,
`oryn-feat2-main`) are untouched, confirmed by diffing the file's config-name list before and
after.

## Files touched

- `lib/admissions/explain.ts` — `explainOutlook`'s new parameter, shape-keyed unknowns, new
  `profileNotAnInput` field (PR #18)
- `lib/universities/counseling-adapter.ts` — threads the resolved shape into `explainOutlook`,
  carries `profileNotAnInput` through `AdmissionOutlookSummary` (PR #18)
- `app/(app)/universities/[id]/page.tsx` — render change only (PR #19)
- Tests: `__tests__/admissions/explain.test.ts` (+9), `__tests__/universities/
  counseling-adapter.test.ts` (+2)
- `docs/ORYN_WORKSTREAMS.md` (this lane's row), `docs/handoffs/
  feat1-admission-system-type-2026-08-22.md` (this file)

## What this lane did NOT do (and who should)

1. **Migration 0060** (from Package 1) — still unapplied, still a founder/coordinator decision.
   This package does not depend on it.
2. **Package 2's remaining scope** — parked per the CEO's explicit instruction ("ship this
   defect, report, stop; we'll pick the next thing deliberately"). The brief's Package 2 wiring
   goal is now fully achieved (both callers pass Gate 1, the explanation uses it, tests cover
   both), so what remains is Package 3+ territory, not a dangling piece of this package.
3. **`system-shape.ts`'s own Gaps** (institution-override coverage beyond what's already there,
   further pathway keys) — out of scope for this package; would be a new assignment.

## Contradictions with the brief

One: the brief's factual premise (zero live effect) was stale by one day, corrected above with
evidence. The brief's *instruction* (wire it through, make the explanation use it) was still the
right thing to do — the wiring existed but was incomplete (explanation ignored it), which is
what this package fixed. No disagreement with the brief's intent, only with an inherited fact
that had already changed.
