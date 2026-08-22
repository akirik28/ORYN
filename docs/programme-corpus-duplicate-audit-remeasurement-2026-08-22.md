# Programme corpus duplicate audit — re-measured against the grown corpus

**Status: read-only re-measurement.** No corpus file edited, no database write. Reuses the
existing, unit-tested classifier (`lib/programs/corpus-duplicates.ts`,
`scripts/audit-program-corpus-duplicates.ts`) exactly as written — no new rules, no code
changes. Companion to `docs/programme-corpus-duplicate-audit.md` (2026-08-21), which this
document re-measures against, not replaces.

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

**Per the assignment's own instruction, these need a note in the corpus file, not a database
change.** No file has been edited yet — holding for your go-ahead before touching even a
corpus-file note, since you asked to see the re-measurement before any action.

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

**This is not the hypothesised trap, and it's a more serious problem than that trap would have
been.** A silent duplicate wastes a row. This is the opposite failure: **the new "comprehensive"
batches are not supersets of the old batches — each is missing real, major programmes the other
already had**, at three of the most prominent universities in the corpus, and the zero-overlap
pattern recurs identically at ten more. The audit's own classifier correctly reports zero
candidate groups here, because these genuinely are not duplicates of each other — but that
same correctness is what makes the gap invisible to a duplicate audit. Nothing in either batch
is wrong on its own terms; the risk is entirely at the *file* level, if anyone treats the new,
larger per-university batch as replacing the old one. The original audit's own supersession
recommendation ("keep the later observation... retain the earlier as history") is exactly right
here and must be read literally: **retain**, not discard. If the old `drive_batch1` (and
similarly-shaped) records for these ~13 universities are ever dropped on the assumption that a
newer, bigger batch already covers everything, real, previously-verified major programmes —
MIT's actual Computer Science, Oxford's PPE, Stanford's Computer Science — would be lost with no
duplicate-audit signal to catch it, because the audit correctly does not (and should not) treat
"different programme, both real" as a duplicate.

**Not acted on — this is a coverage question, not a duplicate question, and outside this
assignment's scope.** Flagged here because it's exactly the class of risk asked about, and it
turned out larger than the one case named. Recommend a dedicated coverage-completeness pass
(does the new large batch for each of these universities actually reach parity with the old
small one, program-by-program) rather than folding it into duplicate handling.

---

## 4. Recommendation — awaiting confirmation before any file edit

Nothing in this document has changed a corpus file or the database. Proposed, pending your
go-ahead:

1. **No action on the 30 already-ingested genuine duplicates** — already safe.
2. **A note in `drive_batch1_2026-08-17.jsonl` and/or `reverify_batch3_2026-08-17.jsonl`** for
   the two Frankfurt School records that never landed, recording that they're a known
   corpus-only duplicate pair, not touching either file's actual data lines.
3. **No re-minting of the 14 identifier-collision records** performed — the original audit's own
   recommendation stands, unimplemented, awaiting the same authorisation any corpus-file change
   needs per this round's instruction.
4. **The coverage gap in section 3 is reported, not fixed** — recommend a separate pass, scoped
   and assigned deliberately rather than folded into this one.
