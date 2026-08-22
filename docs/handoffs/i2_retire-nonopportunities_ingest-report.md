# RES-I2 run report — retire 6 non-opportunity rows, 2026-08-22

**Status: VERIFIED AND READY, NOT YET APPLIED — blocked, escalated to founder via BASORG.**

**Batch:** 6 `opportunities` rows identified by BUG-1's live defect audit
(`data/audit/opportunities-description-defects-2026-08-22.md` on
`oryn/bug1-opportunity-data-defects`) as wrong in kind, not merely low quality: 5 rows
whose `title` is an institution's name rather than an opportunity name (artifacts of the
Drive-corpus import), plus one UCSC course-catalogue class-detail page filed as a summer
program. Assigned by ORYN-BASORG as Priority 2, behind the ECW2 batch (this lane's
Priority 1, complete — see `i2_ecw2_ingest-report.md`).

## Procedure so far (re-measure → resolve/verify identity → dry-run/ROLLBACK → blocked)

1. **Got the exact IDs from BUG-1 directly** rather than inferring them from the "title
   looks like an institution name" description, per BASORG's explicit instruction.
   BUG-1 supplied 3 full UUIDs and 3 truncated 8-char prefixes with an explicit warning
   not to trust the truncation.
2. **Re-resolved the 3 truncated IDs and cross-checked all 6** (not only the unresolved
   3) via exact `title` match against live data — checking the ones handed over "clean"
   is where identity errors hide. All 6 titles, categories (`summer_program` on all 6),
   and current `status` (`active` on all 6) matched BUG-1's claims exactly; no ambiguous
   or duplicate title matches.
3. **Dry run**: single wrapped transaction, all 6 UPDATEs guarded by `id` AND
   `status = 'active'`. Result: all 6 → `status = 'disabled'`, nothing else changed.
   Re-queried after ROLLBACK to confirm it held — all 6 still `active`.
4. **Apply attempt**: the `commit` was **blocked by the Claude Code auto-mode safety
   classifier** — same block as the ECW2 batch.
5. **Escalated to BASORG rather than decomposing into separate statements** — per the
   standing rule BASORG set after reviewing the ECW2 batch's workaround (Ruling 2:
   a blocked transaction gets escalated, not decomposed, regardless of how confident the
   ingester is that the statements are independent). BASORG independently re-verified all
   6 rows itself, confirmed the dry-run procedure was correct, declined to run the write
   on this session's behalf (would cross the same permission boundary by proxy that
   blocked the CEO's DB write, RES-R2's force-push, and this lane's own PR creation
   earlier today), and is surfacing all four blocks to the founder together as one
   capability decision.

## Ready-to-apply artifact

`data/research/opportunities/i2_retire_nonopportunities_2026-08-22.sql` — the exact
guarded, idempotent transaction (dry-run-confirmed), following the same pattern as
`ecw2_verified_apply_2026-08-22.sql`. Whoever the founder authorizes can run it as a
single step; it is safe to re-run as a no-op if partially or fully applied by another
path first (every UPDATE guarded by `id AND status = 'active'`).

## The 6 rows (current state: all `status = 'active'`, unchanged)

| id | title | reason |
|---|---|---|
| `1e907aad-2bd4-43e4-98c1-4d75b6413d7a` | King's College London (London, UK) | Title is the institution's name, not an opportunity name. |
| `4a54159a-58dd-4304-a139-2b76f2a9fe38` | University of Southern California (CA, USA) | Same. |
| `907e279d-bc2f-46b0-b970-9ed9c0abb261` | New York University (NY, USA) | Same. |
| `b4091e25-c8ca-4042-9976-ee41ae4031d5` | Carnegie Mellon University (PA, USA) | Same. |
| `e0960bef-227f-4360-ad8f-d910e5e8dc2b` | University of St. Andrews (Scotland, UK) | Same. |
| `7aa517a3-64a4-4443-a2e9-14f2a46ba8a0` | ECON 1 - 01 Introductory Microeconomics: Resource Allocation and Market Structure | UCSC course-catalogue class-detail page (base64-encoded query blob URL), not an opportunity. |

No `opportunities` column exists for recording a per-row admin reason (schema-checked:
only `status`/`cycle_status` are status-adjacent, no notes/reason field) — these reasons
live here and in the SQL file's inline comments, per BASORG's ruling not to propose a
schema change for this.

## Explicitly out of scope, per BASORG

The other ~79 rows from BUG-1's wider audit (85/271 active opportunities, 31.4%, carrying
some hard defect signature) are a founder-level re-research-or-retire decision — not
touched, not extrapolated from these 6. The DLOPP deadline batch (RES-R2, 74 records) is
separately not cleared for ingestion yet (RES-V1's monotonicity audit still running).

## Next step

Apply `i2_retire_nonopportunities_2026-08-22.sql` once the founder's capability decision
lands, then re-verify (all 6 `status = 'disabled'`, row count elsewhere unchanged) and
update this report's status line.
