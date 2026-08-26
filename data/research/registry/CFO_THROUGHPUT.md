# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (capacity/throughput/bottleneck control).** Rewritten in place at each
checkpoint, not appended to. I do not research opportunity facts, source photos, alter records,
or override evidence — this file tracks fleet capacity and flags backlogs/misallocations only.

## Checkpoint 2 — 2026-08-26, freeze day 1, ~10:00 (T+~50min from fleet dispatch)

**Coverage**: 8 of 9 peer sessions (per `ListAgents`) plus CEO have reported in directly. Only
S3 (likely `oryn-85`) hasn't replied to two check-ins yet — not treating as blocked (only
~15min since the second ping), but tracking it.

### Checkpoint 1's headline finding is now resolved — full loop, worth recording as a pattern

CEO's `GAP_MAP.md`/`REGISTRY_README.md` originally reported university-photo coverage as
`0/1,010`, "genuinely greenfield," from a migration-file grep for an `image_url`-style column.
**Wrong** — verified live, corrected, and now independently re-confirmed by four separate
checks that never saw each other's work first: S1 (oryn-c8), S2 (oryn-c0), S4 (oryn-88) each
hit it from their own research, S8 (oryn-53) hit the same absence via schema introspection, and
I confirmed it directly with SQL. **901 of 1,010 canonical universities already have a
`primary_image_status` outcome** in `university_profile_metrics` (a generic EAV table, not a
dedicated column — the actual reason every column-grep-based method missed it): 525
`wikimedia_verified`, 194 `official`, 2 `verified`, 180 `needs_review`. 721/1,010 (71%) counts
as "accepted" by the existing pipeline (`lib/acquisition/image-validation.ts`,
`image-storage.ts`, `opengraph.ts`, `scripts/acquire-university-images.ts`) — real, committed,
Storage-backed code, not a stub.

CEO's fix (`b72b77f`) went further than my original finding: also surfaced
`universities.logo_url` as a separate, pre-existing column that does **not** count as a photo
under Common Operating Contract §10 (logos/crests disqualified), and correctly downgraded
founder-escalation #1 from "needs a migration" to "likely resolved — new provenance fields
probably fit as new `metric_code` values in the same EAV table, pending one read-side
confirmation." One small internal inconsistency flagged back to CEO just now: the file's own
"Founder escalations queued" section (bottom) still carries the pre-correction "needs a
migration" language, unsynced with the revised §1 — worth fixing before that list is actually
sent, not urgent since CEO confirmed it hasn't been sent yet.

**Standing read for S1-S4's actual workload**: verify-and-fill, not cold-start. Real remaining
gap is semantic (no check today confirms a photo depicts the *correct* university, isn't a
mis-classified crest, isn't a generic city photo) — that's the genuine S1-S4 job on all 1,010
rows, weighted toward the 109 with no candidate at all.

**New forward-looking risk, not urgent today**: S1 flagged, CEO recorded — the existing
acquisition script has checksum dedup but no lock against two concurrent `--apply` runs racing
on the same Storage bucket. Irrelevant today (contract forbids `--apply` from any S-lane this
week; dry-run/proposal only). Relevant later: whoever does the eventual DATA/CEO promotion pass
should serialize that step. Recording here so it survives the handoff to whenever that happens.

### Roster (9 of 9 shards + CEO — all but S3 confirmed by direct report)

| Slot | Session | Mission | Status | Output so far |
|---|---|---|---|---|
| CEO | oryn-e2 | Control tower — registry, gap-map, founder escalations | ACTIVE | Registry + gap-map pushed and corrected (`oryn/research-freeze-ceo-control-tower`, `b72b77f`) |
| S1 | oryn-c8 | University photos, quartile 1/4 (ids ascending) | ACTIVE, dispatching | 0 new — recon only (253 unis: 177 candidate-awaiting-review / 52 needs_review / 24 no_candidate) |
| S2 | oryn-c0 | University photos, quartile 2/4 | ACTIVE, dispatching | 0 new — recon only (253 unis: 177 accepted / 47 needs_review / 29 none) |
| S3 | *unconfirmed* | University photos, quartile 3/4 (inferred by elimination) | unknown | unknown — 2 check-ins sent, no reply yet (~15min) |
| S4 | oryn-88 | University photos, quartile 4/4 (final) | ACTIVE, dispatching | 0 new — recon only (fleet-wide baseline reported) |
| S5 | oryn-83 | Turkey-accessible academic opportunities — S5A summer/pre-college/enrichment, S5B research/mentored-research/internships | ACTIVE, dispatched | 0 — just started, confirmed prior overnight corpus is additive not duplicate |
| S6 | oryn-71 | Competitions — S6-A STEM, S6-B business/humanities/creative | ACTIVE, dispatching | 0 new — baseline: 101 existing competition rows (70 active/31 under_review), ~89 reusable never-applied candidates identified from the 2026-08-23/24 corpus |
| S7 | oryn-4d | Other high-value opportunities — Agent A (scholarships/awards/publications), Agent B (leadership/social-impact/fellowships/online) | ACTIVE, dispatching | 0 — just started |
| S8 | oryn-53 | Independent QA gate — Track A (fact/eligibility/currentness), Track B (image/duplicate/canonicalization/link-integrity) | ACTIVE | 0 reviewed (nothing from S1-S7 has landed yet); productively running a baseline audit of the existing live corpus while it waits — not idle |

No session has reported BLOCKED. No agent past 30 minutes silent (S3 is the only gap, at ~15min
since second ping).

### Backlogs

| Backlog | Count | Note |
|---|---|---|
| Verification (researched, awaiting VERIFIED) | 0 reported | No S-lane has produced a first research batch yet — still inside normal setup time for a fleet ~50 minutes old |
| Production-ready (this week's fleet) | 0 | Same |
| Images completed (this week's fleet) | 0 | Pre-existing 901/1,010 is prior-pipeline work, kept distinct from this week's output so today's real throughput isn't inflated by yesterday's numbers |
| Duplicate backlog | 0 reported | — |
| Blocked-source backlog | 0 reported | — |
| QA backlog (S8) | 0 — nothing to review yet | S8's baseline audit of the existing corpus is the right use of this wait, not scored as idle |

**Known pre-existing corpus, distinct from this week's output**: 2026-08-23/24 overnight session
left ~100 competition/research records (11 already in production, incl. all 6 TÜBİTAK-route
flagship olympiads) and ~390 summer-program findings/~200 dry-run proposals, still uncommitted
in the primary checkout — confirmed present via `git status` at freeze start, and S6
independently confirmed ~89 of the competition-side records specifically as reusable prior art.
S5/S6 are correctly treating this as deepen-and-fill, not restarting from zero.

### Reallocation

**None yet — still too early for a real throughput signal.** All 8 confirmed shards are in
legitimate setup/dispatch, not idle. Next checkpoint (once first real batches land, expected
within the hour based on stated setup progress) is where reallocation calls become meaningful:
watch specifically for (a) S1-S4 converging on the same "verify accepted candidates" queue
without duplicating each other's quartile, (b) S5/S6 gap-closing vs. new-volume balance per
CEO's standing directive to favor S7, (c) whether S8's backlog builds faster than it can clear
once output starts landing.

### Open items

1. S3 (oryn-85) unconfirmed — will fold in once it replies; will flag as a real blocked-agent
   concern only past 30 minutes of silence, not before.
2. Watching for CEO's escalation-text sync (cosmetic, not blocking).
3. `turkey_student_access` and `selectivity_evidence` still have no live columns — every
   S-lane's `PRODUCTION_READY` claim this week depends on fields that today only exist in
   staged research files, not the DB. Not new, but worth remembering when backlogs start
   showing real numbers: "production-ready" this week necessarily means "ready to hand to
   DATA/CEO for promotion," not "already live."

## How these numbers were produced (re-run to refresh)

```sql
select count(*) total,
  count(*) filter (where status='active') active,
  count(*) filter (where status='under_review') under_review,
  count(*) filter (where verification_state='verified_current') verified_current,
  count(*) filter (where eligible_countries is not null and array_length(eligible_countries,1)>0) has_eligible_countries,
  count(*) filter (where deadline is not null) has_deadline
from opportunities;

select count(distinct u.id) canonical_total,
  count(distinct m.university_id) filter (where m.metric_code ilike '%image%') canonical_with_image_metric
from universities u
left join university_profile_metrics m on m.university_id = u.id and m.metric_code ilike '%image%'
where u.duplicate_status <> 'superseded';

select metric_code, value_text, count(*) from university_profile_metrics
where metric_code = 'primary_image_status' group by 1,2 order by 3 desc;
```
Run against Supabase project `qtcvcflzxbuagvvwahhu` via `execute_sql`, 2026-08-26 ~09:20-10:00.
