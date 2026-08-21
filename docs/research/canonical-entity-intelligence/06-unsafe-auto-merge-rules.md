# 06 — Unsafe Auto-Merge Rules Registry

Every rule below is cross-referenced to the document that derives it and, where one exists, to
live evidence from the `oryn-qa-scratch` registry. Structured form:
`data/research/canonical-entities/rules.json`. These are the rules a future automated pass —
or a human moving quickly through `entity_verification_queue` — should be checked against before
calling `merge_canonical_entities()` or writing a new `entity_relationships` row.

**RULE-ENTITY-001 — Name similarity alone is never sufficient for a canonical merge, at any tier
of fuzziness, for any entity type.**
Why: `classifyDuplicateCandidate()` does not even grant its own strongest name-based signal
(`isPureEncodingVariant` — two strings that render pixel-identically) a path to
`SAFE_TO_CANONICALIZE` without an agreeing external id. Source: `01`, `05`.

**RULE-ENTITY-002 — Country agreement is a hard gate before any name-based match is accepted; no
country evidence on either side is a refusal, not a low-confidence accept.**
Why: this is `resolveIdentity()`'s existing, load-bearing design (`sameCountryCandidates`
computed before any name tier is tried) — this package proposes no relaxation of it anywhere.
Source: `01`.

**RULE-ENTITY-003 — A shared parent/system does not make two entities the same entity; a campus
or school-group member must remain its own row, related, never merged into its parent.**
Why: live evidence that this is already done correctly — MEF Okulları's three schools, İSTEK
Okulları's two, Bilkent University's two lab schools all keep independent rows linked via
`part_of`/`school_of`. Source: `03`.

**RULE-ENTITY-004 — A `translation` alias is only correct when official evidence supports
equivalence; `alias_type` and `language_code` are independent axes, not one field standing in for
the other.**
Why: live example — Koç School's Turkish legal name is simultaneously `official` and `tr`, not a
`translation` (translation is reserved for cases where language is the *only* thing that
differs). Source: `02`.

**RULE-ENTITY-005 — A renamed institution needs either a `legacy` alias (same row, continuous
identity) or explicit `successor_of`/`predecessor_of` evidence (two rows, real discontinuity) —
never neither, and never both for the same event.**
Why: live gap found — Constructor University (f.k.a. Jacobs University Bremen, f.k.a.
International University Bremen) has full external-id coverage but zero alias rows, so its
16-years-common former name currently cannot resolve to it. Source: `04`.

**RULE-ENTITY-006 — An abbreviation match is never sufficient alone; well-known-feeling
abbreviations collide across countries in the registry today, not just hypothetically.**
Why: live evidence — `UM` (Universidad de Montevideo / Universiti Malaya), `UP` (Universidad de
Palermo / Universidad Panamericana), `UPM` (Universidad Politécnica de Madrid / Universiti Putra
Malaysia) are all real, currently-coexisting alias collisions, correctly disambiguated only by
`resolveIdentity()`'s country-scoping step. Source: `02`.

**RULE-ENTITY-007 — A disagreeing external id in a shared `id_system` is decisive *against* a
match, and overrides even an identical name.**
Why: `classifyDuplicateCandidate()`'s `conflicting` branch is checked before any name evidence and
returns `NOT_DUPLICATE` outright. Source: `05`.

**RULE-ENTITY-008 — An agreeing external id in a shared `id_system` is the only path to the
auto-safe tier. Nothing else reaches it — not an exact name, not a compatible city, not both
together.**
Why: live evidence — all 43 live "Boston"/"Boston, MA"-shaped duplicate pairs have an exact name
match and a compatible city, and *none* reach `SAFE_TO_CANONICALIZE`, because none has an
agreeing external id (in every pair, exactly one side has any external id at all). This is the
classifier working as designed, not a bug. Source: `05`.

**RULE-ENTITY-009 — Do not create a second row solely to hang a relationship off it. A pure
rename is a one-row edit (add a `legacy` alias); inventing a phantom "old name" row just so a
`successor_of` relationship has something to point at produces exactly the gratuitous duplicate
this whole framework exists to prevent.**
Why: derived directly from testing RULE-ENTITY-005 against the Constructor University case — the
correct fix is an alias on the existing row, not a new row. Source: `04`.

**RULE-ENTITY-010 — Missing external-id coverage on one side of an otherwise-exact match is an
*enrichment gap*, not evidence against a match. The correct action is completing enrichment
(re-running the existing acquisition pipeline on the under-enriched side), not guessing and not
leaving it filed as unexplained "ambiguous" forever.**
Why: this is the central finding of this session's live audit — all 43 queued Phase-6 duplicate
candidates fit this exact shape. Source: `05`, `09`.

**RULE-ENTITY-011 — Cross-entity-type merges are always refused, even when a real institution
operates as both kinds (e.g., a university running a K-12 laboratory school). That relationship
is `school_of`, never shared identity.**
Why: `merge_canonical_entities()` raises an exception on `v_source_type <> v_target_type` — a hard
DB-level refusal, not just an app-level convention. Source: `01`, `03`.

**RULE-ENTITY-012 — A relationship row's direction (`subject_entity_id` vs. `object_entity_id`)
encodes meaning. Reversing subject and object changes the claim even though the row still passes
every constraint.**
Why: live convention — `school_of` rows consistently put the school as subject and the university
as object ("BELS is a school of Bilkent," not the reverse); a future writer reversing this by
habit would silently invert the claim without any error. Source: `03`.

**RULE-ENTITY-013 — Do not create a system/parent/organization entity until at least two
children justify it. A "system" with one known member is indistinguishable from that member and
adds an entity with nothing of its own to verify.**
Why: generalized from the live school-group pattern, where every populated `organization`-type
system entity (MEF Okulları, İSTEK Okulları, Terakki Vakfı Okulları) already has multiple linked
schools. Source: `03`.

**RULE-ENTITY-014 — `verification_state='user_submitted'` is not low-quality evidence of
falsehood. It is an unresolved claim — queue and check it; never silently distrust it or silently
promote it.**
Why: `create_or_resolve_user_submitted_entity()` cannot mark anything else at creation time by
design, and always enqueues a review item — the mechanism already assumes most submissions are
real, just unverified. Source: `01`.

**RULE-ENTITY-015 — Free-text fields (activity title, job title, project title, research title,
award title) are never entity-resolution targets, no matter how proper-noun-like the text looks.**
Why: `canonical_field_policies.policy='free_text_remains'` is an explicit, already-made product
decision for exactly these columns — this framework does not revisit it. Source: `01`.

**RULE-ENTITY-016 — A joint/co-organizer credit ("X, in partnership with Y") is not evidence that
one organization owns or operates the other. Model it as a peer relationship (a `partner_of`
candidate — currently a schema gap, see `03`/`11`), never as `operated_by` in either direction and
never as a merge.**
Why: live evidence — `opportunities.organization` already contains multiple explicit
"in partnership with" strings naming two genuinely independent organizations. Source: `08`.

**RULE-ENTITY-017 — Wikipedia and Wikidata are never a value source for any fact, including
identity — discovery-index only, exactly like every other fact class in this codebase's existing
source-authority policy.**
Why: `lib/acquisition/source-authority.ts`'s `EXCLUDED_DOMAINS` already excludes both explicitly,
with the comment that they are used to *find* real sources, never cited as one. This package
applies the same standard to its own research rather than carving out an exception for identity
claims. Source: `00`.

**RULE-ENTITY-018 — A same-tier disagreement between two acceptable sources resolves to a
recorded conflict, never a silently-picked winner — for entity facts exactly as for relationship
or merge evidence.**
Why: `precedence.ts`'s `decideWrite()` already returns `"conflict"` rather than choosing between
two equal-authority, equal-date, disagreeing sources; this framework extends the same discipline
to identity/relationship evidence rather than treating facts and identity as governed by different
standards. Source: `01`.

**RULE-ENTITY-019 — A named school/faculty with its own admissions process and brand earns its
own canonical entity related to its parent university; a narrower center/initiative defaults to
no row until it recurs; a specific named program is a different `entity_type`
(`program`/`competition`), never an alias of its provider.**
Why: live evidence — the University of Pennsylvania/Wharton six-way organizer-string granularity
cluster in `opportunities.organization` exercises every layer of this distinction at once. Source:
`08`.

**RULE-ENTITY-020 — Country is the one `entity_type` where bulk pre-population from a single
authoritative source (ISO 3166-1) is correct, not a shortcut — a bounded, small, authoritatively
enumerated set with no real case-by-case identity question. Every other `entity_type`, including
city, still requires the normal one-at-a-time research discipline.**
Why: `entity_type='country'` has zero rows despite six schema-enforced FK columns requiring it
(`canonical_required`, the strictest policy tier); the underlying free-text `country` data is
already clean, so the gap is purely that the bulk-safe bootstrap was never run. Source: `15`.

**RULE-ENTITY-021 — `opportunities.organization_entity_id` must always point at the organizing
body, never at the named program/competition/scholarship it runs — even when the organizer string
*is* a competition's own name.** The competition still gets its own `entity_type='competition'`
row (for aliasing/search/`provider_for`), just not as the value of this specific FK.
Why: `trg_opportunities_org_entity_type` (migration 0038) only permits
`entity_type in ('opportunity_provider','organization','university','school','employer',
'research_institution','lab','ngo','club')` on this column — `program`/`competition`/`scholarship`
are valid `canonical_entities.entity_type` values generally but rejected here specifically. Caught
and corrected a real imprecision in this package's own earlier `opportunity-organizer-
candidates.json` (PennApps/MIT Battlecode). Source: `13`.

**RULE-ENTITY-022 — An organization whose entire public identity *is* the one named competition/
journal/program it runs is `entity_type='opportunity_provider'`; a broader-mission institution for
which running student programs is one activity among several is `entity_type='organization'`. A
genuine judgment call at the margin, not a bright line — document the reasoning per case rather
than applying a keyword rule.**
Why: applied consistently across 147 real opportunity-organizer strings (43 resolved to
`opportunity_provider`, 56 to `organization`), with explicit worked examples on both sides.
Source: `13`.

**RULE-ENTITY-023 — Before writing an external registry id (ROR, etc.) onto an ORYN entity, check
whether the registry's own entity granularity actually matches ORYN's for that institution — a
registry may model one system-level entity where ORYN (correctly, for product reasons) models
separate per-campus entities, or vice versa. Verify by querying the registry directly, never by
assuming the pattern that worked for other institutions holds.**
Why: two distinct, live-API-verified failure modes found while testing this package's own top
recommendation — Purdue (ROR has both a system entity and a more specific campus child; the naive
search result is the wrong one) and Rutgers (ROR has only one entity for the whole university,
while ORYN correctly models New Brunswick/Newark as separate rows — enriching both with the same
ROR id would hit `entity_external_ids`' `unique(id_system, external_id)` constraint on the second
write). Source: `05`.
