# The evidence gate is now blocking live HTTP 200 fetches

**2,385 Canadian programme records blocked, 2,097 of them wrongly. Written 2026-08-22 after
ingesting the 1,266 that passed. Nothing was widened; this is for the founder to decide.**

## What the gate rejected

`looksPageConfirmed()` in `lib/acquisition/source-authority.ts` reads a record's
`verification_status` prose and decides whether it describes a confirmed fetch. Records it
rejects come back as `insufficient_evidence` with the detail *"reads as a search result, not a
confirmed fetched page."*

Here is what it said that about tonight, verbatim from the records:

> **Université de Montréal** — "Retrieved directly from Université de Montréal's own official
> admissions site (admission.umontreal.ca), which returned HTTP 200…"

> **Queen's** — "Retrieved by direct HTTP fetch (curl with a standard desktop-browser User-Agent
> string) of this program's own dedicated page…"

> **McMaster** — "Retrieved live from McMaster's official Acalog academic calendar
> (academiccalendars.romcmaster.ca), 2026-2027 Undergraduate Calendar…"

> **Western** — "Retrieved 2026-08-22 from Western's official Program Finder data feed
> (welcome.uwo.ca/data/program-finder.json)…"

> **Alberta** — "Retrieved from the University of Alberta's official Calendar 2026-2027…"

These are live, direct, same-day fetches of each programme's own page on its own institution's
domain, several stating the HTTP status explicitly. **They are stronger attestations than the
word "verified" on its own**, and the gate rejects all of them because they do not contain the
substring it matches on.

## Why this is different from the decision that said "do not widen"

`docs/handoffs/program-evidence-gate-vocabulary-decision.md` investigated 493 UvA and VU records
and concluded the gate should **not** be widened. That conclusion was correct **for those
records**: the word "confirmed" in them modified the *page's rendering architecture*, not the
programme fact, so accepting it would genuinely have lowered the bar.

That reasoning does not reach these. "Retrieved by direct HTTP fetch of this program's own
dedicated page" is not ambiguous and is not describing something else. **The gate is not
protecting an evidence standard here; it is matching a vocabulary.**

The UvA/VU lane went on to prove the point from the other side: rather than widen anything, it
re-fetched all 489 records, re-attested from the results, and they passed the *unmodified* gate.
The data had been accurate all along and was merely unreadable to a prose matcher.

**That escape route is not available for most of these.** McGill is behind an Azure WAF;
McMaster and Western block ClaudeBot by name in `robots.txt`. Re-fetching to satisfy the gate
would mean crawling sites that have said not to.

## The one genuine rejection

**McGill's 288 records should stay out**, and the gate is right about them for the right reason.
They are sourced from the Internet Archive's capture of the 2024-2025 eCalendar because McGill's
live site is WAF-blocked — and McGill's own `robots.txt` designates `archive.org_bot` as the
sanctioned route while disallowing everyone else. Honest sourcing, correctly disclosed, and
genuinely not a live confirmed fetch. The gate saying so is the gate working.

## Counts

| | records | disposition |
|---|---:|---|
| Toronto, UBC, + parts of Alberta and Western | **1,266** | ingested |
| Montréal, Queen's, McMaster, most of Western and Alberta | **2,097** | blocked, **wrongly** |
| McGill | **288** | blocked, **correctly** |

Live programmes after the partial ingest: **14,457** across **143** universities.

## The decision

This is the third independent demonstration of the same problem, now spanning three continents:
493 Dutch records, ~2,100 Canadian, and separately Dartmouth's 53 blocked by the *domain* half of
the same file for a registrar-contracted catalogue platform.

Three options, and the middle one is the recommendation:

1. **Widen the vocabulary.** Cheapest, and the previously-rejected option. Still wrong for the
   same reason it was wrong before — a longer list of accepted words is still a prose matcher.

2. **Stop matching prose. Add a structured field.** The research contract already asks for
   retrieval method and HTTP status in several places; a `retrieval_method` enum
   (`live_fetch` / `browser_render` / `archived_capture` / `search_summary`) with the status code
   alongside would let the gate check a *fact* instead of parsing an essay. Records would then
   pass or fail on what actually happened. This is a contract change plus a migration plus a
   corpus backfill — real work, and the only version that ends the problem rather than moving it.

3. **Leave it and accept the loss.** ~2,600 verified records stay out across three lanes' work.

Nothing has been changed. `looksPageConfirmed()` is untouched, the 1,266 that passed on their own
merits are live, and the corpus files are intact for whenever this is decided.
