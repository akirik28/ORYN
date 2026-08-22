# RES-I1 batch2 dry-run — 2026-08-22

**Package I1-2, assigned by ORYN-BASORG.** Dry-run only — no `--apply`, no writes, no
Supabase write client even constructed. Target: `acquire-programs-batch2_2026-08-20.jsonl`
(301 records: Edinburgh 93, Waterloo 107, Glasgow 101), the confirmed genuine gap from
package I1-1.

## Method

Live state re-measured immediately before running (unchanged from I1-1: Edinburgh 95 /
Glasgow 101 / Waterloo 105 live, `university_programs` 16,114 total). Ran the file through
`decideIngestion()` — the exact same pure decision function
`scripts/ingest-university-programs.ts` uses — via a throwaway analysis wrapper
(`scripts/_i1_dryrun_analysis.ts`, deleted immediately after use, never committed) that adds
per-institution and per-outcome-detail breakdown the stock script's dry-run mode doesn't
print. Same candidate-pool/existing-keys loading as the real script, so these numbers are
what `--apply` would actually do.

## Result

```
Overall: { duplicate: 195, accepted: 106 }

Per institution:
  Edinburgh: { duplicate: 90, accepted: 3 }
  Waterloo:  { duplicate: 105, accepted: 2 }
  Glasgow:   { accepted: 101 }   (zero duplicate)

malformed_source (domain-authority gate): NONE — 0 of 301 records failed
unresolved_university / insufficient_evidence / rejected / conflicting: NONE — 0 of 301
```

Every one of the 301 records resolved cleanly to either `accepted` or `duplicate`. Nothing
in between.

## 1. Net-new vs. duplicate split

**106 net-new, 195 duplicate.** Would bring `university_programs` from 16,114 to 16,220 if
applied, and per-institution catalogs to Edinburgh 98 (95+3), Waterloo 107 (105+2), Glasgow
202 (101+101).

## 2. Gate outcomes per institution — the part BASORG most wanted

**Zero domain-authority failures.** All three universities' `source_url`s resolve to an
accepted authority for program facts under `sourceAuthority("programs", ...)` — self-hosted
official catalogues, confirmed by the gate itself rather than by assumption, exactly as
asked. This is the opposite failure mode from Dartmouth/McMaster/Western-Huron: nothing
here is blocked, nothing needs a founder decision, nothing to stop for.

## 3. What the dry-run revealed that reconciliation couldn't

**The Glasgow overlap hypothesis was wrong — worth flagging explicitly since it was named
directly in the assignment.** Glasgow's exact 101-in-file/101-live count match looked like
the most likely case of real content overlap under different IDs. It's the opposite:
**zero** of Glasgow's 101 file records match anything already live — all 101 are net-new,
duplicate count 0. Glasgow's current 101 live programs and this file's 101 Glasgow programs
are two entirely disjoint sets that happen to be the same size. Applying this batch would
not "fill a gap to 101" — it would take Glasgow from 101 to 202.

Edinburgh and Waterloo went the other way — the close-but-inexact counts (93 file/95 live,
107 file/105 live) turned out to mean exactly what they looked like: near-total overlap
(90/93 and 105/107 duplicate) plus a small number of genuinely new records (3 and 2).

So the three institutions in one file produced three different shapes of answer — heavy
overlap (Edinburgh), heavy overlap (Waterloo), and zero overlap (Glasgow) — which count-
level reasoning alone would not have distinguished reliably, consistent with I1-1's
finding that cardinality is not identity.

## Net effect of this package

No writes. `university_programs` unchanged at 16,114. Ready for BASORG to assign the apply
— which per this dry-run would insert exactly 106 rows (3 Edinburgh + 2 Waterloo + 101
Glasgow), zero gate concerns, zero founder-pending items touched.
