# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (capacity/throughput/bottleneck control).** Rewritten in place at each
checkpoint, not appended to. I do not research opportunity facts, source photos, alter records,
or override evidence — this file tracks fleet capacity and flags backlogs/misallocations only.

## Checkpoint 1 — 2026-08-26, freeze day 1, ~09:30 (T+~20min from fleet dispatch)

**Coverage caveat**: 6 of 9 peer sessions (per `ListAgents`) plus CEO have reported in as of this
checkpoint. 3 sessions unidentified so far — likely S1, S3, S6 (S6's worktree exists on disk but
that session hasn't messaged me directly yet). Numbers below are exactly what's been verified;
nothing extrapolated to cover the silent 3.

### Headline finding this checkpoint: a real correction to the gap-map, not a throughput number

CEO's `GAP_MAP.md` and `REGISTRY_README.md` both stated university-photo coverage as **0/1,010,
"genuinely greenfield," confirmed by grepping migration files for an `image_url`-style column**.
Verified directly against live `oryn-qa-scratch` before this checkpoint went out: that's wrong.
**901 of 1,010 canonical universities already have an image-status outcome** via a pre-existing
EAV metrics table (`university_profile_metrics`, `metric_code='primary_image_status'`:
`wikimedia_verified` 525, `official` 194, `needs_review` 180, `verified` 2), with real license/
attribution data attached (`primary_image_license`: CC BY-SA 3.0 x172, CC BY-SA 4.0 x135, Public
domain x67, etc. — not placeholders), fed by an existing, committed pipeline
(`lib/acquisition/image-validation.ts`, `scripts/acquire-university-images.ts`,
`scripts/university-image-coverage-report.ts`, last touched 2026-08-22). The migration-grep
missed it because the data lives in a generic key-value table, not a dedicated column — a
structural blind spot in that verification method, not a data problem.

This was independently corroborated by two research shards before I verified it myself: **S2**
(oryn-c0, quartile of 253 universities: 177 accepted / 47 needs_review / 29 none — scales
proportionally to the 901/109 fleet-wide split) and **S4** (oryn-88, reported the fleet-wide
901/109 figure directly). Flagged to CEO with full evidence; CEO has not yet confirmed the fix
is live in both files as of this writing. **Real remaining work is a genuine second-pass
semantic verification** (dimension/aspect-ratio checks exist; "is this actually the right
campus, not a logo or a generic city photo" does not) on all 1,010 rows, and 109 true blanks —
not a from-zero build. Recommend S1-S4 treat their mission as "verify + fill 109 gaps," not
"build a pipeline."

### Roster (confirmed directly from each session, not inferred)

| Slot | Session | Mission | Status | Output so far |
|---|---|---|---|---|
| CEO | oryn-e2 | Control tower — registry, gap-map, founder escalations | ACTIVE | Registry + gap-map pushed (`oryn/research-freeze-ceo-control-tower`); 1 correction pending from me |
| S2 | oryn-c0 | University photos, quartile 2/4 (ids 253-505) | ACTIVE, dispatching sub-agents | 0 new — recon only (253-university baseline reported) |
| S4 | oryn-88 | University photos, quartile 4/4 (final) | ACTIVE, dispatching sub-agents | 0 new — recon only (fleet-wide baseline reported) |
| S5 | oryn-83 | Turkey-accessible academic opportunities — S5A summer/pre-college/enrichment, S5B research/mentored-research/internships | ACTIVE, dispatched | 0 — just started |
| S7 | oryn-4d | Other high-value opportunities — Agent A (scholarships/awards/publications), Agent B (leadership/social-impact/fellowships/online) | ACTIVE, dispatching | 0 — just started |
| S8 | oryn-53 | Independent QA gate — Track A (fact/eligibility/currentness), Track B (image/duplicate/canonicalization/link-integrity) | ACTIVE | 0 reviewed (nothing from S1-S7 has landed yet); running a baseline audit of the existing live corpus while it waits |
| S1 | *unidentified* | University photos, quartile 1/4 (inferred from S2/S4 numbering) | unknown | unknown |
| S3 | *unidentified* | University photos, quartile 3/4 (inferred) | unknown | unknown |
| S6 | *unidentified* | Competitions (worktree `s6-competitions` / `oryn/s6-competitions-research` exists on disk, commit = `origin/main`, no report yet) | unknown | unknown |

No session has reported BLOCKED or IDLE. No agent has been silent long enough to flag as a
stuck-agent risk yet (fleet is ~20 minutes old).

### Backlogs (all expected to be nonzero at this stage — flagging as a baseline, not a problem)

| Backlog | Count | Note |
|---|---|---|
| Verification (researched, awaiting VERIFIED) | 0 reported | No S-lane has produced a first batch yet |
| Production-ready | 0 reported | Same |
| Images completed (this week's fleet) | 0 reported | Pre-existing 901/1,010 is prior-pipeline work, not this week's output — kept separate so today's real throughput isn't inflated by yesterday's numbers |
| Duplicate backlog | 0 reported | — |
| Blocked-source backlog | 0 reported | — |
| QA backlog (S8) | 0 — nothing to review yet | S8 is productively using the wait time on a baseline audit of the existing live corpus, not idle |

**Known pre-existing corpus, not this week's output, kept distinct per CEO's registry note**:
2026-08-23/24 overnight session left ~100 competition/research records (11 already in
production, incl. all 6 TÜBİTAK-route flagship olympiads) and ~390 summer-program findings /
~200 dry-run proposals, still sitting **uncommitted in the primary checkout** as of this
checkpoint — independently confirmed present (not lost) via `git status` at freeze start.
S5/S6 should deepen/fill this rather than re-research it from zero; S8 should treat it as
in-scope for baseline QA methodology since it's real, largely unreviewed volume.

### Reallocation

**None recommended yet.** Every reporting session is legitimately in setup/dispatch, not idle —
too early in the freeze for a throughput signal to exist. The one real capacity-relevant
decision this checkpoint is CEO's own standing directive (not mine to countermand): redirect
idle S5/S6 capacity toward S7 once summer_program/competition gap-closing is caught up, since
those two categories are already 84% of the opportunities corpus and S7's categories
(scholarships/awards/publications/leadership) are the thinnest with the least prior-session
attention.

### Open items

1. Waiting on CEO to confirm the image-infrastructure correction landed in both `GAP_MAP.md`
   and `REGISTRY_README.md`.
2. S1/S3/S6 not yet identified by direct report — will fold in the moment they check in.
3. `turkey_student_access` and `selectivity_evidence` have no live columns (confirmed by CEO,
   consistent with the pre-existing `summer_schema_and_pipeline_gaps_2026-08-24.md` finding) —
   not a new gap, but worth tracking since every S-lane's `PRODUCTION_READY` claims this week
   depend on a field that today only exists in staged research files, not the DB.

## How these numbers were produced (re-run to refresh)

```sql
-- opportunities baseline
select count(*) total,
  count(*) filter (where status='active') active,
  count(*) filter (where status='under_review') under_review,
  count(*) filter (where verification_state='verified_current') verified_current,
  count(*) filter (where eligible_countries is not null and array_length(eligible_countries,1)>0) has_eligible_countries,
  count(*) filter (where deadline is not null) has_deadline
from opportunities;

-- university image coverage (the corrected number)
select count(distinct u.id) canonical_total,
  count(distinct m.university_id) filter (where m.metric_code ilike '%image%') canonical_with_image_metric
from universities u
left join university_profile_metrics m on m.university_id = u.id and m.metric_code ilike '%image%'
where u.duplicate_status <> 'superseded';

select metric_code, value_text, count(*) from university_profile_metrics
where metric_code = 'primary_image_status' group by 1,2 order by 3 desc;
```
Run against Supabase project `qtcvcflzxbuagvvwahhu` via `execute_sql`, 2026-08-26 ~09:20-09:30.
