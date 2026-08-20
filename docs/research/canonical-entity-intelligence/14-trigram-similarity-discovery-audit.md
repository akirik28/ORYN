# 14 — Trigram-Similarity Discovery Audit (a new, discovery-only method)

`05-duplicate-detection-rules.md` named a real gap: exact-`normalized_name` self-join (the method
behind the 41-pair audit in `09`) cannot find a near-duplicate that isn't a byte-identical string
collision — an alias-vs-canonical-name mismatch, or two genuinely similar-but-not-identical names.
This document tries two such methods against live data and reports what each actually found,
including one candidate researched to a definitive, sourced conclusion.

**Both methods here are discovery-only, never merge evidence** — consistent with `RULE-ENTITY-001`
and with this codebase's own existing use of `search_key`/`alias_search_key` trigram indexes for
*ranking*, never for *identity*. Nothing in this document is a basis for calling
`merge_canonical_entities()`.

## Method 1: alias-vs-canonical cross-match

Query: does any entity's own `display_name` (normalized) match a *different* entity's registered
alias, within the same `entity_type`, both active? Result: **zero rows**, across the entire live
registry. A clean, reproducible negative — recorded as validated rather than assumed, matching
this package's standing method.

## Method 2: `pg_trgm` similarity, scoped to the smaller, less-mature entity types

Query: pairwise `similarity(a.search_key, b.search_key)` within `entity_type` for
`school`/`organization`/`opportunity_provider`/`competition`/`program` (scoped away from
`university`, which already has the exact-match method well-covering it at that type's scale),
threshold `>0.5`, excluding pairs that already share a `normalized_name` (already covered by other
methods). Full candidate table: `data/research/canonical-entities/trigram-similarity-candidates.json`.
19 candidate pairs surfaced, entirely within `entity_type='school'` (the other four types had no
pair above the threshold — consistent with `09`'s earlier finding that these types are small).

### Flagship worked example, researched to a sourced conclusion: NOT a duplicate

The single highest-scoring pair (similarity `0.82`): **"İzmir Saint-Joseph Fransız Lisesi"**
(city: İzmir) vs. **"Saint-Joseph Fransız Lisesi"** (city: İstanbul). This looked, before research,
exactly like the kind of same-institution/city-data-error case worth flagging urgently. Researched
directly (web search, both schools' own domains: `izmirsj.k12.tr`, and the İstanbul school's own
foundation site `sajev.org.tr`) rather than left as a guess:

**Verified: these are two genuinely distinct, independently-operating schools**, not a duplicate
or a data error. Both trace to the same historical founding event — the Frères des Écoles
Chrétiennes (the French Catholic teaching order founded by Saint Jean-Baptiste de la Salle) came
to Ottoman Turkey in 1841 and opened *separate* schools in İzmir and İstanbul in the same wave.
The İstanbul school's own documented history is independently detailed (founded as "Pensionnat
Saint-Joseph" in Beyoğlu in 1857, moved to Moda in 1864, returned to Beyoğlu, then to Kadıköy in
1870) and it operates today under its own alumni foundation (Saint-Joseph Lisesi Eğitim Vakfı,
`sajev.org.tr`). The İzmir school operates independently today at its own campus (Alsancak,
İzmir; `izmirsj.k12.tr`) and is separately one of six schools in Turkey holding the official
FrancÉducation label. **Recommendation: keep as two fully separate `school` entities, no merge.**
Given both share a well-documented common historical origin (the same 1841 religious-order
founding wave) but no evidence of current shared governance was found, this session does **not**
recommend adding a formal `entity_relationships` row between them either (per `RULE-ENTITY-013`'s
"don't assert a relationship without real evidence of present-day operational connection" spirit)
— noting the shared history in this document is enough; asserting a `member_of`/`related_brand`
row would overclaim what was actually verified.

### Why the rest of the candidate list is lower-signal than it first appears

Inspecting the remaining 18 pairs surfaces an important **methodological caveat this document
exists to record**: most of the remaining high-similarity pairs are driven entirely by shared
**generic Turkish school-type suffixes** — "Anadolu Lisesi" (Anatolian High School, a national
public-school *category*, not a proper name), "İmam Hatip Lisesi" (a religious-vocational
public-school *category*), "Fransız Lisesi" (French Lycée — a *type* descriptor shared by every
French-curriculum school, not evidence any two are related). Two schools named "[Place] Anadolu
Lisesi" and "[Different Place] Anadolu Lisesi" score moderately high on trigram similarity purely
because "Anadolu Lisesi" is a long, shared, generic suffix — this is **not** a duplicate signal at
all, the way it would be for a genuinely distinctive shared string. Example from the candidate
list: "Kartal Anadolu İmam Hatip Lisesi" (İstanbul) vs. "Nilüfer Anadolu İmam Hatip Lisesi"
(Bursa) at similarity `0.63` — two entirely unrelated schools in two different cities, both
carrying the same two generic category suffixes.

**Refined guidance for any future use of this method (recorded so it isn't rediscovered the hard
way):** before treating a trigram-similarity hit as worth researching, strip known generic
institutional-type suffixes (a maintained list: `Anadolu Lisesi`, `İmam Hatip Lisesi`, `Fen
Lisesi`, `Fransız Lisesi`, and their non-Turkish equivalents — `Gymnasium`, `Lycée`, `High School`
alone) from both names first and re-score on what remains. The Saint-Joseph pair survives this
filter (its distinguishing string, "Saint-Joseph," is itself the near-exact match, not a generic
suffix) — which is exactly why it was the right one to prioritize for real research, and why the
"Anadolu Lisesi"-suffix-driven pairs were correctly deprioritized rather than each individually
chased down this session.

## What this document recommends

1. Do not build an automated trigram-similarity-to-review-queue pipeline without first
   implementing the generic-suffix-stripping refinement above — an unfiltered version would flood
   a review queue with noise (18 of 19 candidates here) for every one genuinely valuable hit.
2. The Saint-Joseph finding is a clean, resolved research result — no further action needed,
   recorded here so it is never re-flagged as a false "possible duplicate" by a future pass.
3. `data/research/canonical-entities/trigram-similarity-candidates.json` preserves the full
   19-pair list (including the 18 suffix-driven low-signal ones) for anyone who later builds the
   suffix-stripping filter and wants a labeled test set to validate it against.
