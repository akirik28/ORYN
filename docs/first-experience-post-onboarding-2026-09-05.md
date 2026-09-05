# What a brand-new student sees — measured, not coded, per explicit instruction

CEO's framing: today's correct fix (opportunity cards no longer claim an unassessed dimension
as "your gap") measurably degraded 6 of 8 *existing* students' "3 priorities this week" promise
— but nobody had checked the more extreme, more common case: a student who just finished
onboarding with zero activities at all. Three questions, answered by reading the real code and,
where the logic is a pure function, executing it directly rather than reasoning about it.

## 1. Onboarding: which collected fields are never read again?

Two prior audits already exist and were re-verified rather than redone —
[docs/onboarding-audit-2026-09-02.md](./onboarding-audit-2026-09-02.md) and
[docs/onboarding-first-experience-audit-2026-09-04.md](./onboarding-first-experience-audit-2026-09-04.md)
— both confirm the five screens match Phase 3's spec, in order, with calm Turkish copy and a
clean mobile layout. Only one small, already-known issue remains open (Enter-manually/Skip
share identical copy) — not data-related, not touched here.

**The field-read question is new.** `completeOnboarding` (`app/(onboarding)/onboarding/
actions.ts`) writes: `profiles.{country, school_name, school_entity_id, graduation_year,
birth_year, curriculum, curriculum_other_text, target_geographies}`, `career_goals` (optional),
`student_interests` (optional), `education_records` (mirrors school/curriculum), plus CV-import
tables when a CV was uploaded. Checked every one against today's own dead-column audit
(`docs/dead-column-audit-2026-09-05.md`) rather than re-deriving it:

- **Read, confirmed real consumers**: country, school_name, school_entity_id, graduation_year,
  birth_year, curriculum, target_geographies (fixed earlier today), career_goals.title
  (profile page, story-bank, search, scoring facts), student_interests (profile actions,
  matching, social matching, AI context, scoring facts).
- **Collected but not read from the right place — already found and reported today**:
  `curriculum_other_text`. Every real reader is wired to `education_records`' twin column, not
  `profiles`'. Not a new finding — flagging it here only because it's onboarding-collected and
  the question was "how many," so it belongs in this count.
- **One, not more.** No second instance of the `target_geographies` shape turned up.

## 2. What the dashboard shows immediately after onboarding, zero activity

**Hero.** Proved by direct execution, not argument — `computeDashboardHeroState` is a pure
function, so it was called with a real fresh-account `DimensionSignal[]` (all 9 dimensions,
`evidenceStateFor(0, ..., hasEvidence=false)` — the exact shape `recomputeCareerProfile`
produces when there is nothing to score, confirmed this morning: every `profile_scores` row
with empty `reason_codes` scores exactly 0):

```
computeDashboardHeroState(freshAccountSignal, biggestGap, "en") →
{ "kind": "empty", "gapLabel": null }
```

This is the **third** hero state — distinct from both `claimable` and the `rich_unclaimable`
state today's canClaimGap fix is about. Its copy (`features/dashboard/dashboard-view.tsx`'s
final `else` branch): *"Tell Proxola what you've done, and it will tell you what to do next... 
Right now there isn't enough recorded for it to say anything it could stand behind — that's a
gap in what Proxola knows, not a judgement about you."* Calm, honest, matches AGENTS.md §3's
"must not feel like a government form" bar.

**This directly answers whether today's cap emptied a new student's screen: no.** A zero-
activity account was never in the `claimable`/`rich_unclaimable` population the fix touches —
it has zero confident signal on any dimension, so it landed in `kind: "empty"` before today's
fix and lands there identically after it. The fix's real cost is what CEO already measured
(existing students losing ground they'd had), not a new hole for brand-new students.

**"This Week" (3 priorities).** Three real states, not two — traced in
`dashboard-view.tsx`: an AI-generated plan (`hasAiPlan`), a deterministic Counselor Core
fallback (`usingCounselorFallback`, real eligible candidates ranked with zero AI), or — when
neither exists — a genuine `EmptyState` component, not a blank section:

> **"No weekly plan yet"** — *"Add a few things to your profile and Proxola will generate your
> first weekly plan."* — with a real "Generate my plan" button.

Not fabricated, not silent. **One thing this pass could not fully pin down by execution**: for
a student who picked at least one interest during onboarding (screen 3, optional), whether
`getCounselorState` actually surfaces real fallback candidates depends on whether any live
opportunity gets a genuine match against that interest — plausible from reading
`computeOpportunityMatch`, but not run end-to-end here the way the pure hero-state check was.
Flagging the gap in confidence explicitly rather than presenting it as equally proven — a
fresh account that skipped the interests screen entirely will reliably hit the honest
`EmptyState` above; one that picked interests *might* see the counselor fallback instead, and
this pass didn't execute that path to confirm.

## 3. When are profile scores computed on zero data — real number, or honest "not enough"?

**`recomputeCareerProfile` runs unconditionally at the end of onboarding**, regardless of
whether any activity/award/project/research exists (`app/(onboarding)/onboarding/actions.ts`
line 289, inside the same `runSecondaryWrites` block as the optional CV import — it fires even
if nothing else in that block had anything to write). It does not skip on empty input.

**It does not fabricate a score.** Confirmed two ways: this morning's live query already
established that every `profile_scores` row with empty `reason_codes` scores exactly 0 (a
mechanical fact of the scoring functions, not a coincidence), and `evidenceStateFor`'s own
logic — proven above via direct execution — checks `hasEvidence` *first*, before ever looking
at the score number, and returns `"not_assessed"` immediately when there's nothing behind it.
A 0 score is written (so ranking/sorting downstream has something numeric to compare), but
every reader that shows the *qualitative* state (`ProfileSignal`, the dashboard hero, the
"Areas assessed"/"No evidence yet" coverage stats) reads the honest `not_assessed` label, never
the bare number as if it meant something. This is the same "completeness vs. strength" and
"score 0 ≠ confirmed weak" discipline AGENTS.md §67/§68 and today's earlier weakest-dimension
work both describe — holding for the actual zero-data case, not just the partial-data one
already measured.

## Summary

The product's very first promise — onboard, land on a home screen, see three priorities — is
not silently broken for a brand-new student by today's correct fix. What a zero-activity
account gets instead, everywhere checked, is an honest "not enough yet" state with a real next
action, never a fabricated number or a blank hole. The one real, if minor, gap found here is
`curriculum_other_text` — already reported today, not new. The one thing left unconfirmed by
execution (rather than by reading) is whether picking interests during onboarding is enough by
itself to produce a real Counselor Core fallback instead of the empty-plan state — a natural
next check if it matters for launch, not run here.
