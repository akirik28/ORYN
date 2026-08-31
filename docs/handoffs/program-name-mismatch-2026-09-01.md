# The 388: a measurement, not a matcher

Branch `oryn/program-name-mismatch-2026-09-01`. Docs and read-only analysis scripts only —
no code path in the application changed, nothing in `university_requirements`,
`university_deadlines`, or `university_programs` was written to. Per CEO's explicit
instruction: report the split between "programme missing from `university_programs`
entirely" and "programme present under a different name," and if the second bucket
clusters into predictable shapes, report the shapes with counts — without building a
matcher, and by sampling by hand where automated classification can't be trusted.

## Headline finding: the two-way split CEO asked for isn't the whole shape

The first automated triage pass (loose substring containment + suffix stripping) produced
224 "looks renamed" / 147 "no candidate found." **Neither number survived hand-reading.**
A ~26-record sample across both buckets found real false positives in the "renamed" bucket
(Waterloo's *"Engineering (all programs except Architecture)"* string-matched to
"Architecture" — a program it explicitly excludes; Carnegie Mellon's *"School of Music"*
string-matched to one long joint-degree title that happens to mention the school by name)
and a real false negative in the "no candidate" bucket (Manchester's *"BSc Computer
Science"* has an exact match in `university_programs` — *"Computer Science BSc"* — just
with the degree-type word order swapped, a shape the first pass never tested for).

A second, hand-read sample of 25 from the (corrected) unresolved set surfaced something
neither original bucket name anticipated: **roughly a quarter to half of "no exact match"
records don't name a specific degree programme at all.** They're one of two other things:

- **An organisational unit**, not a programme: *"School of Medicine"* (Complutense Madrid,
  Koç University), *"School of Design"* / *"School of Drama"* (Carnegie Mellon, ×2 and ×5
  records respectively), *"Tandon School of Engineering"* (NYU), *"Columbia Engineering
  (The Fu Foundation School of Engineering and Applied Science)"*, *"Columbia College"*.
- **An admission category spanning multiple programmes**, mostly German universities'
  Staatsexamen/zulassungsfrei admission routes: *"Human Medicine, Dentistry[, Pharmacy]"*
  (Freiburg, Bonn, Hamburg — three separate subjects named as one admission category, not
  one programme), *"Bachelor's/State Examination programmes, unrestricted admission
  (zulassungsfrei) ... — Non-EU/EEA applicants"* (Göttingen), *"Master's programmes,
  Faculty of Philosophy ... central M.A. application portal"* (Göttingen, ×4 records),
  *"Hochschulzugangsprüfung (HZP) für beruflich Qualifizierte"* (an access exam, Darmstadt).

A keyword scan across the full 169-pair unresolved set (not just the 25-sample — "School
of"/"College"/"Faculty"/"Fakultät" for the organisational-unit shape, "Staatsexamen" /
"zulassungsfrei" / "Zugangsprüfung" / "application portal" / "direct application" for the
admission-category shape) finds **at least 55 of 169 pairs (67 + 21 = 88 records)**
matching one of these two patterns — a conservative floor, since it only catches records
using one of those specific words; the hand-read sample's proportion was noticeably higher,
which is expected from a keyword net that can't see a phrasing it wasn't given. **This is
worth reporting as its own finding, not folded into either of CEO's original two buckets**:
these records are correctly un-linkable to a specific `university_programs` row because the
underlying fact isn't about one programme — the research captured something true at the
school or admissions-office level, and no amount of programme-name reconciliation fixes
that, because there is no single programme name to reconcile it to.

## The count, properly framed

388 records is the wrong unit to reason about "how many mismatches" — they collapse to
**199 distinct (university, `program_name`) pairs** (each pair typically produces 2-3
records: a language requirement, a deadline, a math requirement, all citing the same named
programme). All counts below are pairs first, records in parens.

**Confirmed, mechanically-verified rename shapes** — each is an EXACT string transformation
(no fuzzy scoring, no threshold), tested against the live `university_programs` table and
individually spot-checked by hand before being trusted:

| Shape | Pairs | Records | Example |
|---|---|---|---|
| Trailing parenthetical stripped (degree type, CAO code, sub-unit, or bilingual gloss in parens) | 25 | 68 | `"Iranian and Persianate Studies (M.A.)"` → `"Iranian and Persianate Studies"` (Göttingen) |
| Erasmus's own "International Bachelor" prefix | 4 | 22 | `"History"` → `"International Bachelor History"` (Erasmus, Bachelor's only — its Master's programmes follow a different, not-yet-identified convention: `"MSc Economics and Business"`, 6 records, stayed unresolved) |
| Degree-type word order swapped | 1 | 13 | `"BSc Computer Science"` → `"Computer Science BSc"` (Manchester) |
| **Total confirmed shapes** | **30 (15%)** | **103 (27%)** | |

**Organisational-unit / admission-category — not a specific programme at all** (§ above):
at least 55 pairs / 88 records by conservative keyword count, plausibly more.

**Genuinely unresolved after all of this** — no confirmed transformation, not an
organisational-unit or admission-category phrasing either: roughly 169 − 55 ≈ **114 pairs**
at the conservative estimate (fewer if the true organisational/admission share is closer to
the hand-sample's impression). This is the part that actually needs the split CEO asked
for — real coverage gap vs. real rename in some shape not yet identified — and answering it
per-record is exactly the kind of individual reading this task's instruction was to do
carefully rather than automate. Not exhaustively done for all ~114; the hand-read sample
(Tilburg's `"MSc Artificial Intelligence for Psychological Research"` and `"Econometrics
and Operations Research"`, Geneva's `"Bachelor in Information Systems and Business
Analytics (GSEM)"`, TU Berlin's `"M.Sc. Computer Science (Informatik)"` ×6 records) reads
as a genuine mix of both, without a clean way to tell them apart from the text alone —
would need each checked against that specific university's actual current catalogue.

**One case worth naming on its own**: Edinburgh's `"Computer Science BSc (Hons)"` (7
records) automated-matched to `"Computer Science BEng (Hons)"` in the first pass. Not
carried forward as a confirmed shape here — BSc and BEng are commonly two genuinely
different accredited routes through the same subject at UK universities, not a naming
variant of one course. This is close to the exact case CEO's own instruction anticipated
("Medicine and Medicine MBBS are obviously the same course... obviously a judgement call to
justify") — except here the human judgement leans the other way. Correctly left unresolved
rather than folded into a "degree suffix" shape that would have been wrong.

## What this means for the exact-match rule, and what deliberately wasn't done

Nothing was built to catch any of these shapes. Per the instruction, a shape with a count
is a measurement for someone to decide on, not a reason to go add it to
`lib/acquisition/program-identity.ts`. Two observations worth keeping in mind if that
decision comes up:

- The three confirmed shapes are all genuinely mechanical (strip one parenthetical, swap
  two words, add one known institutional prefix) — none require the kind of "is this really
  the same course" judgement the exact-match rule was built to refuse. If any get
  implemented later, they're a different, much narrower kind of rule than "fuzzy matching."
- The organisational-unit / admission-category records are not a matching problem at any
  strictness. No transformation of `program_name` produces a `university_programs` row for
  them, because the fact isn't about a programme. Recognizing that category (rather than
  leaving it silently inside "no exact match") is probably more useful than any amount of
  string-matching precision on the genuine renames.

## Verification

- `npm run lint` / `npm run typecheck` / `npm test` (2864 tests) / `npm run build` — all
  clean; this branch adds two read-only analysis scripts and this handoff doc, nothing
  importable by application code.
- `scripts/analyze-program-name-mismatches.ts` — first-pass triage (kept for the historical
  record of what the loose heuristic produced and why it wasn't trusted as-is).
- `scripts/analyze-program-name-mismatches-precise.ts` — second pass, exact mechanical
  transformations only, the source of the confirmed-shapes table above. Run live against
  the real database (not a fixture); output written to `/tmp/program-name-mismatches*.json`
  for the hand-reading this report is based on (not committed — scratch output).
- Every number above was checked against a live re-run of the scripts today, not
  reconstructed from memory of an earlier pass.
- No `opportunities` table touched. No existing row written to.
