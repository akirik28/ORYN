# C6 — does "knows what it doesn't know" actually hold?

Look-and-report, no code changed. Checked against real rendered UI, real production data,
and source — not source alone.

## Headline: stronger than the framing implied, with one real, separate divergence worth knowing

This surface is not unexamined. Every one of the three non-negotiables has code actively
defending it, with comments citing *specific, dated, already-fixed* bugs on exactly this
axis — one caught on the founder's own account. I did not find a place where one of the three
concepts is displayed as another. I did find a genuine, deliberate divergence from the
founder's own dashboard mockup, and it's worth him knowing about even though it isn't a lie.

## #11 — career profile score vs. admission probability

**The raw `profile_strength_score` number is not shown to a student anywhere in the live
product.** Grepped every non-preview surface: only `layout.tsx` and `dashboard/page.tsx`
reference it, and both explicitly avoid displaying it —

- `layout.tsx`'s own comment: *"The account menu used to render `profiles.profile_strength_
  score` straight from the row above. It now renders a qualitative read instead."* Live-
  checked what it shows now (`features/app-shell/user-menu.tsx`): "X areas strong" / "X areas
  assessed" — count, never the number.
- `dashboard/page.tsx`'s own comment: *"The aggregate `profile_strength_score` is still
  maintained and still drives ranking/snapshots — it is simply not what Home shows."*

**This is stronger than compliance requires — it avoids the confusion class instead of just
labeling around it.** But it's also a real divergence worth flagging, not silently endorsing:
the founder's own spec mockup shows "Career Profile / 77 / +3" as the dashboard's first,
most prominent element. Live-rendered the actual dashboard (`/design-preview/dashboard`,
fixture data, real component tree) — that number is not there. What's there instead: "Your
clearest gap right now is research" (a named dimension, not a score), "Areas assessed 9 ·
Already strong 5" (counts, not a score), and a per-dimension movement sentence
(`lib/scoring/change.ts`: *"Research is the area that moved most... 1 other area also moved
forward"*) replacing the single "+3" aggregate. `change.ts`'s own comment explains why: *"A
student cannot act on a mean of nine dimensions... two very different months produce the
same number."* A deliberate, reasoned redesign — but the founder should know his own mockup
isn't what ships, in case that was a change he'd want visibility into rather than one he'd
already signed off on.

## #12 — profile completeness vs. profile strength

Checked against a real account, not a hypothetical: queried live `profile_scores`/`profiles`
and found `user_id e9eba798-...` at **80% complete, strength score 2** — 9/9 dimensions
low-confidence, 6/9 with zero recorded evidence. Exactly the shape this non-negotiable
exists to prevent conflating.

The two are computed from genuinely separate inputs (completeness: profile *fields* filled
in — country, school, headline, skill count, etc., via `getCompletenessChecklist`;
strength/dimension scores: *evidence quality* per achievement) and render on different
surfaces with different visual language: completeness is a labeled progress bar + percent
("`page.completeness.percentComplete`") on the profile page; dimension state is a qualitative
radar + word-first list (`ProfileSignal`) directly below it, using "Strong / Developing /
Limited evidence / Not enough evidence yet" — never mixed into one number or one bar. Found
no surface presenting one as the other.

## #13 — application readiness vs. admission probability

`lib/applications/readiness.ts`'s own module comment states the distinction explicitly:
*"Deliberately NOT an admissions-probability signal — see lib/admissions/outlook.ts for that,
which is a separate concept computed from a separate model."* Confirmed the on-screen copy
carries the same sentence to the student, not just the code comment
(`applications/readiness.description`, en.json): **"Measures how much of your known checklist
is complete — not your chance of admission."** Sits directly under the percentage.

Also handles two honesty edge cases a naive percent would get wrong: `unmeasured` (nothing on
the checklist currently applies — "0%" would read as "did nothing" when the truth is "nothing
to measure") and `not_tracked` (once submitted, the checklist is self-reported and doesn't
retroactively update — a real submitted application sits at 1 of 8 items checked; the
percentage is hidden once status leaves the assembling phase rather than showing a stale,
accusatory-looking number next to "Submitted").

## The confidence-system claim — "Research score: 48, confidence: Low — because..."

**The product does not say this, literally — it goes further.** Rather than pairing a raw
score with a confidence label, `lib/scoring/signal.ts` implements a five-state qualitative
system (`not_assessed` / `limited_evidence` / `emerging` / `developing` / `strong`) where
**a low-confidence or unassessed dimension never shows a number at all** —
`features/dashboard/profile-signal.tsx` only prints the raw score when `isAssessed(state)` is
true, with its own comment naming exactly why: *"Printing '0' beside 'Not enough evidence
yet' asserts a measurement that never happened — the same confusion between absence and
weakness this whole model exists to end."* `evidence​StateFor`'s own comment addresses the
spec's literal framing directly: *"The dashboard deliberately does not show a raw 'Research:
42/100' as its primary read... it just isn't a good thing to say to a 16-year-old."*

So a genuinely low-confidence Research dimension shows **"Limited evidence"**, full stop — no
number, no percentage. This satisfies Phase 68's actual principle (know when you don't know,
say why) more conservatively than its own illustrative example, at the cost of that example's
literal wording. Worth naming as a real gap between spec text and shipped copy, even though
the shipped version is arguably the more defensible one.

## Near-miss worth naming: I almost mis-reported a working disclaimer as broken

A `grep` for "guarantee" against the university outlook page's admission-estimate disclaimer
(Phase 16.1's required *"This is not a guarantee or an official university probability"*)
initially looked English-only — the grep only surfaced the English branch of a ternary.
Reading the surrounding lines showed both branches: `locale === "tr" ? "...Bu bir garanti
veya resmi bir üniversite olasılığı değildir." : "...This is not a guarantee..."` — correctly
bilingual, matching the spec's wording closely in both languages, sitting directly under the
estimate range. Recording the near-miss rather than silently correcting it: a grep result is
not a bug report, and this session's own standing discipline is to read full context before
concluding something is broken — this is the reason that discipline exists.

## Historical bugs already caught on exactly this axis (why this surface reads as well-defended, not neglected)

- **2026-08-24, Gate 2 finding**: a 90%-complete profile whose single weakest dimension
  happened to be unassessed rendered the *identical* "there isn't enough recorded" copy as a
  genuinely empty profile — a false claim on a strong account. Fixed with a three-state hero
  (`claimable` / `rich_unclaimable` / `empty`) so "no single dimension stands out" and
  "nothing is known" are different sentences.
- **2026-08-31, the founder's own account**: evidence-count mislabeling — a block re-derived
  "assessed" and "no evidence yet" counts by hand instead of using the shared `isAssessed`
  predicate, and on a real 3-assessed/3-limited/3-nothing account printed "Areas assessed 6 ·
  No evidence yet 3" (true: 3 and 6).
- The account-menu raw-score removal (dated in the comment only as "used to," not pinned)
  covers the same failure class layout-wide.

None of these are hypothetical — each cites a specific account or a specific finding
document. This is a surface with a real debugging history on precisely the question C6 asked,
not one meeting scrutiny for the first time.

## What I did not find

No live surface where career-profile score, completeness, or readiness is displayed *as* one
of the other two. No surface asserting a confidence level the underlying data doesn't support.
If either exists, it wasn't found by this pass — reporting the negative plainly rather than
manufacturing a finding to justify the audit.
