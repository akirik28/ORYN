# Turkey high-schools canonical registry — Wave 1 research methodology

**Status:** Wave 1 in progress. **Branch:** `oryn/research-turkey-schools`. **Owner:** Research
Claude (see `docs/ORYN_WORKSTREAMS.md`'s `RESEARCH` row). Short operational status lives in
`docs/handoffs/research-turkey-high-schools.md` — read that first if you just need the current
numbers; this file is the reasoning behind them.

## Objective

Give ORYN's onboarding "which school do you attend?" field (`EntityCombobox scope="school"`,
`canonical_entities` where `entity_type='school'`) a high probability of resolving a real
Turkish student's typed school name to one verified record, for the subset of Turkish high
schools whose students have a meaningful likelihood of applying to universities abroad. This is
a **product-coverage registry, not a prestige ranking** — see `AGENTS.md` §11 and this file's own
"What this registry is not" section below.

## Starting point: this was not a blank slate

Before researching anything, this pass measured live state directly (Supabase MCP
`execute_sql` against `qtcvcflzxbuagvvwahhu`, 2026-08-20) rather than trusting
`docs/entity-canonicalization-audit.md`'s "54 of 58" framing, which predates a further
reconciliation pass. Live state found:

- **58 Turkish schools already `entity_type='school'` in `canonical_entities`**, loaded
  2026-08-15/17 from the founder's own verified Google Drive corpus ("10 ORYN Canonical App
  Data Pack — Verified 2026-08-15", table `TRSCH`). See `scripts/drive-import/README.md` and
  `docs/live-db-reconciliation.md` for that pass's own methodology.
- **133 `entity_aliases`** already attached to those 58.
- **`school_profiles`** populated for all 58 (`school_level`, `ownership_type`,
  `instruction_languages`, `international_orientation_state`).
- **`school_credentials`** already carrying 42 IB Diploma Programme rows plus assorted AP,
  Cambridge IGCSE, German Abitur/DSD, and French Baccalaureate-equivalency rows for schools
  within that 58.
- **`entity_verification_queue`** holding roughly 50 more school-related rows in
  `queued`/`in_progress`/`verified` states from that same pass — most map onto one of the 58
  already-canonical rows (alternate spelling/pending outcome-metric work), but **8 have no
  matching `canonical_entities` row at all**: `Aka Koleji (Aka Schools)`, `AlJazari
  International School of Science and Technology`, `Anka Bilim Koleji`, `Ankara ABC Okulları`,
  `BALIKESIR ACI COLLEGE`, `Cakir Schools`, `Yeni Yol Schools`, `ZAFER COLLEGE` — genuinely
  proposed, genuinely unresolved.

Re-doing identity/alias verification on the existing 58 would be duplicate work with no
product value, and would risk this pass unknowingly conflicting with the still-open
`entity_verification_queue` items. So Wave 1's actual research contribution is:

1. **Resolve the 8 open queue names** — confirm whether each is a real, distinct, currently
   operating institution and, if so, its actual city/official identity (several had no city on
   file at all).
2. **Research genuinely new schools** to bring the total registry to exactly 100, with
   deliberate attention to geographic coverage the existing 58 lack entirely (see below).

The existing 58 are catalogued in this dataset too (tagged `existing_status: "already_live"`,
carrying their live `canonical_entity_id` and `drive_seed_id` for cross-reference) so the
registry concept — "100 schools relevant to this product" — is documented in one place, but
they are explicitly **not re-researched or re-submitted for ingestion**; only rows tagged
`existing_status: "new_candidate"` are new work product for the next consumer to review.

## Selection methodology

Not a "most prestigious 100" list (see `AGENTS.md` §11 — this is explicitly a coverage
registry, not a ranking). The combined 100 should reflect a broad mixture of:

- foreign/historic international-oriented schools (French lycées, German Auslandsschulen,
  American colleges, Austrian Gymnasium)
- internationally oriented private Turkish school networks
- IB World Schools (Diploma Programme specifically — PYP/MYP-only campuses are noted but not
  treated as equivalent evidence of DP-track international relevance)
- Cambridge/IGCSE/A-Level schools
- AP schools
- selective public schools (Fen Lisesi, strong Anadolu Lisesi) whose graduates plausibly apply
  abroad even without a formal foreign-curriculum track

The existing 58 already lean heavily toward Istanbul/Ankara/İzmir with real depth in the
foreign-school and IB categories. Wave 1's new-candidate research was deliberately weighted
toward cities **entirely absent** from the existing 58 — Antalya, Adana, Kocaeli, Eskişehir,
Kayseri, Konya, Balıkesir — plus modest additional depth in Istanbul/Ankara/İzmir, rather than
piling further onto already well-covered cities. Exact city-by-city counts for the final 100
are in `docs/handoffs/research-turkey-high-schools.md`.

## Source strategy

Priority order, per `AGENTS.md` §7/§17:

1. the school's own official website
2. official program directories — IB World School search, Cambridge International School
   Finder, College Board AP course ledger, German ZfA Auslandsschule list, French AEFE/Label
   FrancÉducation network list
3. Turkish government sources (MEB) where an official identity/code is at stake
4. reputable secondary sources (news, education-consultant material) only to *discover*
   candidates, never as the sole evidence for an academic-program claim

For every school in this dataset, `sources[]` carries the URL, a source-type tag, and a note
on what specifically that source confirms. `advanced_programs` is populated **only** when a
source explicitly supports it — a school's general reputation, or another school in the same
network having a program, is never treated as evidence. Many legitimate, internationally
relevant public schools (most Fen Lisesi/Anadolu Lisesi entries) have **no** IB/AP/Cambridge
program at all; that is recorded as an honest empty `advanced_programs` array, not left
ambiguous.

## Canonicalization methodology

Mirrors the schema the product already has (`supabase/migrations/0038_canonical_entity_registry.sql`)
rather than inventing a parallel shape, so the next consumer can map a `new_candidate` row
directly onto an insert without redesigning anything:

- `canonical_name` / `display_name` mirror `canonical_entities` columns.
- `aliases[]` mirrors `entity_aliases` (`alias_type` uses the same enum:
  `official|common|abbreviation|legacy|translation|user_submitted`).
- `school_category` / `primary_curriculum` / `advanced_programs` feed what would become
  `school_profiles` + `school_credentials` rows, not new columns.
- `sources[]` mirrors `entity_evidence`.

No row in this dataset was inferred into existence from name similarity alone. Every
`new_candidate` row traces to at least one source in `sources[]` that a human can open and
check. Per `AGENTS.md` §15 and this repo's own parallel-session discipline, **campus/network
ambiguity is flagged, never silently merged** — e.g., where a school network (Terakki, İSTEK,
Uğur, Doğa) has multiple distinct campuses, only campuses with independently confirmed
separate identity/official pages are included as distinct rows; a network name alone is not
treated as one school.

## Alias methodology

Only aliases with a real, checkable use are included: an abbreviation the school's own
materials use (e.g. "BLIS", "TED"), the school's own English-language name published
alongside its Turkish name, or a widely used short form attested in an official/near-official
source. No alias was generated by guessing a plausible-sounding shortening.

## Uncertainty handling

Per `AGENTS.md` §7/§23 — unknown stays unknown:

- `identity_confidence`: `high` (official site + at least one independent corroborating
  source) / `medium` (single reasonably authoritative source) / `needs_review` (real
  institution, but city, exact legal name, or campus/network boundary is not fully settled).
- Class rank, GPA-scale conversion, and school prestige/admissions-advantage scores are never
  computed or implied — see `AGENTS.md` §8 and §23, which are explicit non-negotiables.
- `primary_curriculum` defaults to "Türkiye / MEB" (the vast majority of schools here layer
  AP/IB/Cambridge coursework on top of a MEB diploma, per `AGENTS.md`'s "curriculum ≠
  qualification" distinction) and is only overridden with direct evidence of a genuinely
  foreign base curriculum.

## What this registry is not

- Not a ranking. No school in this dataset carries a prestige/selectivity score.
- Not exhaustive. Türkiye has thousands of high schools; this registry targets autocomplete
  coverage for the subset relevant to international university applications, per the mission
  brief's own scope (`AGENTS.md`-equivalent research prompt, §9-§13).
- Not independent verification of any individual student's achievements — unrelated concern,
  covered by the product's separate evidence system (`AGENTS.md` §11).

## Known gaps / limitations

- `school_credentials`-equivalent evidence (`program_evidence[]`) is comprehensive for
  IB/AP/Cambridge/German/French pathways specifically, since those have public, checkable
  directories. Less formal "international orientation" (a school's own counseling-office
  claims about sending students abroad) is recorded only where a source explicitly supports
  it, and is otherwise left unstated rather than inferred from a school's category.
- Exact `meb_institution_code`, `address`, and `district`-level fields (the fuller
  `school_profiles` columns) were **not** collected for `new_candidate` rows — per the research
  mission's own Phase 13/18 guidance ("breadth first, then depth"; identity + academic context
  before administrative metadata), consistent with how the existing 58 were also seeded
  (`school_profiles` rows for those carry those fields sparsely too).
- Some already-`queued` names in `entity_verification_queue` that were *not* explicitly
  assigned to this Wave 1 pass (the ones mapping onto already-canonical rows, e.g.
  spelling-variant entries) were left untouched — they belong to whoever finishes that queue,
  not to this dataset.

## Consumer / handoff

Structured dataset: `data/research/schools/turkey-high-schools-wave1-100.jsonl`. Short
operational summary: `docs/handoffs/research-turkey-high-schools.md`. Intended consumer:
whoever owns canonical-entity ingestion (Claude A / `DATA-A` per
`docs/ORYN_WORKSTREAMS.md`, or a founder-directed successor) — this research lane does not
write to Supabase itself (see `AGENTS.md` §25).
