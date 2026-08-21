# 05 — Duplicate Detection Rules

`lib/acquisition/duplicates.ts`'s `classifyDuplicateCandidate()` is a real, tested, four-tier
classifier — but it was built and is only wired up for `entity_type='university'`. This document
(a) reports what running its *logic* (by hand, via direct SQL, against live data) actually found,
because the result changes this package's recommendation from "extend the classifier" to
something more specific, and (b) generalizes candidate-finding and classification to the entity
types that have no classifier at all yet.

## What direct query of the Phase 6 duplicate-audit queue found

Migration 0039 queued 43 `possible_duplicate` candidates into `entity_verification_queue`
(2026-08-1x), found by an exact `normalized_name` self-join within `entity_type`. All 43 are still
`queued`/`P1`, untouched, as of this session. This session re-ran that same self-join directly and
additionally joined `entity_external_ids` to check the classifier's ROR-agreement path — the one
path the code's own comments identify as the *only* one that reaches `SAFE_TO_CANONICALIZE`
without a human. Findings:

- **41 of the 43 pairs are `entity_type='university'`.** (The other 2 were not reproduced by this
  session's exact-name self-join at query time — either already resolved between migration 0039
  and now, or attached to a `city`/`country` value that changed; not chased further, since the 41
  live pairs already deliver the finding below with certainty.)
- **Every single one of the 41 pairs is the identical shape**: the same institution, imported
  twice, with the city stored two different ways ("Boston" / "Boston, MA", "Pasadena" /
  "Pasadena, CA", "St Andrews" / "St. Andrews", "London" / "London, Ontario", ...). Nothing else
  differs — not the institution name, not any other field this session could compare.
- **In all 41 pairs, exactly one side has a ROR external id and the other side has none at all —
  zero pairs have ROR on both sides, and zero pairs have conflicting ROR ids.**

That last point is the actual finding, and it changes the recommendation. Run strictly through
`classifyDuplicateCandidate()`'s own branches (country_code is null on both sides for every
university row — a separate, already-known fact — so the first branch never fires; no shared
`id_system` exists when one side has zero external-id rows, so `agreeing`/`conflicting` are both
empty on every pair): **all 41 pairs classify as `AMBIGUOUS`**, not `SAFE_TO_CANONICALIZE`, exactly
as the code is written today. This is the *correct*, conservative behavior of the existing
classifier — not a bug in it. But "AMBIGUOUS" is the wrong word for what these 41 pairs actually
are, and conflating them with genuinely ambiguous cases (two records that might or might not be
the same entity) undersells how solvable they are.

### The real diagnosis: an enrichment gap, not an identity gap

985 of 1,055 active `entity_type='university'` rows have a ROR id (93.4%). The 70-ish that don't
are not randomly distributed — they cluster exactly on one side of each of these 41 pairs. The
straightforward reading: these 41 "loser" rows are older/duplicate imports that predate, or were
never swept up by, whichever enrichment pass populated ROR for the rest of the registry — not
institutions that are hard to identify. **The correct next action is not a smarter classifier and
not a human manually confirming 41 obviously-identical American/Japanese/Taiwanese university
names — it is running the existing ROR-enrichment pipeline (the same one that reached 93.4%
coverage already) specifically targeted at these 41 un-enriched rows.** Once both sides of a pair
carry a ROR id, `classifyDuplicateCandidate()` will — with zero new logic — correctly resolve
nearly all of them to `SAFE_TO_CANONICALIZE` (if, as expected, the ids agree) or surface a genuine
surprise as `NOT_DUPLICATE` (if, against expectation, they don't — which would itself be an
important finding, not a failure). This is recorded as `RULE-ENTITY-010` in `06` and as the
single highest-priority item in `10`/`11`: it is unusually rare for a 43-item, weeks-old backlog
to have a single, mechanical, already-built unblocking action, and this one does.

The full 41-pair table, with both sides' ids, is in
`data/research/canonical-entities/duplicate-candidates-university.json` — ready for whoever runs
the enrichment pass to verify against, without re-deriving the query.

## Verifying the recommendation itself: two real failure modes a naive ROR-enrichment pass would hit

This document's own top recommendation (re-run ROR enrichment on the 41-orphan set and on `09`
Finding 7's 70-entity gap) was tested directly against ROR's live API for two of the trickier
candidates, rather than assumed to be a purely mechanical, risk-free operation. It found two real,
distinct failure modes worth knowing before running that pass — both discovered by actually
looking, not by extrapolating from the pattern alone.

**Mode A — a system-level ROR entity outranks the campus-specific one in a naive search
(Purdue).** `university-ror-gaps.json` flags Purdue University as the one pair where *neither*
side has ROR yet. Direct query of ROR's API: a plain search for "Purdue University" most
prominently surfaces `ror.org/05p8z3f47`, **"Purdue University System"** — the multi-campus parent
covering Purdue Fort Wayne, Purdue Northwest, Purdue Global, and Purdue University West Lafayette
as separate ROR *children*. ORYN's "Purdue University" rows (city "West Lafayette"/"West
Lafayette, IN") should resolve to the **child** entity, `ror.org/02dqehb95` ("Purdue University
West Lafayette," Wikipedia-linked to plain "Purdue University," the institution ORYN's data
actually means) — not the system-level parent. Confirmed by fetching both records directly
(`curl` against `api.ror.org`, not a secondary source). A researcher trusting the first search
result rather than checking for a more specific child entity would attach the wrong ROR id to
both ORYN rows.

**Mode B — no campus-specific ROR entity exists at all, so ORYN's finer split has no clean 1:1
match (Rutgers).** ORYN already models "Rutgers University–New Brunswick" and "Rutgers
University–Newark" as two separate `canonical_entities` rows (both in `university-ror-gaps.json`'s
genuine-single-row-gap list) — a defensible product choice, since the two campuses genuinely
differ in character and selectivity for a student-facing use case. **ROR does not make the same
split**: querying ROR directly finds exactly one entity, `ror.org/05vt9qd57`, "Rutgers, The State
University of New Jersey," with no New Brunswick- or Newark-specific child in its relationships
(only research centers and affiliated hospitals). Consequence, stated precisely: if a researcher
enriches both ORYN rows with the one Rutgers ROR id, the *second* insert into
`entity_external_ids` will fail outright — `unique(id_system, external_id)` does not permit two
different `entity_id`s to claim the same `(ROR, 05vt9qd57)` pair. This is not a hypothetical; it
is exactly what the live constraint (`09`, "external_id uniqueness" clean-check) will do.

**Mode C — the source registry already reflects a rename/merger ORYN's own registry doesn't know
about yet (Université de Franche-Comté, Université Paul Sabatier Toulouse III).** A third,
distinct shape, found checking two more `university-ror-gaps.json` "genuine single-row gap"
candidates: ROR's own record for "Université de Franche-Comté" is `status: inactive` with a
direct `successor` relationship to a 2024-established institution; ROR's record for "Université
Toulouse III - Paul Sabatier" shows it as the direct `predecessor` of a 2025-established one. Both
are real, current, very recent (2024–2025) French university mergers — unlike Modes A/B, this is
not a granularity mismatch, it is `04`'s rename/succession framework applying directly, with ROR
as the source that already knows about it. Full detail and the exact successor chain: `04`'s
updated live-succession-examples section.

**What this means for the enrichment recommendation, restated correctly:** it is not a purely
mechanical, risk-free run for every one of the 111 combined candidates (41 + 70) — of the 16
France/Germany-heavy "genuine single-row gap" candidates specifically, 2 of them (not counting
Rutgers' 2 rows in the same list) turned out to be live succession cases, not simple gaps. For any
candidate where ORYN's own entity granularity might be finer than the source registry's (a
multi-campus US public university system is the most likely shape — check for this specifically,
not just for Purdue/Rutgers), a researcher needs to decide, case by case, whether (a) a
campus-specific external id exists and should be used (Purdue's shape), or (b) no such id exists
and the two ORYN rows should either share one external id under a *different, non-unique-per-row*
representation, stay without a ROR id at all, or be reconsidered as a single entity with two
`entity_locations` rows instead (Rutgers' shape, and the same modeling choice `03`'s addendum
already validated for BISI's two campuses). Neither Purdue nor Rutgers should be treated as
resolved by this document — both are flagged for the same human/researcher judgment call as
everything else in `10`, now with the specific pitfall named instead of left to be discovered
mid-enrichment-run.

**The rest of the sample checks out cleanly — this is a real risk profile, not a reason to distrust
the whole recommendation.** Extending the same live-API check to five more `genuine_single_row_gap`
candidates (Al-Quds University, Eastern Mediterranean University, European University of Lefke,
Near East University, Lingnan University) found clean, unambiguous, exact top-result matches for
all five — the P1 recommendation remains sound for most of the list; Purdue/Rutgers/Franche-Comté/
Paul Sabatier are the exceptions found so far, not the rule. One reusable methodology lesson from
this batch: **query the bare institution name, never the name with a location qualifier appended**
— `"Lingnan University Hong Kong"` as one search string ranks "University of Hong Kong" first (an
unrelated, much larger institution whose name happens to contain the same location words), while
`"Lingnan University"` alone correctly ranks the right institution first. Verify location as a
separate check against the result, not as part of the query. Two minor, lower-stakes near-name
pairs surfaced in the same batch and are recorded for awareness rather than escalated to `12`'s
depth of treatment: Al-Quds University vs. Al-Quds Open University (both real, both Palestinian,
genuinely distinct), and Lingnan University (Hong Kong) vs. Lingnan Normal University (Zhanjiang,
mainland China) — unrelated institutions that happen to share the "Lingnan" name.

## Restating the four-tier taxonomy the mission brief asks for

The mission brief asks for `AUTO-SAFE MATCH` / `HIGH-CONFIDENCE REVIEW` / `AMBIGUOUS` /
`NOT SAME ENTITY`. Mapped onto the existing code's tiers, with the one refinement this session's
finding justifies:

| Mission tier | Existing code tier | Criteria |
|---|---|---|
| `AUTO-SAFE MATCH` | `SAFE_TO_CANONICALIZE` | Agreeing external id (ROR, or any future `id_system`) on both sides. Still never *automatic* in the sense of unattended — `merge_canonical_entities()` remains `service_role`-only and reason-required regardless of tier; "auto-safe" describes the evidence quality, not a license to skip the merge function's own guardrails. |
| *(new, see below)* | *(currently folds into `AMBIGUOUS`)* | Exact normalized name, compatible city, **exactly one side has any external id at all and the other side has none** — i.e., a data-completeness gap, not a contested identity. Recommend: **do not classify as a review item requiring a judgment call; classify as an enrichment-queue item.** Distinguishing this from true `AMBIGUOUS` is this document's one proposed refinement to the existing classifier (see below). |
| `HIGH-CONFIDENCE REVIEW` | `LIKELY_DUPLICATE_REQUIRES_REVIEW` | Agreeing external id in a *non-ROR* system, or a name-variant-only match (not exact). Needs a human/reviewer glance, but the evidence points one direction. |
| `AMBIGUOUS` | `AMBIGUOUS` | Exact or variant name match, **no external id on either side**, nothing to disambiguate with. This is the true "we genuinely don't know yet" bucket — reserve it for cases where *no* enrichment pass would resolve it either, unlike the 41-pair case above. |
| `NOT SAME ENTITY` | `NOT_DUPLICATE` | Country/city genuinely incompatible, or a shared `id_system` with *disagreeing* values. Decisive, not just "leaning no." |

### Proposed refinement: split "one side has an id, other side has none" out of `AMBIGUOUS`

Concretely, in the shape of `classifyDuplicateCandidate()`'s own branches, insert a new condition
after the `conflicting`/`agreeing.includes("ROR")`/`agreeing.length > 0` checks and before the
`nameVariantOnly`/else fallthrough:

```text
else if (sharedSystems.length === 0 && (bySystemA.size === 0) !== (bySystemB.size === 0) && !opts.nameVariantOnly) {
  classification = "NEEDS_ENRICHMENT"  // one side has zero external ids, the other has ≥1;
                                         // an exact (not variant) name match with compatible city
}
```

This is deliberately narrower than "one side is missing ROR specifically" — it requires the
*whole* external-id set to be empty on one side (not just missing ROR while having, say,
Wikidata), and it requires an *exact* normalized-name match, not a variant. Both narrowings exist
to keep this tier from becoming a backdoor to weaker evidence than the existing `AMBIGUOUS` bucket
already requires — it only fires exactly on the shape this session found live, 41 times, with zero
exceptions. This is a recommendation for whoever owns `duplicates.ts`, not a change this session
makes — see `11`.

## Extending candidate-finding beyond university

No classifier exists yet for `school`, `organization`, `opportunity_provider`, or any other
non-university type. This session ran the same exact-`normalized_name`-within-`entity_type`
self-join across every type and found **zero live candidate pairs outside `university`** — a
clean result, but a weakly-powered one: `school`+`organization`+`opportunity_provider` together
total under 80 active rows against `university`'s 1,055, so the absence of a same-name collision
there is much less informative than the same absence would be at university-scale. It is also an
*exact-match-only* method — it would miss, for example, "MEF Okulları" vs. a hypothetical
"MEF Okullari" (ASCII-folded differently) if one ever entered the registry without going through
`unaccent()`-consistent normalization, or a school entered once under its Turkish name and once
under an English translation with no alias linking them.

**Recommendation for future candidate-finding at these smaller entity types**, once coverage
grows past today's ~80 rows: reuse `classifyDuplicateCandidate()` and `citiesCompatible()`
unmodified (both are already entity-type-agnostic — nothing in their signatures assumes
`entity_type='university'`), but *widen* candidate-finding beyond exact `normalized_name` to also
catch cross-entity **alias collisions** — i.e., where entity A's `canonical_name`/`display_name`
matches entity B's *alias* (not just A vs. B's canonical names) — since a school or organization
entered under an abbreviated/translated form is a more likely near-duplicate shape at this scale
than a pure re-import of the same exact string. `resolveIdentity()`'s own alias tier already knows
how to check this at *ingestion* time (rejecting a new insert that would collide); this document's
gap is specifically about auditing what may already have slipped in *before* that check existed
or before `create_or_resolve_user_submitted_entity()` was the only write path.

## What this document does not propose

No fuzzy/trigram-similarity threshold as a merge signal (the live `search_key`/`alias_search_key`
trigram indexes are for *search ranking*, explicitly not reused here as duplicate evidence — a
high `similarity()` score is exactly the kind of "looks confident" signal `06`'s rules exist to
exclude). No cross-entity-type duplicate detection (a `school` and a `university` are never
duplicate candidates of each other, per `01`, even if a real institution runs both). No
country-less matching at any tier, for any entity type.
