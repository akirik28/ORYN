# "Unknown" scoring as "worst" — measured, not fixed, per explicit instruction

CEO's framing: the Phase 12 follow-up found that `evidenceStateFor()` returns `"not_assessed"`
whenever a dimension's `reason_codes` is empty, and live `profile_scores` shows a deterministic
split — every row with empty `reason_codes` scores exactly 0, every row with real evidence has
a real score. Since "weakest 3 dimensions" ranks by raw score, an evidence-free (score-0)
dimension will win that ranking whenever a student has one. The two questions asked, in order:
how many students does this actually touch, and what does the affected student's home screen
literally say. No fix proposed here — measurement only, as instructed.

## 1. How many students

Ranked each student's `profile_scores` rows by score ascending (the exact `rankDimensionGaps`
method) and checked the top 3 for `reason_codes = '[]'` (score-0, evidence-free by
construction):

```
8 students have any profile_scores at all.
7 of 8 (87.5%) have at least one evidence-free dimension in their weakest 3.
7 of 8 (87.5%) — the SAME 7 — have their single #1 weakest dimension be evidence-free.
```

Per-student detail (the one dimension that would be named "your weakest area" if nothing
guarded against it):

| user_id (truncated) | dimension named | score | evidence-free |
|---|---|---|---|
| 026e9295 | community_impact | 0 | yes |
| 46dd6f7e | awards_distinction | 0 | yes |
| 49de3083 | leadership | 0 | yes |
| 6e2f0ff1 | community_impact | 15 | **no — the one clean case** |
| 7722ebe9 | execution_project_depth | 0 | yes |
| 96f3274c | entrepreneurship | 0 | yes |
| ccf2161e | entrepreneurship | 0 | yes |
| e9eba798 | intellectual_curiosity | 0 | yes |

Seven different dimensions affected, not one recurring outlier — this is a property of the
mechanism, not a quirk of one dimension's scoring.

## 2. What the affected student's screen actually says — two surfaces, two different answers

**Dashboard home hero (AGENTS.md's own "Biggest Gap" block) — already guarded, found by
reading `lib/scoring/dashboard-hero.ts` before assuming anything.** `computeDashboardHeroState`
calls `canClaimGap()`, which requires the named dimension's state to be `isAssessed`
(`emerging`/`developing`/`strong` — `not_assessed` and `limited_evidence` are excluded). For
all 7 affected students, the literal weakest dimension fails that check, so the hero falls
through to `kind: "rich_unclaimable"` instead of naming it. This exact failure mode was already
found and fixed once — the file's own comment documents it hitting the **founder's own real
account on 2026-08-31** ("Awards 100 / Leadership 'Nothing yet'... Home was the one
contradicting the others"). The sentence a tainted student actually sees on their home screen,
quoted verbatim from `features/dashboard/dashboard-view.tsx`:

> **Proxola can't name your clearest gap yet.**
> The area that currently looks weakest is one Proxola has too little evidence to judge, so
> ranking it as your gap would be guessing. {N} of {total} areas are in that position — filling
> even one of them in is what turns this into a real answer.

Turkish (not a translation of the English — the file's own comment is explicit that the Turkish
was written to carry the same admission of limitation, not read as more confident than it):

> **Proxola henüz en belirgin boşluğunu söyleyemiyor.**
> Şu an en zayıf görünen alan, Proxola'nın karar verecek kadar kanıta sahip olmadığı bir alan —
> bu yüzden onu boşluğun olarak göstermek tahmin olurdu. {total} alandan {awaitingEvidence}
> tanesi bu durumda; birini bile doldurmak bunu gerçek bir cevaba dönüştürür.

**This is the headline "Biggest Gap" promise AGENTS.md Block 3 describes, and it is not
currently making the false claim CEO's question worried about.** The specific sentence "your
clearest gap right now is {X}" only ever renders when `canClaimGap` passes.

**Opportunity card's "addresses a current gap" sentence — a second, live, already-shown
surface, NOT guarded.** `reasonSentence()` (features/opportunities/opportunity-card.tsx)
renders "it addresses a current gap in your profile" whenever `reason_codes` contains
`addresses_a_current_gap`, which `buildReasonCodes` (lib/opportunities/persist-matches.ts:500)
sets whenever `profile_need_score >= 70` — itself true whenever `computeProfileNeed`'s
`matchedDimensions` (an opportunity-category ∩ student's weakest-3 intersection) is non-empty.
This computation has no `canClaimGap`-equivalent check anywhere — it doesn't ask whether the
matched dimension is actually assessed, only whether it's a member of the raw weakest-3.
Measured directly: of the 7 tainted students, **6 have at least one eligible opportunity match
carrying this exact reason code, 722 such cards total.** One caveat, itself a finding: unlike
the dashboard hero, `computeProfileNeed` never records *which* dimension triggered the claim —
only a boolean gate feeds `reason_codes`. That means a clean per-card audit of "how many of
these 722 specifically cite the evidence-free dimension vs. a different, genuinely weak one in
the same student's weakest-3" isn't possible without instrumenting the matching function itself
to record the dimension name, which it doesn't do today.

## Summary

The specific claim CEO's question named ("your clearest gap is X") is already protected on the
one surface AGENTS.md's own spec describes it for, by a fix already shipped five days ago after
the identical bug hit a real account. The same underlying conflation — an unscored dimension
reads identically to a genuinely weak one, because both produce a raw score of 0 — reaches
students through a second, adjacent, unguarded surface today: 722 live opportunity cards across
6 students carry a "this addresses your gap" claim built from the same unguarded weakest-3
selection the dashboard hero was specifically patched to stop trusting blindly.

No fix proposed, per instruction — CEO's own framing names the two live options (exclude
evidence-free dimensions from selection, or select them and say something honest instead, the
way the dashboard hero already does) as a decision to make once this measurement is in hand.
