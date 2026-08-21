# Priority-Country Undergraduate Programme Catalogues — France, Italy, Spain, Switzerland

Research lane: `worktree-priority-country-programs`
Researched: 2026-08-21
Data files: `data/research/university-programs/fr_it_es_ch_batch{1..5}_2026-08-21.jsonl`

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

**659 records across 15 universities.** Every record is `official_primary` read directly from the
institution's own domain, and every record has `university_official_domain` populated.

| Country | Records | Universities |
|---|---:|---|
| Italy | 353 | Bologna (118), Padua (106), Sapienza (65), Politecnico di Milano (29), Politecnico di Torino (26), Bocconi (9) |
| Spain | 227 | Complutense (165), Carlos III (62) |
| Switzerland | 70 | ETH Zurich (23), Zurich (15), Lausanne (15), EPFL (13), Genève (4) |
| **France** | **9** | Sorbonne Université (8), Sciences Po (1) |

**France at 9 is the honest headline, not the 659.** It is the weakest of the four priority
countries and the top target for the next pass.

---

## The one rule that mattered most: language of instruction

**Language asserted on 387 records, left as an honest disclosed unknown on 272, guessed on zero.**

The standing instruction was never to infer `language_of_instruction` from a programme's name or
from a page being served in English. A previous lane made exactly that mistake on Leiden and had
to correct 69 records.

**Sourced (387)** — only where the institution prints an explicit marker:

| Source | Marker | Handling |
|---|---|---|
| Bologna | per-card `Language:` field | verbatim, incl. dual `English, Italian` |
| Padua | per-card language field | verbatim, incl. `Italian and English` |
| Sapienza | per-programme `ITA` / `ENG` badge | verbatim as the catalogue's own codes |
| Politecnico di Torino | per-programme badge | verbatim, incl. `Ita Eng` and `Multilingual` |
| UC3M | parenthetical label per degree | verbatim, incl. `Bilingual` |
| Bocconi | literal `In English` / `In Italian` headings | value normalised to English/Italian; the group-level nature of the evidence kept in notes |
| UCM | 2 degrees titled `(en inglés)` | verbatim |

UC3M and Bocconi were re-fetched independently to re-read their markers before the values were
trusted.

**Not asserted (272)** — the reasons are the useful part:

- **Politecnico di Milano** — the catalogue carries ITA/ENG filter badges that did not survive
  extraction. No marker was actually read, so none was recorded. One per-programme pass would
  convert 29 unknowns into sourced values; the cheapest remaining win in this dataset.
- **EPFL, ETH Zurich, UZH, UNIL, UNIGE** — no per-programme marker published. EPFL French and
  ETH/UZH/UNIL German or French instruction is *prior knowledge, not page evidence*, and is
  deliberately absent from the data.
- **ETH Zurich specifically** — ETH publishes a real statement: *"the Bachelor's degree programmes
  begin in German. In the second and third years of the programmes, some of the courses may take
  place in English."* Mixed and time-phased; no single value represents it honestly. Field is null,
  verbatim quote preserved. **Do not collapse to "German" at ingestion.**

### Two traps worth naming

1. **UCM — "one cohort" is not "the language".** Nine UCM degrees carry titles saying *"ofrece un
   grupo en inglés"* or *"ofrece un grupo bilingüe español – inglés"*. That means one cohort inside
   the degree is taught in English. An automated extraction reported all nine as "Inglés". All nine
   are recorded as unknown with the verbatim qualifier preserved. **This phrasing is common across
   Spanish catalogues** — any lane extracting Spanish universities should expect it.
2. **Padua — an English site is not an English degree.** Padova's English-language site lists
   Italian-taught degrees under Italian names *and* under English names. Language came only from
   each card's own language field.

---

## Retrieval: the "JS-rendered catalogue" diagnosis was mostly wrong

An earlier version of this document listed Bologna and Padova as blocked by JavaScript rendering
and concluded that a headless browser was the highest-leverage tooling investment. **That was
wrong, and the correction generalises.**

- **Bologna is fully server-rendered.** The blocker was the *default URL*, which shows only filter
  counts and an empty results panel. Appending `?pagesize=200&orderby=alphabetic` returns all 118
  programmes as plain HTML — retrievable with `curl`, no browser involved.
- **Padova** needs `?page=N` (25 pages), but those pages are equally server-rendered and curl-able
  once the parameter is known.

The browser was still what *diagnosed* both: opening the page and reading the DOM revealed the
`pagesize` / `page` parameters and the filter-checkbox structure that the plain fetch had made look
like an accordion. **Use the browser to discover the shape, then script the retrieval.**

Generalisable checks before declaring a catalogue blocked:

1. Look for a page-size or sort parameter on the listing's own pagination links.
2. Check whether "categories with counts" are actually *filter checkboxes* rather than collapsed
   sections — that means results live in a separate panel with its own URL parameters.
3. Try a same-origin `fetch()` from the browser console; if it returns cards, `curl` will too.
4. Only then conclude that rendering is client-side.

---

## Structural judgments that prevented invented data

- **Sciences Po is one record, not six.** The Undergraduate College publishes *one* Bachelor of
  Arts. Its six majors (`Block 1: Economics, Political Science – Comparative Politics, Political
  Science – Political Theory; Block 2: Law, History, Sociology`) and seven campus/regional variants
  are structure *inside* one degree. Expanding them into rows would have manufactured degrees
  Sciences Po does not offer. Its only explicit language statement is campus-specific.
- **Cycle is sourced, not inferred from duration.** Bologna's own URL namespace encodes it:
  `/laurea/` and `/1cycle/` are first-cycle; `/magistralecu/` and `/singlecycle/` are *laurea
  magistrale a ciclo unico*. 15 of Bologna's 118 and 12 of Padua's 106 are single-cycle (5–6 year)
  degrees. **Neither set is "all three-year bachelors."**
- **UZH's index mixes real degrees with umbrella degrees** (`Bachelor of Arts (RVO19)`, `Bachelor
  of Science Faculty of Science (2021)`) that each contain many majors. 15 rows is not UZH's
  subject-level offering.
- **Sapienza publishes two distinct degrees both named "Classics"** at different URLs — one `ITA`,
  one `ENG`. Dedup keys on URL as well as name so they are not collapsed.
- **Excluded rather than mislabelled:** 5 UCM entries that are not degrees (`Cursos 0`, `DECA`,
  complementary languages, two teaching-subject items), and 1 Padova row (`VITICULTURE, ENOLOGY AND
  WINE MARKETING`, LM-69) that was a second-cycle master's.

## Flags ingestion must handle

| Flag | Count | Meaning |
|---|---:|---|
| `Plan a extinguir` (UCM) | 29 | UCM's own discontinued-plan marker. Retained because published, but **must be filtered from student-facing views** — a new applicant cannot enter them. |
| Attached centre (UCM) | 30 | Delivered by a *centro adscrito* (CUNEF, Villanueva, Cardenal Cisneros, Don Bosco, ESCUNI, Escorial, ISDE), not a UCM faculty. Needs entity resolution. |
| `official_primary_partner_hosted` (PoliTo) | 2 | `Food Tech for Ecological Transition` (unisg.it) and `Sustainable Design for Food Systems` (corsi.unipr.it) are listed by PoliTo but hosted on a **partner's** domain. A domain-authority check failing on these is **expected and correct**, not a data error. |
| Single-cycle degrees | 27 | Bologna 15, Padua 12. 5–6 year *ciclo unico*, not bachelors. |

Admissions strings (Bologna `Type of access`, Padova admission field) are recorded **inside
`researcher_notes` only**, never as requirement fields — requirements are another lane's territory,
and these are current-cycle statements that need re-verification before being surfaced.

---

## Attempted and blocked — so the next lane does not repeat these

| Institution | Blocker |
|---|---|
| **Universidad de Navarra** (ES) | English catalogue is machine-translated and demonstrably wrong — "Degree in Education" links to `/degree-in-pedagogy`, alongside "Degree of high school program in Philosophy" and "graduate in Religious Sciences". The Spanish canonical page `unav.edu/en/grados` **404s**. ~90 entries available; **none published** rather than inject mistranslated names. Recoverable with the correct Spanish listing URL. |
| **Universitat Pompeu Fabra** (ES) | HTTP **403** to automated fetch. Per a sibling lane, 403s of this kind have cleared when retried in a real browser — worth one browser attempt before treating as closed. |
| **USI Università della Svizzera italiana** (CH) | HTTP **403**. Same note as UPF. |
| **Sorbonne Université — Lettres** (FR) | `formations-lettres.sorbonne-universite.fr` refused automated fetch with **ECONNRESET** on two attempts. Médecine not attempted. Only the Sciences faculty's 8 licences captured. |
| **Université de Genève — central index** (CH) | `bachelors.unige.ch` redirects to a JS SPA (`unige.ch/bachelor-master/#/bachelor`). Only the *sciences de la société* faculty captured. Given the Bologna/Padova finding, retry with the parameter-discovery checks above before assuming it is client-side. |
| **Université de Lausanne — French index** | `unil.ch/formations/...` redirects to `www2.unil.ch` which **404s**. The English institutional index worked and was used instead. |

No CAPTCHA was encountered, and none was attempted or bypassed.

---

## Corpus conflicts found — recorded, not silently reconciled

1. **Bocconi.** Existing ORYN research records list `International Economics and Finance`,
   `International Economics and Management`, `Economics Management and Computer Science` and
   `Global Law`. **None appear on Bocconi's current BSc page.** Caveat against this finding:
   Bocconi's law programmes sit on a separate page, so `Global Law` may be out of scope of a
   BSc-only listing rather than defunct. Human call required.
2. **Sciences Po.** An existing record lists a `Bachelor of Arts and Sciences`, which the official
   Undergraduate College page does not mention.

---

## Remaining gaps, in priority order

1. **France (9 records).** Sorbonne Lettres + Médecine, Université Paris-Saclay, Université PSL,
   Université Paris Cité, HEC Paris, plus deepening École Polytechnique and Paris Dauphine.
2. **Politecnico di Milano language pass** — 29 records needing one field the catalogue already
   publishes. Converts unknowns into sourced values, which beats adding rows.
3. **UZH umbrella expansion** and the remaining **UNIGE faculties**.
4. **Spain**: Universitat de Barcelona, Universidad Autónoma de Madrid, Universitat Autònoma de
   Barcelona, UPM, UPC; retry UPF and Navarra.
5. **Switzerland**: Bern, Basel, Fribourg, Neuchâtel; deepen St. Gallen (8 corpus records).
6. **Italy**: Milano Statale, Torino, Pisa, Cattolica, Ca' Foscari, Trento; deepen Bocconi law.

Sequencing note: this lane's agreed follow-on is **requirements + deadlines for these same four
countries**, held until programme coverage is no longer thin — currently gated on France.
