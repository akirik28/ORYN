# Cialfo Public Intelligence & Data Gap Audit — engineering record

**Founder-facing counterpart (source of truth for strategy, field maps, coverage, decisions):**
Google Drive document **"ORYN — Cialfo Public Intelligence & Data Gap Audit"**,
ID `1SeLGD4y8Rj4twWpZWeMj5fP_OIEahlwhTNBCtYubVLA`, in the Drive `ORYN` folder
(`10Ca-Tsmr1u7L0L_oJXDW9-PVfPujxl6x`). Update that document after every phase of this
work; it is the durable record. This file is the engineering half: what to run, what to
change, and the rules any implementation must obey.

> **Drive update constraint.** The Drive tooling available to agent sessions can create and
> read Docs but **cannot edit an existing Doc's body in place**. Updating the founder-facing
> document means writing a replacement and trashing the old one, which mints a **new file
> ID** — so whoever updates it must also re-point the ID in this file and in
> `current-state.md`. Search by **title**, not ID; the title is the stable identifier. Drop
> this note if in-place editing becomes available.

Audit opened 2026-08-17 against commit `315f914`.

**Phase 2 landed.** The acquisition architecture that closes these gaps is documented in
[verified-data-acquisition.md](./verified-data-acquisition.md), with a 30-university /
23-country verified pilot committed at `supabase/fixtures/university-identity-pilot.json`.
Read that file before implementing any further data work.

---

## What this audit was and was not

Cialfo (`cialfo.co`) is a school-sold college-counselling platform. Its university data
sits entirely behind `app.cialfo.co`, which was **not** accessed. Everything recorded
came from pages readable with no login:

- `cialfo.co` and `cialfo.co/direct-apply` — positioning and stated scale
- `help.cialfo.co` — their public Intercom help centre, which documents product fields,
  filters, scoring models and workflows in detail. This was the primary evidence base.
- `explore.cialfo.co` (redirects to `explore.study`) — their university-facing
  recruitment brand, not a public student university search

**Rights position, and it is a hard rule:** Cialfo is classified `DISCOVERY_ONLY`. Their
documentation tells us *which fields matter to a student in this category*. It is never a
source for a value ORYN stores, and their visual design is not reproduced. Every field
ORYN adopts is populated from the authoritative publisher of that fact (official
university pages, government open data, official application platforms) with its own
`source_url` + `retrieved_at`. See the Drive doc's Source Rights table for the full
classification of every source touched.

---

## Findings that constrain implementation

These are the ones that change code, not just strategy. Full analysis in the Drive doc.

1. **`university_programs` is the product's largest gap.** 0 rows against a 1,010-university
   spine. Cialfo's newest search is course-first — a student applies to a programme, not an
   institution. This is the highest-value data work available.
2. **Do not attach percentages to admission outlook bands.** Cialfo publishes explicit
   ranges per band (Far Reach 1–5%, Reach 5–20%, Target 20–75%, Likely 75–99%) with no
   confidence interval, sample size, or model version. ORYN's `admission_model_v1` five-band
   output must stay band-only unless a calibrated model plus stated confidence exists —
   non-negotiable #5.
3. **Never feed engagement into an outcome estimate.** Cialfo Likelihood takes "actions
   taken on Cialfo" as an input, and Uni-Fit takes "based on past searches". Behavioural
   signal may rank *what to show* (`lib/opportunities/matching.ts` scope), and must not
   enter admission outlook or any number a student reads as a chance of acceptance.
4. **ORYN's provenance discipline is a genuine differentiator — keep it enforced in schema.**
   Nothing in Cialfo's public documentation carries a source URL, retrieval date, confidence
   level, freshness state or verification status on a university fact. Do not weaken
   `university_sources`, `data_confidence`, `data_status`, `precision_state` or
   `stats_as_of` to move faster on volume.
5. **Explorer filters are thin relative to the data already present.** `app/(app)/universities/page.tsx`
   filters on `country`, `region`, `q` only, while `university_rankings` (1,009 rows) and
   `universities.student_size` (283 rows) are already queryable. Filters must only be added
   over fields ORYN can actually honour — no empty facets.
6. **Verified test scores are achievable but credential-blocked.** Cialfo verifies TOEFL
   against the ETS API (registration ID + DOB, 3-attempt lockout, verified badge). This is
   the first realistic path from `evidence_added` to a true `verified` state. Requires an ETS
   agreement — founder-blocked, see `founder-blocked-backlog.md`.
7. **Minimum cohort size: keep n=100.** Cialfo shows outcome scattergrams to students at 3
   data points, which is too small to protect students at a single school from
   re-identification. ORYN's Phase 19 threshold stays as specified.

---

## Schema implications

### Tables that exist and need data, not migrations

| Table | Rows | Blocker |
|---|---|---|
| `university_programs` | 0 | none — pipeline work |
| `university_requirements` | 0 | none — pipeline work |
| `university_deadlines` | 0 | none — pipeline work |
| `university_statistics` | 0 | `COLLEGE_SCORECARD_API_KEY` unset |
| `university_profile_metrics` (codes beyond `total_students`) | 283 rows, one code | none — pipeline work |
| `external_sync_jobs` | 0 rows ever | pipeline has never executed once |

### Tables that do not exist yet

- **Scholarships.** Needs `name`, `university_id`, `award_value` + `award_currency`,
  `scholarship_type`, `deadline`, `intake_years`, `award_conditions`, `eligibility`,
  `stackable`, plus the standard source/confidence/freshness columns. Design only until the
  sourcing decision lands (see backlog) — no rows from an aggregator without a licence review.
- **Careers / occupations.** Only worth building with sourced labour-market numbers (BLS,
  Eurostat, national statistics offices). Cialfo's careers module has no salary or outlook
  data; a brochure clone adds nothing.
- **Application-outcome store** for Phase 18 benchmarking. Gated on consent design +
  GDPR/KVKK review, since it means storing minors' application decisions.
- **Programme-level search index / filter facets** to support course-first discovery.

Any new migration follows the `0038`+ convention: `text` + `CHECK` constraint rather than
new Postgres enums, so vocabularies can evolve without an enum migration.

---

## Pipeline rules for the programme ingestion work

Written as constraints, so a later session can implement without re-deriving them.

- **Provider boundary.** New sources go behind the existing `UniversityDataProvider` /
  `OpportunityProvider` interfaces. No `fetch` calls scattered through feature code.
- **Scope discovery by university.** Seed programme discovery from the existing 1,010
  university rows plus a per-country programme vocabulary. Do not open-web crawl —
  every candidate must have a known parent `university_id` before extraction.
- **Matching key.** `(university_id, normalised_name, degree_level)`. Resolve entities
  against the canonical registry (`canonical_entities`, `entity_aliases`,
  `entity_external_ids`, migration `0038`) before insert. Never create a second
  `universities` row to hold a programme.
- **Normalisation.** Degree level from a fixed vocabulary; currency as ISO 4217 with the
  amount stored unconverted alongside it; duration numeric years; language of instruction
  ISO 639. Grade thresholds carry their own grading-system metadata and are never
  cross-compared without it.
- **Validation.** Zod per extraction, reject rather than coerce. Sanity bands (tuition
  `> 0` and `< 200000`; duration 0.5–8 years). AI-extracted fields land as *proposals*,
  never direct writes — same rule as CV import.
- **Evidence is mandatory.** One `university_sources` row per accepted fact with
  `source_url`, `source_domain`, `source_type`, `retrieved_at`, `confidence`, `raw_excerpt`.
  No source row, no stored fact.
- **Freshness.** `last_checked_at` on every read attempt; `last_changed_at` only on an
  actual value change; `source_hash` to catch silent page edits. Cadence: deadlines 7d,
  tuition and requirements 90d, programme lists 180d, identity and rankings annually.
- **Conflict resolution.** Official primary > official secondary > third-party structured.
  Same-tier disagreement sets `data_status = 'conflicting'` and surfaces both values with
  both sources. **A failed refresh never overwrites good data.**
- **Idempotency.** Natural-key upsert on the matching key; re-running a batch is a no-op.
  Every run writes an `external_sync_jobs` row — the first successful programme batch
  should be that table's first row ever.
- **Denormalised columns must be written in the same pass as their metric.** The
  `student_size` / `university_profile_metrics.total_students` drift bug (fixed in
  `5bc010d`) is the precedent: writing the metric without the UI-facing column made 113
  rows of real work invisible to students. Any new metric with a denormalised mirror gets
  the same both-writes treatment, and only ever fills a null rather than overwriting a
  human-verified value.

---

## Verification vocabulary

Applied per fact, and the language the Drive doc and any UI copy should share:

`VERIFIED_CURRENT` · `VERIFIED_HISTORICAL` (shown with its date, never as current) ·
`VERIFIED_DERIVED` (must name inputs + calculation version) · `STALE` (shown, labelled
with its age) · `CONFLICTING` (both values, both sources, ORYN picks neither) ·
`UNVERIFIED` (never presented as fact) · `UNRESOLVED` (attempted and failed; recorded so
it is not silently retried forever)

Absence of data is displayed as absence. "Data temporarily unavailable" is always correct;
a plausible-looking invented number never is.

---

## Reproducibility

Re-verify coverage before trusting any number in the Drive doc:

```bash
npm run report:universities
```

This requires `SUPABASE_SECRET_KEY`. **It was empty during this audit**, so the coverage
figures in the Drive doc are carried from the same-day *ORYN University & Opportunity
Enrichment — Canonical Report* rather than re-queried. Confirming that the anon key cannot
substitute is itself a check worth keeping: the public read policies are authenticated-only
(migrations `0014`, `0039`, `0040`), so an anon-key count returns `*/0` for every table —
that is RLS working, not an empty database. Do not read a zero from an anon-key query as a
coverage number.

Other checks used or relevant here:

```bash
npm run check:integrations
```

```bash
npm run entities:audit
```

Standard gate before any commit from this workstream:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

To re-derive the Cialfo evidence, the article URLs are listed with their purpose in the
Drive doc's *Cialfo Public Surface Inventory*. All were public on 2026-08-17; a help-centre
article can be edited or withdrawn at any time, so treat the inventory's access date as
the evidence date.

---

## Queued work, in priority order

1. `university_programs` 0 → real coverage. Start with Economics / Computer Science /
   Engineering across the UK / Netherlands / Turkey / US subset of the existing spine,
   from official course catalogues, one `university_sources` row per fact.
2. Real Explorer filters over data already present: rank band, student-size band,
   institution type, country/region.
3. Surface the Longlist / Shortlist / Applying funnel from existing `target_universities`
   statuses — UI-only change over existing data, cheapest win in this audit.
4. Add tuition-budget capture to onboarding — the one genuinely missing preference
   dimension, and a prerequisite for meaningful programme and scholarship filtering.
5. Scholarship entity — schema only, no data until the sourcing decision lands.
6. `university_deadlines` for universities that already have `target_universities` rows —
   highest student value per row written.
7. Re-run `npm run report:universities` and refresh the Drive doc's Coverage section once
   `SUPABASE_SECRET_KEY` is set.

Founder-blocked items raised by this audit are recorded in
[founder-blocked-backlog.md](./founder-blocked-backlog.md).

---

## Note on `docs/data-readiness.md`

That file still reports 21 universities and 0 opportunities. It is stale — the live state
is 1,010 universities and 11 opportunities per the canonical Drive report. Treat the Drive
canonical report plus this file as current until `data-readiness.md` is rewritten.
