# Description vs. organization mismatch sweep — 2026-09-03

Assigned by the CEO session after 6e's organization-fill pass found roughly 1-in-5 of 84
newly-filled records had a prestige-brand-vs-real-operator mismatch (ISSOS marketed under
St Andrews/Cambridge/Yale but privately run; "Greenwich Olympiad" with no Greenwich
involvement; "UNAT" not the UN). Split of labor: 6e owns `organization` and `cycle_status`;
this pass owns `description` — sweep prose for the same defect class, fix what's in-lane,
flag what isn't.

**Result: 4 description-side fixes staged** (SQL, not applied —
`data/research/opportunities/description_org_mismatch_sweep_2026-09-03.sql`), **plus 2
findings that belong to 6e's field, not mine, flagged below rather than fixed.**

## Method

216 of 282 active opportunities have `organization` filled. First pass: a word-boundary
regex sweep for ~35 well-known university/UN/Turkish-institution names in `description`,
checked against `organization` *not* containing that same name:

```sql
with tokens(tok) as (values ('Harvard'),('Stanford'),('MIT'), ... )
select o.id, o.title, o.organization, t.tok, left(o.description, 260)
from public.opportunities o
join tokens t on o.description ~* ('\y' || t.tok || '\y')
where o.status = 'active' and o.organization is not null
  and o.organization !~* ('\y' || t.tok || '\y')
order by o.title;
```

~24 hits, read individually against full description text. All but one were false
positives on inspection: same-entity abbreviations (org "California Institute of
Technology" vs. description "Caltech" — same thing), city/neighborhood name collisions
("Cambridge, MA" the city, "Greenwich Village" the neighborhood — not the university), and
descriptions that already correctly distinguish venue from operator (Immerse Education's
"held at Cambridge, Oxford and London" is true and non-misleading, since Immerse never
claims those universities run it; same pattern for Sutton Trust, NSLC, NYLF/Envision,
Telluride, World Scholar's Cup's Yale-hosted finals). One hit — Marshall Society, below —
was real, but the *organization* field is the one that's wrong, not description.

Zero real description-side contradictions came out of that pass against a *correctly*
filled organization. The actual finds were somewhere else: a second, narrower sweep for the
literal "two unrelated programs' text spliced together" shape — the exact "student reads
the sentence, not the column" risk the brief warned about — targeted the 35 active records
whose description is still in the old raw pipe-delimited scrape format
(`description ~ '\|.*\|.*\|'`, never rewritten into prose). Unrewritten scrape text is where
contamination survives; the polished-prose records from earlier research passes had
already had this kind of thing caught and cleaned. All 35 were read in full. 4 had real
cross-institution splicing or duplication.

## Fixed (staged, description-only)

All 4 cross-checked first against the existing 2026-09-02 organization-research files,
since three of the four had already been independently resolved there for `organization` —
this pass only had to close the gap those files explicitly left open.

1. **`3c4cbeb7` "Pre-College Program"** — `official_url` is IE University's own Madrid/
   Segovia page; `organization_research_verified_leads_2026-09-02.sql` already staged
   `organization = 'IE University'` (unapplied). Description's tail was a verbatim fragment
   from an unrelated Koç University program ("Koç University | Finansal Muhasebe, İnsan
   Hakları, Siyaset Bilimine Giriş"). Truncated to the IE-only content.
2. **`f8fc69c2` "Trinity College London, Ireland"** — `official_url` is tcd.ie (Trinity
   College *Dublin*); `organization_research_verified_leads_2026-09-02.sql` already staged
   `organization = 'Trinity College Dublin'` (unapplied) and its own note already flagged
   the title's "London" as wrong but explicitly out of that pass's scope. Description
   spliced in a full paragraph of unrelated University of Amsterdam / UvA Summer School
   content. Truncated to the Trinity-only content. **The title is still wrong and still
   unfixed by anyone — see below, it's neither my lane nor clearly 6e's.**
3. **`8e5c10af` "POLIMI 2026"** — `official_url` is techcamp.polimi.it;
   `organization_backfill_2026-09-02.sql` already staged `organization = 'Politecnico di
   Milano'` (unapplied). Description's tail named Modul University Vienna and the
   University of Sussex, neither connected to POLIMI's own TECHCAMP. Truncated to the
   POLIMI-only content.
4. **`483c0af4` "Winchester College - Discover Summer Program"** — different shape: not a
   splice of another institution, but the record's own content duplicated verbatim (the
   ingest scrape ran twice into the field), second copy cut off mid-word. Kept one copy,
   dropped the repeat and an orphaned "US" token at the seam that isn't decipherable out of
   context. **Organization here is contested between two unapplied 09-02 files and not
   something this pass resolved — see below.**

## Flagged for 6e / CEO, not fixed here

**The Marshall Society Essay Competition (`5f7ef5d4`)** — the inverse of the brief's
assumption: description is already correct and `organization` is the one that's wrong.
Current `organization`: "The Marshall Society". Description's own text (already
carefully researched, not touched by this pass): *"the Marshall Society itself is a
genuine University of Cambridge student economics society, but the competition sponsor,
**Cambridge Global Connect**, is a separate for-profit education company (a subsidiary of
Oxbridge Global Connect) that originated at Cambridge rather than a university-run
program."* If the description is right, `organization` should name the actual sponsor
(Cambridge Global Connect), not the affiliated-but-non-operating student society — the
same ISSOS/Greenwich-Olympiad shape the brief opened with, just with the error on the
other field. Not staged here since `organization` is 6e's.

**UNAT — "Stanley Prep for Educational Excellence" (`c6b985f9`)**, `organization` still
null — a heads-up, not a finding I could fully resolve myself. Its title is "UNAT (United
Nations Advanced Training)" and its official_url is `stanleyprep.com`. A sibling record
already in the catalog — **"UNO - United Nations Online" (`31856863`)**, same operator,
`organization` already correctly "Stanley Prep" — carries the disclosure UNAT's own
description currently lacks: *"NOT an official United Nations program, though
participants do meet UN-affiliated diplomats."* When 6e reaches UNAT, the same operator
and very likely the same disclosure apply; flagging now so it isn't re-researched from
scratch.

**Winchester's organization is internally contested, unresolved by either staged file**:
`official_url_provenance_fixes_2026-09-02.sql` stages `organization = 'Winchester
College'` with a `winchestercollegesummerprogramme.com` URL; `organization_backfill_
2026-09-02.sql` stages `organization = 'Discovery Summer (independent provider; Biltur is
a Turkey-based enrollment agency, not the operator)'` for the *same row*. Neither is
applied. Worth resolving before either lands, since they disagree on which entity actually
runs the program — exactly the fact this whole sweep exists to get right.

**Trinity College Dublin's title still says "London"** — already noted as out-of-scope by
the 09-02 organization pass, still true for this pass (title is neither `description` nor
`organization`). Sitting unowned between two lanes; someone should claim it.

## Adjacent observations, not acted on (different lane: dedup / official_url)

Noticed while reading the 35 raw-scrape records; not this pass's field, not fixed:

- **`d12506f1` / `a7a89e1e`** — two rows for the same Lehigh University Iacocca Global
  Entrepreneurship Intensive, different years/phrasing. Likely a dedup pair.
- **`30436a92` / `dc762fce`** — two rows for the University of Edinburgh's Pre-University
  Summer School, same shape.
- **`8f6e438f` (Hochschule Bremen), `14db7109` (Maastricht), `a7a89e1e` (Lehigh)** —
  `official_url` points to an unrelated page (a different degree program, a third-party
  aggregator, a random admissions-event page) rather than the actual program described.
  Traceability gap, but an `official_url` fix, not a `description` one.

## Why the yield reads the way it does

The word-boundary sweep across all 216 organization-filled records turned up far fewer
real contradictions than the brief's framing implied — because the earlier S5/S6/S7
research passes already rewrote most descriptions into careful, well-hedged prose that
correctly distinguishes venue/instructor/partner mentions from claims of operation
(Immerse Education, Sutton Trust, NSLC, World Scholar's Cup all pass this check cleanly).
The real contamination survives specifically in the ~35 records nobody has rewritten yet
(still raw pipe-delimited scrape text) — that's where all 4 fixes and both flags came
from. A next pass aiming to find more should target unrewritten-scrape records specifically
rather than re-running a broad token sweep across the whole catalog, which mostly
re-confirms already-careful prose.
