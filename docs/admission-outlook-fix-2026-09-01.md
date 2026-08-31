# Admission outlook fix — 2026-09-01

Fixes the bug from `docs/fresh-install-audit-2026-08-31.md`: a brand-new student's first
target university computed and persisted a confident-looking outlook (e.g. "Extreme
Reach", "1–11% estimate, medium confidence") from zero profile signal. Per instruction:
fix the write path, count existing affected rows on live, clear nothing.

## The fix

**`lib/admissions/persist.ts`** — `refreshAdmissionOutlook` now fetches the same
`profile_scores` rows the dashboard hero reads, builds a `DimensionSignal[]` via the same
`toProfileSignal`, and gates on the same `hasConfidentSignal` predicate
`lib/scoring/dashboard-hero.ts` already uses:

```ts
if (!hasConfidentSignal(toProfileSignal(scoresRes.data ?? []))) {
  return null;
}
```

No confident signal → the function returns before `computeAdmissionOutlook` is ever
called, and the `target_universities` row is left untouched — no `outlook`, no
`estimate_range_low/high`, no `outlook_confidence`, no `academic_fit_score`/
`profile_fit_score` either (those were being written from the same `profileStrength ?? 0`
and would have been just as bogus). `OutlookBadge`'s existing `!outlook → "Not yet
assessed"` branch — present before this change, never reachable in practice because this
function always wrote a real value first — now does its job.

Exactly as instructed: no third state invented, no wider range, no lowered confidence
label. The honest answer when Oryn knows nothing is silence, which the badge already knew
how to render.

**`lib/admissions/outlook.ts`** — the confidence-derivation line itself
(`completeness_percent >= 60 ? "high" : "medium"`) is now the exported
`dataConfidenceForCompleteness`, a real three-band function (`>= 60` high, `>= 30`
medium, else low). Per instruction: "a two-way ternary with no low branch is wrong even
when there is data, just less visibly" — fixed for the populated case too, not only
gated around.

**`lib/universities/counseling-adapter.ts`** — one stale comment fixed as a direct
consequence of the above, not separate scope: this file's `profileDataConfidence` field
carried a comment admitting it was hand-copying `persist.ts`'s old inline ternary because
"that one-line rule isn't re-exported as its own function" — exactly the setup for two
copies drifting apart. It now points at the shared `dataConfidenceForCompleteness`
instead. (This function has no live caller today — checked directly, imported only by
its own test file — so nothing user-facing changes here; fixing the comment closes the
gap it explicitly flagged, now that closing it costs one line.)

Tests added: `__tests__/admissions/outlook.test.ts` gets full boundary coverage of
`dataConfidenceForCompleteness` (0, 29, 30, 59, 60, 100). The gate itself
(`hasConfidentSignal` composed with `toProfileSignal`) isn't independently re-tested at
the `persist.ts` level — both functions already carry their own dedicated test coverage
(`__tests__/scoring/signal.test.ts`, including the empty-array case), and this codebase
has no established pattern for mocking the Supabase server client at the unit level (no
existing `persist.ts`-shaped file has one) — inventing one for this single call site
would be new test infrastructure beyond what was asked, not a proportionate addition.

## How many existing rows are affected — counted, not cleared

`oryn-qa-scratch`: 18 `target_universities` rows total, 7 carry a non-null `outlook`,
across 4 distinct users. Pulled each of those 4 users' real `profile_scores` rows via
read-only query and ran them through the actual `toProfileSignal`/`hasConfidentSignal`
functions (not a hand-reimplementation of the logic) to get an exact, verified answer:

| User (first 8 chars) | Dimension states | Confident signal? | Rows |
|---|---|---|---|
| `026e9295` | academics **strong** (94, high-confidence, 3 reason codes) among others | **Yes** | 1 row — legitimate, not affected |
| `46dd6f7e` | 8 of 9 dimensions `not_assessed` (score 0, no reason codes); 1 `limited_evidence` | No | 3 rows |
| `49de3083` | all 9 dimensions `not_assessed` — a completely blank profile | No | 2 rows |
| `e9eba798` | 3 dimensions `limited_evidence` (real activity data, but low-confidence), 6 `not_assessed` | No | 1 row |

**6 of the 7 outlook-carrying rows were computed from a profile with no confident
signal — the bug, not a legitimate harsh assessment.** The 7th (`026e9295`, an AIME
qualifier with a 94-score, high-confidence academics dimension) has real signal; its
`extreme_reach` classification is this student's actual composite score against a
selective school's admission rate, unrelated to this bug, and is left exactly as is.

One thing worth surfacing rather than folding into the count silently: `46dd6f7e`'s three
rows include one classified `not_applicable` (Gate 1 — a geography-conditional
suppression, unrelated to profile completeness). That row is still bug-affected, because
`academic_fit_score`/`profile_fit_score` get written from the same `profileStrength ?? 0`
regardless of which `outlook` label results — a `not_applicable` classification doesn't
exempt a row from carrying bogus fit scores underneath it.

**Nothing has been cleared.** These 6 rows still carry their bogus outlook today. Once
this fix merges, they stay stale until either the affected student's profile actually
gains confident signal (at which point their *next* page view naturally recomputes and
overwrites it correctly — no cleanup needed for that student) or someone runs a
one-time `UPDATE ... SET outlook = NULL, ...` for the rows named above. Six rows, on a
scratch/QA project with no real students behind these four accounts — small enough to
clear by hand once a decision is made, not something this pass acted on unilaterally.
