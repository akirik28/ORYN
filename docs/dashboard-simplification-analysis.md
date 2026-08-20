# Dashboard "what matters now" analysis

Compiled 2026-08-20 by the UI-simplification workstream. Method: dashboard-view.tsx (current,
including Computer B's just-landed B4 commit) + `docs/ui-feature-preservation-matrix.md`'s
Counselor-capabilities section + live-confirmed rendering from the earlier `/design-preview`
pass. **Analysis only — no code changes in this doc.** `features/dashboard/dashboard-view.tsx`
and `app/(app)/dashboard/page.tsx` have live, active commits from Computer B as of this
writing (most recently B4 — a deterministic "This week" fallback so the dashboard is never
solely blocked on an AI call). Implementing anything below should wait for an explicit
go-ahead and a fresh collision check, not happen reflexively off this doc.

## Current modules, categorized

**Primary — always visible, front and center:**
- **Career Profile score + trend** (`ScoreRing`). The spec's own worked example leads with
  this; feature-preservation matrix rates it Primary, "spec's own example homepage leads with
  this."
- **Biggest gap**. The product's central differentiator per `MASTER-EXECUTION-STRATEGY.md`'s
  own North Star. Already paired tightly with the score in the hero card — correct, don't
  separate these.
- **"Your focus this week."** The whole "what should I do next" promise. Just got materially
  more reliable via B4 (AI plan → deterministic Counselor Core fallback → only then an empty
  state) — this should stay the single most prominent block below the hero.
- **Strengths** (computed in `dashboard-contract.ts` per the feature-preservation matrix, not
  yet rendered anywhere). Matrix rates it Primary — "'your strongest area' is explicit spec
  copy." Recommendation for whoever wires this in: pair it *with* Biggest Gap as a compact
  "Strongest: X · Weakest: Y" line rather than a new standalone card. The spec's own example
  ("Leadership is already one of your strongest areas... Research is currently your weakest
  gap") reads as one comparative statement, not two separate modules — and a new full card
  here would compete with "Your focus this week" for top-of-page attention, which is exactly
  the kind of "show everything we know" drift this pass is meant to avoid.

**Secondary — visible, but visually quieter, below the primary fold:**
- **Biggest improvement.** Positive reinforcement, not actionable — already correctly
  smaller/inline under the gap text, already conditional (`{biggestImprovement ? ... : null}`).
  No change.
- **University outlook.** Only relevant once a student has targets; already correctly placed
  in the lower two-column grid.
- **Opportunities preview.** Same reasoning — discovery-oriented, not "right now"-oriented.

**Collapsed/progressive — the one real finding in this pass:**
- **"Due soon."** This currently duplicates information already shown per-action: both the AI
  `WeeklyFocus` cards and the new `CounselorWeekFallback` cards already render a
  `DeadlineBadge` inline on any action that has one (confirmed in both components' source).
  A student can see "Apply to the Economics Challenge — 6 days left" once in the focus block
  and again, identically, in "Due soon" right below it. Recommend: only list a deadline in
  "Due soon" if it is *not* already attached to a currently-rendered focus action — collapse
  to a single compact line when everything urgent is already covered above (e.g. "Nothing
  else due in the next two weeks" or a slim link to the full calendar), and only expand to a
  visible list for deadlines the focus block doesn't already surface. This removes duplicated
  reading, not information — every deadline stays reachable.

**Contextual only — already correct, confirmed, no change needed:**
- **"One thing not to do."** Already conditionally rendered only when an active
  avoid-for-now recommendation exists. This is precisely right and was already built this
  way before this pass.
- **The "AI Advisor isn't configured" empty state.** Now the last resort after B4's
  deterministic fallback, which is the correct ordering — contextual for a genuine edge case
  (brand-new profile, not enough signal for Counselor Core either) rather than the common
  path it used to be whenever `ANTHROPIC_API_KEY` was absent.

## Visual hierarchy — the "premium, spacious, engaging" angle

The current build already gets real premium signal right: generous whitespace, serif
headline type for the score/greeting, a gradient hero card, restrained color. Confirmed live
via `/design-preview` earlier this session. The one gap: **every section below the hero uses
near-identical card treatment** (`rounded-xl border p-5`), so the page doesn't visually
communicate "these three things matter a lot, these two are worth knowing" the way the
primary/secondary split above says it should. A real 2-tier visual language would help: the
hero and "Your focus this week" reading as unmistakably the point of the page, and the
outlook/opportunities grid reading as quieter, smaller-scale, "browse when you're ready"
material — through weight and spacing (which this system already has real tokens for, e.g.
`rounded-2xl` vs `rounded-xl`, `--brand-primary-subtle` washes), not new colors or components.
Concrete, not implemented here.

## What this pass deliberately did not do

Did not touch `dashboard-view.tsx` or `app/(app)/dashboard/page.tsx` — both have Computer B's
live, in-progress commits (B4 landed while this analysis was being written; Strengths
rendering is likely still coming). Did not invent a new "Strengths" UI ahead of Computer B's
own data-layer work landing. Did not propose removing any capability — "Due soon" collapses
its *presentation*, not its data; every deadline stays a click away.

## Suggested next step

Once Computer B's dashboard-contract work settles (Strengths rendering lands, or a checkpoint
confirms no more dashboard-view.tsx changes are queued), implement: the Due-soon dedup, the
Strengths+Gap pairing (coordinate with whoever wires Strengths in, if not already claimed),
and the 2-tier visual weight pass. Small, independently reviewable changes, not one rewrite.
