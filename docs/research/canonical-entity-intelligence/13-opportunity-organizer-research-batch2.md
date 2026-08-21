# 13 — Opportunity Organizer Research, Batch 2 (the long tail)

A follow-on research pass, run as a separate session against the same live `oryn-qa-scratch`
database, covering the ~147 organizer strings `08-opportunity-organizer-canonicalization.md`
identified but did not have time to research individually — everything in
`opportunities.organization` except the University of Pennsylvania/Wharton cluster, the MIT
cluster, and the METU/Arber Kongre cycle-operator case study, all three already fully worked out
in `08` and in `data/research/canonical-entities/opportunity-organizer-candidates.json`.

## Result

**147 of 147 assigned organizer strings resolved to a sourced official URL and a proposed
`entity_type`** — 118 at `high` confidence, 28 at `medium`, 1 at `low`, 0 recorded as fully
`unresolved`. That last number is not a claim of certainty everywhere: several rows carry real,
explicitly flagged ambiguity (see below) but still landed on a defensible, sourced answer rather
than a blank. Zero fabricated URLs — every value traces to either the ROR API directly or the
organization's own official site, and the large majority were independently cross-checked against
`opportunities.official_url`, which an earlier researcher had already populated per-opportunity
(see "Method," below). Full structured output:
`data/research/canonical-entities/opportunity-organizer-candidates-batch2.json`.

| Confidence | Count | Typical reason |
|---|---|---|
| High | 118 | ROR-confirmed university/research institution, or an org's own site independently found and cross-validated against the live `opportunities.official_url` for the same string |
| Medium | 28 | Official URL solid, but `entity_type`/parent/relationship is a genuine judgment call (narrow center vs. default-to-parent; joint-organizer shape; a government body with no matching `entity_type`) |
| Low | 1 | `Stanley Prep` — real, sourced answer, but a thin-footprint for-profit company where this session could not fully corroborate beyond one cross-check |

| `proposed_entity_type` | Count |
|---|---|
| `organization` | 56 |
| `opportunity_provider` | 43 |
| `university` | 41 |
| `research_institution` | 3 |
| `ngo` | 3 |
| `club` | 1 |

49 rows carry a ROR id (all `university`/`research_institution` proposals). 28 rows propose a
`parent_entity` + `relationship_to_parent`.

## Method: the live `opportunities.official_url` field as a second, independent source

Before writing anything, this session queried `oryn-qa-scratch.opportunities` (`organization`,
`official_url`) directly (read-only `SELECT`, same discipline as `08`/`09`). This turned out to be
far more valuable than a lookup convenience: an earlier researcher had already populated
`official_url` per-opportunity with real, program-level sourcing, entirely independent of this
session's own web research. Comparing the two independently-derived answers resolved every
genuinely ambiguous case this batch hit:

- **`Journal of Research`** — at least four similarly-named high-school research journals exist
  (Journal of Student Research, American Journal of Student Research, Journal of High School
  Research, IJHSR). This session's own web search alone would have been a coin flip. The live
  `official_url` (`journalresearchhs.org`) settled it: this is JRHS, "Journal of Research | High
  School" — matching the organizer string most literally, but not the name this session would have
  guessed first from web search rankings alone.
- **`Stanley Prep`** — resolved from an opaque company name into a specific, sourced fact: the live
  opportunity is "UNO – United Nations Online," a Stanley Prep program explicitly run **in
  partnership with WFUNA** (World Federation of United Nations Associations) and explicitly **not**
  an official UN program, per Stanley Prep's own site. Web search alone surfaced no obvious signal
  this was a joint-organizer case.
- **`120 Hours`** — confirmed as the Norwegian student architecture competition
  (`120hours.no`), not the unrelated "120 Hours" hackathon/meetup naming this session's first web
  search pulled up.
- **`American Regions Mathematics League`** — confirmed `arml3.com` as the specific domain already
  in use, useful given ARML's web presence is oddly split across several parallel domains
  (`arml3.com`, `arml6.com`, `armlcontest.com`) with no obvious single canonical site.

**Recommendation for future batches:** query `opportunities.official_url` for the target organizer
strings *before* starting web research, not after. It would have caught the Journal of Research and
Stanley Prep ambiguities immediately rather than after independent (and in Journal of Research's
case, initially wrong-leaning) web research.

## A schema finding that affects every organizer string, including doc 08's own candidates

`opportunities.organization_entity_id`'s own trigger
(`trg_opportunities_org_entity_type`, migration 0038) restricts it to
`entity_type in ('opportunity_provider','organization','university','school','employer','research_institution','lab','ngo','club')`
— **`program`, `competition`, and `scholarship` are not permitted on this specific column**, even
though they are valid values of the general 14-type `canonical_entities.entity_type` enum and even
though several organizer strings *are*, by ordinary language, the name of a competition or
scholarship rather than an institution.

This matters retroactively: `08`'s own `opportunity-organizer-candidates.json` proposes `PennApps`
as `entity_type='competition'` and `MIT Battlecode` the same way — exactly the shape this column's
trigger would reject if either were the entity actually written into
`opportunities.organization_entity_id` for its own row. This is not a contradiction in `08`'s
work — `PennApps`/`MIT Battlecode` are correctly typed as `competition` in the *general* registry,
related `provider_for` back to their university — but it does mean the entity that actually gets
linked via `organization_entity_id` for a PennApps-organized opportunity must be University of
Pennsylvania (or a CS-department-level entity), not the PennApps competition entity itself. This
batch adopted the rule going forward: **`opportunities.organization_entity_id` always points at the
organizing body, never at the named program/competition/scholarship it runs**, and proposes
`entity_type='opportunity_provider'` (already in the constraint) for organizers whose entire public
identity *is* running one named program — see the next section.

## The `opportunity_provider` vs. generic `organization` boundary, made explicit

`00` noted `opportunity_provider` was, at session start, the most under-populated type in the whole
registry (4 rows). This batch proposes 43 more, using a heuristic worth stating plainly since
neither `01` nor `08` fully specified one:

- **`opportunity_provider`**: the organization's entire public identity *is* the one named
  competition/journal/program it runs, with no broader independent mission (`DECA Inc.`, `MathILy`,
  `iGEM Foundation`, `American Regions Mathematics League`, `Journal of Research`/JRHS, `Terra
  Journals`, `Ross Mathematics Program`, `Canada/USA Mathcamp`, `USA Computing Olympiad`, `The
  Concord Review, Inc.`, etc.).
- **`organization`**: a broader-mission institution, foundation, professional society, or government
  body for which running student programs is one activity among several (`Davidson Institute for
  Talent Development`, `The Sutton Trust`, `Mathematical Association of America`, `Royal Society of
  Chemistry`, `Coursera`, `Center for Civic Education`, etc.).

This is a real, evidenced pattern, not an arbitrary split, but it is a genuine judgment call at the
margin (e.g. `QuestBridge`, `National History Day, Inc.` could reasonably go either way) — flagged
here as a candidate for a short, explicit rule (`RULE-ENTITY-020`?) rather than left implicit across
147 independent per-row decisions.

## New joint-organizer and near-joint-organizer cases beyond `08`'s original four

`08` found four live "in partnership with"/"/" joint-organizer strings and named the missing
`partner_of` relationship type as the gap. This batch found **five more, plus two shapes that look
similar but are meaningfully different** — useful because a future `partner_of` migration should be
designed against the full evidenced shape, not just the original four:

| Organizer string | Shape |
|---|---|
| `Boston University College of Fine Arts, in partnership with the Boston Symphony Orchestra` | Classic joint credit — BU's College of Fine Arts and the independent nonprofit BSO co-run the Tanglewood Institute (BUTI). Same shape as `08`'s four. |
| `ETH Zurich, Department of Computer Science (D-INFK), in partnership with Hebbian` | Same shape, smaller scale — a university department and a small independent STEM-education startup (Hebbian, `hebbian.ch`). |
| `The Brewer Foundation, in partnership with New York University` | Same shape — an independent foundation (whose own site is only a law-firm subpage) and a university, co-running the International Public Policy Forum. |
| `Finnish Association of Philosophy and Ethics Teachers (FETO) / Philosophical Society of Finland` | Same shape, "/" punctuation rather than "in partnership with" — two independent Finnish nonprofits. |
| `FISP (International Federation of Philosophical Societies) / UNESCO` | Similar, but asymmetric: FISP runs the International Philosophy Olympiad; UNESCO is a named institutional co-sponsor, not a peer operator with its own equal claim to organizing it. |
| `NASA / University of Texas at Austin Center for Space Research` | **A different shape worth distinguishing**: this reads as a funding/programmatic sponsor relationship (NASA funds/co-designs the SEES program that UT Austin's Center for Space Research runs) rather than two equal co-brands jointly organizing. If `partner_of` is ever added to the schema, this case argues for either a `sponsor_of`-style distinction or an explicit note that `partner_of` covers both shapes loosely. |
| `Arizona State University (Access ASU / Barrett, The Honors College)` | **Not actually a `partner_of` case** — Access ASU and Barrett Honors College are both internal ASU units, not independent organizations, so this is closer to the two-named-sub-units-of-one-institution shape already seen in the Wharton cluster (`08`) than to a genuine cross-organization partnership. Flagged so a future pass doesn't mis-sort it into the `partner_of` bucket. |
| `Harvard-MIT Math Tournament` | **A third distinct shape**: entirely student-organized jointly by Harvard and MIT students, with no separately incorporated body. Not `part_of`/`school_of` either university, and not a symmetric-brands partnership either — closer to "a competition whose organizer happens to be an unincorporated joint student effort across two institutions." Recommended for `entity_verification_queue` rather than forcing a `parent_entity` onto either school. |

Combined with `08`'s original four, that's **11 live joint/near-joint-organizer strings** now
documented across both research passes — a strong, repeated signal that `partner_of` (or some
family of related types) is worth prioritizing whenever the schema-gap backlog from `06`/`11` is
next worked.

## The government-entity-type gap

Five organizer strings in this batch name a government body directly: `European Commission
(Directorate-General for Research and Innovation)`, `Office of Naval Research`, `NASA` (as the
joint partner above), `Presidency for Turks Abroad and Related Communities (YTB), Government of
Turkiye`, and (embedded inside the Legacy International joint case) the `U.S. Department of State
Bureau of Educational and Cultural Affairs`. None of the 14 `canonical_entities.entity_type` values
is a clean fit — `organization` was used throughout as the closest available type, consistent with
how `03` already handles the absence of a `government` relationship concept. This is a small,
low-blast-radius gap (five rows out of 147) but a real one, worth a one-line mention alongside the
`partner_of`/`organized_by`/`campus_of` gaps `06`/`11` already track if a future schema review
happens to be in progress — not urgent enough to justify raising alone.

**`YTB` specifically is recorded with no `parent_entity`, on purpose**: sources disagreed on
whether it sits directly under the Turkish Presidency or under the Ministry of Culture and Tourism.
Per this package's standing rule, a genuine source conflict is recorded as unresolved rather than
picked between — see `01`'s tier-2 evidence rule (a disagreement is decisive against confidently
asserting either answer, not grounds for choosing the more convenient one).

## The two-level parent chain the schema can't express in one row

`Vanderbilt University, Peabody College (Programs for Talented Youth)` is a genuine three-tier
chain: PTY is a program/center of Peabody College, which is itself one of Vanderbilt's ten
constituent schools (`school_of` Vanderbilt). This candidate JSON's schema (like the live
`entity_relationships` table it mirrors) only carries one `parent_entity`/`relationship_to_parent`
pair per row, so this batch modeled the organizer string at the Peabody College tier (the more
defensible independent-identity level, matching the Wharton/Stern precedent) and documented the
second hop in `notes` rather than inventing a two-parent field. This is not a schema gap in the
same sense as `partner_of` — `entity_relationships` already supports chaining via two separate rows
(PTY `part_of` Peabody College; Peabody College `school_of` Vanderbilt) — it is only a reminder that
a single research-candidate JSON row can't fully represent a chain, and an implementer creating
these rows for real should expect to write two relationship rows, not one, for cases shaped like
this.

## Confirmed patterns from `01`–`08` that held up against 147 more real strings

- **RULE-ENTITY-013** (don't create a system/parent entity for a single known child) came up
  repeatedly for university sub-centers with no second sibling in this data (`DIMACS`, `Aggie STEM`,
  `CEISMC`, UMD's `Office of Extended Studies`, `Colorado School of Mines`' `Conference and Event
  Services`) — each proposed candidate explicitly flags that resolving straight to the parent
  university remains the more conservative, equally defensible choice, per `08`'s own stated default
  for this shape.
- **The school-group model (`03`)** generalized cleanly to two more real cases beyond MEF/İSTEK/
  Terakki/Bilkent: `Idyllwild Arts Academy / Idyllwild Arts Foundation` (a foundation operating a
  named boarding school) and `United World Colleges (UWC)` (an international coordinating body for
  18 constituent colleges, none of which currently appear as their own organizer strings). Neither
  required a new rule — both are the existing pattern working as designed.
- **A second federation candidate for `member_of`, beyond `03`'s PSL/UC-system list**: `The American
  Legion (state-affiliated programs)` — the national organization charters semi-autonomous state
  departments that independently run their own Boys State/Girls State programs. Not created here
  (only the national body appears as a live organizer string), but named as a concrete future
  candidate the way `03` already named PSL and the UC system.
- **RULE-ENTITY-016** (joint credit is never `operated_by`, never a merge) is now evidenced by 11
  live examples across both research passes rather than `08`'s original four — see above.
- **RULE-ENTITY-017** (Wikipedia/Wikidata as discovery-only) was followed throughout; every
  `official_url` in the JSON traces to the organization's own site or the ROR API, never to a
  Wikipedia/Wikidata value.

## What this document does not do

Consistent with `00`'s standing method: nothing here was written to `canonical_entities`, no merge
was executed, and no `entity_verification_queue` row was created. Every proposal in
`opportunity-organizer-candidates-batch2.json` is exactly that — a proposal, for the session that
owns write access to confirm before creating any row, alias, or relationship. Three organizer
strings this session was assigned research effort on real-world entities that, on inspection, are
genuinely thin or contested enough (`Stanley Prep`, `American Regions Mathematics League`'s exact
canonical domain, `YTB`'s government-structure placement) that this document recommends a second
independent look before treating them as `source_verified`, not that they be trusted as-is.

**Independent spot-check, run by the lead session after reviewing this document (not by the agent
that wrote it):** three of this batch's claims were re-verified from scratch via separate web
searches — `Journal of Research`→`journalresearchhs.org` (confirmed: JRHS, the exact high-school
research journal described), `120 Hours`→`120hours.no` (confirmed: the real Norwegian
student-organized architecture competition, matching the description exactly, not the unrelated
hackathon), and the flagged-low-confidence `Stanley Prep`/WFUNA claim (confirmed, and more directly
than this batch's own citation — WFUNA's own site has a page titled "Training Programs at the UN:
Stanley Prep," `wfuna.org/program/training-programs-at-the-un-stanley-prep/`, an even more direct
primary source than what this document originally cited). All three checked accurate — recorded
here as evidence this batch's methodology produced trustworthy results, not merely as a formality.
