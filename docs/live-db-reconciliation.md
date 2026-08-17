# Live database ↔ repo reconciliation

Date: 2026-08-17. Project: `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`).

## What the drift actually was

The working assumption going in was "live is ahead of the repo". That was half right, and
the wrong half was the expensive one.

**Live was ahead in one dimension.** Eleven migrations exist in the live migration history
that exist in no commit on any branch of this repository:

```
add_canonical_entity_registry            canonical_entity_relationships_and_locations
add_canonical_entity_search              canonical_entity_user_submitted_and_merge_workflow
add_entity_verification_queue            university_rankings_and_profile_metrics
canonical_entity_references_across_...   current_university_student_counts_view
global_university_discovery_queue        enable_pg_net_for_verified_dataset_ingest
qs2027_top1000_staging_and_csv_parser
```

**Live was also behind, and nobody had noticed.** Repo migrations `0028` and `0030`–`0037`
had never been applied. The entire Professional Profile & Networking pack — `contact_info`,
`featured_items`, `skill_endorsements`, `recommendations`, `profile_views`,
`profiles.headline/about` — was committed code with no tables behind it.

### Cause

`git grep canonical_entities` and `git grep entity_aliases` return **nothing**, in the
working tree and across every ref. No commit ever contained them. The canonical registry
was built by applying migrations directly to the project (MCP `apply_migration` or Studio)
without writing the corresponding files. So this is case **B — applied outside the repo**,
not a replaced or rewritten history.

Meanwhile the repo kept moving. Migrations 0030–0038 were authored and committed against
the assumption that they would be applied later, and they never were. Two histories,
neither aware of the other.

### The counts in the briefing were stale

| | briefing | actual |
|---|---|---|
| `universities` | ~267 | **1010** |
| `canonical_entities` | ~328 | **1143** (now 1160) |
| `university_rankings` | ~260 | **1009** |
| `university_profile_metrics` | ~143 | **172** (now 176) |

The QS 2027 Top-1000 ingest ran between the briefing and this session. The 267 figure is
the pre-ingest curated set, which survives as the 260 rows still marked
`data_confidence='high', data_status='fresh'`.

## Architecture decision: `canonical_entities` wins

Repo `0038_canonical_institutions.sql` proposed `institutions` (a `category` enum of
school/organization, `aliases text[]`, `*_id` FK columns). It had **never been applied
anywhere** — there is no `institutions` table in live — so deprecating it cost zero data.

The live registry is strictly richer on every requirement in the brief:

| Requirement | `canonical_entities` | `institutions` (0038) |
|---|---|---|
| schools, universities, employers, NGOs, labs, clubs, sports teams, providers | 15 typed values | 2 categories |
| aliases | rows, each with language/type/source/verified | `text[]`, no provenance |
| source evidence | `entity_evidence` | — |
| external IDs | `entity_external_ids` | — |
| locations | `entity_locations` (multi-campus, validity dates) | two columns |
| relationships | `entity_relationships` (9 types) | `parent_entity_id` only |
| verification workflow | `entity_verification_queue` | a status enum |
| merge workflow | `merge_canonical_entities()` + audit table | — |
| per-field type enforcement | database triggers | app code only |
| duplicate prevention | partial unique index excluding tombstones | plain unique index |

It also already had every linkage column wired and indexed — `profiles.school_entity_id`,
`*.organization_entity_id`, `sports_experiences.team_entity_id`,
`universities.canonical_entity_id` — each guarded by an `enforce_canonical_entity_type`
trigger. Applying 0038 would have created a **second, parallel** set of columns pointing
at a **second** registry.

The one thing 0038 contributed that the live registry genuinely lacked is
`activities.opportunity_id`, which is not an identity concern at all. It is carried
forward in `0039`.

## What changed

### Migrations

| File | What |
|---|---|
| `0037_public_profile_headline_about.sql` | **Fixed a latent bug.** `create or replace view` cannot insert columns mid-list, so this migration could never apply to *any* database — it failed with `42P16: cannot change name of view column "country" to "headline"`. Now drops and recreates, and re-issues the grant. |
| `0038_canonical_institutions.sql` | **Deleted.** Superseded architecture, never applied. |
| `0038_canonical_entity_registry.sql` | **New.** Idempotent transcription of the entire live canonical stack — registry, aliases, evidence, external IDs, locations, relationships, queues, merges, school/university reference tables, all linkage columns, all functions and triggers, RLS, and the field-policy catalogue. Verified as a byte-for-byte no-op against live: row counts unchanged after applying. |
| `0039_canonical_registry_reconciliation.sql` | **New.** The forward deltas — see below. |
| `0040_post_reconciliation_security.sql` | **New.** Security-advisor findings. |

Migrations `0028`, `0030`–`0037` were applied to live. All additive; every affected table
was empty.

### What `0039` fixes

1. **`activities.opportunity_id`** — the one genuinely new linkage from the retired design.

2. **The custom fallback was unreachable.** `create_or_resolve_user_submitted_entity` was
   invoker-rights, and `canonical_entities`/`entity_aliases` grant INSERT to nobody. Every
   call from a student session failed on RLS. It is now `SECURITY DEFINER` with EXECUTE
   granted only to `authenticated` — a far narrower grant than an INSERT policy, because
   the function can only ever produce `verification_state='user_submitted'` on an
   allow-listed entity type. It now also enqueues each new entity for verification; before,
   user-submitted rows accumulated next to a queue that nothing fed.

3. **`university_rankings` (1,009 rows) and `university_profile_metrics` were unreadable.**
   RLS enabled, zero policies — deny-all for `authenticated`, not just anon. Any page
   showing a ranking silently got nothing. Both now have the same `authenticated read`
   policy `universities` has always had.

4. **Registry reads narrowed from anon to authenticated.** The policies were
   `for select using (true)` with no role restriction, so the anon key could enumerate the
   whole registry including student-submitted rows. `universities` was already
   authenticated-only; this closes the inconsistency.

5. **43 duplicate university identities queued for review, not merged.** See below.

## Data integrity audit (Phase 6)

| Bucket | Finding | Count |
|---|---|---|
| SAFE | verification queue rows unresolved to an entity | 10 |
| POSSIBLE_DUPLICATE | duplicate name within type+country+city | 0 |
| **AMBIGUOUS** | **same normalized name, differing city string** | **43** |
| AMBIGUOUS | same alias on multiple entities | 0 |
| AMBIGUOUS | alias equals another entity's canonical name | 0 |
| INVALID | blank names / non-http URLs | 0 |
| UNRESOLVED | school/university entities with no `country_code` | 1058 |
| UNRESOLVED | `official_verified` with no evidence row | 78 |
| UNRESOLVED | university entities with no `universities` row | 72 |

**The 43 duplicates are real.** The curated set and the QS-2027 expansion each created a
row for the same institution, differing only in how the city was written — "Boston" vs
"Boston, MA", "Pasadena" vs "Pasadena, CA". `canonical_entities_identity_uq` could not
catch them because it keys on the city string, and every university row has a null
`country_code`. They are **not merged here**: a name-plus-city heuristic is exactly the
kind of fuzzy match that must not run unattended. Each pair is enqueued in
`entity_verification_queue` with `blocker='possible_duplicate'` and instructions.

**78 `official_verified` university entities have zero evidence rows** — in fact *no*
university entity has any. The registry is asserting a verification state its own evidence
model does not support. Flagged, not silently downgraded: changing 78 verification states
is a data decision, not a reconciliation one.

## The headline feature was broken on live data (Phase 7)

Before this session, searching the canonical registry for **"MIT", "LSE", "Caltech",
"NUS", "UNSW"** returned **nothing**, and **"UCLA"** returned *University College London* —
a different university.

Cause: the QS ingest wrote names as `University of California, Los Angeles (UCLA)`. The
abbreviation lived inside the display name, not in `entity_aliases`, so alias search could
not reach it. Only 132 alias rows existed for 1,143 entities.

Fixed in `supabase/seed_canonical_delta.sql` by extracting trailing parentheticals into
alias rows. Deterministic, restates data already in the row, never touches `display_name`,
`verified=false`. Aliases went 132 → 435.

```
UCLA     -> University of California, Los Angeles (UCLA)      [1.000]
Caltech  -> California Institute of Technology (Caltech)      [1.000]
LSE      -> The London School of Economics and Political ...  [1.000]
MIT      -> Massachusetts Institute of Technology (MIT)       [1.000]
UNSW     -> The University of New South Wales (UNSW Sydney)   [0.970]
bogazici -> Boğaziçi University                               [0.980]
```

### Drive pack delta

Source: **ORYN Canonical App Data Pack — Verified 2026-08-15**
(`1tpQVG12JKdqGXFs1LW8g3_K0VBGORLbrTTQJJ36dkuc`). Compared row by row before writing
anything:

| Group | Rows | Outcome |
|---|---|---|
| Schools (TRSCH) | 54 | Already present — all 58 live school entities carry `metadata.drive_seed_id` from this pack. |
| Universities (GUNI) | 77 | Already present. 63 match by exact name; the other 14 match under the QS-style parenthetical name. **Inserting them would have created 14 real duplicates.** |
| Organizations (PROV) | 19 | **17 imported.** Yale and Carnegie Mellon skipped: already present as `university` entities, and every organization-ish field accepts `university`, so a second row would be a duplicate identity for nothing. |
| Opportunity aliases | 5 | Not applicable — `opportunities` is empty. |

Entity types were mapped from the pack's own `institution_type` rather than filed
wholesale as `organization`, because the type is what each field's trigger checks: a
journal filed as `organization` becomes linkable from a work-experience row.

`supabase/seed_entities_drive_batch1.sql` was deleted — it targeted `institutions` and a
`universities.aliases` column that does not exist.

## Empty tables (Phase 9)

| Table | Classification |
|---|---|
| `university_programs`, `university_requirements` partial, `opportunities`, `opportunity_sources` | **SEED NOT APPLIED** — `supabase/seed_drive_batch1.sql` exists in the repo, targets these tables with real sourced Drive data, and has never been run. Not applied here: its university inserts key on `(lower(name), country)` and the live set is now QS-named, so the overlap needs checking first. |
| `university_statistics` | **DATA PIPELINE MISSING** — `lib/universities/sync-us-universities.ts` has never run; `external_sync_jobs` has 0 rows ever. |
| Every user-owned table (`activities`, `skills`, `connections`, `messages`, …) | **EXPECTED EMPTY** — a QA scratch project with 4 profiles. |
| `contact_info`, `featured_items`, `skill_endorsements`, `recommendations`, `profile_views` | **EXPECTED EMPTY** — created this session; no user has used the features yet. |
| `canonical_entity_merges` | **EXPECTED EMPTY** — nothing has been merged, deliberately. |
| `provider_health`, `product_events`, `external_sync_jobs` | **EXPECTED EMPTY** — write-on-use operational tables. |

## Migration history reconciliation (Phase 10)

No applied history was rewritten and no timestamp was faked. The eleven out-of-repo
migrations stay in live's history as the documented baseline. `0038_canonical_entity_registry.sql`
reproduces what they built, written to be idempotent, so:

- **fresh database**: `0001`–`0037` build the app schema, `0038` builds the canonical
  stack, `0039`/`0040` apply the deltas → converges to live.
- **live database**: `0038` was applied and changed nothing (verified: 1143 entities, 132
  aliases, 1010 universities, 1009 rankings, 58 schools, 22 field policies — all unchanged
  across the apply).

## Security (Phase 13)

Verified by simulating both roles directly against RLS:

| Check | `authenticated` | `anon` |
|---|---|---|
| `canonical_entities` | 1160 | **0** |
| `entity_aliases` | 435 | **0** |
| `universities` | 1010 | **0** |
| `university_rankings` | 1009 (was 0) | 0 |
| `entity_verification_queue` | **0** (deny-all) | 0 |
| `qs2027_import_staging` | **0** (deny-all) | 0 |
| custom fallback RPC | creates `user_submitted` + queue row | no EXECUTE |
| forging a verified entity | **blocked** | blocked |

Advisor fixes in `0040`: `current_university_student_counts` switched to
`security_invoker`; `handle_new_user` (a trigger function) is no longer an RPC endpoint;
`is_blocked_between` revoked from anon but kept for `authenticated`, which needs it for
three INSERT policies.

Accepted and documented rather than "fixed": `pg_trgm`/`unaccent` in `public` (relocating
means recreating every trigram index the product's search depends on); eleven tables with
RLS and no policy (deliberate deny-all for operational surfaces); the custom-fallback RPC
being SECURITY DEFINER (that is its purpose). Leaked-password protection is a dashboard
setting and cannot be enabled from a migration.

## Browser verification (Phase 12) — partial, honestly

Dev server on port 3000 (one instance). Verified: the app builds and boots, the marketing
page and `/signup`/`/login` render with **zero console errors and zero server errors**, and
middleware correctly redirects `/universities?q=MIT` to sign-in.

**Signed-in flows were not exercised through the browser.** Doing so requires creating an
account and typing a password into a login form, which is outside what I will do
unattended. Rather than skip the coverage, the same behaviour was verified one layer
down — as the actual `authenticated` Postgres role against real RLS: entity search across
school/university/employer scopes, Turkish folding, the custom-fallback write path, queue
enqueueing, and every deny-all boundary (tables above). That is stronger evidence for the
data layer than clicking would have been, and weaker evidence for the React layer. The
gap is real: **onboarding, profile CRUD, coursework, connections and messaging have not
been clicked through since the column rename.**
