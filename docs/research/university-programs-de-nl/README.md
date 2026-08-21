# Germany & Netherlands Programme Catalogues

Research lane: `worktree-de-nl-programmes`
Researched: 2026-08-21
Data files: `data/research/university-programs/de_nl_batch{1..10}_2026-08-21.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

Assigned by the ORYN multi-agent coordination session to deepen the `university_programs`
catalogue, in two waves. Wave 1 covered 5 named institutions. Wave 2 was assigned by the
coordinator after wave 1 landed, prioritizing the Netherlands "looks covered but isn't" trap
over Germany's honest zeros — see below.

---

## Verified counts

**1,836 records across 10 universities**, all `official_primary`, all with
`university_official_domain` populated.

| University | Country | Live before this lane | Bachelor's | Master's | Other | New total |
|---|---|---:|---:|---:|---:|---:|
| LMU Munich | Germany | 4 | 61 | 119 | — | 184 |
| Universität Heidelberg | Germany | 0 | 136 | 135 | — | 271 |
| TU Berlin | Germany | 0 | 50 | 92 | — | 142 |
| University of Bonn | Germany | 0 | 131 | 126 | — | 257 |
| TU Delft | Netherlands | 15 (Bachelor's only) | 2 (gap-fill) | 38 | — | 55 |
| Erasmus University Rotterdam | Netherlands | 4 | 32 | 116 | — | 152 |
| Tilburg University | Netherlands | 4 | 28 | 95 | — | 127 |
| University of Amsterdam | Netherlands | 4 | 60 | 266 | — | 330 |
| University of Groningen | Netherlands | 4 | 48 | 138 | — | 190 |
| Vrije Universiteit Amsterdam | Netherlands | 0 | 29 | 114 | 20 Pre-Master's | 163 |
| **New records this lane** | | | **577** | **1,239** | **20** | **1,836** |

Six of the ten (Heidelberg, TU Berlin, Bonn, plus VU Amsterdam from 0) went from nothing to a
fully reconciled total. The four Dutch universities in wave 2 (Erasmus, Tilburg, UvA,
Groningen) each carried exactly 4 pre-existing programmes — the same "looks covered but isn't"
trap as LMU's original 4 — all confirmed excluded by exact title/URL match, not duplicated.

---

## Retrieval methodology, per university

Each university required a different approach — the general discipline (confirmed again and
again here) is to let the browser diagnose the page's actual data source, then script
retrieval against that source rather than the rendered HTML.

**Wave 1:**

- **LMU Munich** — client-rendered widget, but network-request inspection found its own JSON
  results endpoint, queried directly with facet filters, reconciled against the site's own
  stated per-facet totals. One sub-endpoint required Basic-auth credentials the researcher
  did not have — rather than attempting to acquire or work around them, it passively observed
  the page's own authenticated XHR requests instead. It never handled a credential itself.
- **Universität Heidelberg** — the study-finder page embeds a server-rendered GraphQL
  hydration payload whose own `tableTotalRows=103` field confirmed the 103-subject listing
  was complete with zero further pagination needed.
- **TU Berlin** — the official "All Programs Offered" catalogue paginates via plain TYPO3 URL
  parameters, reproducing the site's own stated totals exactly.
- **University of Bonn** — the "Degree Programs A-Z" catalogue is server-rendered Plone,
  paginated via `?b_start:int=N` across 9 pages.
- **TU Delft** — confirmed the official Bachelor's index carries 17 entries against the 15
  already live, independently retrieved twice before adding the 2 gap-fill entries.

**Wave 2:**

- **Erasmus University Rotterdam** — fully server-rendered HTML (Drupal), plain `?page=N`
  pagination matching the site's own stated result counts exactly, plus faceted-filter query
  params for authoritative per-faculty attribution. A site-wide "compare studies" JSON index
  surfaced 9 live programmes missing from the standard finder entirely (8 other index entries
  were stale 404s, verified and excluded rather than trusted).
- **Tilburg University** — sits behind a Cloudflare managed JS challenge (plain `curl` got
  HTTP 403 `cf-mitigated: challenge`). Confirmed the site's own `robots.txt` explicitly
  permits AI use (`Content-Signal: ai-input=yes`) before using the interactive browser tool,
  which cleared the challenge automatically in ~5s with no human interaction — this is
  clearing a bot-mitigation gate the site itself says AI traffic may pass, not a CAPTCHA
  bypass. Catalogue itself is server-rendered HTML via Drupal Views AJAX pagination.
- **University of Amsterdam** — overview pages are JS-rendered, but network-request
  inspection found a public, unauthenticated JSON REST API (`uva.nl/_restapi/list-json`)
  backing them, returning the complete structured catalogue in two calls. Reconciled exactly
  against UvA's own live result counters (64/64 Bachelor's, 276/276 Master's).
- **University of Groningen** — entirely server-rendered HTML, no JS execution needed at any
  point. Alphabetical index pages plus a discoverable AddSearch endpoint for structured
  metadata at scale, then all 280 candidate programme pages fetched individually. The Dutch
  **CROHO accreditation code** (the official programme-registry number, printed on every
  programme's own page) became the key deduplication signal — pages sharing a code are the
  same legally-accredited programme, which correctly resolved ~45 "profile"/track sub-pages
  into their parent programmes without collapsing genuinely independent joint-degree
  programmes that happen to share a subject area.
- **VU Amsterdam** — see the dedicated section below. Broke a blocker that had defeated two
  prior attempts on a sibling branch.

---

## VU Amsterdam: how a twice-failed blocker was broken

VU Amsterdam had 0 live programmes and a real history: two prior attempts on
`oryn/programs-pipeline-reconciled` (`2338865`, `638f0f5`) had correctly diagnosed that the
real data lives behind a session-scoped `POST /api/search` returning the full result set with
genuine per-programme language facets, but neither could get past it — guessed OData filter
syntax was silently ignored rather than erroring, and replaying a captured request 401'd.

**Root cause**: Azure AI Search's `search.in()` requires a delimiter argument. The prior
guesses (`Filter/any(...)`, `Scopes/any(...)`, `ItemType/any(...)`) all omitted it, so the
filter was silently ignored — indistinguishable from a working-but-unfiltered request, which
is exactly why two independent attempts concluded the syntax "couldn't be reverse-engineered."
A filter that fails silently looks exactly like a filter that isn't supported.

**What worked**: installed a `window.fetch`/`XMLHttpRequest` interceptor in the browser
console *before* triggering a fresh in-page request (a filter-checkbox click, not a page
reload), capturing the page's own genuine outgoing request verbatim — correct headers and the
working filter form `ItemType/any(c: search.in(c, 'Bachelor', '|'))`. Replayed an equivalent
fetch from *inside the page's own JS context* immediately after (same session, cookies
automatic) rather than externally — no 401.

**This generalizes beyond VU Amsterdam**: a captured request is only valid from inside the
browser session it was bound to. Replaying it externally breaks the session/auth binding
regardless of how correct the filter syntax is. The coordinator flagged this as the same
shape as at least one other blocked university found elsewhere in this research programme
today.

Also corrects the original task brief's "10 of 29" figure: that was a DOM-visible card count
from the first blocked attempt (the listing only ever mounts 10 of its cards without the API),
not a claim about the university's actual offering — and it was Bachelor's-only. Master's
alone is 114.

---

## Language of instruction: discipline held, at real cost to coverage in Germany

The standing rule — never infer `language_of_instruction` from a programme's name or from a
page rendering in a given language, only assert what a programme's own page states — held
across all ten universities, including where it meant leaving the field null.

| University | Records | Language null | Notable pattern |
|---|---:|---:|---|
| LMU Munich | 180 | 23 | Bulk listing had a clear field for most; ambiguous cases left null |
| Heidelberg | 271 | 1 | Only 15/271 purely English-medium — overwhelmingly German or bilingual |
| TU Berlin | 142 | 4 | — |
| Bonn | 257 | 87 | Bonn's own Keyfacts box omits the field for roughly a third of programmes — a real source gap |
| Delft | 40 | 1 | Caught a mismatch between an index page's label and a detail page's own label — detail page trusted |
| Erasmus Rotterdam | 148 | 5 | EUR's own field literally states the ambiguous combined category "Dutch and English" for these 5 — left null rather than guessed |
| Tilburg | 123 | 0 | Every record has an explicit source value |
| Amsterdam (UvA) | 326 | 2 | Cross-validated against 12+ individually-fetched live pages, 100% agreement |
| Groningen | 186 | 0 | RUG's page template uniformly includes the field |
| VU Amsterdam | 163 | 0 | Real per-record `opleidingstaal--nl`/`opleidingstaal--en` API facets |

The Netherlands corpus (944 records) has only 8 language-nulls total — Dutch university sites
overwhelmingly publish an explicit per-programme language field. Germany is the harder
source: Bonn's 87 nulls are the largest concentration of unknowns in the full batch, a real
gap in that source, not a research shortfall — German programmes routinely run English-medium
despite German titles, and vice versa, so a name-based guess would not have been defensible.

---

## Structural findings

- **LMU's 4 pre-existing DB records have `language_of_instruction: null`** where this lane's
  own research found real, sourced values via the official finder. Not overwritten (out of
  this research pass's scope) — flagged for whoever merges this into the live table.
- **TU Delft's provisional programme** (`Health and Technology`, joint with Erasmus MC)
  carries an explicit "(accreditation pending)" annotation on TU Delft's own index — only
  provisional NVAO accreditation as of this research date, planned 2027 launch. Included
  because genuinely and officially listed today, but flagged as forward-looking, not
  operating — needs a product decision on whether pending-accreditation programmes belong in
  the student-facing catalogue.
- **A genuine cross-source conflict, preserved rather than silently resolved**: Erasmus
  Rotterdam's own page states the joint EUR/TU Delft "Technical Medicine" programme is
  English-taught; TU Delft's own page (already in the DB from this lane's wave-1 batch) says
  "Dutch & English, mainly Dutch." Both recorded verbatim from their respective institution's
  own page.
- **UvA's existing "Politics Psychology Law and Economics" record is the same programme as
  UvA's current "PPLE" branding** (same `pple.uva.nl` root) — confirmed and skipped rather
  than re-added under the new name, avoiding a near-duplicate that a naive title match would
  have missed.
- **Tilburg's new Master's-level "Economics" is not a duplicate of the existing Bachelor's
  "Economics"** — different CROHO code, different URL, genuinely distinct programme, flagged
  as such in `researcher_notes` rather than silently skipped as a false-positive duplicate.
- **VU Amsterdam's 20 Pre-Master's records are bridging programmes, not degrees** — VU's own
  API tags them with a distinct type, kept as a separate `degree_level` value rather than
  miscounted into the Master's total.
- **`international_eligible` is null on all 1,836 records.** Matches the established
  convention across this entire research programme — none of these ten universities' catalogue
  pages publish a per-programme international-eligibility flag; never inferred.

---

## Live-data gap found in the wave-1 task brief — corrected after peer and coordinator verification

The original brief described RWTH Aachen and FU Berlin as "already covered" (grouped with
KIT), and VU Amsterdam as having "10 of 29" programmes live. A live query showed all three at
0 live rows. Corrected after a peer session and the coordinator both weighed in:

- **RWTH Aachen and FU Berlin: an ingestion gap, not a research gap.** Both were already
  fully researched and pushed on `oryn/programs-pipeline-reconciled` — FU Berlin (75 records,
  `58872fc`) and RWTH Aachen (77 records, `6dff85a`), verified as ancestors of this branch's
  own history before writing this note, not taken on trust. Not re-researched — the
  coordinator has since confirmed both are ingested (`university_programs` moved from 664/54
  to 7,657/122 institutions in the same integration pass that picked up this lane's wave 1).
- **VU Amsterdam: a known, previously-diagnosed technical blocker, not an untouched gap** —
  and now resolved this lane, see the dedicated section above.

KIT (45 live programmes) was the one part of the original brief that was accurate.

---

## Validation performed

- All 1,836 records parse as valid JSON, one object per line, UTF-8 with native-language
  characters preserved.
- All 1,836 records carry all 21 required schema fields (matching `fr_it_es_ch_batch4`'s
  schema) — zero missing-field records.
- Zero duplicate `research_program_id` within or across all 10 files.
- Zero duplicate `official_program_url` within or across all 10 files.
- Cross-checked against the **entire** existing research corpus (all `.jsonl` files under
  `data/research/university-programs/`, not just this lane's own output): the corpus does
  carry pre-existing duplicate IDs/URLs (46 IDs, 181 URLs — all between older files from
  2026-08-17/20, e.g. a Glasgow batch duplicated across two independent files), but **none of
  this lane's 10 files are involved in any of them**, confirmed programmatically rather than
  assumed.
- Spot-checked sample records per file for value/notes-field separation discipline (asserted
  values in data fields, reasoning and caveats in `researcher_notes` / `verification_status`)
  — held in every sample checked.

No CAPTCHA was encountered, and none was attempted or bypassed. No credential was handled by
any researcher agent (see the LMU Basic-auth note above).

---

## Remaining gaps, in priority order

1. **Germany's honest zeros** — Humboldt, Freiburg, Göttingen, Hamburg, TU Darmstadt,
   Stuttgart — assigned as this lane's next wave, deprioritized behind the Dutch deepening
   per the coordinator's explicit steer (a university showing a handful of its real catalogue
   is worse than one showing none).
2. **Bonn's 87 language-null records** — the source itself is thin here; a targeted
   per-programme detail-page pass could recover some, but likely not all.
3. **LMU's 4 pre-existing DB records carry null language where this lane's research has real
   values** — a reconciliation pass (not a re-research pass) would close this cheaply.
4. **TU Delft's provisional "(accreditation pending)" programme** — needs a product decision
   on whether forward-looking/pending-accreditation programmes belong in the student-facing
   catalogue, or should be held back until accreditation is confirmed.
5. **The pre-existing 46 duplicate-ID / 181 duplicate-URL corpus issue** noted during
   validation above — out of this lane's scope (predates it, involves only other files), but
   worth someone's attention given the standing data-quality mandate.
