# 10 — Prioritized Manual-Review Queue

What a human or a future automated pass should look at first, and why — synthesizing `05`–`09`
into one ordered list rather than leaving the priority implicit across five documents.

## P0 — Structural, affects an entire language/script

**1. Fix Turkish `ı` handling in `dbNormalizedName()` and decide `nameKey()`'s behavior for it.**
Not a queue item in the usual sense — a code fix (`07`). Ordered first because every other
Turkish-script entity created from today forward inherits this gap until it's fixed, and because
`canonical_entities_identity_uq` is not actually protecting against duplicate Turkish-school/
university inserts right now. Audit-then-fix the ~26+ already-affected stored rows as a follow-up
once the function itself is corrected (regenerate-and-diff, not a blind bulk update, per `07`'s
recommendation).

## P1 — Large, mechanical, already-scoped

**2. Re-run ROR enrichment targeted at the 41 "incomplete" university rows.**
`data/research/canonical-entities/duplicate-candidates-university.json` has the exact 41 ids
ready. This is expected to resolve the majority of the Phase 6 duplicate-audit backlog (open since
migration 0039) with zero new classification logic — see `05`, `09`. One row (Purdue University)
needs both sides checked, since neither currently has a ROR id.

**3. Decide the disposition of the ~45 "orphan" canonical_entities rows with no `universities` row.**
Overlaps heavily with #2 but is a distinct question: even after ROR-enrichment resolves the
identity question, someone needs to decide whether these orphan rows should be deleted, merged
via `merge_canonical_entities()`, or left as harmless tombstones. Flagged in `09` as a real,
previously-undocumented product-surface risk (`search_canonical_entities()` can return an entity
id with zero backing `universities` rows) worth a direct check against the live UI before deciding
disposition.

## P2 — Real gaps, smaller blast radius, need product/schema judgment (not this session's to decide)

**4. Add `partner_of` to the `entity_relationships.relationship_type` constraint.**
A migration, so out of this session's scope entirely — but the need is concrete and evidenced
(`08`): at least 4 live `opportunities.organization` strings are unmodeled joint-organizer credit.

**5. Populate `opportunities.organization_entity_id` for the ≥2-occurrence organizer clusters.**
`data/research/canonical-entities/opportunity-organizer-candidates.json` has the University of
Pennsylvania/Wharton and MIT clusters worked out in detail, plus the next tier
(Stanford/CMU/Northwestern/Columbia/Boston University/Horn Entrepreneurship) flagged as
likely-straightforward alias-resolver runs against the existing 1055+ university registry — not
new research for most of them. The remaining ~160 single-occurrence organizer strings are real
but lower-value per string; tackle after the clusters above.

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

## Explicitly out of scope for any review — do not act on these without new evidence

- Do not merge any of the 41 university pairs on this package's evidence alone (no external-id
  confirmation exists yet for either side of most pairs — that is precisely the point of P1 above).
- Do not create `partner_of`/`campus_of`/`successor_of` rows by inference from this document's
  examples — they are illustrations of the *type*, not evidence for a specific real pair.
- Do not act on the opportunity-organizer candidates in `opportunity-organizer-candidates.json` as
  pre-verified — they are proposed structures for a researcher to confirm against each
  organization's own official site before creating, per this package's own source standard (`00`).
