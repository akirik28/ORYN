# RES-I1 apply — batch2 Edinburgh/Waterloo 5, 2026-08-22

**Scoped apply, approved by ORYN-BASORG after the Glasgow false-net-new finding
(`docs/handoffs/i1-batch2-dryrun-2026-08-22.md`'s addendum).** Scope is exactly 5 rows —
Edinburgh 3, Waterloo 2 — out of `acquire-programs-batch2_2026-08-20.jsonl`'s 301. Glasgow's
101 stay blocked, not part of this or any apply.

## Why a scoped file, not the original 301-record file

The stock `scripts/ingest-university-programs.ts --apply` processes its entire input file.
Running it against the original `acquire-programs-batch2_2026-08-20.jsonl` would have
inserted all 106 "accepted" records from the original dry-run, including Glasgow's 101 —
exactly what's blocked. Extracted the 5 approved records **verbatim** (raw JSONL lines, not
hand-transcribed) from the source file into a new scoped file,
`data/research/university-programs/i1-batch2-approved5_2026-08-22.jsonl`, via a throwaway
script that re-ran the same `decideIngestion()` pass and wrote out exactly the lines where
`outcome === "accepted"` and university matched Edinburgh/Waterloo — asserted `=== 5` before
writing anything, would have aborted otherwise. Deleted after use, never committed. The real
production ingestion script then ran against this scoped file, unmodified — same code path,
same audit trail, same dedup logic as any other batch, just a precisely bounded input.

## Procedure (re-measure → dry-run → apply → re-verify → idempotency → invariants)

1. **Re-measured live immediately before writing**: Edinburgh 95, Waterloo 105, Glasgow 101,
   `university_programs` 16,114 — unchanged from the dry-run/verification checkpoints
   earlier this session. No drift.
2. **Dry run of the scoped 5-record file** via the real script (no `--apply`):
   `Outcome breakdown: { accepted: 5 }`. Exact match to the approved scope — nothing else
   in the scoped file, nothing unexpected.
3. **Applied**: `npm run ingest:university-programs -- data/research/university-programs/i1-batch2-approved5_2026-08-22.jsonl -- --apply`.
   `Inserted 5/5 row(s) into university_programs.` Zero insert errors, zero orphaned program
   rows (no `ORPHANED PROGRAM ROW` or `failed to insert` lines in the output).
4. **Re-verified live**: Edinburgh 95→**98** (+3), Waterloo 105→**107** (+2), Glasgow
   **101→101** (unchanged), `university_programs` 16,114→**16,119** (+5). Every number
   matches BASORG's stated expectation exactly.
5. **Idempotency re-confirmed**: re-ran the same scoped file through the dry-run path again
   — `Outcome breakdown: { duplicate: 5 }`. All 5 now correctly recognized as already-live;
   a second `--apply` of the same file would insert nothing.
6. **Audit trail verified directly** (not assumed from the script's own summary line):
   `program_research_queue` has exactly 5 rows under `batch_id` prefix
   `i1-batch2-approved5_2026-08-22.jsonl`, every one `outcome='accepted'` with a non-null
   `promoted_program_id`. Zero orphans.

## Invariant check — what did NOT change

- **Glasgow: 101 → 101, exactly unchanged.** The scope did not leak. Confirmed both by direct
  count and by checking that the *original* `acquire-programs-batch2_2026-08-20.jsonl`
  batch_id has **zero** rows in `program_research_queue` — the other 296 records in that
  file (Glasgow's 101 included) were never fed to the ingestion script at any point in this
  apply; only the scoped 5-record file was.
- Every other university in `university_programs`: untouched — the scoped file named only
  Edinburgh and Waterloo, and the script's own per-record identity resolution has no path to
  write to a university a record doesn't name.
- McGill (288), McMaster (432), Western/Huron (5), Dartmouth (53): all still untouched,
  still blocked, unrelated to this apply.

## The 5 rows inserted

| research_program_id | University | Program |
|---|---|---|
| `ACQ-PRG-2026-08-20-b2-0-92` | The University of Edinburgh | Theoretical Physics BSc (Hons) |
| `ACQ-PRG-2026-08-20-b2-0-93` | The University of Edinburgh | Veterinary Medicine (5-year programme) BVM&S |
| `ACQ-PRG-2026-08-20-b2-0-94` | The University of Edinburgh | Veterinary Medicine (Graduate Entry Programme - 4-year programme) BVM&S |
| `ACQ-PRG-2026-08-20-b2-1-7` | University of Waterloo | Bachelor of Arts |
| `ACQ-PRG-2026-08-20-b2-1-8` | University of Waterloo | Bachelor of Science |

## What's still explicitly NOT ingested, by design

- Glasgow's 101 (69 near-certain duplicates by name/degree-type drift, 32 unverified
  partnership/dual-degree/graduate-entry variants) — blocked, pending RES-V1's corpus-wide
  convention-drift investigation and per-record catalogue adjudication.
- McGill 288 — honest `archived_capture` records, correctly gate-blocked.
- McMaster 432, Western/Huron 5, Dartmouth 53 — domain-authority gate, founder-pending
  decision.
- The 18 UPDATE-shaped files (`tr_bilingual_names_*`, `url_repair_*`) — different write
  shape, parked pending BASORG's routing.

## Files

- `data/research/university-programs/i1-batch2-approved5_2026-08-22.jsonl` — the exact 5
  records applied, kept as the permanent provenance record (same convention as every other
  ingested batch file in this directory).
- This report.
