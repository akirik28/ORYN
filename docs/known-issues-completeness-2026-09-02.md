# known-issues.md completeness pass — 2026-09-02

**Status:** documentation only, one file changed (`docs/known-issues.md`), gates green
(typecheck/lint/3656 tests). **Author lane:** oryn (this session), at oryn-a7's request,
following the doc-staleness pass earlier tonight (`docs/doc-staleness-audit-2026-09-02.md`).
**Branch:** `oryn/known-issues-completeness-2026-09-02`.

## The gap this closes

The earlier staleness pass verified every *existing* claim in `known-issues.md` against
live state. It did not check whether the file was *complete* — and it wasn't: roughly 25 of
tonight's ~40 merged packages produced their own dated handoff doc under `docs/` but had no
corresponding entry in `known-issues.md`. A finding a lane deliberately named-and-did-not-fix
was sitting only in a handoff doc nobody not already following the fleet's own git history
would find.

## Method

Enumerated every doc added to `docs/` since the third staleness pass (30 total, via
`git log --diff-filter=A --name-only -- 'docs/*.md'`), read each one, and extracted only what
its own lane named as unfixed. **Not re-derived** — where an entry below cites a doc's
finding with no independent re-verification, that's deliberate, per the assignment. A
fixed-in-the-same-package finding was excluded entirely; that stays in git history, not this
file, matching this file's own established convention.

The one thing checked across docs rather than trusted from any single one: whether a later
package resolved an earlier package's named-but-open question. **Four such cases found**,
all recorded inline in the new section rather than only here:

1. `cron-auth-path-verification-2026-09-02.md` (04:24) confirmed the founder-morning-runbook's
   (04:10) "4 unscheduled job routes, undetermined if intentional" was actually deliberate —
   each route self-documents it in its own top comment.
2. `handoffs/structured-usage-migration-2026-09-02.md` (06:02) confirmed the 3 features
   `handoffs/spend-artefact-sweep-2026-09-02.md` (05:07) flagged as "not migrated to
   `withUsageLogging`" were in fact migrated, in a later package from the same lane.
3. `scheduled-review-audit-2026-09-02.md` built exactly what `progress-history-audit-2026-09-02.md`
   had named as entirely unbuilt (Phase 41's "or scheduled review" half) — though the result
   is only half-resolved: built, tested, and manually triggerable, but deliberately left
   unarmed, the same founder-gated-unarmed pattern as every other Phase 30 job.
4. `handoffs/migration-0058-social-layer-audit-2026-09-02.md` corrected — not just
   resolved — a factual claim from `age-gate-mechanism-verification-2026-09-02.md`: the
   latter called `lib/social/public-profile-authorization.ts` "dead code, zero live
   callers," which was wrong at the file level (most of it is live, wired into `/u/[id]`).
   A different sub-type from the other three: a later lane correcting an earlier lane's
   claim, not just building what it left undone.

Two items from CEO's own seed list had no findable source doc in the 30. Checked both
directly rather than dropping them silently:

- **"137 unmerged branches"** — confirmed, close enough to exactly right: `git branch -r
  --no-merged origin/main` reads 136 today (this moves constantly as the fleet pushes and
  merges all night).
- **"`product_events`' two absent event types"** — could not confirm as stated. Every one
  of Phase 52's 10 named events has a real `logEvent()` call site today, including
  `opportunity_saved`/`opportunity_applied` (both written via a ternary that's easy to miss
  on a first grep). Recorded as a mismatch for CEO to clarify, not forced into a fabricated
  match.

## A near-miss, caught before this went out — two docs missed by the original enumeration

The original doc list was enumerated once, early in this pass, against `origin/main` at
that moment. `origin/main` kept moving (this fleet pushes and merges roughly every twenty
minutes), and two docs landed after that snapshot: `docs/unmerged-branch-audit-2026-09-02.md`
and `docs/what-a-student-cannot-do-yet-2026-09-02-v2.md`. Both would have been silently
missed had a routine step at the end — checking this session's own memory index before
finalizing — not surfaced them: `MEMORY.md` already carried a summary of the branch audit's
real finding (58 real survivors, not the raw 137), which didn't match what this pass's own
first-draft entry said (a shallow `git branch -r --no-merged` count with no source doc). That
mismatch is what triggered re-running the doc enumeration fresh against current
`origin/main` rather than trusting the original snapshot — which surfaced both missed docs.

Both turned out to matter. The branch audit replaces this pass's own shallow branch-count
line with the real finding (patch-ID elimination, 58 survivors, the confirmed-real
skills-taxonomy gap, the S5/S6/S7 opportunity research). The MVP re-measurement doc
(`what-a-student-cannot-do-yet-v2`) contains what is arguably the single most important
finding of the whole night: **the product's own act → reflect → advisor-adjusts loop
(Phase 10) has never once been observed working end to end**, across two independent
measurements ~150 commits apart — 0 completed actions, 0 reflections, unchanged. It also
corrected this session's own earlier `docs/portfolio-audit-2026-09-02.md` on a specific
column count (7 of 9 tables have `evidence_status`, not 8 of 9).

**The lesson, worth stating plainly rather than filing away**: a one-time doc enumeration
against a fast-moving `origin/main` goes stale within the same pass that produced it, and a
memory cross-check — not just a fresh re-scan — is what caught it here, since the mismatch
between "my own draft entry" and "what memory already knew" is what prompted the re-scan in
the first place, not a scheduled recheck.

## What was added

One new top-level section in `docs/known-issues.md`, positioned after the existing "Third
staleness pass" block and before "ORYN has never been deployed," titled **"Fourth pass,
2026-09-02: closing the gap between tonight's ~40 merged packages and this file."** Four
subsections:

- **Real, named gaps** — grouped by area (AI spend/cost, security/age enforcement,
  opportunities, scoring/progress, deadline/reason-codes freshness). 16 entries, each
  citing its source doc directly, no entry re-deriving a finding. Includes the reflection-
  loop finding (its own subsection, given its weight) and a correction to this session's
  own portfolio-audit entry (7 of 9 evidence-linkable tables, not 8 of 9).
- **Well-built, never exercised** — the section oryn-a7 asked me to consider, kept separate
  from "broken" on purpose. Four features: `research_generator`, `counselor_explanation`,
  `essay_story_bank`, and busy mode (Phase 65) — all reachable, correctly wired,
  student-facing, and genuinely never used by any real student in the population that
  exists today. Distinguished explicitly from the pre-existing "ORYN has never been
  deployed" section, which already covers the *background-job* side of "never run" —
  this section is specifically about features a logged-in student could reach today and
  simply hasn't.
- **Two items with no source doc** — the branch-count and `product_events` findings above,
  flagged as directly-checked rather than doc-sourced, one confirmed and one not.

## What this deliberately does not do

- No new claim re-verified against live state beyond the two seed items with no source doc
  — every other entry is exactly what its originating lane already established, cited
  rather than repeated with new evidence.
- No entry added for a finding already fixed in the same package that found it (research-
  generator's three fixes, progress-history's two fixes, the university-data-depth honesty
  fix, the browse-page follow-through, the $2.97 burst fix, etc.) — all of that stays in
  git history and each package's own handoff doc, per this file's standing convention.
- Did not edit `docs/founder-blocked-backlog.md` or any other founder-facing decision doc —
  out of scope, same flag-don't-edit convention this file already applies to itself.

## Verification

```
typecheck   clean
lint        clean
test        3656 passed (260 files)
```

Build not run — this is a documentation-only change with no code touched; nothing in it can
affect the Next.js build output.
