# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `SESSION_CLOSEOUT_2026-08-
26_to_27.md` (CEO's consolidated fleet report, now updated in place — the fleet did not fully
stop). On a 5-minute recurring check (`/loop`, per founder instruction — reconfirmed at
checkpoint 139 to keep watching for dead sessions).

## Checkpoint 142 — 2026-08-27, ~10:55

**Founder directive: dynamic backlog reassignment — the fleet does not go idle on shard
completion.** Per CEO's latest control-tower commit: priority order **P0 (live defects) → P1
(photo verification) → P2 (image rights) → P3 (category balance) → P4 (Turkey-access) → P5
(time-sensitive) → P6 (URL health) → P7 (opportunity images)**. Current assignments: S1/S3/S4
finishing in-flight shard work then own-shard depth; **S2 cross-checking S1/S3/S4's official-
tier images against its own methodology (S2 cites ~16% defect rate — close to, slightly above,
my earlier ~12-15% figure; not yet reconciled into one number)**; S5 continuing in-flight
batches; **S6 reassigned to fleet-wide Turkey-access verification (P4) — directly relevant to
this file's long-standing `turkey_student_access`/`selectivity_evidence` open item**; S7
finishing an in-flight photo pass; S8 continuing S5's QA backlog then a URL-health sweep (P6).

**3 more production writes — independently verified against live DB, not just trusted from
the doc:**

```
FIRST Robotics Competition   (db25d327) status=active,   verification_state=verified_current
FRC (duplicate stub)          (dfb94075) status=disabled, verification_state=unverified
Stockholm Junior Water Prize  (17aeb772) status=active,   verification_state=verified_current
Stockholm Water Prize (wrong) (c8eb3d40) status=disabled, verification_state=unverified
```

All 4 match CEO's description exactly: the wrong-entity Stockholm Water Prize row and the
empty FRC duplicate stub are correctly retired (disabled/unverified); the real youth
competition and canonical FRC row are active/verified. **This closes the Stockholm/FRC open
item — confirmed live, not just a fix package.** A third item, Marshall Society Essay
Competition, was a first-party-verified correction (exact deadline, corrected a sponsor-vs-
society affiliation overclaim, country eligibility honestly left unknown) that didn't require
a status change — no separate row check needed. Adding the 4 IDs above to my standing re-run
query going forward.

**No dead servers.** All 9 peers still present and active. Real work continuing across the
fleet, not just closeout docs: S5A resolved 14 previously-inconclusive rows; S8 is actively
QA-sampling S5A/S5B's new output (38 + 31 + 8 records) rather than rubber-stamping it.

### Open items (updated)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns, but S6 is now
   assigned to fleet-wide Turkey-access verification (P4); watching for progress.
2. University-photo false-accept rate — S2's own methodology cites ~16%; my earlier figure was
   ~12-15%. Not yet reconciled to one number; will use whichever is more current once S2's
   cross-check work lands.

## How these numbers were produced (re-run to refresh)

```bash
git fetch origin
for b in oryn/s1-university-photos oryn/university-photos-s2 oryn/s3-university-photos \
         oryn/s4-university-photos oryn/s5a-summer-academic-enrichment \
         oryn/s5b-research-mentored-internships oryn/s6-competitions-research \
         oryn/s7-other-high-value-opportunities oryn/s8-qa-gate \
         oryn/research-freeze-ceo-control-tower; do
  git rev-list --count origin/main.."origin/$b"; git log -1 --format='%h %ar: %s' "origin/$b"
done
```
```sql
select id, title, cycle_status, deadline, cost, updated_at from opportunities
where id in ('973b3bdd-59c2-4e99-a76b-2006b365d63a','2f0e0301-5dd4-4d25-91a4-8f73bf5584e9',
  'd780bc55-41e0-444b-8bcc-3f927b28c4b7','8a7c89e4-e63a-4f64-a76d-4bae1b31e889',
  '960dcf4d-322c-4e72-8c99-0a1d3368b2ea');

select id, title, status, verification_state, updated_at from opportunities
where id::text like 'c8eb3d40%' or id::text like '17aeb772%'
   or id::text like 'dfb94075%' or id::text like 'db25d327%';
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-27 ~10:55.
