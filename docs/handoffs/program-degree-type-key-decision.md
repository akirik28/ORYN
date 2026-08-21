# university_programs dedup key, round two — degree_type

Branch `oryn/program-degree-type-key`. Migration `0054` written and committed, **not
applied**. Full gate clean: lint 0, typecheck 0, test 1279/1279, build succeeds.

## The decision

Add `degree_type` to `university_programs_dedup_idx`, alongside the columns migration 0053
already established (university, name, degree_level, language, url) — additive, same
`coalesce(degree_type, '')` treatment already used for degree_level/language.

## Where this came from

Dry-running a 20-file, 2,383-record ingestion backlog against the post-0053 key produced 61
"duplicate" outcomes. Checked every one directly against source records (see
`docs/handoffs/program-ingest-batch-2026-08-21-dry-run-report.md` for the full derivation, not
repeated here): 58 (Durham, Southampton) are the standard UK three-year Bachelor's vs
four-year integrated Master's split of the same subject — e.g. Durham's "Chemistry" as both
"MChem (Hons)" and "BSc (Hons)" — identical on every column the current key checks, differing
only in `degree_type`. Zero of the 58 repeat a `degree_type` within their collision group,
which is the check that would have indicated a genuine duplicate rather than a missing
discriminator.

## Measured against the same standard migration 0053 used to reject campus/faculty

| | `campus` (0053, rejected) | `faculty_or_school` (0053, rejected) | `degree_type` (0054) |
|---|---|---|---|
| Population | 78.7% | 32.0% | 98.3% of this backlog, 43.9% of the live table overall |
| Multi-value contamination | yes — PoliMi held a comma-joined multi-campus list on one row | yes — ETH's department codes attached inconsistently across submissions | none found |
| Checked collisions, genuinely distinct | 11 (Bologna/Padua) | 0 evidenced | 58 of 58 |
| Checked collisions, re-submissions | 0 | — | 0 |

Cleaner on every axis than either field 0053 rejected — no format-inconsistency problem, no
sparse-population problem, and a 100% correct-attribution rate on direct inspection of every
collision, not a sample.

## Pre-check (2026-08-21, oryn-qa-scratch, read-only)

5,342 live rows; **0** would violate the new six-column index. Expected by construction — an
additive widening of an already-unique key can only split existing groups further, never merge
two rows that are already distinct under the narrower key — confirmed directly rather than
left as an assumption.

## What this deliberately does not fix

The same dry run found 3 further collisions, all Istanbul University: two "İşletme" (Business
Administration) listings — İktisat Fakültesi (Faculty of Economics, quota 75) vs Siyasal
Bilgiler Fakültesi (Faculty of Political Science, quota 60) — identical on every column
including `official_program_url`. Not addressed here, and not addressable by any key shape:
YÖK Atlas, the source for this entire Turkish independent-batch population, has no stable
per-programme URL at all — confirmed directly in the source's own `researcher_notes` (the
detail view is a client-side-only modal; `window.location` never changes), so every record in
this backlog shares one portal-root URL. Widening with `faculty_or_school` to catch three
records, on a field already shown (in 0053's own analysis) to be 32.0% populated and
contaminated by inconsistent capture elsewhere, would be exactly the reactive, single-case
patch this project has avoided all day. These 3 stay audited in `program_research_queue` as
`duplicate` — replayable if a real fix for URL-less sources exists, not solved by guessing a
schema change to fit three records today.

## Code changes (schema-adjacent, same pass)

- `lib/programs/ingest.ts`: `programDedupKey()` takes `degreeType: string | null` as a required
  6th argument (nullable value, unlike `officialProgramUrl` — no `insufficient_evidence` gate
  makes this one universally non-null the way url's gate does). `decideIngestion()` passes
  `record.degree_type ?? null` through.
- `scripts/ingest-university-programs.ts`: updated call sites for the new signature, **and**
  fixed the same `.map()`-over-a-static-snapshot bug found (and fixed separately) in this
  session's multi-file batch tool — within-file same-key collisions were being decided against
  a starting snapshot neither could see the other in, so dry-run predictions undercounted real
  collisions. `university_programs`'s own unique index still catches the real thing at insert
  time (nothing was ever silently duplicated), but the fix makes the *prediction* correct, not
  merely the outcome safe. Left a comment at the source per the suggestion that prompted it, so
  a future copy of this script's shape inherits the warning instead of the bug.
- `__tests__/programs/ingest.test.ts`: 7 existing tests updated to the new signature, 1 new
  test (Durham-shaped: same name/degree_level/language/url, different `degree_type`, both
  accepted).

## Files

- `supabase/migrations/0054_program_dedup_index_degree_type.sql` — new, **not applied**.
- `lib/programs/ingest.ts`, `scripts/ingest-university-programs.ts` — updated.
- `__tests__/programs/ingest.test.ts` — updated.
- This file.
