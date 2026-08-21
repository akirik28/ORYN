# Turkish student opportunity research — summary

**Assignment:** find and document real, verified opportunities (research programmes,
competitions, volunteering, youth civic participation, scholarships, entrepreneurship,
internships) for students roughly 14-18 in or from Türkiye — motivated by two live
measurements: Turkey had zero `research`/`internship` category entries in the live
`opportunities` table, and `community_impact`/`leadership` were nearly absent across all
166 tagged opportunities. Assigned by the ORYN multi-agent coordination session, building
on this session's own Turkey admissions-system research (no application file exists in
the domestic YKS pathway — these opportunities are developmental/exploratory value for a
domestic-track student, and the whole profile for a student targeting abroad).

**Result: 24 records across 4 files**, each independently researched and verified against
official organiser sources, held to the standard requested: accuracy > provenance >
freshness > completeness > volume — a handful of genuinely verified records over a large
batch of uncertain ones.

| File | Category focus | Records | Verified current | Other states |
|---|---|---|---|---|
| [`turkey_batch1_2026-08-21.jsonl`](../../../data/research/opportunities/turkey_batch1_2026-08-21.jsonl) | Research / university programmes | 3 | 3 | — |
| [`turkey_batch2_2026-08-21.jsonl`](../../../data/research/opportunities/turkey_batch2_2026-08-21.jsonl) | Competitions (TEKNOFEST, TÜBİTAK) | 8 | 6 | 2 CURRENT_CYCLE_NOT_PUBLISHED |
| [`turkey_batch3_2026-08-21.jsonl`](../../../data/research/opportunities/turkey_batch3_2026-08-21.jsonl) | Volunteering / youth councils | 7 | 3 | 1 HISTORICAL, 1 CONFLICTING, 2 NEEDS_REVIEW |
| [`turkey_batch4_2026-08-21.jsonl`](../../../data/research/opportunities/turkey_batch4_2026-08-21.jsonl) | Scholarships / entrepreneurship / internships | 6 | 4 | 1 HISTORICAL, 1 CURRENT_CYCLE_NOT_PUBLISHED |

Schema (36 fields per record, matching the convention already established by
`leadership_batch*` in this same directory): `canonical_name, aliases, organizer,
organizer_type, organizer_domain_provenance, category, subjects_fields, official_url,
application_url, country, city, delivery_mode, eligible_countries,
international_applicants_allowed, age_range, grade_range, prerequisites, program_dates,
deadline, application_open_date, duration, cost, currency, financial_aid,
selection_process, required_materials, individual_or_team, award_or_output,
latest_verified_cycle, verification_state, source_url, source_title, sources,
retrieved_at, research_notes`. Validated: all 24 records parse as valid JSON, all required
fields present, no duplicate `canonical_name` values across the 4 files (confirmed
directly — batch 1 was corrected mid-research to drop TÜBİTAK 2204-C/D once batch 2 had
already covered them as competitions, avoiding an initial overlap).

## What was found

**Genuine, verifiable opportunities exist across every requested category**, but volume
is real and uneven — some categories (volunteering NGOs' actual under-18 tracks,
internships) are genuinely thin once verified against official pages rather than assumed
from an organisation's general reputation. That thinness is itself an honest finding, not
a research shortfall: several major, well-known organisations (TOG, most of AKUT, most
major scholarship foundations) turned out to be university-only once checked directly,
and are recorded as explicit drops below rather than stretched into false positives.

**Highlights:**
- **Koç University Summer Research Program (KUSRP)** — free, faculty-mentored, genuinely
  international-student-eligible original research.
- **TÜBİTAK 2204-C/D** (Polar Research, Climate Change) confirmed as jointly
  TÜBİTAK/TEKNOFEST-run — a genuine cross-organiser finding, traced from a project-code
  fragment back to TÜBİTAK's own listing.
- **AKUT Vakfı's LABEP** — AKUT's core search-and-rescue association has no lise track at
  all, but a legally distinct sister foundation runs a real 20-week disaster-awareness
  programme for high-schoolers. Finding the right *legal entity*, not just the right name,
  mattered here.
- **İŞKUR's national Staj Portalı** — a government-run internship-matching platform with
  an explicit, separate lise track (real employer contracts, wages, insurance).
- **The gençlik meclisi / kent konseyi ex-officio civic-leadership pathway**: the specific
  statutory citation (Belediye Kanunu 5393 madde 76) could not be confirmed against
  primary legislative text after repeated bounded attempts (mevzuat.gov.tr was
  unreachable — SSL errors and blocked fetches across multiple tries), consistent with a
  prior lane's same experience. But the underlying **fact** — that a gençlik meclisi
  başkanı becomes a natural/ex-officio member of their city's kent konseyi yürütme kurulu
  — is now independently confirmed on two separate municipalities' own official pages
  (Yeşilyurt, Fethiye), which is real, usable evidence even without the specific article
  number attached.

## What was honestly dropped, and why (selected — full detail in each file's
`research_notes`)

- **TOG (Toplum Gönüllüleri Vakfı)** — confirmed university-only (18-24) on its own site;
  its only contact with under-18s is as tutoring beneficiaries, never volunteers.
- **AKUT Derneği's own youth tracks** — Genç AKUT is ages 9-12, AKUT Junior is grades 5-8
  (~10-14), Öğrenci Toplulukları is university-only — none fit 14-18 cleanly.
- **Sabancı Vakfı, Vehbi Koç Vakfı scholarships** — confirmed üniversite-only.
- **Darüşşafaka** — entry point is 4th/5th grade; a 14-18-year-old cannot newly apply.
- **ODTÜ "Mühendislik Yaz Okulu"** — the site itself states 2026 is organised by a student
  radio club, not the university — fails the "genuinely university-run" test.
- **Bilkent AI Summer School** — page unmaintained ("yakında güncellenecektir"), expired
  TLS certificate — not a live current offering.
- **TÜBİTAK 2248, 2249** — real programmes, but 2248 is career mentorship restricted to
  Science-High-School/Olympiad students specifically (not general research access), and
  2249 turned out to be the entrance exam *into* a specific school, not an opt-in
  programme.
- Several GençBizz/Genç UPSHIFT-family entrepreneurship programmes were found but not
  re-recorded — already documented in this session's own `leadership_batch4/5` and
  `night1` files; checked for duplication before writing, not blindly re-added.
- Most "staj" (internship) search results resolved to university-only programmes on
  inspection — a genuinely hard category, reported honestly rather than padded.

## Known date-traps and conflicts caught (not silently resolved)

- A Turkish foundation's (TEV) own site displays a "başvuruları 2 Ekim'e uzatıldı"
  (extended to Oct 2) notice that reads as current on first glance; direct inspection
  showed it's dated 22.09.2025 and refers to the 2025 cycle — excluded, not restated as
  2026. This exact trap recurred exactly as an earlier research pass this session had
  warned it would.
- TÜBİTAK 2204-A/B's most recent cycle concluded April 2026 with no 2026-27 cycle yet
  announced — deadline fields left `null` rather than restating stale dates.
- Sabancı University's own programme page and its own FAQ page state two different
  registration deadlines (1 May vs. 1 August 2026) with no reconciling language between
  them — recorded as an explicit conflict, `deadline` left `null`.
- A secondary source's TÜBİTAK 2204-C prize-amount figure conflicted with the amount
  verified directly on TEKNOFEST's own current-cycle page — the primary source's figure
  was kept, the conflict noted, not silently overwritten.

## Known gate not yet fixed (code, out of this pass's scope)

Most Turkish NGOs/foundations/municipalities are `.org.tr`/`.com.tr`/subdomain-based, not
`.gov.tr`/`.edu.tr`, and won't automatically pass `lib/acquisition/source-authority.ts`'s
`looksOfficial()` domain check. Every record's `organizer_domain_provenance` field
documents how domain ownership was actually established (an official page's own
self-identification, matching contact-domain email, a linked first-party subdomain,
etc.) as a workaround for review, not a substitute for the code-side fix a separate lane
is understood to own.

## Operational notes

Two of the four research agents stalled mid-task (a harness-level "no progress for 600s"
timeout, not a data-quality issue) and were resumed from where they left off rather than
restarted from scratch — no data was lost, confirmed by checking disk state before each
resume. One agent's own scratchpad file was separately overwritten mid-task by unrelated
content from another concurrent session sharing this repo's infrastructure; it correctly
discarded the corrupted intermediate file and rebuilt its deliverable directly, rather
than incorporating anything from the unverified injected content.
