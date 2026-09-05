# Opportunity cards claiming an unassessed dimension as "your gap" — measured, fixed, one decision open

Follow-up to `docs/weakest-dimension-evidence-gap-2026-09-05.md` (a different lane's own
measurement), which found the dashboard hero's "biggest gap" claim is already guarded by
`canClaimGap()` (fixed 2026-08-31, after hitting the founder's own account) but a second,
adjacent surface — the opportunity card's "it addresses a current gap in your profile"
sentence — has no equivalent guard. That doc could not say how many of the 722 live cards it
found actually named the tainted (unassessed) dimension versus a genuinely weak one, because
`computeProfileNeed` never recorded *which* dimension a claim was about — only a boolean fed
into `reason_codes`.

## 1. Making the mechanism visible

`OpportunityMatchResult.matchedGapDimensions` (`lib/opportunities/matching.ts`) already carries
the real dimension list in memory — it just never reached `buildReasonCodes`, and nothing
persists it. `lib/opportunities/persist-matches.ts` already builds an `evidenceStateByDimension`
Map for a different purpose (`resolveMatchConfidence`, the `match_confidence` column) from the
exact same `profile_scores` read `weakestDimensions` uses — so the real per-dimension
`EvidenceState` was one query away, not new instrumentation. Restructured that computation into
a real `DimensionSignal[]` (`profileSignal`) first, with `evidenceStateByDimension` now derived
from it rather than computed separately, and threaded `profileSignal` into `buildReasonCodes` as
a new required parameter — the same object shape `canClaimGap` (`lib/scoring/signal.ts`) already
expects, since CEO's instruction was to reuse that function directly, not re-derive its logic.

## 2. Measurement

Live query (2026-09-05), the 6 tainted students named in the other lane's table (all except the
one clean case, `6e2f0ff1`): their `profile_scores` rows, and every currently-stored
`opportunity_matches` row carrying `addresses_a_current_gap`, grouped by opportunity category.
Fed into a script calling the real, unmodified `rankDimensionGaps`/`evidenceStateFor`/
`canClaimGap`/`CATEGORY_DIMENSIONS` — not hand-reasoned — to classify each (student, category)
group as groundable (at least one matched dimension passes `canClaimGap`) or not.

```
{
  "totalCards": 562,
  "groundedCards": 0,
  "ungroundedCards": 562,
  "cardsWithZeroWeakestMatch": 3,
  "pctUngrounded": "100.0"
}
```

**100% of the 562 cards currently live for these 6 students name a dimension `canClaimGap`
refuses.** Per-student detail — every one of the 6 has their *entire* weakest-3 fail
`isAssessed`, not just the single rank-1 dimension the other lane's table named:

| student | weakest-3 (rank order) | any claimable |
|---|---|---|
| 026e9295 | entrepreneurship (not_assessed), community_impact (not_assessed), research (limited_evidence) | no |
| 46dd6f7e | academics, intellectual_curiosity, leadership (all not_assessed) | no |
| 49de3083 | academics, intellectual_curiosity, leadership (all not_assessed) | no |
| 7722ebe9 | research, entrepreneurship, execution_project_depth (all not_assessed) | no |
| 96f3274c | leadership, entrepreneurship, community_impact (all not_assessed) | no (0 live gap-cards right now regardless) |
| ccf2161e | leadership, entrepreneurship, community_impact (all not_assessed) | no |

**Why 562, not 722**: this is a live, actively-refreshing table — `refreshOpportunityMatches`
recomputes on every relevant page view, and time passed between the other lane's count and this
one (itself confirmed separately: `match_confidence` — computed from the same underlying data —
reads `NULL` on 828 of 999 all-student gap-claiming rows right now, i.e. most of that table is
stale relative to when the confidence column started being written). The 562 measured here is
what's live *right now*, not a discrepancy to reconcile — 3 of the 562 (`cardsWithZeroWeakestMatch`)
are themselves stale in the other direction: their stored category doesn't even intersect the
student's *current* weakest-3 at all, and are counted as ungrounded on that basis alone.

**Worse than the framing "some cards are wrong"**: for these 6 students, the claim is never
right, because every one of their three weakest-ranked dimensions is unassessed, not just their
single worst one. Whichever category-relevant dimension a match happens to hit, it hits a hole
in the profile, not a real weakness.

## 3. The fix — `canClaimGap`, reused, not reinvented

```ts
if (match.profileNeedScore >= 70 && match.matchedGapDimensions.some((d) => canClaimGap(profileSignal, d))) {
  codes.push("addresses_a_current_gap");
}
```

Fires on **at least one** matched dimension passing, not all: an opportunity's category can
target two of a student's weakest three at once (e.g. `fellowship` → `leadership` + `research`),
and if only one is genuinely assessed, there IS a real gap this opportunity addresses — the
other, unassessed one riding along doesn't make the true half of the claim false. Proven with a
dedicated multi-dimension test (one assessed + one not → still fires; neither assessed → doesn't).

**Existing tests checked before writing anything new, per explicit warning that four other
findings today were existing tests nailing down wrong behavior**: grepped the whole
`__tests__/` tree for `addresses_a_current_gap` and `reasonSentence` by name — zero hits either
way. This specific code path had no coverage at all before this pass, not a wrong assertion to
fix — the warning didn't apply here, checked rather than assumed.

**Proven red-to-green literally, not just by argument**: reverted the fix line by hand back to
`if (match.profileNeedScore >= 70) codes.push(...)`, reran the new test file — the 4 tests that
should distinguish old from new behavior failed exactly as expected (`AssertionError: expected
[ 'addresses_a_current_gap' ] to not include 'addresses_a_current_gap'`, ×3, plus the
honest-empty case), the 2 tests that should pass either way (a genuinely assessed dimension
still firing) stayed green under both versions. Restored the real fix, reconfirmed all 23 green.

## 4. The one open decision — what the card says when it can't claim the gap

**Not decided here, per instruction.** The dashboard hero's own fix (2026-08-31) has room for a
full honest paragraph explaining *why* it won't name a dimension; a card has a single short
sentence slot shared with three other possible reasons (`matches_your_interests`, `near_you`,
`similar_to_dismissed`), and CEO's own instinct — say nothing rather than construct a
justification — is what this pass implemented as the **default, reversible behavior**: when
`addresses_a_current_gap` doesn't fire and nothing else applies either, the card falls through to
the exact same "honestly empty" state the `no_overlap` case has had since 2026-09-02 (`reason_codes:
[]`, `reasonSentence()` returns `null`, no sentence rendered) — not a new UI state, reusing one
already shipped and already correct for a different case with the identical shape ("nothing true
to say"). **This still needs CEO's confirmation, not just the absence of an objection** — the
alternative CEO named (a short, honest substitute phrase) is a real product-copy decision, and
silence was chosen as the safe interim default specifically because it required no new copy to
implement, not because the question is considered closed.

## Verification

Full suite: 443 files, 6631 passed / 2 expected-fail. tsc clean. One pre-existing, unrelated
lint warning (`locale` unused in this same file, documented in its own 2026-09-03 comment,
predates this change). No migration needed — this is a computation-time filter over existing
columns, no schema change.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
