# Germany & Netherlands Programme Catalogues — LMU, Heidelberg, TU Berlin, Bonn, Delft

Research lane: `worktree-de-nl-programmes`
Researched: 2026-08-21
Data files: `data/research/university-programs/de_nl_batch{1..5}_2026-08-21.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

Assigned by the ORYN multi-agent coordination session to deepen the `university_programs`
catalogue for five named institutions. A live query against the `oryn-qa-scratch` project
(`qtcvcflzxbuagvvwahhu`) taken immediately before dispatch showed the actual starting state:

| University | Country | Live programme count before this lane |
|---|---|---:|
| LMU Munich | Germany | 4 |
| Universität Heidelberg | Germany | 0 |
| TU Berlin | Germany | 0 |
| University of Bonn | Germany | 0 |
| TU Delft | Netherlands | 15 (Bachelor's only) |

Same pattern as every prior lane in this research programme: a university with 4 of ~180
programmes visible is worse than one with zero, because it looks covered and is not.

---

## Verified counts

**890 records across 5 universities**, all `official_primary`, all with
`university_official_domain` populated.

| University | Country | Bachelor's | Master's | Total |
|---|---|---:|---:|---:|
| LMU Munich | Germany | 61 | 119 | 180 |
| Universität Heidelberg | Germany | 136 | 135 | 271 |
| TU Berlin | Germany | 50 | 92 | 142 |
| University of Bonn | Germany | 131 | 126 | 257 |
| TU Delft | Netherlands | 2 (gap-fill) | 38 | 40 |
| **Total** | | **380** | **510** | **890** |

Three of the five (Heidelberg, TU Berlin, Bonn) went from 0 to a fully reconciled total
confirmed against the institution's own stated count. LMU's pre-existing 4 records were left
untouched, not duplicated. Delft's existing 15-record Bachelor's list was treated as
authoritative and only genuinely missing entries were added.

---

## Retrieval methodology, per university

Each university required a different approach — the general discipline (confirmed again
here) is to let the browser diagnose the page's actual data source, then script retrieval
against that source rather than the rendered HTML.

- **LMU Munich** — the public Studiengangfinder widget is client-rendered. Network-request
  inspection found its own JSON results endpoint (`cms-search.lmu.de/.../execute`), queried
  directly with facet filters (`Abschluss=Bachelor|Master`, `Fachtyp=Hauptfach`), reconciled
  against the site's own stated per-facet totals. One sub-endpoint required Basic-auth
  credentials the researcher did not have — rather than attempting to acquire or work around
  them, it passively observed the page's own authenticated XHR requests instead. It never
  handled a credential itself.
- **Universität Heidelberg** — the study-finder page embeds a server-rendered GraphQL
  hydration payload (`window.__DATA__`) whose own `tableTotalRows=103` field confirmed the
  103-subject listing was complete with zero further pagination needed. Each programme's
  degree type, language and duration were then independently re-confirmed from that
  programme's own detail page rather than trusted from the aggregate listing alone.
- **TU Berlin** — the official "All Programs Offered" catalogue paginates via plain TYPO3
  URL parameters. Filtering by degree type and fetching all pages reproduced the site's own
  stated totals (50 Bachelor's / 92 Master's) exactly, with zero mismatches against each
  programme's own detail page.
- **University of Bonn** — the "Degree Programs A-Z" catalogue is server-rendered Plone,
  paginated via `?b_start:int=N` across 9 pages (266 entries site-wide, 257 in scope).
  Cross-confirmed against each programme's own "Keyfacts" box.
- **TU Delft** — mixed English/Dutch pages. Confirmed the official Bachelor's index carries
  17 entries against the 15 already in the live DB, and independently retrieved that 17-item
  list twice (WebFetch + browser `get_page_text`) to confirm the 2 gap-fill entries before
  adding them.

---

## Language of instruction: discipline held, at real cost to coverage

The standing rule — never infer `language_of_instruction` from a programme's name or from a
page rendering in a given language, only assert what a programme's own page states — held
across all five universities, including where it meant leaving the field null.

| University | Records | Language null | Notable pattern |
|---|---:|---:|---|
| LMU Munich | 180 | 23 | Bulk listing had a clear field for most; ambiguous cases left null rather than resolved from the detail page's prose |
| Heidelberg | 271 | 1 | Only 15/271 are purely English-medium — the corpus is overwhelmingly German or explicitly bilingual, read per-programme |
| TU Berlin | 142 | 4 | — |
| Bonn | 257 | 87 | Bonn's own Keyfacts box simply omits the field for roughly a third of programmes — a real gap in the source, not a research shortfall |
| Delft | 40 | 1 | Caught a genuine mismatch between an index page's language label and a detail page's own label for at least one programme — detail page trusted |

Bonn's 87 nulls are the largest concentration of unknowns in this batch. That is the source's
own limitation, not a place a name-based guess would have been defensible — German
university programmes routinely run English-medium despite German titles, and vice versa.

---

## Structural findings

- **LMU's 4 pre-existing DB records have `language_of_instruction: null`.** This lane's own
  research found real, sourced values for those same programmes via the official finder.
  Not overwritten here — reconciling new research against existing rows is out of this
  research pass's scope — but flagged for whoever merges this data into the live table.
- **TU Delft — provisional programme included and flagged, not silently added as live.** One
  Bachelor's gap-fill (`Health and Technology`, joint with Erasmus MC) carries an explicit
  "(accreditation pending)" annotation on TU Delft's own index. Cross-checked via WebSearch
  against both TU Delft's and Erasmus's own news outlets: only provisional NVAO accreditation
  as of this research date, planned 2027 launch, not yet enrolling. Included because it is
  genuinely and officially listed today, but its `verification_status` says forward-looking,
  not operating — this needs a decision on whether forward-looking programmes belong in the
  student-facing catalogue at all.
- **TU Delft joint/external degree structures** (e.g. GIMA — Geographical Information
  Management and Applications) are documented as joint degrees directly from the programme's
  own page, not flattened into an ordinary single-institution record.
- **`international_eligible` is null on all 890 records.** This matches the established
  convention in this research programme (the `fr_it_es_ch_batch4` reference file is null on
  184/184 records too) — none of these five universities' catalogue pages publish a
  per-programme international-eligibility flag; it was not inferred.

---

## Live-data gap found in the task brief — corrected after peer and coordinator verification

The coordination session's brief for this task described RWTH Aachen and FU Berlin as
"already covered" (grouped with KIT), and VU Amsterdam as having "10 of 29" programmes
live. A live query taken before dispatch showed all three at 0 live rows, which an earlier
version of this document reported as a straightforward brief/reality mismatch. That framing
was incomplete — corrected here after a peer session and the coordinator both weighed in:

- **RWTH Aachen and FU Berlin: an ingestion gap, not a research gap.** Both are already
  fully researched, committed and pushed on `oryn/programs-pipeline-reconciled` — FU Berlin
  (75 records, `58872fc`) and RWTH Aachen (77 records, `6dff85a`). Both commits are verified
  ancestors of this branch's own history (`git merge-base --is-ancestor`, confirmed directly,
  not taken on trust). The records were simply never loaded into the live table. Not
  re-researched here — would have been wasted, duplicate work.
- **VU Amsterdam: a known, previously-diagnosed technical blocker, not an untouched gap.**
  The same `oryn/programs-pipeline-reconciled` session attempted it twice before this lane
  started (`2338865`, `638f0f5`, both confirmed reachable from this branch). Its programme
  list is virtualized/lazy-rendered, mounting only 10 of 29 cards in the DOM regardless of
  scroll/click/wait — that is where the brief's "10 of 29" actually comes from: a
  DOM-visible count from a blocked scrape, not a claim about ingested rows. The site's own
  `/api/search` POST endpoint does return the full 29-record set with useful per-programme
  language facets, but its request-body filter syntax could not be reverse-engineered in
  either attempt (guessed filters were silently ignored; replaying the captured request
  401'd). Needs either a fetch-interceptor installed before first page load, or manual
  click-through — not attempted again in this pass, to avoid repeating already-ruled-out
  approaches.

Both corrections came from a peer session's and the coordinator's independent verification,
not from this lane's own research — credited here rather than presented as this lane's own
finding. KIT (45 live programmes) was the one part of the original brief that was accurate.

---

## Validation performed

- All 890 records parse as valid JSON, one object per line, UTF-8 with native-language
  characters preserved.
- All 890 records carry all 21 required schema fields (matching `fr_it_es_ch_batch4`'s
  schema) — zero missing-field records.
- Zero duplicate `research_program_id` within or across the 5 files.
- Zero duplicate `official_program_url` within or across the 5 files.
- Spot-checked a sample record per file for value/notes-field separation discipline
  (asserted values in data fields, reasoning and caveats in `researcher_notes` /
  `verification_status`) — held in every sample checked.

No CAPTCHA was encountered, and none was attempted or bypassed. No credential was handled
by any researcher agent (see the LMU Basic-auth note above).

---

## Remaining gaps, in priority order

1. **RWTH Aachen, FU Berlin, VU Amsterdam** — genuinely at 0, contrary to the task brief;
   see discrepancy note above. Natural next targets.
2. **Bonn's 87 language-null records** — the source itself is thin here; a targeted
   per-programme detail-page pass could recover some, but likely not all.
3. **LMU's 4 pre-existing DB records carry null language where this lane's research has real
   values** — a reconciliation pass (not a re-research pass) would close this cheaply.
4. **TU Delft's provisional "(accreditation pending)" programme** — needs a product decision
   on whether forward-looking/pending-accreditation programmes belong in the student-facing
   catalogue, or should be held back until accreditation is confirmed.
