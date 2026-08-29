# Photo Sourcing Batch B — Closeout

**Date:** 2026-08-27
**Scope:** Dry run per Research Freeze COC §10 (Photo Standard). No DB writes, no git commands. Output: `s7photo_corpus_batchB.jsonl` (12 records).

## Environment note
The Browser pane was shared with other concurrent photo-sourcing sessions at start (8 tabs already open on commons.wikimedia.org/upload.wikimedia.org, tab cap reached). Closed one idle tab, opened a dedicated foreground tab (tab-13), and confirmed at least once mid-session that another session was actively navigating a shared tab out from under a pending call (a reused tab's title changed to an unrelated Commons category between two of my calls). All findings below come from navigate+screenshot pairs executed on the dedicated tab after that point; nothing was trusted from a tab I didn't just re-verify myself.

## Results: 8 verified / 2 real gaps / 2 confirmed online-only

### Verified, image proposed (8)
1. **Science Olympiad (Division C)** — NASA-sourced 2004 photo of a regional qualifying round (Gulf Coast Regional, Houston). Public domain. Moderate confidence: entity confirmed via NASA's own caption, not legible in-frame signage; photo is regional-level and 22 years old, not confirmed Division-C-specific.
2. **IYPT** — Brazilian national team photo, IYPT 2004. Rejected a same-uploader 2007 candidate that turned out to be an airport photo, not the tournament.
3. **Genç UPSHIFT** — Host-institution fallback (Turkish Ministry of Youth and Sports HQ building, Ankara). Rejected UNICEF Ukraine's UPSHIFT program photos (same global family, wrong country).
4. **Wharton LBW** — Host-institution fallback (Wharton School building, UPenn campus).
5. **UK Chemistry Olympiad** — Host-institution fallback (Royal Society of Chemistry HQ, Burlington House). Rejected all International Chemistry Olympiad (IChO) results as a related-but-distinct competition.
6. **Erasmus+ Youth Exchanges** — Host-institution fallback (European Commission's Berlaymont building, Brussels). Rejected two mismatches: an elementary-school folklore project tagged "Erasmus+" (wrong age group/activity type), and the classic university-level Erasmus student-exchange photos (a structurally different sub-programme from non-formal Youth Exchanges, and tonally wrong — party photos — for a 14-18 audience).
7. **The Harvard Crimson Global Essay Competition** — Highest-confidence find of the batch. Per the flagged caution, verified affiliation *before* photo search: the competition site's own footer reads "© 2025 THE HARVARD CRIMSON." Then found the actual Harvard Crimson Building (14 Plympton St, Cambridge — the newspaper's real HQ, distinct from Harvard University generally). Filled in the `organization` field with this finding since the input record had it marked "not recorded."
8. **Congressional App Challenge** — Highest-confidence match overall: a student presenting her app to a member of Congress, with legible poster-board text corroborating the scene, used as the illustrating photo on the topic's own Wikipedia article.

### Real gaps — component exists, not found (2)
- **Breakthrough Junior Challenge** — The Foundation's annual televised ceremony (where past winners have been recognized) is real and is documented on Commons in general terms, but no Junior-Challenge-specific photo turned up.
- **Coca-Cola Scholars Program** — An in-person Scholars Weekend plausibly exists, but no photo of it is on Commons. Separately rejected "World of Coca-Cola" museum as a fallback: every candidate there is dominated by Coca-Cola wordmark branding (the brand *is* the museum's subject), which fails the no-logo-dominant rule independent of relevance.

### Confirmed online-only, no candidate (2)
- **Pioneer Research Institute** — Confirmed via the program's own page: fully virtual (seminars + 1:1 mentoring + independent remote research). No residential/campus component.
- **American Journal of Student Research (AJSR)** — Confirmed online-only journal; sole listed address is a generic Pomona, CA office suite, not a distinctive building worth a host-institution photo.

## Methodology notes / judgment calls
- Two records required rejecting a "same family, wrong entity" trap: Genç UPSHIFT (Ukraine's UPSHIFT ≠ Turkey's) and UK Chemistry Olympiad (IChO ≠ UK Chemistry Olympiad). A third, softer version of the same trap applied to Erasmus+ Youth Exchanges (higher-ed Erasmus mobility ≠ non-formal Youth Exchanges).
- "Harvard Crimson" as a bare Commons search term is a naming trap — it resolves almost entirely to Harvard's athletics teams (also nicknamed "Crimson"), not the newspaper. Had to search by the building's street address instead.
- For Coca-Cola Scholars, the logo-dominance problem is structural, not just a search-coverage gap: this brand's own buildings/museum are inherently branding-first spaces, so even a future, more thorough search may not surface a compliant photo without an actual event photo of the Foundation's people/scholars.
- All 5 host-institution fallbacks are explicitly labeled as such in `image_depicts` per the standard, with an honest confidence note in `correct_entity_reasoning` about whether identity rests on in-frame legible signage vs. category/cross-wiki corroboration alone.

## Output
- `s7photo_corpus_batchB.jsonl` — 12 lines, validated as well-formed JSON (python json.loads, one line at a time — 12/12 passed).
