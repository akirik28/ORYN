# Student count research — Batch 1 (2026-08-20)

Fills the `total_students` gap in `university_profile_metrics` for 20 universities that
previously had no enrollment fact recorded. Candidates were pulled from the
`university_rankings`-ordered gap query (highest QS/list rank first, `website_url is not null`),
so this batch skews toward well-known, high-rank institutions students are likely to look up.

Priority order followed throughout: **accuracy > provenance > freshness > completeness > volume.**
Every row below comes from an official institutional page (a "fast facts" / statistics-office /
annual-report / official news-release page) that explicitly states a current enrollment number for
that specific institution, with the reporting year captured in `stats_as_of`. Several PDFs (IIT
Bombay, IIT Madras, Khalifa University, University of Vienna) were downloaded and their text
extracted directly (via `pypdf`) rather than trusted from a search snippet, because the standard
WebFetch summarizer could not reliably parse the PDF binary.

Coverage: **383 → 403** universities with a `total_students` fact (distinct `university_id`,
verified via `select count(distinct university_id) from university_profile_metrics where
metric_code = 'total_students'`).

## Added (20)

| University | Country | Total students | Reporting period | Source |
|---|---|---:|---|---|
| University of Oslo | Norway | 27,400 | 2025 | [uio.no/english/about/facts](https://www.uio.no/english/about/facts/) |
| University of Exeter | United Kingdom | 29,777 (FTE) | 2025/26 | [exeter.ac.uk/about/facts/facts](https://www.exeter.ac.uk/about/facts/facts/) |
| IIT Bombay | India | 13,282 | 2023/24 | [iitb.ac.in Pocket Statistics 2023-24 PDF](https://www.iitb.ac.in/sites/www.iitb.ac.in/files/2025-01/Pocket%20Statistics%202023_24.pdf) |
| Western University | Canada | 42,978 | 2024/25 | [uwo.ca/about/whoweare/facts](https://www.uwo.ca/about/whoweare/facts.html) |
| Eindhoven University of Technology | Netherlands | 13,453 | 2024/25 | [tue.nl facts-figures](https://www.tue.nl/en/our-university/about-the-university/publications/facts-figures) |
| University of Geneva | Switzerland | 17,886 | 2024 | [unige.ch/stat news item](https://www.unige.ch/stat/actualite/chiffresetudiants-3) |
| Stockholm University | Sweden | 45,170 (registered headcount) | 2025 | [su.se facts-in-numbers](https://www.su.se/english/about-the-university/university-facts/facts-in-numbers) |
| Wageningen University & Research | Netherlands | 12,407 | October 2025 | [wur.nl facts-figures](https://www.wur.nl/en/about-wur/facts-figures) |
| University of York | United Kingdom | 22,345 | 2024/25 | [york.ac.uk/about/student-statistics](https://www.york.ac.uk/about/student-statistics/) |
| Ghent University | Belgium | 50,936 | 2025/26 | [ugent.be fact sheet PDF](https://www.ugent.be/en/ghentuniv/mission/internationalisation/fact-sheet.pdf) |
| Khalifa University | United Arab Emirates | 4,099 | Spring 2024 | [ku.ac.ae factsheet PDF (June 2024)](https://www.ku.ac.ae/wp-content/uploads/2024/06/KU-Factsheet-June-2024.pdf) |
| Newcastle University | United Kingdom | 27,260 | 2025/26 | [ncl.ac.uk figures](https://www.ncl.ac.uk/who-we-are/structure/figures/) |
| University of Groningen | Netherlands | 32,500 | 2024/25 | [rug.nl facts-and-figures](https://www.rug.nl/about-ug/profile/facts-and-figures/?lang=en) |
| UNAM | Mexico | 372,755 | 2024–2025 | [UNAM Agenda Estadística 2025, table 011.xlsx](https://web.planeacion.unam.mx/Agenda/2025/xls/011.xlsx) |
| Chalmers University of Technology | Sweden | 10,999 (full-time) | 2024 | [chalmers.se key-facts](https://www.chalmers.se/en/about-chalmers/key-facts-about-chalmers/) |
| University of Basel | Switzerland | 12,764 | Fall 2024 | [unibas.ch news release](https://www.unibas.ch/en/News-Events/News/Uni-Info/Start-of-the-fall-semester-2024.html) |
| Queen's University at Kingston | Canada | 28,561 (full-time) | 2025/26 (as of Nov 1, 2025) | [queensu.ca 2025-26 Enrolment Report PDF](https://www.queensu.ca/registrar/sites/uregwww/files/uploaded_files/pdfs/Reports/Enrolment%20Reports/Enrolment-Report-2025-26.pdf) |
| Universiti Teknologi Malaysia | Malaysia | 32,004 | as of 2025-12-31 | [utm.my facts-and-figures](https://www.utm.my/about/facts-and-figures/) |
| IIT Madras | India | 13,383 | 2024/25 | [iitm.ac.in Annual Report 2024-25 PDF](https://www.iitm.ac.in/sites/default/files/Others/Annual%20Report%202024-25%20final%20upload.pdf) |
| University of Vienna | Austria | 85,243 | Winter Semester 2024/25 | [Wissensbilanz 2024 PDF](https://vcm2015.univie.ac.at/fileadmin/user_upload/startseite/Dokumente/univie_LB_Kennzahlen_2024.pdf) |

### Notes on individual figures

- **Exeter (29,777)** — the official page explicitly labels this figure FTE (full-time equivalent),
  not headcount, per the annual 1 December student census. Stored with `unit = 'FTE'` rather than
  relabeling it as headcount.
- **Western University (42,978)** — this is the broader total including part-time students. The
  university's own page separately breaks out 37,875 full-time (30,647 UG + 4,664 Masters + 2,557
  PhD); both figures are noted in the row's `notes`.
- **Stockholm University (45,170)** — this is the "total registered students" (headcount with an
  active course registration, Spring 2025), which the university's own page distinguishes from a
  separate FTE figure of 32,267. Only the headcount was stored as `total_students`; the two are not
  interchangeable and were not conflated.
- **Wageningen (12,407, Oct 2025)** — a live re-fetch of the official facts page returned a lower,
  more current figure than the 13,190 (academic year 2024/25) reported by secondary sources during
  research. Per the freshness-over-volume priority, the more current, directly-verified official
  figure was used.
- **UNAM (372,755)** — this is UNAM's own official "población escolar total" for the 2024–2025
  cycle, which by UNAM's institutional structure includes upper-secondary enrollment (bachillerato:
  Escuela Nacional Preparatoria + Colegio de Ciencias y Humanidades, 106,087 students) alongside
  licenciatura (232,106) and posgrado (33,851), since UNAM operates its own preparatory high schools
  as part of the university system. This matches how UNAM and Mexican press report the "total UNAM
  student population." The higher-education-only subset (posgrado + licenciatura + técnico) is
  265,963 — noted in the row for transparency in case a stricter definition is later preferred.
- **Queen's University at Kingston (28,561)** — full-time headcount only, as of November 1, 2025,
  per the university's own Enrolment Report; excludes ~3,093 part-time students reported separately
  in the same document.
- **IIT Bombay, IIT Madras, Khalifa University, University of Vienna** — figures were confirmed by
  downloading the official PDF directly and extracting text locally (`pypdf`), because the
  WebFetch/URL-summarization tool could not reliably read these particular PDFs (compressed streams
  / binary content). This avoided trusting a secondary source's characterization of what the PDF
  says.

## Candidates researched but NOT added (no verifiable current figure found)

| University | Country | Reason skipped |
|---|---|---|
| King Fahd University of Petroleum and Minerals (KFUPM) | Saudi Arabia | Official "Facts and Figures" and "About Us" pages describe ratios (e.g. 12:1 student-faculty) and growth narrative but never state a current total enrollment number with a year; only third-party aggregator figures (~13,772) were found, unconfirmed on an official page. |
| Universidade de São Paulo (USP) | Brazil | Multiple USP-hosted pages (`depar.usp.br/num`, `jornal.usp.br`, `sites.usp.br/transparencia`) gave inconsistent totals for different years (89.3k undergrad only; 97,358 for 2022; 98,697 for 2024; 118,900 in one summarization) without one page giving a single clean, current, self-consistent total — did not want to guess between conflicting official-adjacent numbers. |
| University of Science and Technology of China (USTC) | China | Official English facts page (`en.ustc.edu.cn/About/up/Facts___Figures.htm`) gives a total (13,718) but does not state which year the figures apply to; per the rule "if you can't determine the year, don't insert," skipped. |
| Universiti Putra Malaysia (UPM) | Malaysia | Could not reach UPM's own official "Fakta & Angka" page directly (fetch failures); only third-party citations of "official" December 2024 data (30,720) were available, not independently confirmed by reading the primary page. |
| University of Liverpool | United Kingdom | No official liverpool.ac.uk facts/statistics page could be directly fetched to confirm the widely-cited 31,050 (2024/25) figure. |
| Tongji University | China | Official facts-and-figures URL (`tongji.edu.cn/eng1/About/Facts_and_Figures.htm`) returned 404 on retry; only secondary aggregation available. |
| Erasmus University Rotterdam | Netherlands | Official `eur.nl` facts-and-figures URL returned 404; secondary sources disagreed materially (39,000 vs. ~34,240 from a 2023 breakdown) with no official page to arbitrate. |
| Lancaster University | United Kingdom | Could not locate/fetch Lancaster's own official facts-and-figures page; only third-party-repeated figures (18,620, 2024/25) available. |
| Wuhan University | China | No single official page found; secondary sources disagreed (56,600–58,720) without a dated, official total. |
| Université de Montréal | Canada | Official registrar statistics page exists but total for 2024 not directly confirmed (only an aggregate "67,000 including affiliated schools HEC Montréal and Polytechnique" figure, which is not UdeM alone). |
| Queen's University Belfast | United Kingdom | No qub.ac.uk official facts page located; secondary sources disagreed (25,080 vs. 24,915 for 2024/25) with nothing official to settle it. |
| Al-Farabi Kazakh National University | Kazakhstan | No official facts page found; only a wide, unreconciled range (20,000–25,000+) across secondary sources. |
| Cardiff University | United Kingdom | Official facts-and-figures page is behind Cloudflare bot-challenge protection; per instructions, did not attempt to bypass bot detection. Skipped rather than trust an unverified secondary citation. |
| University of Cape Town | South Africa | No official uct.ac.za statistics page fetched directly; secondary sources disagreed (28,233 vs. "~29,000+") without a dated official total. |
| Universidad de Chile | Chile | Only found official data on *new* 2024 enrollees (6,804), not total enrolled student population; did not extrapolate. |
| Vrije Universiteit Amsterdam | Netherlands | Official "VU in numbers" page's most recent displayed figure was for 2022/23 (31,761); a more recent 2024/25 figure (31,351) appeared only in a search-engine synthesis, not confirmed by directly reading the live page. Skipped rather than use stale or unconfirmed data. |
| Tecnológico de Monterrey | Mexico | Figures found were for different scopes/periods (90,000 institution-wide for Sept. 2023; 18,000 for the Monterrey campus only, 2024/25) with no single current, whole-institution official total. |
| Harbin Institute of Technology | China | Not reached this batch — deprioritized after time spent on higher-confidence candidates; no official page checked. |
| Technische Universität Wien (TU Wien) | Austria | Not reached this batch (distinct institution from University of Vienna, which was completed) — deprioritized after time spent on higher-confidence candidates. |
| Hanyang University | South Korea | Secondary sources gave several inconsistent totals (32,679–35,000) with no single official page consulted to reconcile them. |

## Method notes

- Candidate list generated from the gap query specified in the task (universities missing
  `total_students`, ordered by `university_rankings.list_position` ascending, `website_url is not
  null`, limit 40).
- For each accepted university: located the official institutional page via web search, read it
  directly (WebFetch, or `curl` + `pypdf`/`openpyxl` text extraction when WebFetch could not parse
  the page/PDF), confirmed an explicit number tied to an explicit reporting year, then inserted.
- Re-ran a live dedup check (`select university_id, metric_code from university_profile_metrics
  where university_id in (...)`) against all 20 candidate IDs immediately before inserting, to guard
  against a concurrent session in this same research campaign adding a `total_students` row first.
  None had one.
- Insert used `source_type = 'official_primary'` for all 20 rows (all are the institution's own
  page or a document/spreadsheet the institution itself published), `verified_at = now()`.
