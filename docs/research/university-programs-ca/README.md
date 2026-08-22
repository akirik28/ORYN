# Canada Programme Catalogue — Nine Universities

**Note (2026-08-22): a ninth university, Ottawa, was added after this document's original eight
by a separate lane (RES-R1) under a separate mandate — BASORG-scoped "zero DB coverage AND zero
research corpus" targeting by live QS 2027 rank, not the coordinator's originally-named eight.
The body text below through "Remaining gaps" describes the original eight lane's own work exactly
as that lane wrote it; Ottawa's own method is documented in its own section near the end, clearly
separated rather than blended into the eight-university narrative it wasn't part of.**

## Why this lane exists

Baseline before this lane, verified live in the DB before any research began: Waterloo held
105 programme records; all other 27 Canadian universities held zero. The coordinator assigned
research-only coverage (no DB writes, no migrations — commit and push incrementally) for eight
named institutions, in priority order, "where international students actually apply": Toronto,
UBC, McGill, McMaster, Alberta, Queen's, Western, Montréal.

Three traps were named going in, because they had already cost real records elsewhere in this
project: admission in Canada is provincial, not national (OUAC/Ontario, EducationPlannerBC/BC,
CEGEP/Québec — there is no single national counterpart to UCAS or Parcoursup); Québec
institutions publish primarily in French while McGill and Concordia are English-medium, so
`language_of_instruction` had to come from per-programme evidence only, never inferred from
province or reputation; and co-op variants are distinct programmes, not duplicates — a
distinction that had already cost real records four times in two days on other lanes before this
one started. That third trap turned out to need more nuance than "distinct programmes" implied;
see below.

## Verified counts

| Institution | Records | File | Commit |
|---|---|---|---|
| Toronto | 635 | `ca_programs_toronto_2026-08-22.jsonl` | `524f573` |
| UBC | 546 | `ca_programs_ubc_2026-08-22.jsonl` | `cdc0fbf` |
| McGill | 288 | `ca_programs_mcgill_2026-08-22.jsonl` | `130b053` |
| Montréal | 679 | `ca_programs_montreal_2026-08-22.jsonl` | `ee698b0` |
| Queen's | 337 | `ca_programs_queens_2026-08-22.jsonl` | `02c2c42` |
| Alberta | 179 | `ca_programs_alberta_2026-08-22.jsonl` | `a6f8a3a` |
| McMaster | 432 | `ca_programs_mcmaster_2026-08-22.jsonl` | `f2d5dfc` |
| Western | 555 | `ca_programs_western_2026-08-22.jsonl` | `68c58d7` |
| **Subtotal (original eight)** | **3,651** | `data/research/university-programs/ca_programs_*.jsonl` | branch `oryn/ca-programmes` |
| Ottawa (RES-R1, separate lane/mandate — see its own section below) | 276 | `ca_programs_ottawa_2026-08-22.jsonl` | branch `oryn/res-r1-au-programmes` |
| **Total (nine)** | **3,927** | | |

Note on McMaster's 432 (original eight, table above): sourced correctly per this lane's own
robots.txt finding below (calendar host is unblocked), but BASORG separately determined the
calendar host fails a *source-authority* gate unrelated to crawl-permission — a different check
from the one this document verifies. McMaster's 432 exist as research but are not DB-eligible
pending a founder decision on that gate. Not this lane's finding; recorded here because a reader
of the table above would otherwise reasonably assume "researched cleanly" means "ingestion-ready."

Schema: the same 21-field research record used across the entire DE/NL/UK/US/Turkey/priority-country
corpus (`research_program_id, university_name, university_country, university_official_domain,
program_name, degree_level, degree_type, faculty_or_school, subject_hint, official_program_url,
admissions_url, source_url, source_type, language_of_instruction, duration, campus, delivery_mode,
international_eligible, researched_at, verification_status, researcher_notes`). Every file was
schema-validated and deduplicated by `research_program_id` before commit — zero mismatches, zero
duplicate IDs across all eight files. None of this data has been ingested into the live DB; the
coordinator has taken ownership of that step.

This document is the record of three things asked to outlive the raw rows: a co-op taxonomy, a
crawler-blocking posture specific to Canada, and an infrastructure failure pattern. It also
records two sourcing judgments the coordinator reviewed and confirmed mid-lane, since the next
Canadian research pass will hit the same shapes again.

## Co-op taxonomy: the same word means a different database shape at every institution

The working assumption — "co-op is a variant, treat it as a distinct programme record, don't
collapse it into its base programme" — held up, but not uniformly. Re-checking the committed
records directly (not the research agents' summaries) turned up three distinct *mechanisms*,
and two of the eight institutions use more than one mechanism internally. Verifying per
programme, every time, was not caution for its own sake — it changed the record shape in
practice.

**Mechanism 1 — same programme, a same-record flag.** UBC's official undergraduate Program
Finder exposes co-op as a fact-panel attribute (`Co-op=Yes` / `Co-op=No`) on one programme page,
not as a separate listing. Confirmed exhaustively for UBC: zero of the 196 programmes in UBC's
own catalogue carry "Co-op" in their title. Example record (Ancient Mediterranean and Near
Eastern Studies, BA): `researcher_notes` states plainly that UBC's finder "does NOT list Co-op
as a separately titled/admitted program anywhere in the 196-program catalogue... so no
co-op/non-co-op duplicate-record split was made or needed for UBC." One record per programme,
full stop.

**Mechanism 2 — a fully separate programme, its own code, even at the sub-option level.**
Alberta's Chemical Engineering catalogue lists a base `Bachelor of Science in Chemical
Engineering` (poid 110438) and, independently, a parallel `... Co-op` family with its own poid
range covering the same named options (Biomedical, Bioprocessing & Biomanufacturing, Clean
Energy, Computer Process Control, Oil Sands) — non-co-op and co-op versions of the *same option*
are two different catalogue entries with two different admission pages. Collapsing these would
have silently deleted a real distinction Alberta itself maintains down to the sub-option level.

**Mechanism 3 — both of the above, inside one institution, decided per programme.** McMaster
does not pick one convention. Computer Science bundles co-op and non-co-op into a single title
and record ("Honours Computer Science, Honours Computer Science Co-op (B.A.Sc.)", poid 33006) —
`researcher_notes` quotes the source directly: "the page describes a single curriculum with no
separately stated co-op admission/GPA requirement," so it was kept as one record on the source's
own authority. Sustainable Chemistry, in the same catalogue, does the opposite: `Honours
Sustainable Chemistry (B.A.Sc.)` (poid 33342) and `Honours Sustainable Chemistry Co-op (B.A.Sc.)`
(poid 33343) are two fully separate pages with two separate poids. Toronto shows the identical
split across campuses rather than across subjects: Accounting at UTM carries co-op as an
in-record flag ("The university flags a work-integrated learning (co-op) option available within
this program"), while International Development Studies at UTSC is listed as its own titled,
separately admitted programme — `International Development Studies (Co-op) (HBA)` and `(HBSc)`,
each with its own dedicated URL, distinct from the non-co-op title. Inheriting McMaster's
Computer Science answer for its own Sustainable Chemistry programme would have been wrong; so
would inheriting Toronto's Accounting answer for its own International Development Studies
programme. Neither is a lane-level convention — it is a per-programme fact.

**A fourth trap, adjacent to co-op but distinct: Queen's inverts which variant is open.**
Four Queen's Computing plans (Cognitive Science, Computing and Mathematics, Computing, Software
Design) each carry a base plan code (`COGS-S`, `COMA-S`, `COMP-M`, `SODE-S`) and a parallel
Professional-Internship-integrated code (`COGS-I`, `COMA-I`, `COMP-I`, `SODE-I`). The natural
assumption is that an internship/co-op track, if anything, would be the one still accepting
students. At Queen's it is the reverse: all four `-I` plans carry the identical official
footnote, "No new students will be admitted to the [code]-I Plan," while every one of the
matching base `-S`/`-M` plans remains open. This was caught and recorded per plan, from the
calendar's own footnote, rather than assumed from the pattern seen at the other seven
institutions.

The lesson for the next lane is not "expect five shapes." It is that co-op status is a
per-programme fact with no reliable institutional default — confirmed twice over, since two of
the eight institutions researched here disproved their own internal consistency.

## AI-crawler-blocking posture: Canada is a different environment from Europe

Across the entire DE/NL/UK/priority-country research corpus that preceded this lane, zero
institutions blocked AI crawlers by name. In this batch of eight Canadian universities, three
did:

- **McGill** — `mcgill.ca` presents an Azure WAF bot-mitigation interstitial ("One moment, we're
  checking you're not a bot") to automated fetches, and its robots.txt carries no blanket
  AI-crawling permission. Separately, a direct read of `mcgill.ca/robots.txt` (checked
  independently of the per-record research notes, not just accepted from an agent's summary)
  found a path-scoped carve-out: `User-agent: archive.org_bot` / `Allow: /study/*`, sitting
  immediately above a general `Disallow: /study/*` rule for everyone else. That carve-out only
  covers the `/study/*` path — most eCalendar programme pages live there, but not all, so it does
  not blanket-license every McGill record sourced via Wayback. Where it applies, it reframes
  Wayback retrieval as McGill's own sanctioned historical-access route rather than a corner cut;
  see the McGill judgment call below for how this was actually used.
- **McMaster** — `future.mcmaster.ca`, the marketing-facing future-students site, blanket-disallows
  a list of roughly ten named AI/bot crawlers in its robots.txt. `academiccalendars.romcmaster.ca`,
  McMaster's separate official Acalog calendar system, carries no such disallow. Every McMaster
  record in this batch was sourced from the calendar host, not the blocked marketing host — the
  research notes state this explicitly per record: "academiccalendars.romcmaster.ca's own
  robots.txt carries no AI/bot-specific disallow, unlike future.mcmaster.ca which does and was
  not used."
- **Western** — `westerncalendar.uwo.ca`'s robots.txt "explicitly disallows the ClaudeBot user
  agent site-wide with no carve-out." Western's own official Program Finder feed
  (`welcome.uwo.ca/data/program-finder.json`, itself unrestricted) publishes a link to specific
  westerncalendar.uwo.ca pages as the citation Western directs applicants to. That URL was
  recorded as `official_program_url` because it is what Western's live feed itself publishes, but
  the host was never independently crawled — see the Western judgment call below.

The governing rule applied in every one of these three cases, by name, in every subsequent
research prompt this lane wrote: **find the permissive alternative; don't route around a block.**
In all three cases a legitimate, unblocked path to the same information existed — a different
host (McMaster), a citation from a different, permitted host (Western), or a scoped Wayback
carve-out plus a WAF interstitial that made the block itself unambiguous (McGill) — and the block
itself was never bypassed, spoofed, or ignored.

**For the next Canadian lane:** expect this posture rather than discover it. At minimum, check
robots.txt on both the marketing-facing "future students" domain and the separate academic-calendar
domain before assuming either is representative of the other — McMaster alone shows they can
disagree.

**Ottawa (added later, RES-R1 lane): clean, no block found.** `catalogue.uottawa.ca`'s robots.txt
disallows only administrative/infrastructure paths (`/admin/`, `/en/search/`, `/en/archives/`,
etc.) — nothing touching `/en/undergrad/` content, no AI-crawler-specific rules, no crawl-delay.
Extends this section's running count to 4 of 9 Canadian universities checked with a
crawler-blocking posture (McGill, McMaster's marketing host, Western) against 5 clean (the
original eight's other five, plus Ottawa).

## Agent stalls: three of eight dispatches, zero output, one fix that held

Three of the eight research dispatches in this lane — Alberta, McMaster, Western, each on first
attempt — stalled with "no progress for 600s (stream watchdog did not recover)" and produced no
output file at all. The coordinator confirmed this matches a total of eight such stalls across
the session's parallel lanes tonight, with a root cause diagnosed elsewhere: nested sub-agent
spawning, where a dispatched agent spawns its own sub-agents and blocks waiting on one slow step
instead of making forward progress.

The fix, applied identically on retry for all three: re-dispatch fresh (not a continuation of the
stalled run — no partial output existed to continue from in any of the three cases), with an
explicit instruction added to the prompt not to let any single slow step block forward progress,
and to write output records incrementally rather than only at the end. All three retries
completed cleanly with no further stalls.

**For the next lane:** build the incremental-write instruction into the research prompt template
from the start, rather than adding it only after a stall. It cost nothing on the five dispatches
that never stalled, and it was the entire fix on the three that did.

## Two sourcing judgments, reviewed and confirmed mid-lane

Both of the following were flagged to the coordinator rather than decided unilaterally, because
each set a precedent wider than one institution.

**McGill's Wayback sourcing.** McGill's live eCalendar is WAF-gated for automated access, so the
majority of McGill records in this batch were sourced from the Internet Archive's capture of the
2024–2025 eCalendar cycle — one cycle behind the live 2026–2027 catalogue, which itself had only
sparse Wayback coverage at research time. Flagged as a real trade-off, not a silent
approximation: McGill's 288 records are the thinnest of the eight relative to its actual
catalogue size, precisely because of this constraint. The coordinator confirmed keeping the
Wayback-sourced records as-is, with the generalizable reasoning that programme data (a
programme's name, degree, and department rarely change year to year) can tolerate a
one-cycle-old, fully-archived source in a way that requirements or deadline data — which change
every cycle by definition — could not.

**Western's citation-URL pattern.** 263 Western records carry a `westerncalendar.uwo.ca` URL in
`official_program_url` despite that host's robots.txt disallowing ClaudeBot outright. Verified
directly, not assumed from the research agent's characterization: the URL value was copied
verbatim from Western's own permitted, unrestricted Program Finder feed — it is what Western
itself publishes as the authoritative link for that programme — and the westerncalendar.uwo.ca
host was never fetched or crawled to obtain it. The coordinator confirmed this was the correct
call, with a clean supporting rule: **robots.txt governs crawling, not referencing.** A recorded
citation to a URL a permitted source already published is not a crawl of the disallowed host.
The coordinator's added point: it is a student's own browser, not a bot, that will actually load
the link when clicked from within Oryn — the disallow was never at risk of being violated by
storing the citation.

## Validation performed

Every one of the eight files was schema-checked against the 21-field contract and deduplicated by
`research_program_id` before its commit — zero schema mismatches, zero duplicate IDs, across all
3,651 records. Large duplicate-`official_program_url` clusters at Toronto, Alberta, and Western
(160+ each) were individually spot-checked by pulling the full records, not just trusting a
summary count — in every case confirmed as genuine degree-family bundling on one shared
institutional page (e.g. multiple degree/subject combinations listed together), verified via
differing `degree_type`/`program_name` fields, not the lazy single-URL misattribution pattern
seen previously on other lanes (cited there as "Bristol, 62 rows on one URL" and "St Andrews, 87
pointing at a closed cycle's archive"). The co-op-taxonomy and crawler-posture claims in this
document were re-verified directly against the committed JSONL files while writing this handoff,
not reproduced from memory of the original research passes.

## Method: Ottawa (276 records, RES-R1 lane, separate mandate — see the note at the top)

Picked by live QS World University Rankings 2027 verification (4 independent corroborating
fetches, same discipline as the AU package's top-8), among universities with **zero DB rows AND
zero research-corpus files** — a gate added specifically because McMaster's zero-DB-rows turned
out to mean "researched and gate-blocked," not "unresearched," which the naive zero-coverage
check in this lane's own original scoping missed. Ottawa: zero DB rows, zero corpus mentions
outside `university-programs/` (confirmed by grep before starting), clean robots.txt (see above).

**The concentration-component question, and why the answer isn't "exclude Minor/Major":**
398 URLs fetched from `catalogue.uottawa.ca/en/undergrad/` (sitemap-derived, zero classification
decisions in stage 1, per this project's now-standard fetch-then-classify discipline). Census
found 119 titled "Minor in X" / "Major in X" / "Advanced Minor in X" (67 + 50 + 2) — the
Indigenous Studies Major page states outright: *"Please refer to the Academic Regulations for
information on the Honours bachelor's with double major and the Honours bachelor's with major and
minor."* Neither confers a credential alone; both attach to a base Honours Bachelor's.

**This looked, at first, like it should generalize to Montréal's `Majeure`/`Mineure`** (86 records
in the original eight's table above, each with its own `degree_type`/`degree_level` row) — same
English gloss, same surface shape. **It doesn't, and the distinction is worth carrying forward
explicitly because the next lane will hit the same surface shape and reach for the same wrong
generalization:**

- **Ottawa (Ontario concentration model):** *"...information on the Honours bachelor's **with**
  major and minor."* You are already admitted to the bachelor's; the major/minor is a field
  declared within it. Not independently enrolled in.
- **Montréal (Québec *cumul* model):** *"Vous pouvez **aussi cumuler** la majeure avec un ou
  plusieurs programmes... pour l'obtention d'un baccalauréat **par cumul**."* ("You can **also
  accumulate** the major with one or more programs... for a bachelor's **by accumulation**.") You
  enrol in the majeure as its own unit and accumulate separate units toward a degree. The *"aussi"*
  is load-bearing — it is a thing you enrol in, which can *also* be combined with others.

**The working rule, tested per source rather than assumed from an English gloss: include a unit
if it is independently enrolled in and accumulates toward a credential; exclude it if it is a
concentration declared within a credential you are already admitted to.** Applied to all 119 of
Ottawa's individually (not sampled) — 109 hit the concentration-signal language directly in full
text; the remaining 10 got individual review, 9 confirmed by structural identity (bare
compulsory/optional course-list pages, no admission section — same template as the 109, just
missing that exact sentence in the crawled text), and **1 failed the test and was reclassified**:
`Majeure en lettres françaises et Baccalauréat en éducation` states admission to *that combined
unit itself* is suspended — i.e., there is a direct admission pathway to it, unlike a bare Major
or Minor page. It stays, as a combined credential. Final: **118 excluded, not 119** — caught only
by reviewing the excluded population individually; a prefix-based classifier had silently filed
it under "Major" without surfacing it. **Neither Ottawa's exclusion nor Montréal's inclusion is a
defect. Do not "fix" this into consistency in either direction** — a future lane normalizing
Montréal's 86 into exclusions, or Ottawa's 118 into inclusions, would destroy a true distinction
between two different credential systems to make two numbers rhyme.

**Other exclusions:** 2 more URLs collapsed as aliases (`bachelor-social-sciences-major/` and
`bachelor-social-sciences-interdisciplinary-studies/` both redirect-equivalent in content to
`bachelor-social-sciences/`, kept as canonical — UWA alias-pair precedent). 2 more
(`certificate-law/`, `certificate-indigenous-laws/`) are the *same* hub/overview page (byte-
identical opening text) listing several *other* named credentials rather than describing
themselves — neither is a real, distinct credential. One of the credentials that hub page names,
**"General Certificate in Law," has no page of its own anywhere in the 398-URL sitemap** — recorded
here as a documented gap (same shape as RES-V2's UniStart finding on Adelaide), not silently
dropped. Reconciliation: **398 = 118 (components, enrollability-tested) + 2 (alias) + 2 (hub) +
276 (included).**

**French-medium programmes, not forced into an English taxonomy:** Ottawa is bilingual at the
programme level, not just the catalogue UI — a fully French-titled programme
(`Baccalauréat spécialisé en sciences de l'activité physique...`) sits under the `/en/undergrad/`
URL path, so **the URL path is not evidence of language; language_of_instruction is read per
record.** 299 of 398 fetched pages carry an explicit source statement ("This program is offered
in English and in French" / "in French only" / "in English only," etc., 11 distinct observed
phrasings) — recorded verbatim, `field_provenance: explicit_source_field`, left `null` on the 99
without one rather than inferred. Two credentials had no clean equivalent anywhere in the existing
Canada corpus's vocabulary and were **escalated to BASORG rather than minted in-lane**, per the
closed-vocabulary rule: `Licentiate in Law (LLL)` and `Licentiate in Law (LLL) and Honours BSocSc
in International Development and Globalization` — `degree_type` recorded as the source states it;
`degree_level` left `null` pending a ruling.

**Status caveats, structured rather than buried in prose:** a new field, `status_note` (verbatim
source statement, `null` when absent — no enum, since only three shapes have been observed across
this whole package so far and this repo already has two founder-pending items caused by fixing a
vocabulary before the real distribution was known: migration 0057's flat column can't represent
`kilavuz_codes`' one-to-many shape, and `cycle_status` has no slot for the `unknown` 41 records
need). 22 of 276 included records carry one — mostly *"admission... is suspended until further
notice,"* one *"Coming in 2027."* A student browsing a suspended programme with no signal would
see it as open; this field exists so that's queryable rather than only discoverable by reading
`researcher_notes` prose.

**Validation on this lane's own output, not assumed clean:** corpus-wide `research_program_id`
uniqueness — PASS, 276/276 unique, zero collisions against the rest of the corpus. URL
cardinality — **276 records, 276 distinct `official_program_url` values, ratio 1.0, zero
collisions** — checked specifically because Toronto and Western (this same document, "AI-crawler-
blocking posture" section context and the live-DB overlap check that preceded this lane) both
have real URL collisions in their already-ingested data (Western: up to 160 programmes sharing one
generic listing URL) that would have broken a URL-as-identity assumption if reproduced here.

## Remaining gaps, in priority order

1. **Not yet ingested.** All 3,651 records exist only as committed JSONL on `oryn/ca-programmes`;
   none are in the live DB. Ownership of ingestion was explicitly taken by the coordinator.
2. **McGill is one calendar cycle behind and thin relative to its real catalogue** (288 records,
   the lowest of the eight relative to McGill's actual programme count), a direct consequence of
   the WAF gate described above. A future pass should re-check whether `mcgill.ca`'s live gate or
   Wayback's coverage of the 2026–2027 cycle has improved before treating 288 as complete.
3. **Alberta has the lowest raw count of the eight (179).** Not diagnosed further in this pass —
   worth a direct check on whether this reflects Alberta's actual catalogue size or incomplete
   coverage, before a downstream consumer assumes it is exhaustive.
4. **Montréal's internal co-op ("stage") track claim, made during the original research pass, was
   not independently re-verified against the committed file while writing this document** — unlike
   the UBC/Alberta/Toronto/McMaster/Queen's examples above, which were all re-checked directly.
   Treat that one claim with correspondingly lower confidence until it is spot-checked the same
   way.
5. **No graduate-vs-undergraduate coverage audit was performed across the eight files.** This
   lane did not track the split, and no claim is made here about relative completeness between
   levels.
6. **Ottawa: `Licentiate in Law (LLL)` and its combined BSocSc variant have no `degree_level`**,
   escalated to BASORG rather than mapped in-lane — no clean existing-corpus equivalent found.
   Awaiting a ruling before either record can carry a populated value.
7. **Ottawa: "General Certificate in Law" is a documented gap, not a missing record** — named on
   `certificate-law/`'s hub page, no dedicated page exists anywhere in the 398-URL sitemap. If a
   future crawl of `catalogue.uottawa.ca` finds one, this is the credential it would belong to.
8. **Ottawa: postgraduate coverage was out of scope**, same as every other university in this
   corpus and the AU package before it — the sitemap's 305 `/en/graduate/` URLs were never fetched.

## Calgary — deferred (RES-R1, 2026-08-22): feasibility, not authority

Picked by the same live-QS-rank method as Ottawa (QS 2027, #249 world / #11 Canada, the rank
immediately after Ottawa's #10). DB and corpus gate both clean before starting: 0
`university_programs` rows, `duplicate_status: canonical`, no dedicated corpus file anywhere
(local worktree or any remote branch) — the only two grep hits (a passing mention of "Calgary
Faculty of Veterinary Medicine" inside Alberta's own file, and a shared-application-system
listing in `admissions-systems-v1.json`) confirmed incidental, not coverage.

**The source-authority question — resolved, not the reason this stopped.** Calgary's catalogue
(`calendar.ucalgary.ca/programs/<code>`) is a client-side-rendered SPA whose data comes from a
third-party backend, `app.coursedog.com` (Coursedog, reading Calgary's own PeopleSoft SIS).
BASORG ruled this is **not** McMaster-shaped: the browsable, citable URL is Calgary's own domain
— Coursedog is infrastructure the page fetches from, not the publisher of record, the same way a
Next.js site calling its own `/_next/data/*.json` isn't third-party-sourced. **This becomes
standing policy for the corpus**: client-side rendering backed by a SaaS vendor (Coursedog,
Kuali, Modern Campus, etc.) passes the gate provided the canonical URL a student would cite is
on the institution's own domain and that URL is what gets recorded — a vendor-hosted *publication
address* (McMaster's `romcmaster.ca`) still fails. Querying the vendor API directly was
explicitly prohibited regardless of gate outcome, for a provenance reason distinct from
authority: recording a Calgary URL for data actually fetched from `app.coursedog.com` would be
the same "one field, two sources" defect as Adelaide's international-key finding, just upstream
of it. Approved method was browser-rendering Calgary's own URLs (`retrieval_method:
browser_render`) and letting the page fetch Coursedog the way any visiting student's browser
would.

**What actually stopped it: `calendar.ucalgary.ca` rate-limits well below what 493 browser
renders would require.** `robots.txt` returned HTTP 429 on every check — first attempt, and again
after 8 polls spaced 25s apart (~3.5 minutes of deliberately slow, spaced requests). Most likely
self-inflicted rather than a sign the site is broadly down: a single browser render of the
`/programs` listing alone pulls dozens of sub-resources (JS bundles, the Coursedog API call,
analytics/telemetry beacons), and combined with the posture-check requests this lane made
roughly 50 requests to the domain in 10-15 minutes before the host started responding 429
site-wide, not just on the path being probed. **493 full-page renders would be several thousand
requests against a host that already flagged ~50.** A clean robots.txt would have been permission
to crawl, not permission to crawl at that volume — the two questions are separate, and the volume
one was already answered by the host itself.

**Explicitly not tried, and should not be tried by a future lane either:** changing the request's
user-agent to look like an ordinary browser (evasion, regardless of whether it would work — never
do this in response to a rate limit or a block, escalate instead); retrying at a shorter interval
to "push through" (429 is the host stating the rate itself is the problem, not a transient failure
worth a quick retry — WAF-style limiters generally want backoff in minutes to tens of minutes,
across the whole host, not just the path being fetched); falling back to the vendor API to route
around the slow institutional path (the provenance ruling above is about authority, not
availability — an availability problem does not reopen it).

**Status: deferred, not excluded.** Unlike McGill/McMaster (policy-blocked, do not attempt), the
gate for Calgary is open. A future attempt should retry `calendar.ucalgary.ca/robots.txt` cold
(a fresh IP/session, or simply much later) before assuming anything about current site health,
and if renders proceed, throttle far more conservatively than this lane did on the initial
posture check — real minutes between requests, not seconds, given how quickly ~50 requests
triggered a response here.
