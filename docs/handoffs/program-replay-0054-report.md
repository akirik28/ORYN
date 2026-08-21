# Replay of the 58 Durham/Southampton records — applied

Branch `oryn/program-degree-type-key`. Applied 2026-08-21 (`batch_id =
'replay-program-rejections-0054_2026-08-21'`).

## All 58 survived

`university_programs`: **7,657 → 7,715** (+58) — matching the original prediction for
`university_programs` (5,342 → ~7,715) exactly, now reconciled across the two-step apply the
in-flight ingestion required. Verified directly against the database, not the script's stdout:
58 audit rows, all `outcome = 'accepted'`, 0 dangling `promoted_program_id`.

Scoped to exactly the two batch_ids characterized in the ingestion dry-run report
(`independent_batch32_2026-08-21.jsonl_2026-08-21` — Durham,
`independent_batch36_2026-08-21.jsonl_2026-08-21` — Southampton). The 3 Istanbul University
records (`independent_batch39_2026-08-21.jsonl_2026-08-21`) were not included in this replay's
candidate set and remain audited as `duplicate`, untouched — no key shape resolves them, per
migration 0054's own decision.

## Files

- `scripts/replay-program-rejections-0054.ts` — new.
- This file.
