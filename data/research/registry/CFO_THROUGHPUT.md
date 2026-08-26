# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only.

## Checkpoint 3 — 2026-08-26, freeze day 1, ~10:20 (T+~70min from fleet dispatch)

**Coverage**: full roster now confirmed directly — S1-S8 + S9 (CEO) + S10 (this file), all
9 shards + control tower identified by name. No unresolved identities.

### This checkpoint's real content: two verified findings, not throughput numbers yet

Fleet is still ~70 minutes old; every S-lane remains in setup/first-dispatch. Nothing below is
a "we're behind schedule" signal — it's exactly the kind of process-quality finding this role
exists to catch before it compounds into wasted capacity.

**Finding A — "pipeline-accepted" is not "compliant"; my own "901/1010 resolved" framing was
imprecise, corrected.** S3 (university photos, quarter 3) sample-checked 3 of the 721
pipeline-"accepted" `campus.webp` files by actually opening and viewing them — something
neither I nor CEO had done before writing anything down. Result: University of Bristol's file
is a stone entrance sign dominated by the institution's own crest/wordmark (an outright
Common Operating Contract §10 reject), Stanford's is a generic graduation-crowd photo with
nothing identifiably Stanford in it (unverifiable identity), and only Heidelberg (1 of 3)
looked genuinely compliant. **Update**: S3's full-shard audit has since turned up a third,
differently-shaped defect (a color-graded photo of the wrong building) — three distinct failure
modes now confirmed (wrong-entity-dominant, generic-unidentifiable, wrong-building), which
argues against treating any of them as a one-off fluke worth a quick patch; this is a real,
recurring category of defect the "accepted" bucket needs genuine per-photo review to catch. I independently confirmed the quantitative substrate directly
against `storage.objects` (721 `campus.webp` + 338 `logo.webp` = 1,059 total objects, matching
the metrics-table "accepted" count exactly) — so the *count* was never wrong. What was wrong
was my own chat-message shorthand ("901/1010 already resolved... don't start from zero"),
which dropped nuance my own written checkpoint had already correctly hedged ("real remaining
gap is semantic"). Corrected directly with S3, CEO, and the affected shards. CEO reframed
GAP_MAP.md's "721 accepted" language from implied-done to explicitly-unverified as a result.
**Lesson for the rest of this freeze, stated plainly so it doesn't need re-learning**: a
database status field or an automated pipeline's own pass/fail is evidence that a process ran,
not evidence the artifact meets this week's real standard. Only opening the actual file (or
reading the actual source page) closes that gap — and that discipline caught a real defect on
the first try here, at n=3.

**Finding B — independently-derived boundary math is a reproducible collision risk.** Per
CEO: S1 and S2's university-photo quartile boundaries were each computed independently via a
`floor(N·k/4)`-style formula and landed one row apart from each other (not a one-off typo —
the same shape of error either could reproduce on any future N-way split done this way). S4
resolved it going forward by adding a `--range` flag to `scripts/acquire-university-images.ts`
(canonical split: 1-253 / 254-506 / 507-759 / 760-1010), which S1-S3 have now converged on.
**Lesson**: when N parallel workers need non-overlapping partitions of the same set, a single
shared, tested tool beats N independent re-derivations of the same math, even when each
derivation looks correct in isolation — the failure mode is specifically the *disagreement*
between two independently-"correct" answers, not an obviously-wrong one either side could have
caught alone.

Both findings are now closed (CEO fixed the docs, `044d324` also fixed a related internal
inconsistency in the founder-escalations text I'd flagged). Recording them here as **named,
reusable patterns** for the rest of this freeze and any future one — not reopening either as
an open item.

### Status: escalation #1 (photo-schema migration) fully resolved, no longer queued

CEO confirmed via S2's direct read of the consumer code: the read side uses a hardcoded
`metric_code` allowlist in two page components (not an open-ended read), so adding new
provenance `metric_code`s (`image_depicts`, `no_logo_verified`, etc.) needs a small, explicit
code change to extend that allowlist — but genuinely no migration/DDL. Founder escalation #1
is fully closed, not just downgraded.

### Roster (9 of 9 shards + CEO, all confirmed directly)

| Slot | Session | Mission | Status | Output so far |
|---|---|---|---|---|
| CEO | oryn-e2 | Control tower — registry, gap-map, founder escalations | ACTIVE | Registry + gap-map pushed and corrected twice (`b72b77f`, `044d324`) |
| S1 | oryn-c8 | University photos, ids 1-253 | ACTIVE, researching | 0 new — recon (177 candidate/52 needs_review/24 no_candidate); converged on S4's `--range` tool after the boundary near-miss |
| S2 | oryn-c0 | University photos, ids 254-506 | ACTIVE, researching | 0 new — recon (177 accepted/47 needs_review/29 none); self-reported the boundary root cause to CEO |
| S3 | oryn-85 | University photos, ids 507-759 (boundary confirmed exact — see below) | ACTIVE — was heads-down verifying before reporting, not blocked | 0 new; the Bristol/Stanford/Heidelberg spot-check (now a 3rd instance found mid-audit) is this shard's real output so far, and it's a genuine, valuable one |
| S4 | oryn-88 | University photos, ids 760-1010 | ACTIVE, researching | 0 new — recon; authored the shared `--range` flag now used fleet-wide; running a structural audit across all 1,010 in parallel with its own shard's work |
| S5 | oryn-83 | Turkey-accessible academic opportunities — S5A summer/pre-college/enrichment, S5B research/mentored-research/internships | ACTIVE, dispatched | 0 — confirmed prior overnight corpus is additive not duplicate before starting |
| S6 | oryn-71 | Competitions — S6-A STEM, S6-B business/humanities/creative | ACTIVE, dispatching | 0 new — baseline 101 existing rows, ~89 reusable never-applied candidates identified from the 2026-08-23/24 corpus |
| S7 | oryn-4d | Other high-value opportunities — Agent A (scholarships/awards/publications), Agent B (leadership/social-impact/fellowships/online) | ACTIVE, dispatching | 0 — just started |
| S8 | oryn-53 | Independent QA gate — Track A (fact/eligibility/currentness), Track B (image/duplicate/canonicalization/link-integrity) | ACTIVE | 0 reviewed (nothing from S1-S7 has landed); baseline-auditing the existing live corpus while it waits |

No session BLOCKED. No agent silent past 30 minutes.

### Backlogs — still a legitimate zero across the board

Verification / production-ready / images-completed-this-week / duplicate / blocked-source / QA
backlogs are all 0 reported. Fleet is 70 minutes old; first real batches are the next
meaningful signal, not yet due. Pre-existing 2026-08-23/24 corpus (~100 competition/research
records, ~390 summer-program findings, still uncommitted in the primary checkout — confirmed
present) remains correctly treated as deepen-and-fill material by S5/S6, not this week's
output.

### New operational risk, confirmed directly, not urgent

**Disk**: S3 flagged 94% used / 13GB free on the data volume; verified myself via `df -h` —
exact match. Not critical at 13GB, but this repo has hit `ENOSPC` from worktree sprawl before
(50+ worktrees, prior incident). ~12 worktrees active for this freeze alone plus several
pre-existing ones. Mitigations already informally in place (S3 and I both skipped `npm install`
in research-only worktrees) — worth CEO reinforcing fleet-wide if worktree count keeps growing.

### Reallocation

**Still none needed.** Every shard is legitimately active. Watching for the next checkpoint:
(a) S1-S4 should now be doing real semantic verification, not a quick re-confirm of pipeline
status, given Finding A; (b) S5/S6 gap-closing vs. new-volume balance per CEO's standing
S7-favoring directive; (c) whether S8's backlog builds faster than it clears once output lands.

### Open items

1. ~~S3's shard-boundary description vs. S4's canonical split~~ — **closed.** CEO verified S3's
   docs, registry row, and all 3 worktree manifests now uniformly read 507-759.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns — every
   `PRODUCTION_READY` claim this week means "ready for DATA/CEO to promote," not "already live."
3. **Not a fleet/capacity matter, escalated directly to the founder rather than handled here**:
   an untracked `Claude.pdf` in the checkout root, flagged in CEO's checkpoint-1 report as
   possibly containing a minor's personal data. Confirmed independently (metadata only,
   deliberately not opened): real 1-page PDF, 48KB, created 2026-08-18, never committed to git
   on any branch — no leak has occurred. Founder's call on disposition, not this fleet's.

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

select count(*) filter (where o.name ilike '%campus%') campus_files,
       count(*) filter (where o.name ilike '%logo%') logo_files
from storage.objects o join storage.buckets b on b.id=o.bucket_id
where b.name='university-images';
```
Run against Supabase project `qtcvcflzxbuagvvwahhu` via `execute_sql`, 2026-08-26 ~09:20-10:20.
Disk: `df -h /Users/adasarpkirik/Desktop/Founder/ORYN`.
