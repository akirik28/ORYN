# 04 — Rename / History Framework

Three distinct real-world shapes get confused with each other if not named separately: a
**rename** (one continuously-existing entity gets a new name), a **succession**
(institutional discontinuity — merger, split, refounding — after which both identities remain
independently referenceable), and a **duplicate** (no real-world event at all, just two records
for one thing). This document gives the decision rule and grounds it in a real, currently-open
gap this session found live in the registry.

## The decision rule

```
Did the institution's LEGAL/OPERATING IDENTITY actually change (not just its name)?
│
├─ No — same legal entity, same registry ids, only the label changed
│   └─ RENAME → keep ONE canonical_entities row, update canonical_name/display_name,
│      add the OLD name as an entity_aliases row with alias_type='legacy'.
│      This is a data EDIT (update the row + add an alias), not a merge — there is
│      only ever one row before and after. No entity_relationships row is needed
│      or correct here, because there is only one entity, not two.
│
└─ Yes — a real discontinuity: two institutions federated/split, one absorbed another,
   or an institution closed and a legally distinct one opened in its place
    └─ SUCCESSION → keep BOTH canonical_entities rows (both remain independently
       referenceable — a graduate's degree was conferred by a specific one of them,
       a historical scholarship was awarded by a specific one of them). Add an
       entity_relationships row: newer successor_of older (and, symmetrically,
       older predecessor_of newer). Do NOT merge — merge_canonical_entities()
       tombstones the source, which is correct for "two rows, one real entity,"
       but wrong here because these are, factually, two real entities across time.
```

The test that separates the two: **would a fact dated before the event still correctly describe
the "old" name's row, or does it actually describe the same row under its new name?** A 2015
graduate of "Jacobs University Bremen" graduated from the same institution that today is called
Constructor University — same accreditation, same legal entity, same ROR record continuity in
spirit (in practice ROR minted Constructor University a *new* id, `02yrs2n53`/Wikidata `Q132853201`,
rather than updating a prior Jacobs-University record in place, which is a real external-registry
quirk worth knowing about but does not change the underlying real-world fact: this was a rename,
not a succession). A 2015 graduate of the pre-2019 École Polytechnique, by contrast, did not
graduate from "Institut Polytechnique de Paris" even loosely — IP Paris did not exist yet as an
entity; that is `member_of`, a federation formed later, not a rename at all (see `03`).

## Live, currently-open case: Constructor University

Direct query confirms **Constructor University exists** in the live registry (ROR `02yrs2n53`,
plus CrossRef Funder/GRID/ISNI/Wikidata — full external-id coverage) — it was created following
an earlier cross-session handoff that explicitly flagged it as *"formerly Jacobs University
Bremen / International University Bremen"* and warned not to alias it to the unrelated
`Universität Bremen`. That warning was followed correctly: Constructor University and Universität
Bremen are two separate, correct rows.

**But Constructor University currently has zero `entity_aliases` rows at all** — not "Jacobs
University Bremen" as `legacy`, not "International University Bremen" as `legacy`, nothing. Per
this document's decision rule, this is a straightforward rename (same institution, same
accreditation lineage, just two historical name changes: International University Bremen →
Jacobs University Bremen (2007) → Constructor University (2023)) — the correct fix is two
`legacy`-type alias rows, not a relationship. Until that fix lands, a source, a student's own
record, or a piece of research citing "Jacobs University Bremen" (a name that was in wide use for
16 years and appears throughout scholarship/summer-program literature from that era) will not
resolve to this entity through `resolveIdentity()`'s alias tier, and
`create_or_resolve_user_submitted_entity()` would create a new `user_submitted` "Jacobs University
Bremen" row rather than finding the existing one — precisely the duplicate-creation failure mode
`01`'s framework exists to prevent, currently unguarded for this one real, specific case. This is
recorded as a concrete candidate in `10` and `11`, not fixed by this session (no write access, and
even with it, this is exactly the kind of single-row edit that belongs to whichever session owns
write access to `canonical_entities`/`entity_aliases`, not to a read-only research pass).

**Zero `successor_of`/`predecessor_of`/`related_brand` relationships exist inside ORYN's own
registry** (confirmed by direct query) — but two real, current, externally-verified succession
cases were found this session by checking ORYN's own "genuine single-row ROR gap" candidates
(`university-ror-gaps.json`) directly against ROR's live API, and both are exactly the shape this
section originally had to describe hypothetically:

- **Université de Franche-Comté → Université Marie et Louis Pasteur.** ROR's own record for
  "Université de Franche-Comté" (`ror.org/03pcc9z86`, established 1423) is explicitly
  `status: inactive`, with a direct `successor` relationship to Université Marie et Louis Pasteur
  (`ror.org/04asdee31`, established 2024, `umlp.fr`) — itself one of two 2024/2025 successors to
  the intermediate "Université Bourgogne Franche-Comté" federation (2015–2024/25; the other
  successor, Université Bourgogne Europe, inherits the Dijon/Bourgogne side, not the
  Franche-Comté/Besançon side — UMLP's own child-entity list includes "Laboratoire de
  Mathématiques de Besançon" and other Franche-Comté-specific institutes, confirming which
  successor actually carries Franche-Comté's research lineage forward).
- **Université Toulouse III - Paul Sabatier → Université de Toulouse.** ROR's "Université de
  Toulouse" (`ror.org/01ahyrz84`, established 2025) lists "Université Toulouse III - Paul
  Sabatier" (`ror.org/02v6kpv12`) as a direct `predecessor`.

Both are real successions **an outside registry (ROR) already knows about and ORYN's own registry
does not yet reflect** — ORYN's `canonical_entities` rows for these two institutions (if they
exist, or when created) need a real decision, per this document's own decision rule: does the
ORYN row represent the historical institution (in which case `verification_state='inactive'` plus
a `successor_of`-pointing relationship is the correct model — the same pattern `12` (case 13, Fatih
University) independently arrived at for a closed Turkish university) or should it be updated to
the current successor's identity? **Not decided by this session** — flagged precisely, with
sources, for whoever owns write access; see `05`'s verification section and `10`/`11` for how this
folds into the ROR-enrichment priority item. Both mergers are recent enough (2024–2025) that this
is very likely still-unfolding French higher-education restructuring, not a one-off — the
`docs/handoffs/claude-b-to-claude-a.md` era's "watch for a European business-school merger"
prediction turned out to undersell the risk: full public research universities are mid-merger too.

## Why `legacy` alias and `successor_of` relationship must not be conflated

A tempting shortcut is to record every former name as a relationship row pointing at the current
name, treating "renamed from" as just another relationship type. This document recommends against
that explicitly (`RULE-ENTITY-009` in `06`): a `legacy` alias is a fact about *one row's search
surface* (cheap, always safe, immediately improves resolution), while a `successor_of`
relationship asserts that *two independently-real rows* exist. Modeling a simple rename as a
`successor_of` pair would mean creating a second `canonical_entities` row for "Jacobs University
Bremen" whose only purpose is to exist so a relationship can point at it — exactly the kind of
gratuitous duplicate row this entire research package exists to prevent. The cheaper, correct fix
for a pure rename is always the one-row-plus-alias edit.

## Decision checklist for a researcher encountering "X used to be called Y"

1. Does X's official site, or an authoritative registry (ROR's own aliases/labels field), state Y
   as a former name of the *same* institution (same accreditation number, same campus, same
   founding date)? → rename. Add `legacy` alias to X's existing row. Stop.
2. Did X's official history page describe a merger, split, federation, or a closure-and-reopening
   under different legal ownership? → succession or `member_of` (federation), per the test above.
   Requires two rows and a relationship, never a merge.
3. Neither is confirmable from an official source? → leave as-is, do not guess, queue as
   `unknown_relation`-equivalent (an `entity_verification_queue` item) rather than picking one.
