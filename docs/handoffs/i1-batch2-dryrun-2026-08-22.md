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

## Addendum — Glasgow's "clean" verdict was wrong; Edinburgh/Waterloo's 5 verified separately

**BASORG caught this before any apply**, by checking live Glasgow data directly rather than
trusting the dry-run's zero-duplicate result. Live Glasgow `degree_type` is NULL on all 101
rows; the file's Glasgow records carry it populated (BSc/BEng/LLB/etc. on 93 of 101) and
append a bracketed degree code to `program_name` (e.g. file `Accountancy & Finance [BAcc]`
vs. live `Accountancy & Finance`). Both components of the dedup key's 6-tuple differ
simultaneously, so every one of the 101 read as net-new. Stripping the bracket suffix and
comparing by name against live: **69 of 101 are near-certain duplicates** (same programme,
cosmetic naming difference) and 32 look like genuinely distinct partnership/dual-degree/
graduate-entry variants requiring per-record adjudication against Glasgow's official
catalogue — research work, not ingestion. **Ruling: Glasgow's 101 are BLOCKED, no apply, no
partial apply.** This dry-run's "zero gate concerns" verdict was correct about the
authority gate specifically and wrong about data quality more broadly — a clean gate result
is not the same claim as a clean dedup result, and I reported it in a way that could be read
as endorsing both. The dedup key itself is not being loosened over this (its own header
documents why a looser URL-based check was already tried and wrong 53/54 times) — this is a
research-adjudication problem, assigned to RES-V1 as a corpus-wide investigation (any
university whose live rows and a later research pass drifted onto different naming/
degree_type conventions is exposed to the same 100%-false-net-new failure mode, silently,
under an apparently clean dry-run).

**Follow-up requested**: verify the Edinburgh 3 / Waterloo 2 net-new records the same way,
by name against live, before either gets cleared.

- **Edinburgh's 3** (Theoretical Physics BSc(Hons); Veterinary Medicine 5-year BVM&S;
  Veterinary Medicine Graduate-Entry 4-year BVM&S): live Edinburgh has **zero** programmes
  matching `%theoretical physics%` or `%veterinary%` by name, at all — not a near-miss, no
  existing row of any kind to be a duplicate of. Genuinely new content.
- **Waterloo's 2** (generic "Bachelor of Arts"; generic "Bachelor of Science", no major):
  live Waterloo's only BA/BSc-named rows are "Psychology – Bachelor of Arts" and
  "Psychology – Bachelor of Science" — major-specific tracks, not the same programme as an
  undeclared/general BA or BSc entry. Different identity, not a naming variant of the same
  thing. Genuinely new content.

**Verified: none of the Edinburgh/Waterloo 5 show Glasgow's failure pattern.** Both
components (name, degree_type) were checked, not just name.

## Net effect of this package

No writes. `university_programs` unchanged at 16,114. **Glasgow's 101: blocked, not part of
any apply.** Edinburgh's 3 and Waterloo's 2 verified clean by name against live — 5 rows
ready if BASORG assigns an apply scoped to just those 5. The original "106 rows, zero
concerns" framing is superseded by this addendum; treat this file's addendum section, not
the original body above it, as current.
