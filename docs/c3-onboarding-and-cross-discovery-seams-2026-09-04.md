# Two seams C3 named as out of scope — onboarding's internal handoffs, universities↔opportunities

Look-and-report only, per assignment. Nothing here touches product code. Method matched what
was asked: look at the seams between pieces, not the correctness of either piece alone.

## Bottom line

**Onboarding's internal steps don't lose data on back-navigation** — the good-news finding,
confirmed not assumed. Two small, low-severity UI-state resets exist (a search box, an import
method selector) but the underlying answers survive. Nothing is written to Supabase until the
final "Finish" click, with two narrow, already-flagged exceptions. One new-ish diagnostic write
(step-index tracking, landed this session) is a deliberate, well-documented design choice — not
a bug — but currently has zero readers anywhere in the app, worth knowing before anyone assumes
it already powers something.

**Universities and opportunities are genuinely, completely separate islands** — confirmed in
both directions, independently verified at the type-signature and query level, not inferred.
Targeting a university has zero effect on opportunity relevance; a university's page surfaces
zero opportunities. The schema itself doesn't make the join easy today — `target_universities`
stores no country or field, only a foreign key to `universities`/`university_programs`, which
nothing in the opportunities code joins through.

## 1. Onboarding's internal step-to-step handoffs

`features/onboarding/onboarding-wizard.tsx` holds all wizard state in one parent component (13
`useState` fields, lines 108-131) — only Screens 3 (interests) and 5 (CV import) are separate
components; Screens 1/2/4 are inline JSX reading the parent's state directly.

**Does an earlier answer ever influence a later screen?** No — confirmed by reading every
option list a student sees. `InterestsStep`'s own prop signature (`interests-step.tsx:10-16`)
takes only `interests`/`setInterests` — no `goals`, and the call site
(`onboarding-wizard.tsx:357`) doesn't pass it either, so there's no channel for Screen 1 to
reach Screen 3 even if the component wanted it. The interest-suggestion list, curriculum
options, and geography options are all static arrays, varying only by locale. Neither the
build spec nor any code comment asserts these steps *should* gate each other — this is a
factual finding about current behavior, not a claim that it's wrong.

**Back-navigation**: confirmed the answer data survives. Because state is lifted to the parent
and only the visible step swaps, returning to a previously-visited step shows exactly what was
there before. Two purely cosmetic exceptions: `InterestsStep`'s search box text resets on
remount (already-added interest badges don't), and `ImportStep`'s method selector
(`"choose"`/`"cv"`/`"manual"`) resets to `"choose"` on remount even though the underlying
reviewed CV data is intact — clicking "Upload CV" again skips straight back to the reviewed
list rather than re-prompting, so the data isn't lost, just the last-viewed screen state is.

**Abandonment**: confirmed nothing reaches `profiles` (or any answer-bearing table) until
`completeOnboarding` fires on the final "Finish" click
(`app/(onboarding)/onboarding/actions.ts:136-297`). Three exceptions, none of which write the
wizard's own answers:
- A step-index diagnostic write, added this session (`recordOnboardingStep`,
  `onboarding-wizard.tsx:182-189` / `actions.ts:320-328`) — fires on every `goNext`/`goBack`,
  writes only the bare step number to `profiles.onboarding_step`. Its own code comment
  (`actions.ts:299-317`) explains this is deliberate and scoped: built for future drop-off
  analysis, explicitly fire-and-forget, explicitly documented as read nowhere else in the app
  today. **Confirmed independently**: grepped the whole repo for `onboarding_step` — exactly 5
  hits (the type declaration, the two writes, and an unrelated privacy test asserting it must
  never leak to a public profile view). Nothing reads it back to resume the wizard; a returning
  student restarts from Screen 1 regardless of how far they got. Not a bug — the write's own
  comment says this in advance — but worth flagging as "collected, not yet consumed by
  anything," since that's easy to assume is already wired up once the column exists.
- Adding a custom school via "Can't find your school?" on Screen 2 writes a real row to the
  shared `canonical_entities` registry immediately (`lib/entities/resolve.ts:185-190`), before
  Finish — but it isn't linked to the student's profile until Finish, so an abandoned session
  after this step leaves an orphaned (harmless, unlinked) entity row.
- Uploading a CV on Screen 5 writes the raw file to the `cv-uploads` storage bucket immediately
  (`actions.ts:62-65`) — the *parsed* structured data stays in React state until Finish, so
  abandonment leaves an orphaned file but no structured profile data.

**One stale-doc finding, self-resolving**: `docs/onboarding-first-experience-audit-2026-09-04.md`
still says `onboarding_step` is written in exactly one place (the literal `"completed"`). That
was accurate when written; the `recordOnboardingStep` code's own comment explicitly names this
doc and states it's closing that exact gap. The doc just predates the fix — flagged, not
edited, per standing practice.

## 2. Universities ↔ opportunities cross-link

**Direction 1 — does targeting a university affect opportunity relevance?** No. The matching
engine's full input types (`StudentMatchProfile`, `OpportunityForMatching` —
`lib/opportunities/matching.ts:8-99`) have no university-derived field at all — independently
re-confirmed by grepping those exact 92 lines for "univers": zero matches. The sole writer of
`opportunity_matches` (confirmed via repo-wide grep for upserts against that table — exactly
one call site) is `refreshOpportunityMatches` (`lib/opportunities/persist-matches.ts:102-135`),
whose 6-table read list (independently re-read directly) is `profiles`, `profile_scores`,
`student_interests`, `opportunities`, `saved_opportunities`, `opportunity_matches` — no
`target_universities`. Even the action that adds a target university
(`app/(app)/universities/actions.ts`) never mentions opportunities and only revalidates
`/universities`/`/dashboard`, never `/opportunities`.

**Direction 2 — does a university's page surface related opportunities?** No. Both the
detail page (`app/(app)/universities/[id]/page.tsx`, 1005 lines, full section list read) and
the browse/explorer page (`app/(app)/universities/page.tsx`, 521 lines) were grepped for
"opportunit" — zero matches in either file.

**Where they come closest — the Advisor's merged action list — still doesn't cross-score
them.** `generateCandidateActions` (`lib/counselor/candidates.ts:97-99`, read directly) is a
plain concatenation of three independently-computed arrays:
`[...opportunityCandidates(state), ...requirementCandidates(state, locale), ...profileTaskCandidates(state, locale)]`.
`requirementCandidates` IS about targeted universities (their admission-requirement checklists)
but is a structurally different `CandidateAction` kind that never touches or weights
`opportunityCandidates`'s own computation — they're displayed together, not blended into one
score.

**Why this isn't a quick join even if someone wanted it**: `target_universities`
(migration `0007`) stores only `user_id`, `university_id`, `program_id`, `status`, `notes`, and
cached outlook fields — no country, no field of study. Those live on `universities.country` and
`university_programs.field`, requiring a join nothing in `lib/opportunities/*` performs today.
`opportunities` has its own fully independent `country`/`eligible_countries`/`fields` columns.

**What actually drives opportunity relevance today**, confirmed field by field: `profiles.country`,
`profiles.citizenship_countries`, `profiles.graduation_year` (→ age/grade gates),
`student_interests.label` (relevance), bottom-3 `profile_scores` dimensions (profile-need), and
`saved_opportunities` dismissal history. Never `target_universities`.

## What was not covered

- **Onboarding**: no live-render or RLS-behavior check of `recordOnboardingStep`'s actual write
  path (only static analysis) — same standing browser-access limitation as tonight's other
  passes. Didn't assess whether the two cosmetic UI-state resets (search box, import method
  selector) are worth fixing — that's a severity/priority call, not something this pass makes.
  Didn't check whether the orphaned custom-school-entity or orphaned CV-file cases cause any
  downstream problem (duplicate entities, storage cost) — flagged as existing, impact
  unassessed.
- **Cross-link**: didn't individually enumerate the ~40+ files that only `.select()` from
  `opportunity_matches` (read-only by construction, so none of them can be a second computation
  site — confirmed via the upsert-only grep above — but not walked one by one). Didn't review
  `lib/counselor/scoring.ts`'s final ranking step in line-by-line detail to confirm it applies
  no university-context boost specifically at that stage — confirmed the two candidate types are
  computed independently before ranking ever runs, which answers the question asked, but that
  file is the next one to check if a university-aware ranking *boost* (as opposed to a
  university-aware *input*) is the specific thing being ruled out.

Look and report only — no code changed. Which of these (if any) is worth fixing, and who does
it, is CEO's call per the assignment.
