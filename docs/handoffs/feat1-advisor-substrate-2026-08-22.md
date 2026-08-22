# Handoff: FEAT-1 Package 4 — the advisor's substrate now carries what the schema already knows

STATUS: **Code complete, gate green, PR not yet opened as of this file — opened immediately
after.** Fresh worktree off `origin/main`@`eec6deb` (`db403e6` per the CEO's own message had
already advanced by the time I fetched — verified via `git fetch`+`git log`, not assumed;
`db403e6` confirmed an ancestor of `eec6deb`, so the report was accurate when written, not
wrong). `npm ci`'s clean-vs-cloned question: verified myself before choosing —
`package-lock.json` is byte-identical between the primary checkout and `origin/main` (zero
diff lines), and disk was at 6.0Gi/98% free at the time, so hardlink-copied `node_modules`
from the primary checkout rather than running another full `npm ci` (net disk cost: ~0.1Gi,
vs. the ~0.9-1Gi a fresh `npm ci` cost in Package 3). Gate: lint clean, typecheck clean,
**133 files / 1970 tests** (+2 files, +12 tests over the 131/1958 baseline the CEO reported
after Package 3 merged), `npm run build` succeeds.

## The defect, restated precisely (Package 3's Finding 1, now fixed)

`lib/ai/student-context.ts` collapsed the four-value `EvidenceStatus` enum
(`self_reported | evidence_added | verified | verification_rejected`) to a boolean
(`evidence_status === "self_reported"`). `lib/scoring/assemble-facts.ts` pulls every row via
`select("*")` with no verification filter. Net effect: a `verification_rejected` claim — one
a human reviewer actively checked and did **not** confirm — reached the live advisor chat
and weekly-plan generator with the exact same textual certainty as a `verified` one, and
contributed to the student's dimension scores exactly as if it were true. Per the CEO's own
framing: this is worse than a UI mislabel, because the student has no visibility into what
the advisor silently assumed.

## Design, and where I pushed back on the CEO's starting position

The CEO's starting position: "`verification_rejected` rows should be excluded from scoring
entirely... `self_reported`/`evidence_added` included but distinguishable." I traced every
consumer of `assembleScoringFacts` before implementing (`lib/scoring/persist.ts`,
`lib/ai/student-context.ts`, `lib/counselor/state.ts`, `app/(app)/profile/page.tsx`, all 9
dimension scorers, `lib/scoring/completeness.ts`) and found the exclusion **cannot** live in
`assembleScoringFacts` itself, contrary to where the CEO's message pointed by naming that
file: it is one shared function backing the student's **own profile page** (which must still
show a rejected item so the student knows to fix/resubmit it) and the **completeness
checklist** (a "does Oryn know enough" measure, Phase 67 — a different question from "should
this count toward a strength score"). Filtering there would have silently broken both.

Resolved design, two tiers:
1. **`lib/scoring/index.ts`** — new `excludeRejectedForScoring`, applied once inside
   `computeCareerProfile` (the actual function `lib/scoring/persist.ts`'s real persist path
   calls), across all seven `ScoringFacts` collections that carry `evidence_status`
   (activities, awards, certifications, projects, research/volunteering/work experiences).
   `assembleScoringFacts` itself is **unchanged** — profile page and completeness checklist
   see the full, unfiltered data exactly as before.
2. **`lib/ai/student-context.ts`** — carries the real `EvidenceStatus`, not a boolean, into
   `StudentAdvisorContext`. The advisor's own context is **not** filtered (unlike the scorer)
   — a rejected item stays visible so the advisor can say something honest if asked about it
   directly, rather than having no idea it exists. `formatContextForPrompt`'s `tag()`
   mechanism (per the CEO's explicit instruction — extended, not paralleled) now renders all
   three non-default states distinctly: `[self-reported]`, `[evidence added, not
   independently verified]`, `[verification rejected]`; `verified` stays the silent default,
   unchanged.
3. **`lib/ai/advisor-prompt.ts`** — three new sentences explaining each tag, including an
   explicit instruction never to use a `[verification rejected]` item as evidence of
   anything, and to say so plainly if the student asks about it directly.

This means: a rejected claim no longer inflates a score, and no longer reads as confirmed to
the advisor — but it also doesn't vanish from the advisor's awareness entirely, so the
product can still give an honest answer if a student asks about their own rejected entry.

## Tier 2 (bundled per the CEO's instruction — same theme, one line)

`lib/counselor/scoring.ts`'s `scoreRequirementCandidate`: the "referenced requirement not
found in state" branch defaulted to `DATA_CONFIDENCE_SCORE.medium` (60/100) where its sibling
branch (`scoreOpportunityCandidate`, same "shouldn't happen" shape) honestly defaults to
`.low` (20/100). Changed to `.low` for consistency; absence of data should never read as a
real, moderate confidence level. Added a regression test — the existing test exercising this
branch (`state([])`, i.e. `requirementCandidateInputs: []`) asserted only score/eligibility,
never `confidence`, so the inconsistency had no test coverage before this.

## Existing-profile score-shift measurement — BLOCKED, not silently skipped

The CEO explicitly asked: *"If (2) turns out to change scores for existing profiles, say so
explicitly... with a measurement of how many and by how much."* I attempted exactly that —
a read-only `SELECT count(*) ... WHERE evidence_status = 'verification_rejected'` across all
seven affected tables against `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), grouped to also
count distinct affected `user_id`s. **This session's own permission classifier denied the
query.** Per this org's rule 16 ("a permission block on one session is never a task to be
reassigned") I did not retry the identical call and did not ask a peer session to run it on
my behalf — both would be exactly the permission-laundering pattern rule 16 exists to
prevent. I have **not fabricated or guessed a number**; I genuinely do not know whether zero
profiles or many are affected, or by how much, as of this handoff. This needs either a
session/tool with that permission, or the founder directly, to run the query above (or an
equivalent) before this fix's live-data impact is fully known. Flagging this prominently
rather than letting the PR's silence read as "checked, zero impact" (rule 20).

## Files touched

- `lib/scoring/index.ts` — `excludeRejectedForScoring` + its use in `computeCareerProfile`
- `lib/ai/student-context.ts` — `EvidenceStatus` threaded through `StudentAdvisorContext`,
  `formatContextForPrompt`'s tag mechanism extended to all four states
- `lib/ai/advisor-prompt.ts` — three new instruction sentences
- `lib/counselor/scoring.ts` — `.medium` → `.low` fallback fix
- Tests: `__tests__/scoring/index.test.ts` (new, 4 tests), `__tests__/ai/
  student-context.test.ts` (new, 7 tests), `__tests__/counselor/scoring.test.ts` (+1
  regression test)
- `docs/ORYN_WORKSTREAMS.md` (this lane's row)

No schema change, no migration — every field this uses already exists live.

## What this package did NOT do (rule 20)

- **Did not measure the live score-shift impact** (see above — blocked, not skipped).
- **Did not touch `lib/counselor/state.ts`'s completeness checklist or `app/(app)/
  profile/page.tsx`** — deliberately, both still see unfiltered facts including rejected
  items, per the design reasoning above.
- **Did not re-run Package 3's full audit** — this package fixed exactly Finding 1 and Tier
  2 from that audit; the two items Package 3 flagged as "already known, not new" (the
  `computeProfileNeedScore` hardcoded binary and the opportunity-extraction confirmed-open
  gap) were out of this package's assigned scope and remain untouched.
- **Did not verify in a browser** — this is a prompt-text/scoring-math change with no
  rendered UI surface of its own (the advisor's chat/weekly-plan output is free-form AI
  text, not a fixed UI element to screenshot); verification here is the test suite plus the
  measurement attempt above, not a visual check.
