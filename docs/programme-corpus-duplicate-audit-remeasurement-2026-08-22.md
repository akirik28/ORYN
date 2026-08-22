# Programme corpus duplicate audit — re-measured against the grown corpus

**Status: measurement, plus one small corpus-file annotation authorised by the coordinator
(§2).** No database write. Reuses the existing, unit-tested classifier
(`lib/programs/corpus-duplicates.ts`, `scripts/audit-program-corpus-duplicates.ts`) exactly as
written — no new rules, no code changes. Companion to `docs/programme-corpus-duplicate-audit.md`
(2026-08-21), which this document re-measures against, not replaces.

**Update, same day, after coordinator review:** §3's coverage-gap finding was checked against
live `university_programs` by the coordinator directly. The programmes flagged as absent from
the *corpus files* — MIT's EECS majors, Stanford's Computer Science, Oxford's PPE, and (checked
by the coordinator, not this document) Harvard's 49 AB rows — **are live in the database via a
route other than these research files.** §3 is corrected below to state this precisely: the
finding is real and verified at the file level, but it is not a live product defect for the four
institutions checked. Re-flagged as a research-process risk (a batch that is not what it claims
to be, trusted as a baseline by the next reader) rather than a data-completeness one. **Do not
re-research MIT, Stanford, Oxford, or Harvard on the basis of this document** — see §3.

---

## 1. What moved

| | 2026-08-21 | 2026-08-22 (now) |
|---|---:|---:|
| corpus files | 72 | 130 |
| corpus records | 10,094 | 19,178 |
| candidate groups | 204 | 801 |
| candidate records | 414 | 1,640 |

The corpus grew ~90%, driven by the US w2 wave, UK, and Canada batches, exactly as briefed.

| classification | 2026-08-21 | 2026-08-22 |
|---|---:|---:|
| genuine_duplicate | 32 groups / 64 records | **32 groups / 64 records — unchanged** |
| re_research | 96 groups / 192 records | 587 groups / 1,174 records |
| legitimate_split | 76 groups / 158 records | 182 groups / 402 records |
| id_collision_distinct_programmes | 0 | 0 |

**The genuine-duplicate set did not grow, and it is the identical 32 groups** — verified
directly, not just by count: every one of the 32 still involves only `drive_batch1_2026-08-17.
jsonl` and `reverify_batch3_2026-08-17.jsonl`, the same pair the original audit found. Zero new
byte-identical duplicates came from the US/UK/Canada wave.

**The 84%-must-not-collapse finding holds, and strengthened**: 769 of 801 groups (96.0%) are
`re_research` or `legitimate_split` — must not be collapsed. The larger corpus produced
proportionally *more* legitimate variety, not more risk.

The id-collision defect (46→535 groups sharing one `research_program_id`) also holds its shape:
still exactly 14 of them are `legitimate_split` (distinct programmes wrongly sharing an ID),
still concentrated in the same three `fr_it_es_ch_batch*` files. No new instance of this defect
appeared in the new US/UK/Canada data.

---

## 2. The 32 byte-identical duplicates — ingestion status

Checked each of the 32 groups' `official_program_url` directly against live
`university_programs` (read-only `execute_sql`, project `qtcvcflzxbuagvvwahhu`).

**30 of 32 are already ingested, exactly once each — no live duplication, no action needed.**
The dedup key already collapsed the corpus-level duplicate correctly at ingestion time; these
30 rows are safe as they stand.

**2 of 32 never reached the database — corpus-file-only:**

- Frankfurt School of Finance and Management — "Business Administration"
- Frankfurt School of Finance and Management — "Management Philosophy and Economics"

Confirmed directly, not inferred from a URL miss: Frankfurt School holds exactly **one** live
`university_programs` row total ("Computational Business Analytics") — the other two names have
no live counterpart under any URL.

**Done, authorised by the coordinator.** Annotated both `reverify_batch3_2026-08-17.jsonl` lines
(14 and 16) with a `corpus_duplicate_note` field pointing at the sibling record in
`drive_batch1_2026-08-17.jsonl`, the classification, and the confirmed never-ingested status —
no data field touched, no line deleted, no database write. One side-effect worth recording: the
annotated copies are no longer byte-*identical* to their `drive_batch1` siblings (they now carry
one extra field the other doesn't), so a future re-run of the audit script will report these two
specific groups as `genuine_duplicate` with `allFieldsIdentical: false` rather than `true` — the
classification itself is unchanged (still `genuine_duplicate`, `corpus_duplicate_note` is not a
`DISCRIMINATOR_FIELD`), only that one boolean flips, and it flips because of the annotation
explaining the duplicate, which is the intended, self-documenting outcome.

---

## 3. What defeated name-based dedup silently — bigger than the hypothesised case

Generalised the "Stanford trap" check across every university with both an old (small,
pre-2026-08-22) batch and a new (large, 2026-08-22) batch. Result, using the audit's own real
candidate output — not a naive name comparison — counting how many candidate groups link an old
record to a new one at each institution:

| University | old records | new records | cross-batch candidate groups |
|---|---:|---:|---:|
| Stanford University | 4 | 64 | **0** |
| MIT | 5 | 50 | **0** |
| Yale University | 4 | 78 | **0** |
| University of Oxford | 4 | 48 | **0** |
| University of Cambridge | 8 | 26 | **0** |
| University College London | 7 | 422 | **0** |
| King's College London | 5 | 147 | **0** |
| LSE | 5 | 38 | **0** |
| University of Warwick | 4 | 186 | **0** |
| Durham University | 142 | 162 | **0** |
| University of Southampton | 206 | 248 | **0** |
| NYU | 1 | 193 | **0** |
| Carnegie Mellon University | 52 | 101 | **0** |

**Not a dedup miss — verified directly at three institutions.** The worry was that a registrar
abbreviation would let a duplicate insert silently. Checked whether that's what's happening, or
whether the new batch is genuinely missing programmes the old one had:

- **Stanford**: old batch's "Computer Science," "Symbolic Systems," and "Management Science and
  Engineering" are **absent from the new 67-record bulletin batch entirely** — not renamed, not
  findable under any substring search. Only "Economics" carried over.
- **MIT**: old batch's "Computer Science and Engineering" and plain "Mathematics" are absent
  from the new 50-record catalogue batch. The new batch documents itself carefully (course
  numbers are load-bearing, three different departments each publish an "Engineering" major) but
  never includes Course 6-1/6-2/6-3 (MIT's EECS majors) or Course 8 (Physics) at all.
- **Oxford**: all four of the old batch's entries — "Computer Science," "Economics and
  Management," "Engineering Science," "Philosophy Politics and Economics" (PPE) — are absent
  from the new 48-record batch. PPE and single-honours Computer Science are among Oxford's most
  recognisable courses.

**Coordinator correction, same day — this is a file-level finding, not a live product defect,
for the institutions checked.** The coordinator queried `university_programs` directly:
MIT's EECS majors, Stanford's Computer Science, Oxford's PPE, and (checked independently by the
coordinator) Harvard's 49 AB rows **are all live in the database right now.** The measurement
above is not wrong — the new *corpus files* genuinely do not contain those programmes, verified
directly rather than inferred, and that absence is real. What was wrong was the inference drawn
from it: these four universities' programmes reached `university_programs` by some route other
than the corpus files this document searched, so a student today sees them correctly. **Do not
re-research MIT, Stanford, Oxford, or Harvard on the strength of this finding** — the gap named
above is not theirs.

**What the finding actually is, restated precisely.** A research batch labelled comprehensive
for a university is not a reliable account of what that university has live in the product,
because rows arrive by more than one path and the corpus files are not the only one. The risk
this creates is not "students don't see MIT's Computer Science" — they do. The risk is that
**the next lane to read one of these batches will trust its "comprehensive" framing as a
baseline**, and reason from a false premise the same way this document's own first pass did,
before the coordinator caught it. That is a research-process risk, not a data-completeness one,
and it generalises past the specific 13 universities named above to any batch anyone describes
as comprehensive without checking against the live table first.

**The other 9 universities in the table (Yale, Cambridge, UCL, KCL, LSE, Warwick, Durham,
Southampton, NYU, CMU) were not individually re-checked against the live table** — only
Stanford/MIT/Oxford (this document) and Harvard (the coordinator) were. Whether their old
records also already reached `university_programs` by the same other route, or genuinely
haven't yet, is unconfirmed and should not be assumed either way.

**Not acted on.** This connects directly to the new assignment below (§5): the real fix is
mapping every route by which a row reaches `university_programs`, so "the corpus files" stops
being treated as if it were the only one.

---

## 4. What was done, and what remains open

1. **No action on the 30 already-ingested genuine duplicates** — already safe, confirmed.
2. **Done, authorised.** Corpus-file annotation added for the two Frankfurt School records that
   never landed — see §2.
3. **No re-minting of the 14 identifier-collision records performed.** The original audit's own
   recommendation stands, unimplemented — no authorisation was given for it this round, and it
   was not asked for.
4. **The coverage-framing finding in §3 is corrected, not fixed** — it is now recorded as a
   research-process risk (batches over-claiming their own completeness), not a live-data gap for
   the four institutions checked. See §5: the actual next step is mapping every route into
   `university_programs`, not re-researching any of these universities.
