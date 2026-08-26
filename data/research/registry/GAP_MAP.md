# ORYN Research Freeze — Gap Map

**Maintained by: CEO (control tower).** Rewritten in place at each checkpoint, not appended to.
Numbers below are measured live against `opportunities`/`universities` in Supabase project
`qtcvcflzxbuagvvwahhu` (oryn-qa-scratch) — re-run the queries in this file's own footer before
trusting this beyond same-day use.

## Checkpoint: 2026-08-26, freeze day 1, ~09:15 (session start)

## 1. University photos (S1-S4 scope)

| | Count |
|---|---|
| Canonical universities needing a photo | **1,010** |
| Currently have any image infrastructure | **0** — confirmed by grep across all migrations, no `image_url`/`photo_url`/equivalent column exists on `universities` or `opportunities` anywhere in the schema history (0001-0065). |
| Prior research/data on this | **None found** anywhere in the repo as of freeze start. |

**Read**: this is not a partially-covered category needing depth — it is a cold start. No
duplicate-work risk yet, but also no schema to write real image URLs into. **S1-S4 should
research and verify candidate images now** (Wikimedia Commons and other open-license sources
per the Common Operating Contract §10) and log them to the registry as `VERIFIED`, but actual
`PRODUCTION_READY` promotion is blocked on a schema decision — see Founder Escalations below.
Prioritize by real exposure, not alphabetically: request a `target_universities`/match-count
join from CEO if you need a priority-ordered list rather than guessing.

## 2. Opportunities, by category (S5-S7 scope) — live counts, all statuses

| Category | active | under_review | other | **total** |
|---|---|---|---|---|
| summer_program | 149 | 87 | 17 (1 expired, 16 disabled) | **253** |
| competition | 70 | 31 | 0 | **101** |
| research | 10 | 3 | 0 | **13** |
| internship | 7 | 1 | 0 | **8** |
| scholarship | 8 | 1 | 0 | **9** |
| volunteering | 6 | 1 | 0 | **7** |
| entrepreneurship | 5 | 0 | 2 (disabled) | **7** |
| student_program | 7 | 0 | 0 | **7** |
| online_program | 6 | 0 | 0 | **6** |
| fellowship | 5 | 0 | 0 | **5** |
| academic_program | 1 | 2 | 0 | **3** |
| conference | 2 | 0 | 0 | **2** |
| **Total** | **276** | **126** | **19** | **421** |

### This is a real, live imbalance — not a hypothesis

`summer_program` + `competition` = 354 of 421 rows (84%). The other ten categories combined =
67 rows (16%), and several of those ten are the categories most directly tied to a strong
application profile beyond "did a program": **research (13), internship (8), fellowship (5),
academic_program (3), conference (2)** — 31 rows combined, most of it not yet `active`.
Publications/awards/leadership as *named categories* don't exist in the schema's own `category`
enum at all (they may be living inside `competition`/`research`/tags — S7 should confirm rather
than assume a true zero).

**Directive for this checkpoint**: S5/S6 capacity should shift toward *closing gaps within*
summer_program/competition (deadline/eligibility/cost completeness — per the 2026-08-23/24
corpus, still real gaps there) rather than adding volume to already-thick categories. **S7
(scholarships/awards/publications/leadership/online/Türkiye-global) is this checkpoint's
highest-leverage category** — smallest base, least prior-session attention, and covers ground
(publications, leadership, awards as such) that may not exist as findable rows at all yet.
Redirect any idle S5/S6 capacity to S7-shaped candidates before adding a 150th summer program.

## 3. Turkey-access and second-review status — not yet measurable

`turkey_student_access` (VERIFIED_ELIGIBLE / ELIGIBLE_WITH_CONDITIONS / NOT_ELIGIBLE / UNCLEAR)
is this freeze's own new field — it is not a live DB column, so it cannot be queried yet. Until
S1-S8 report it through the registry, the honest state is: **unmeasured**, not zero. Do not
read "421 opportunities live" as "421 usable by a Türkiye-based student" — the 2026-08-23/24
corpus already found real counter-examples in both directions (Caltech SRC restricted to one
US school district; AI Scholars CMU restricted to US citizens; MITES/Clark/SIMR US-only) sitting
inside what reads as a healthy active count.

## 4. Grade-band and subject-family coverage — not yet measured

Not measured this checkpoint — `opportunities.fields`/`eligible_grades` would need a live query
per subject family (STEM/Math/CS-AI/Science/Engineering/Business/Economics/Finance/
Entrepreneurship/Essay/Humanities/Law-Politics/Arts/Architecture) and per grade (9-12). Flagging
as an open gap in the gap map itself rather than guessing — next checkpoint.

## 5. Geographic access-pathway coverage — partial read from prior corpus only

Prior corpus (not re-verified live this checkpoint): strong US/UK coverage, real Netherlands/
Germany/Canada/Australia programme-catalogue depth (separate table, `university_programs`,
not `opportunities`), a dedicated Turkey-opportunities pass (2026-08-21, 24 records) and Turkey
national-route resolution for 6 flagship olympiads. Asia (beyond a few named competitions) and
"Online/year-round, geography-agnostic" as an explicit opportunity shape are both thin on
first read — not yet quantified.

## Founder escalations queued (not yet sent — batching for one message, not one per finding)

1. **University-photo schema doesn't exist.** S1-S4 can source and verify candidate images now,
   but writing them to production needs new columns (`image_url`, `image_source_url`,
   `image_depicts`, `image_verified`, `no_logo_verified`, `correct_entity_verified`,
   `rights_status`) — a migration, which no research lane (including CEO) may create per the
   Common Operating Contract. Recommend DATA or a founder-authorized session drafts this once
   S1-S4 has a real verified batch to size it against.
2. **`turkey_student_access` and `selectivity_evidence` have no columns either** — the second
   is a carried-over gap from the 2026-08-23/24 corpus (`summer_schema_and_pipeline_gaps_2026-
   08-24.md`, 15 items), not new. Same blocker shape as #1.

## How these numbers were produced (re-run to refresh)

```sql
select category, status, count(*) as n from opportunities group by category, status order by 1,2;
select count(*) from universities where duplicate_status = 'canonical';
```
Run against Supabase project `qtcvcflzxbuagvvwahhu` via `execute_sql`. Photo-infrastructure
absence confirmed via `grep -rn "image_url\|photo_url\|image_source\|no_logo_verified"
supabase/migrations/` (zero hits, all 65 migrations).
