# university_programs.kilavuz_kodu — proposal, written not applied

Branch `oryn/yok-atlas-placement-schema`. Migration `0056` written and committed, **not
applied to any live database** — per the coordination session's explicit instruction, 0055's
authorization does not extend to this migration; applying it needs the founder's authorization
again, separately, when someone is ready to actually run it (most usefully alongside a backfill
pass, not before one). Full gate clean: lint 0 (new files), typecheck 0, test 1286/1286.

## The ask

The coordination session flagged this as "the highest-value single fix available for Turkish
data": every one of Oryn's 779 Turkish `university_programs` rows has
`official_program_url = 'https://yokatlas.yok.gov.tr/'` — the bare portal root, because YOK
Atlas has no per-programme URL. `kilavuz_kodu` is a real, live, stable per-programme identifier
(confirmed directly against the API, not from prose — see
`docs/handoffs/yok-atlas-placement-schema-decision.md`, and re-confirmed at 12-university scale
in `docs/handoffs/yok-atlas-placements-scale-12-universities.md`, where it was stored on 456 real
placement-cycle rows without incident). Asked: propose how it lands — a column, or an
`entity_external_ids` row with its own `id_system` — and write the migration.

## The decision: a plain column, not `entity_external_ids`

Checked `entity_external_ids`'s actual shape directly before deciding, rather than assuming the
pattern generalizes:

```
entity_external_ids.entity_id  →  foreign key  →  canonical_entities.id
```

(confirmed via `information_schema.constraint_column_usage`). Its existing `id_system` values —
`WIKIDATA` (985), `ROR` (985), `GRID` (980), `ISNI` (972), `CROSSREF_FUNDER` (922),
`IB_SCHOOL_CODE` (35), `MEB_INSTITUTION_CODE` (2) — are every one of them university- or
school-level identifiers. `university_programs` rows have no `canonical_entities` row of their
own; only universities and schools do in this schema. Reusing `entity_external_ids` for a
per-programme identifier would require either:

- a polymorphic foreign key (two mutually-exclusive nullable target columns —
  `entity_id`/`program_id` — plus a `CHECK` to enforce exactly one is set), a real anti-pattern
  introduced for one single-system fact, or
- making `university_programs` rows canonical entities in their own right — alias tracking,
  merge workflow, verification queue, everything `canonical_entities` exists for — a materially
  bigger architectural change than one stable identifier column justifies.

`kilavuz_kodu` is also, unlike ROR/WIKIDATA/GRID/ISNI, a single-system fact — there is no second
per-programme identifier scheme in play anywhere in this product yet. That is the same shape
`official_program_url` and `admissions_url` already are: single-purpose, single-system, plain
columns directly on `university_programs`, not `entity_external_ids` rows. A dedicated
`university_program_external_ids` table would be the right move the day a second per-programme
identifier system actually shows up — building it now, for one system, is an abstraction with
no second user yet, the same reasoning migration 0055 used to justify a plain wide table over
`university_profile_metrics`'s EAV shape.

## What the migration does

```sql
alter table public.university_programs add column kilavuz_kodu text;

create index university_programs_kilavuz_kodu_idx
  on public.university_programs (kilavuz_kodu)
  where kilavuz_kodu is not null;
```

Nullable, no uniqueness constraint, not added to `university_programs_dedup_idx`, not wired into
`decideIngestion()`. The partial index costs nothing while the column is empty (which it will be
immediately after this migration runs — see below) and pays for itself the moment a backfill
pass starts checking "do I already have this programme's code" before writing.

## What this deliberately does not do

**No backfill.** This migration adds the column only. Populating it for the existing 779 rows is
real, separate work: re-matching every row against the live API by name, the same
collision-prone process `docs/handoffs/yok-atlas-placements-scale-12-universities.md` just ran
for placement cycles — including that pass's own Finding 1: six universities' programme names
are recorded in English in this DB while YOK Atlas is Turkish-only, so those rows cannot be
backfilled by name-matching at all without closing that gap first (a verified bilingual alias,
not a guessed translation). Applying this migration and then discovering the backfill is blocked
on a separate, harder problem would be a worse sequencing than doing the backfill design first —
which is exactly why this migration is a proposal, not something to run today.

**No uniqueness constraint, and no dedup-key change.** Migration 0054 explicitly declined to use
`kilavuz_kodu` for `university_programs` identity resolution, reasoning that YOK Atlas's own
programme-code coverage was evidenced (399 records, one per placement-cycle row) but
`university_programs`' own name-matching coverage was not yet proven at scale. That reasoning is
unchanged by this proposal — if anything, this pass's 6-university language gap and 3-group
Istanbul University faculty-coverage gap are more evidence that `university_programs`' own
identity resolution isn't ready for a hard constraint keyed on an external code yet, not less.
Whoever runs the backfill is the right person to judge whether a constraint becomes safe once
real coverage is measured.

## Files

- `supabase/migrations/0056_university_program_kilavuz_kodu.sql` — new, **not applied**.
- `types/database.ts` — `UniversityProgram.kilavuz_kodu`, added to `UniversityProgramInsert`'s
  optional fields.
- This file.
