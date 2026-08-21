# Priority-Country Undergraduate Programme Catalogues — France, Italy, Spain, Switzerland

Research lane: `worktree-priority-country-programs`
Researched: 2026-08-21
Data files: `data/research/university-programs/fr_it_es_ch_batch{1,2,3,4}_2026-08-21.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

France, Italy, Spain and Switzerland are named priority countries in `AGENTS.md`. Before this
lane, the research corpus held **84 records across all four**, concentrated in five institutions
(Bocconi, Politecnico di Milano, ETH, IE University, Paris Dauphine), typically 4–5 programmes
each, and many with `university_official_domain` null.

A university showing 5 of its ~60 programmes is arguably worse than one showing none, because it
looks covered and is not. This lane deepens rather than duplicates.

---

## Verified counts

**435 records across 13 universities.** Every record is `official_primary` read directly from the
institution's own domain, and every record has `university_official_domain` populated.

| Country | Records | Universities |
|---|---:|---|
| Spain | 227 | Universidad Complutense de Madrid (165), Universidad Carlos III de Madrid (62) |
| Italy | 129 | Sapienza (65), Politecnico di Milano (29), Politecnico di Torino (26), Bocconi (9) |
| Switzerland | 70 | ETH Zurich (23), University of Zurich (15), Université de Lausanne (15), EPFL (13), Université de Genève (4) |
| France | 9 | Sorbonne Université (8), Sciences Po (1) |

France is the weakest and is the top priority for the next pass — see *Blocked* below for why.

---

## The one rule that mattered most: language of instruction

**Language was asserted on 164 records, left as an honest disclosed unknown on 271, and guessed on
zero.**

The standing instruction was never to infer `language_of_instruction` from a programme's name or
from a page being served in English. A previous lane made exactly that mistake on Leiden and had
to correct 69 records. Concretely, in this lane:

**Sourced (164)** — only where the institution prints an explicit marker:

| Source | Marker | Handling |
|---|---|---|
| Sapienza | per-programme `ITA` / `ENG` badge | kept verbatim as the catalogue's own codes, including dual `ITA, ENG` |
| Politecnico di Torino | per-programme badge | kept verbatim, including `Ita Eng` and `Multilingual`, which do not reduce to one language |
| UC3M | parenthetical label after each degree title | kept verbatim, including `Bilingual` and multi-language lists |
| Bocconi | literal `In English` / `In Italian` section headings | recorded as the heading string, so the **group-level** nature of the evidence stays visible |
| UCM | 2 degrees titled `(en inglés)` | recorded verbatim |

UC3M and Bocconi were re-fetched independently to re-read their markers verbatim before the
values were trusted.

**Not asserted (271)** — and the reasons are the useful part:

- **Politecnico di Milano** — the catalogue *does* carry ITA/ENG filter badges, but they did not
  survive extraction. No marker was actually read, so none was recorded. Needs a per-programme pass.
- **EPFL, ETH Zurich, UZH, UNIL, UNIGE** — no per-programme marker published. EPFL French and
  ETH/UZH/UNIL German or French instruction is *prior knowledge, not page evidence*, and is
  therefore deliberately absent from the data.
- **ETH Zurich specifically** — ETH *does* publish a real statement: *"the Bachelor's degree
  programmes begin in German. In the second and third years of the programmes, some of the courses
  may take place in English."* That is mixed and time-phased; no single `language_of_instruction`
  value represents it honestly. The field is null and the verbatim quote is preserved in
  `researcher_notes`. **Do not collapse this to "German" at ingestion.**
- **UCM — the trap worth naming.** Nine UCM degrees carry titles saying *"ofrece un grupo en
  inglés"* or *"ofrece un grupo bilingüe español – inglés"*. That means **one cohort inside the
  degree** is taught in English — it is *not* the degree's language of instruction. An automated
  extraction happily reported these as "Inglés". All nine are recorded as unknown with the verbatim
  qualifier preserved. This is the same class of error as the Leiden incident and is the single
  most likely way this dataset could have been silently wrong.

---

## Structural judgments that prevented invented data

- **Sciences Po is one record, not six.** The Undergraduate College publishes *one* Bachelor of
  Arts. Its six majors (`Block 1: Economics, Political Science – Comparative Politics, Political
  Science – Political Theory; Block 2: Law, History, Sociology`) and its seven campus/regional
  variants are structure *inside* one degree. Expanding them into programme rows would have
  manufactured degrees Sciences Po does not offer. Its only explicit language statement is
  campus-specific (Paris, French), so no degree-level language is claimed. Its "18 dual Bachelor
  degree programmes" are referenced but not enumerated on that page and remain unresearched.
- **UZH's index mixes real degrees with umbrella degrees** (`Bachelor of Arts (RVO19)`,
  `Bachelor of Science Faculty of Science (2021)`) that each contain many majors. 15 rows is **not**
  UZH's subject-level offering.
- **Sapienza publishes two distinct degrees both named "Classics"** at different URLs — one badged
  `ITA`, one `ENG`. The dedup key includes URL so they are not collapsed by name.
- **UCM non-degrees excluded (5):** `Cursos 0`, `Oferta de Idiomas como Formación Complementaria`,
  `Declaración Eclesiástica de Competencia Académica (DECA)`, and two `Asignaturas para la Docencia`
  entries. These are on the grado index but are not undergraduate degrees.

## Flags that ingestion must handle

| Flag | Count | Meaning |
|---|---:|---|
| `Plan a extinguir` (UCM) | 29 | UCM's own marker for a discontinued plan. Retained because published, but **must be filtered from student-facing views** — a new applicant cannot enter them. |
| Attached centre (UCM) | 30 | Delivered by a *centro adscrito* (CUNEF, Villanueva, Cardenal Cisneros, Don Bosco, ESCUNI, Escorial, ISDE), not a UCM faculty. Needs entity resolution. |
| `official_primary_partner_hosted` (PoliTo) | 2 | `Food Tech for Ecological Transition` (unisg.it) and `Sustainable Design for Food Systems` (corsi.unipr.it) are listed by PoliTo but hosted on a **partner's** domain. A domain-authority check failing on these is **expected and correct**, not a data error. |

---

## Attempted and blocked — so the next lane does not repeat these

| Institution | Blocker |
|---|---|
| **Universidad de Navarra** (ES) | English catalogue is machine-translated and demonstrably wrong — "Degree in Education" links to `/degree-in-pedagogy`, alongside "Degree of high school program in Philosophy" and "graduate in Religious Sciences". The Spanish canonical page `unav.edu/en/grados` **404s**. ~90 entries were available; **none published** rather than inject mistranslated names. Recoverable with the correct Spanish listing URL. |
| **Universitat Pompeu Fabra** (ES) | HTTP **403** to automated fetch. |
| **USI Università della Svizzera italiana** (CH) | HTTP **403** to automated fetch. |
| **Università di Bologna** (IT) | Catalogue behind a JS/filter interface. Yields **category counts only** — 118 first-cycle programmes across 16 subject areas, no programme rows. |
| **Università di Padova** (IT) | Same pattern. States **114 bachelor courses**, no rows extractable. |
| **Sorbonne Université — Lettres** (FR) | `formations-lettres.sorbonne-universite.fr` refused automated fetch with **ECONNRESET** on two attempts. Medicine faculty not attempted. Only the Sciences faculty's 8 licences were captured. |
| **Université de Genève — central index** (CH) | `bachelors.unige.ch` redirects to a JavaScript SPA (`unige.ch/bachelor-master/#/bachelor`) returning no rows. Only the *sciences de la société* faculty was captured. |
| **Université de Lausanne — fr index** | `unil.ch/formations/...` redirects to `www2.unil.ch` which **404s**. The English institutional index worked and was used instead. |

Common pattern: **JS-rendered catalogues and per-faculty fragmentation**, not access restrictions.
Bologna, Padova and UNIGE would likely all fall to a headless-browser retrieval path; that is the
single highest-leverage tooling investment for this domain.

---

## Corpus conflicts found — recorded, not silently reconciled

Neither was overwritten. Both need a human decision on which source is authoritative.

1. **Bocconi.** Existing ORYN research records list `International Economics and Finance`,
   `International Economics and Management`, `Economics Management and Computer Science` and
   `Global Law`. **None of these appear on Bocconi's current BSc page.** Either they are superseded
   names or they came from a different page. The 9 records in this lane are what Bocconi publishes
   today. (Note Bocconi's law programmes live on a separate page, so `Global Law` may simply be
   out of scope of the BSc listing rather than defunct.)
2. **Sciences Po.** An existing record lists a `Bachelor of Arts and Sciences`, which the official
   Undergraduate College page does not mention.

---

## Remaining gaps, in priority order

1. **France is barely covered (9 records).** Sorbonne Lettres + Médecine, Université Paris-Saclay,
   Université PSL, Université Paris Cité, HEC Paris, and deepening École Polytechnique and Paris
   Dauphine (both currently thin in the corpus).
2. **Bologna and Padova** — 232 first-cycle programmes known to exist between them, zero captured.
3. **Politecnico di Milano language pass** — 29 records that need only a per-programme fetch to
   fill a field the catalogue already publishes.
4. **UZH umbrella expansion** and the remaining **UNIGE faculties**.
5. **Spain**: Universitat de Barcelona, Universidad Autónoma de Madrid, Universitat Autònoma de
   Barcelona, UPM, UPC; retry UPF and Navarra.
6. **Switzerland**: Bern, Basel, Fribourg, Neuchâtel; deepen St. Gallen (currently 8 corpus records).
7. **Italy**: Milano Statale, Torino, Pisa, Cattolica, Ca' Foscari, Trento; deepen Bocconi law.

Sequencing note: this lane's agreed follow-on is **requirements + deadlines for these same four
countries**, since the official catalogue for each institution has now been located once.
