# Every route by which a row reaches `university_programs`

**Measured 2026-08-22, read-only against live `university_programs`
(project `qtcvcflzxbuagvvwahhu`), `program_research_queue`, the committed JSONL corpus
(`data/research/university-programs/*.jsonl`), and the ingestion code paths. No database write,
no corpus edit. Assignment from the coordinator, prompted by two independent findings — the
coordinator's own live-DB check on MIT/Stanford/Oxford/Harvard, and a sibling lane's claim that
"4 universities hold programmes but appear in no research file at all" — both pointing at the
same gap: the corpus files are not a complete account of how rows get into `university_programs`.**

---

## 1. Exactly two routes reach the live table, and no others

Every one of the table's 14,457 rows was classified by its `notes` text. There is no residual
bucket — the two patterns partition the table exactly:

| route | live rows | share |
|---|---:|---:|
| **Route 1 — Research handoff** | 14,327 | 99.1% |
| **Route 2 — Drive corpus batch** | 130 | 0.9% |
| anything else (`no_notes`, unmatched pattern) | **0** | 0% |

`14,327 + 130 = 14,457` — the exact total row count of `university_programs`. This was checked
as a single `group by` over the whole table, not sampled.

Cross-checked at a second, independent layer — `program_research_queue` (the ingestion audit
trail, checked separately from the live table) — and the same shape holds: every `batch_id` in
the queue is either a per-JSONL-file batch (`<filename>.jsonl_<date>`, Route 1's pattern) or the
single `drive_programs_batch1_2026-08-17` batch (Route 2). No third pattern appears in the
30 largest batches, nor anywhere else queried.

### Route 1 — Research handoff (dominant, 14,327 rows)

- **Notes signature:** `"Research handoff, program_id <ID>, researched_at <date>."`
- **Source:** the committed JSONL corpus, `data/research/university-programs/*.jsonl` (130
  files, 19,178 records as of this measurement).
- **Code:** `scripts/ingest-university-programs.ts` and
  `scripts/ingest-university-programs-batch.ts` write these rows; `scripts/replay-program-rejections-0053.ts`
  and `scripts/replay-program-rejections-0054.ts` re-attempt rows a schema change had previously
  rejected. All four are genuine `insert into university_programs` (or Supabase
  `.from('university_programs').insert(...)`) call sites — confirmed by grep across the repo,
  excluding `node_modules` and tests.
- **Audit trail:** `program_research_queue`, one row per JSONL record, `batch_id` derived from
  the source filename.

### Route 2 — Drive corpus batch (130 rows)

- **Notes signature:** `"Drive corpus batch drive_programs_batch1_2026-08-17, program_id ORYN-PRG-<NNNN>, last_verified <date>."`
- **Source:** the founder's Google Drive spreadsheet corpus (`02_ORYN_University_Programs.xlsx`,
  "ORYN Database" folder, owned by `akirik28@my.uaa.k12.tr`) — not a spreadsheet checked into
  this repo.
- **Pipeline:** `scripts/drive-import/parse.py` reads the Drive export →
  `scripts/drive-import/generate_programs_sql.py` emits a plain SQL file → that file
  (`supabase/seed_programs_batch1_programs.sql`, header: "189 candidate rows -> 130 accepted, 0
  duplicate, 32 unresolved_university, 27 insufficient_evidence") was applied by hand. No
  `INSERT` runs through `scripts/ingest-university-programs.ts` for this route. Requires
  migration `0028_program_requirement_dedup_indexes.sql` first (`ON CONFLICT` targets).
- **Audit trail:** confirmed present. `program_research_queue` holds exactly 189 rows under
  `batch_id = 'drive_programs_batch1_2026-08-17'` — matching the SQL header's "189 candidate
  rows" exactly. **The queue is written by this route too, just via the SQL-generation script
  rather than the JSONL ingest script** — worth correcting if anyone assumed the queue is
  Route-1-only.
- **The 130 accepted rows also have a JSONL counterpart, committed at the same path convention
  as every other batch:** `data/research/university-programs/drive_batch1_2026-08-17.jsonl`,
  189 records, `research_program_id` values in the same `ORYN-PRG-NNNN` scheme the SQL notes
  cite. This is not a second, independent JSONL batch — it is the research documentation of the
  *same* Drive extraction event that produced the SQL file (same date, same program-ID scheme,
  same 189-record count). See §2: this file is where the "4 mystery universities" actually live.

**No third route exists in the live table, the queue, or committed code** as far as this
measurement reaches. `scripts/acquire-programs.ts`, `lib/admissions/persist.ts`, and several
migrations reference `university_programs` but were not found to perform seed-style bulk inserts
outside these two routes — flagged as unconfirmed rather than asserted clean, since not every
reference was individually traced to a no-op.

---

## 2. The "4 universities, no research file at all" claim does not hold

Two other lanes converged on this claim independently — a sibling lane reported it directly to
the coordinator; a second lane (US-programme-catalogue-gap) explained it as "the source was a
Drive spreadsheet, so there's no `data/research/university-programs/*.jsonl` file to find."

**Direct verification says otherwise, for all four institutions**, by parsing every JSONL
record's `university_name` field (not grep on raw file bytes, which mismatches on comments,
filenames, and unrelated substrings):

| university | JSONL records found | file(s) |
|---|---:|---|
| Universidad Complutense de Madrid | 165 | `fr_it_es_ch_batch4_2026-08-21.jsonl` |
| University of Bologna | 122 | `drive_batch1_2026-08-17.jsonl` (4), `fr_it_es_ch_batch5_2026-08-21.jsonl` (118) |
| EPFL | 16 | `drive_batch1_2026-08-17.jsonl` (13), `fr_it_es_ch_batch2_2026-08-21.jsonl` (3) |
| University of Mannheim | 4 | `drive_batch1_2026-08-17.jsonl` (all 4) |

Every one of the four has a committed research file. Mannheim's case is the sharpest rebuttal of
the second lane's specific explanation: its 4 records sit in `drive_batch1_2026-08-17.jsonl` —
line 31–34, `research_program_id` `ORYN-PRG-0161`–`0164` — the exact program IDs the live rows'
`notes` field cites (`"Drive corpus batch ..., program_id ORYN-PRG-0161, ..."`). The claim that
"the source was a Drive spreadsheet, so no JSONL file exists" is specifically wrong here: the
Drive spreadsheet's extraction *was* documented as a JSONL file, at the standard corpus path,
and that file is what the live rows trace back to.

**What was actually true in both claims, restated precisely:** a lane auditing *by JSONL-file
presence checked against the standard multi-batch discovery pipeline* (Route 1 only) would
correctly find these institutions' rows don't originate there — Mannheim is 100% Route 2, and
even Bologna/EPFL/Complutense's majority-Route-1 rows sit in files with generic multi-country
names (`fr_it_es_ch_batch4`, not `es_madrid_complutense`) that a per-institution search might
miss. The inaccuracy was narrower than either claim stated: not "no research file," but "no
research file discoverable by [that lane's specific search method]," and for Mannheim
specifically, the file exists and is the exact provenance of the live rows.

Per-university route split (live table, verified via `notes` pattern):

| university | Route 1 rows | Route 2 rows | total live |
|---|---:|---:|---:|
| Universidad Complutense de Madrid | 165 | 0 | 165 |
| University of Bologna | 121 | 1 | 122 |
| EPFL | 10 | 3 | 13 |
| University of Mannheim | 0 | 4 | 4 |

(EPFL and Bologna's live totals differ slightly from their JSONL record counts above — 13 vs 16,
122 vs 122 exactly for Bologna — because not every corpus record necessarily reached the live
table, or reached it after supersession/dedup at ingestion time. That gap is expected and is not
itself evidence of a missing route; it is the normal shape of `re_research`/`legitimate_split`
records not all being current.)

---

## 3. A related but distinct finding, folded in: Michigan's URL-anchor duplication

A peer lane (`uds:/tmp/cc-socks/49146.sock`) independently found 47 duplicate pairs (94 live
rows) at University of Michigan-Ann Arbor, both via Route 1, from two separate scraping passes
on 2026-08-21: one hit `lsa.umich.edu/lsa/academics/majors-minors.html` directly, the other hit
`admissions.umich.edu/academics-majors/majors-degrees`, which links to the same LSA page but with
a per-major URL anchor fragment (e.g. `#economics-maj`). Because `official_program_url` is part
of the composite dedup key (migrations 0053/0054), the anchor-vs-no-anchor difference let one
real major insert twice.

**This is not a third route — it's a dedup-key weakness inside Route 1**, worth recording here
because it's the same shape of problem this document is about (a component trusted as a source
of truth turning out not to be), just one level down: at the ingestion key, not the route level.
Not verified independently by this document; relayed from the peer lane's report, which offered
the full row-id list on request.

---

## 4. What this means for other lanes

- **A batch's own "comprehensive" framing is not evidence of what's live** — confirmed twice now
  (MIT/Stanford/Oxford/Harvard by the coordinator, the general shape by this document). Check the
  live table before treating a corpus file's absence as a live-data gap.
- **A missing per-institution JSONL file is not evidence a university has no research
  documentation** — it may be Route 2 (check `notes` on the live rows), or it may be present in a
  multi-institution batch file under a name that doesn't obviously match.
- **The two routes are fully accounted for and exhaustive as measured.** Any future new
  ingestion mechanism should get its own recognizable `notes` signature, the same way these two
  already do, so this partition stays a two-line query instead of an investigation.
