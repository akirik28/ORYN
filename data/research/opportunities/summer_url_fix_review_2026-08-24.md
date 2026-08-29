# URL-fix / retire review — for CEO sign-off

Requested by CEO 2026-08-24 after catching that "King's College London" was a dedupe case, not a
URL-swap. I re-checked all 10 URL-swap candidates for the same risk (does a clean duplicate row
already exist?) and found one more (St Andrews) plus one messier case (Lehigh) neither of us had
caught. Table below reflects the corrected recommendation for each row, not my original batch.

## A. Rows where a URL-swap is safe (no duplicate found, verified via SQL title search)

| row_id | title | current `official_url` | proposed `official_url` | dedup checked? | live-reverified today? |
|---|---|---|---|---|---|
| `b4091e25` | Carnegie Mellon University (PA, USA) | cmu.edu/physics/.../cv_oct24.pdf (random faculty CV) | cmu.edu/pre-college/admission/index.html | yes — CMIMC + SAMS exist, neither is this | **yes**, live 2026-08-24 |
| `907e279d` | New York University (NY, USA) | wp.nyu.edu/birdvox/news/ (unrelated research-lab blog) | nyu.edu/admissions/.../find-a-program.html?fwp_filter_first_level=high-school-programs | yes — no other bare-NYU row | no — pull from description only |
| `6d62d570` | NYU High School Law Institute | law.nyu.edu/news/student-spotlight-dylan-erikson (random news article) | law.nyu.edu/studentorganizations/highschoollawinstitute | yes | **yes**, live 2026-08-24: free program, 2026-27 cycle closed |
| `fd105724` | Universidad de Navarra - University of Navarra | unav.edu/web/unicc/competition (unrelated competition page) | unav.edu/web/facultad-de-filosofia-y-letras/find-your-way-walk-the-camino | yes | no — pull from description only |
| `0f7a1ef0` | University of Applied Sciences and Arts of Western Switzerland | heia-fr.ch/.../chemtech/ (unrelated research institute) | heia-fr.ch/en/university/events/**tech-and-engineering**-swiss-summer-camp-2026/ (note: hyphenation differs from what's in our own description — that version 404s) | yes | **yes**, live 2026-08-24: ages 15-17, CHF 2,850 (2,700 residential), 06-13.07.2026 |

## B. Retire — duplicate of an already-correct row

| row_id | title | why | the correct sibling row |
|---|---|---|---|
| `1e907aad` | King's College London (London, UK) | broken URL (unrelated clinical-trials paper); a clean twin already exists | `f43ddfc3` "King's College London Pre-University Summer School" — verified_current, correct URL |
| `e0960bef` | University of St. Andrews (Scotland, UK) | broken URL (random faculty profile); a clean twin already exists | `0a316853` "University of St Andrews Summer Academic Experience" — verified_current, correct URL. **New fee found for this row**: £6,850 all-inclusive, 2026 entry (live-verified today) |

## C. Retire — not a fixable opportunity at all

| row_id | title | why |
|---|---|---|
| `7aa517a3` | ECON 1 - 01 Introductory Microeconomics... | single UCSC undergrad course-catalog listing, session-tokenised URL |
| `910ec94d` | Time: 4:30pm – 5:30pm (Hong Kong time)... | Zoom-webinar registration snippet, not a program page |
| `b10444c7` | Summer Programs in the Netherlands - 2025 | aggregator search-results page; captured description is actually about an unrelated Milan program |
| `7dabbd20` | USC Summer Programs 2025 Info Sessions | promo for webinars about USC's program; USC's real program already has its own correct row (`4a54159a`) |

## D. Needs more research, not a mechanical fix — do not action yet

| row_id | title | status |
|---|---|---|
| `a7a89e1e` + `d12506f1` | "Lehigh University: Bethlehem, PA" (IGEI, broken URL) + "Lehigh University" (general, official_url=global.lehigh.edu) | Two messy rows, neither clean. The IGEI-specific URL in `a7a89e1e`'s description is a 2024-dated Qualtrics form link, not reverified. Recommend holding both until a current, specific IGEI page is found — then consolidate into one row rather than swap or retire either now. |
| `8f6e438f` | Hochschule Bremen (HSB)... | My first proposed fix also 404s on recheck. Search suggests the "Virtual International Summer School" may not run in 2026 — HSB's site currently shows a different "Short-Term Study Program" (Jun 1-24, 2026) instead. Not established whether this is a successor or an unrelated offering. |
| `4f668b96` | Global Issues at Princeton: Grades 10-12 | Both the current official_url (generic CTY catalog) and the description's more-specific URL (cty.jhu.edu/summer/grades7-12/princeton/) — the latter is a hard 404, not a redirect. Third confirmed CTY URL-rot case tonight. No duplicate found under "Princeton" in the corpus. Recommend retire or fall back to the CTY homepage with an explicit "unconfirmed" note — do not assert this specific track still runs. |

## Also flagged, not part of this batch

- **Koç University Summer Academy** cost proposal (TRY 80,000 → `cost` field) is **withdrawn** per CEO's
  correction — already correctly handled (fact lives in `description`, `cost` stays NULL, no currency
  column exists). Not re-proposing.

Full detail and source quotes for every row above are in `findings.jsonl` (search by row_id) and the
original batch write-up in `DRY_RUN_PACKAGE.md` / `CHECKPOINT.md`.
