# 10 — Prioritized Manual-Review Queue

What a human or a future automated pass should look at first, and why — synthesizing `05`–`09`
into one ordered list rather than leaving the priority implicit across five documents.

## P0 — Structural, affects the whole registry or an entire language/script

**1. Fix Turkish `ı`/German `ß` handling in `dbNormalizedName()` and decide `nameKey()`'s behavior
for them.**
Not a queue item in the usual sense — a code fix (`07`). Ordered first because every other
Turkish- or German-script entity created from today forward inherits this gap until it's fixed,
and because `canonical_entities_identity_uq` is not actually protecting against duplicate
Turkish-school/university inserts right now. Audit-then-fix the ~26+ already-affected stored rows
as a follow-up once the function itself is corrected (regenerate-and-diff, not a blind bulk
update, per `07`'s recommendation). **Scope correction from `17`: this item is about
`lib/acquisition/normalize.ts` only (the ROR-enrichment pipeline). The Turkish `ı` half is
already fixed in the separate, live, student-facing `lib/entities/normalize.ts` — no action
needed there. The German `ß` half is NOT fixed there either (confirmed live) and sits on the
production search path today, making it more urgent in practice than this item's ranking
implies — see `17` §2 for the one-line fix location.**

**1b. Bulk-populate `entity_type='country'` from ISO 3166-1.**
`15`. Different in kind from every other item here: this is the one entity type where a full
upfront bulk population is *correct*, not a shortcut — a bounded, authoritatively-enumerated set.
Six schema-enforced FK columns (`profiles`, `education_records`, `universities`, `opportunities`)
already require it (`canonical_required`, the strictest policy tier) and currently have nothing to
point at. The underlying free-text `country` columns are already clean, so the backfill after
bootstrap should be close to mechanical. Decide the small number of disputed-territory edge cases
(Northern Cyprus, Taiwan, Hong Kong/Macao SAR — all already present in live `country` text values)
deliberately rather than letting the bulk import default silently.

## P1 — Large, mechanical, already-scoped

**2. Merge the 43 orphan pairs directly (`merge_canonical_entities(orphan, enriched_sibling,
reason)`) — no ROR re-research needed for these specifically, corrected from an earlier version
of this recommendation.** `05`'s "mechanical precision correction" section: `--from-db` builds
its roster from the `universities` table, which every orphan side has zero rows in by
construction — the enrichment pipeline structurally cannot reach them, confirmed by reading
`scripts/acquire-university-facts.ts` directly, and `claude-a-university-spine.md`'s own account
of an already-completed full-spine `--from-db` pass (203 unresolved) confirms its unresolved set
doesn't overlap these 43. Each orphan's paired sibling already carries a verified ROR id, which
is the confirmation — the task is confirming the pair via the evidence already assembled here
(identical name, compatible city, the two-timestamp pattern) and merging directly, not running an
acquisition script. Separately, run `npm run acquire:universities -- --from-db` +
`npm run import:universities` (per `scripts/acquire-university-facts.ts`'s own usage docs) for
the 70 entities in `09` Finding 7 (a genuinely different, complementary gap — real single-row
enrichment targets, not orphan-pair duplicates) — and apply 9 already-known ROR ids directly.
`data/research/canonical-entities/duplicate-candidates-university.json` has the exact 43 ids
ready. This is expected to resolve the majority of the Phase 6 duplicate-audit backlog (open since
migration 0039) with zero new classification logic — see `05`, `09`. One row (Purdue University)
needs both sides checked, since neither currently has a ROR id. **For 9 of `university-ror-gaps
.json`'s "already-known duplicate-supersession" entities (MIT, UCL, LSE, Warwick, KFUPM, HKUST,
UTS, Newcastle-Australia, Al-Farabi Kazakh National University — the 9th found late in this
session in `founder-blocked-backlog.md`/`claude-a-university-spine.md`, see `09` Finding 2's
correction note; this package's own list had said "8" throughout until this correction), no
research is needed at all — `scripts/university-duplicates-audit.ts` already identified and
hand-verified the correct ROR id for every one of them on 2026-08-17/18 (cross-confirmed by this
session's own independent ROR queries for 4 of the 9); the id just needs to be written to
`entity_external_ids`, which `merge_canonical_entities()` alone does not do. See `05`'s dedicated
section on this discovery and each entity's `ror_id_already_known` field.** The
remaining 16 genuine single-row gaps (several in France/Germany) still need real enrichment —
worth running in the same pass since it's the same pipeline.
**Not purely mechanical, though — verified directly against ROR's live API (`05`'s "Verifying the
recommendation itself" section): Purdue needs the campus-specific child id
(`ror.org/02dqehb95`), not the system-level one a naive search returns first
(`ror.org/05p8z3f47`); Rutgers–New Brunswick and Rutgers–Newark have no separate ROR entities at
all — ROR models all of Rutgers as one record (`ror.org/05vt9qd57`), which will hit the
`entity_external_ids` uniqueness constraint if both ORYN rows are enriched with it naively. Both
are flagged `WARNING_verified_live_against_ror_api` in their respective JSON entries — check for
this "ORYN splits finer than the registry does" shape on any other multi-campus US public
university system before running the pass unattended.**

**Sequencing note added by `17`**: nine of these 43 pairs — UCLA, UC Berkeley, UC San Diego, UC
Santa Barbara, NYU, Caltech, City University of Hong Kong, National Cheng Kung University,
National Yang Ming Chiao Tung University — were independently rediscovered via a second,
unrelated method (`lib/entities/audit.ts`'s alias-collision rule, run live against the
registry), which is useful confirmation but not new scope. Worth merging this specific nine
first if the full 43-pair pass is done incrementally rather than in one batch: several are
exactly the high-application-volume US institutions ORYN's own students are most likely to
search for. Full external-id detail for these nine: `entities-lib-live-findings.json`.

**3. Decide the disposition of the ~45 "orphan" canonical_entities rows with no `universities` row.**
Overlaps heavily with #2 but is a distinct question: even after ROR-enrichment resolves the
identity question, someone needs to decide whether these orphan rows should be deleted, merged
via `merge_canonical_entities()`, or left as harmless tombstones. Flagged in `09` as a real,
previously-undocumented product-surface risk (`search_canonical_entities()` can return an entity
id with zero backing `universities` rows) worth a direct check against the live UI before deciding
disposition.

**3b. Populate five concrete, already-researched `entity_relationships` candidates.**
`12-institution-collision-traps.md` cases 5, 8, and 10 name specific, sourced-not-guessed rows
ready to create once whoever has write access confirms each institution's ORYN row id: `Charité
– Universitätsmedizin Berlin part_of Humboldt-Universität zu Berlin` AND `part_of Freie
Universität Berlin` (a genuine two-parent case, both legal per `03`'s `part_of` semantics);
`Amsterdam University College part_of University of Amsterdam` AND `part_of Vrije Universiteit
Amsterdam` (same two-parent shape, confirmed from AUC's own official page); `King's College
London member_of University of London`, `University College London member_of University of
London`, `London School of Economics member_of University of London` (mirrors the one existing
`member_of` example, École Polytechnique / IP Paris — directly answers this document's earlier
request in `03`/`09` for a second live example). None of these five are this session's or
`12`'s to write — all five need each institution's actual ORYN row confirmed first.

## P2 — Real gaps, smaller blast radius, need product/schema judgment (not this session's to decide)

**4. Add `partner_of` to the `entity_relationships.relationship_type` constraint.**
A migration, so out of this session's scope entirely — but the need is concrete and evidenced: 11
live `opportunities.organization` strings across `08` and `13` are unmodeled joint-organizer
credit, in at least three distinguishable shapes (symmetric co-brand partnership, asymmetric
funder/sponsor, unincorporated joint effort with no parent at all) — see
`relationship-taxonomy-mapping.json` for the breakdown, worth designing the migration against all
three rather than just the original four simplest cases.

**5. Populate `opportunities.organization_entity_id` — all 171 distinct organizer strings now
have a researched candidate, not just the high-value clusters.**
`opportunity-organizer-candidates.json` (Penn/Wharton, MIT, next-tier ≥2-occurrence organizers)
plus `opportunity-organizer-candidates-batch2.json` (the remaining 147, from `13`) together cover
every distinct string in `opportunities.organization`. Apply `RULE-ENTITY-021` when doing this
work: the FK must point at the organizing body, never at a `program`/`competition`/`scholarship`
entity even when that's literally the organizer string's own name (`opportunities.organization_
entity_id`'s trigger rejects those three types on this specific column).

**6. Add a `campus_of` example.** Zero live rows of this type exist. Not urgent (nothing is
currently modeled incorrectly), but worth watching for — the first genuine branch-campus case
ORYN's registry encounters (a university with a distinct-address, no-independent-admissions
overseas campus) is the natural first candidate; this session did not find one in the data
audited.

**7. Add a `successor_of`/`predecessor_of` example.** Same status as #6 — zero live rows, nothing
wrong, just unexercised. `04` names the most plausible future source (a European business-school
merger) without asserting one has happened.

## P3 — Awareness items, no action needed from this package

**8. The Terakki Levent Lisesi / Levent Fen Lisesi granularity question.** Already correctly
queued and blocked by another active research effort (`entity_verification_queue`, source hint
`ibo.org`) — this package deliberately does not re-triage it, only cites it as a validated
"ambiguous, and that's fine" example in `03`.

**9. The 45-vs-43 count discrepancy this session's own queries produced at different points.**
Not a data-quality issue — a live-database timing artifact from concurrent writes during this
research window (`09`). Recorded so a future session doesn't waste time reconciling two numbers
that were never meant to agree exactly.

**10. Trivial, isolated fix: `"Universit degli Studi della Campania Luigi Vanvitelli"` is missing
its `à`.** `09` Finding 9 — a one-row `display_name` correction (`"Università..."`), confirmed not
part of a broader pattern. Lowest-effort item in this entire document; sequenced last only because
it's genuinely this small, not because it's unimportant to the one student who'd see it rendered
wrong.

**11. Improve alias coverage for countries outside the actively-researched corpus — Italy (3/38)
and the Netherlands (0/13) confirmed thin-to-absent, likely the norm elsewhere too.** `09` Finding
9. Same shape as the opportunity-organizer/school alias work elsewhere in this package — research
each institution's well-known English/common/original-language forms ("La Sapienza," "Milan
Polytechnic," "Universiteit van Amsterdam") rather than bulk-guessing. The Dutch case specifically
needs `translation`-type aliases for the original-language names, not just `common`-type English
variants — normalization alone will never bridge "University of Amsterdam" to "Universiteit van
Amsterdam" the way it bridges an accent-only variant. Not urgent, but a concrete, scoped, real gap
once higher-priority items above are clear.

**12. Trivial: fix 3 malformed `country_code` values and one misspelled `display_name`.** `09`
Finding 10 — `Sasmo` (`country_code='singapour'`), `EUROPE YOUTH PARLİMENT` and `Titan Akademi Spor
Kulübü` (both `country_code='Türkiye'`) should be `SG`/`TR`; `EUROPE YOUTH PARLİMENT` should also
become `European Youth Parliament`. Same low-effort tier as item 10. Longer-term, this class of bug
becomes structurally impossible once item 1b (country entity bootstrap) lands — worth noting the
connection rather than treating the two as unrelated.

## Explicitly out of scope for any review — do not act on these without new evidence

- Do not merge any of the 43 university pairs on this package's evidence alone (no external-id
  confirmation exists yet for either side of most pairs — that is precisely the point of P1 above).
- Do not create `partner_of`/`campus_of`/`successor_of` rows by inference from this document's
  examples — they are illustrations of the *type*, not evidence for a specific real pair.
- Do not act on the opportunity-organizer candidates in `opportunity-organizer-candidates.json` as
  pre-verified — they are proposed structures for a researcher to confirm against each
  organization's own official site before creating, per this package's own source standard (`00`).
