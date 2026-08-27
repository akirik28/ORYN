# S5 — Precise Fix List for Existing Live Rows

Requested by S9/Research CEO, 2026-08-27: package the existing-row corrections found during S5A/S5B's
research into a precise, actionable list (row id, old value, new value, source) rather than leaving
them scattered across handoff prose. Four categories below, each a different kind of fix — simple
field corrections, one flagged-but-unresolved discrepancy, structural decisions that aren't a single
value swap, and S5B's category-recategorization package (already precisely formatted, referenced
rather than duplicated).

All values below are re-confirmed directly against the live `opportunities` table
(`qtcvcflzxbuagvvwahhu`) at the time this list was written, not copied from earlier research notes.
**Nothing below has been applied — these are proposals for CEO/DATA to action.**

## A. Currency-label corrections (2 rows) — high confidence, ready to apply

Both caught the same way: this session's fresh research found the correct current price and it
matched the DB's stored number exactly once a currency was attached — meaning the number was captured
correctly originally, only the currency (implicitly USD, since the column carries no currency field)
was never checked.

| Row ID | Title | Field | Old value (as stored) | New value | Source |
|---|---|---|---|---|---|
| `1259aa77-0b5e-4c55-a384-51dbd47de3ec` | AI Summer Week @ ETH Zurich | `cost` (implied currency) | `500.00` (no currency column exists; implicitly read as USD) | **CHF 500** | Organizer's own Swiss-franc-denominated application form, `forms.hebbian.ch/r/OD1gjp`, retrieved 2026-08-27: *"CHF 500"* |
| `0a316853-6d11-4270-826a-1f8fbf896114` | University of St Andrews Summer Academic Experience | `cost` (implied currency) | `6850.00` (implicitly USD) | **GBP 6,850** | University's own fee page, `st-andrews.ac.uk/study/part-time/summer-courses/academic-experience/`, retrieved 2026-08-27: *"The course fee for 2026 entry is GBP6,850."* |

No `currency` column exists on `opportunities` today (same schema gap the 2026-08-24 summer-programs
audit already flagged) — until one exists, recommend at minimum appending the currency to the stored
number's context (e.g. a note field) so a future reader isn't misled into treating either figure as USD.

## B. Flagged discrepancy, NOT a confident fix — needs investigation, not a value swap

| Row ID | Title | Field | Current DB value | What this session found | Status |
|---|---|---|---|---|---|
| `511a9497-145a-4725-a77e-31f50a4f920d` | Penn Medicine Summer Program for High School Students | `deadline` | `2026-06-01` | Actual 2026 application deadline per the official BOLD Summers admissions page: **2026-02-26**. Note: the DB's `2026-06-01` does not cleanly match the program's own `start_date` either (`2026-06-28`, confirmed live) — so this isn't simply "the deadline field actually holds the start date," it's an unexplained value with no found source. | **Flagged for CEO/DATA investigation, not corrected here** — re-verified live before writing this: DB genuinely holds `2026-06-01`, which matches neither the found application deadline nor the program's own start date. Worth checking whichever prior source populated this field originally before overwriting it. |

## C. Umbrella-row structural decisions (3 rows) — not a value substitution, a product/data-model call

Each of these is one DB row standing in for multiple sub-programs with materially different
eligibility, cost, or geography. None can be "fixed" with a single field edit — CEO/DATA needs to
decide whether to (a) determine which specific sub-program the existing row represents and correct it
to that one, (b) split the row into per-sub-program rows, or (c) leave as-is with an explicit
umbrella-scope note. Contract §13's anti-fragmentation rule means splitting is not automatically the
right call.

| Row ID | Title | The problem | Sub-programs found |
|---|---|---|---|
| `22fb607f-3aab-4320-a737-3531d0b96702` | Worldwide Youth in Science and Engineering (WYSE) | Unclear which sub-brand the row represents; Turkey-access verdict depends entirely on the answer | (1) Engineering Summer Camps — no restriction found. (2) Young Scholars Summer STEMM Research Programs — restricted to residents of 7 named US Midwest states (IL/IN/KY/MI/MO/IA/WI), verbatim from `wyse.grainger.illinois.edu/summer-programs/`. (3) Digital Scholars Program — Chicago-based, no restriction found. If the row represents (2), it's `NOT_ELIGIBLE` for Türkiye; if (1) or (3), likely eligible. |
| (id not re-queried this pass — see S5A's original handoff, "CANDIDATE COUNT"/umbrella note) | BRAND-ED | One row covers 4 differently-branded, differently-priced, differently-aged sub-programs (School of The New York Times, Vogue College of Fashion, Sotheby's Institute of Art, Man City Sport Business School) | Facts sourced from a seed document, not an independent re-fetch this pass — CEO/DATA should decide split-vs-represent before treating any single price/age as the row's value. |
| (id not re-queried this pass — see S5A's original handoff, "DUPLICATES FOUND") | Johns Hopkins CTY Summer Residential Program | One row stands in for dozens of distinct CTY tracks (Civic Leadership Institute, Intensive Studies for 7th Graders and Above, Institute for Advanced Critical and Cultural Studies, etc.) at different host campuses, ages, and price points | Not itemized here — genuinely dozens, not a short list; recommend CEO/DATA pull CTY's own current track list directly when ready to decide, rather than working from this pass's notes. |

## D. S5B's category-recategorization + gap-fill package (8 rows) — already precisely formatted

S5B's package is on branch `oryn/s5b-research-mentored-internships`, file
`data/research/opportunities/s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl` — already in a clean,
directly-appliable JSON format (row id, existing category, proposed category, proposed field values,
evidence pointer, and a specific `action` per row), referenced here rather than duplicated to avoid
two copies drifting apart. Summary for this package's context:

| Row ID | Title | Current category | Proposed category | Action |
|---|---|---|---|---|
| `0337369f-bb69-47e5-aa82-d4a0e92a674b` | Polygence | summer_program | research | recategorize + fill gaps |
| `bc678344-c213-4ae8-a4f8-48af2856338f` | Lumiere Education | summer_program | research | recategorize (cost still unconfirmed) |
| `8296f39c-93da-48ab-acc5-af023b14f347` | Research Mentorship Program | summer_program | research | **merge into `647eb8da-...` first** (pre-existing internal duplicate), then recategorize |
| `647eb8da-9cb8-46d4-8ded-b4c516f7ac90` | UCSB Research Mentorship Programs | summer_program | research | keep as canonical after merge, then recategorize + fill gaps |
| `ae174625-5ad8-41b7-9c9a-7f00710c168a` | Summer Science Program (SSP) | summer_program | research | recategorize + fill gaps (age/cost already correct) |
| `2bbea7da-09bb-4eca-b46b-c3b5363e3b92` | Rockefeller SSRP | summer_program | research | recategorize + fill gaps |
| `418217ec-65af-494a-bf4f-370c0b6f070c` | Secondary Student Training Program (SSTP) | summer_program | research | **merge with `3533791e-...` first** (pre-existing internal duplicate, this row survives), then recategorize |
| `3533791e-62a7-49b7-a983-469a8a1c2514` | SSTP (duplicate) | summer_program | research | retire as duplicate of `418217ec-...` |
| `d1c24acc-a289-459f-a476-110a731e2eb8` | Venture & Tech Summer Program 2026 | summer_program | **internship** (not research) | recategorize + fill gaps |
| `09b42a46-cd61-4576-bc5a-565975c66d05` | International Research Institute of NC | summer_program | research | recategorize only (weakest-evidenced of the 8, gaps stay open) |

Note two pre-existing internal duplicate pairs surfaced independent of either lane's own research
(UCSB's program under two rows, Iowa SSTP under two rows) — recommend merging these as part of the
same pass, per S5B's own fixes file for exact merge guidance.

## Independent cross-validation

S5A's own continuation pass independently excluded 6 rows from its worklist on the identical
"this is actually mentored research filed under summer_program" logic, without having read S5B's
finding first — zero disagreement between the two lanes on any case either side checked. Not a new
fix, just a confidence signal on the method.
