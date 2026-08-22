# RES-I1 apply — University of Ottawa, 2026-08-22

**Package I1-11, approved by ORYN-BASORG, confirmed directly on the established channel
after the assignment first arrived via the durable-session-id relay** (same pattern as
UWA — verified the artifacts independently before doing anything, then held for direct
channel confirmation before writing, per the standing rule that write authorization
requires exactly that, even for a message claiming to be BASORG). Ottawa: 0 → **276
programmes**, RES-R1's first Canadian university outside the earlier zero-coverage batch,
verified by both RES-V1 (V1-12a, contract/ID/URL-cardinality, new `ca-r1` validator
contract) and RES-V2 (V2-11a, 72/72 clean across four instruments including
language-of-instruction tested both directions).

## Batch ID — the revert path, recorded prominently as the condition of approval

```
ca_programs_ottawa_2026-08-22.jsonl_2026-08-22
```

Verified directly: 276 rows under this batch_id in `program_research_queue`, all
`outcome='accepted'`, all `promoted_program_id` non-null, **276 distinct promoted ids** —
clean 1:1, zero orphans.

## Procedure (all 7 steps)

1. **Re-measured live immediately before writing**: `university_programs` **16,770**,
   Ottawa 0, Adelaide 0, UNSW 217, Sydney 149, Monash 178, UWA 107, Glasgow 101, Edinburgh
   98, Waterloo 107, `opportunities` 391 — every number matched the required baseline.
2. **Pulled only the Ottawa file** from `origin/oryn/res-r1-au-programmes`
   (`ca_programs_ottawa_2026-08-22.jsonl`) — Adelaide's file never checked out, never read.
   Scope asserted before running: exactly 276 lines, single university name
   ("University of Ottawa").
3. **Within-batch checks before touching the DB**: zero duplicate `research_program_id`
   within the file; `official_program_url` cardinality **276 unique / 276 records = 1.000**
   (RULE-IDENTITY-001).
4. **Dry run via the real script**: `{ accepted: 276 }` — exact match to the required
   count. Per BASORG's explicit instruction ("if the accepted count is anything other than
   276, stop"), this cleared the gate to apply.
5. **Applied**: `Inserted 276/276 row(s) into university_programs.` Zero insert errors,
   zero orphaned program rows.
6. **Re-verified live**: `university_programs` 16,770 → **17,046** (+276 exactly). Ottawa
   0 → **276**.
7. **Idempotency re-confirmed**: re-ran the identical file — `{ duplicate: 276 }`.

## Invariants — what did NOT change

| | Before | After |
|---|---|---|
| UNSW | 217 | **217** |
| Sydney | 149 | **149** |
| Monash | 178 | **178** |
| UWA | 107 | **107** |
| Adelaide | 0 | **0** |
| Glasgow | 101 | **101** |
| Edinburgh | 98 | **98** |
| Waterloo | 107 | **107** |
| `opportunities` | 391 | **391** |

Total delta: **+276, exactly**. Adelaide's file was never read by this package at any
point — excluded by construction, not merely by outcome.

## Net effect, phrased precisely (correcting the imprecision noted after I1-10)

`university_programs`: 16,770 → **17,046**. Australia remains **651 live across four
universities** (UNSW, Sydney, Monash, UWA) — Adelaide's 120 records are verified, not
ingested, unaffected by this package. Canada gains its first record from this round:
University of Ottawa, **276 live**. `university_requirements` and `university_deadlines`
untouched — this package's scope was `university_programs` only.
