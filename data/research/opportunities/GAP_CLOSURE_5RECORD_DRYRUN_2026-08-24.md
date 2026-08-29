# 5-record gap-closure dry-run — Brain Bee / IEO / TISDC / FIRST Global / IEnvO

Prepared by RES-CR1 per CEO request 2026-08-24, under founder's overnight-autonomy directive.
**No production write yet.** P1-only facts. Source records: `cr1_research_batch4.jsonl` (CR1-150),
`cr1_olympiads_batch1.jsonl` (CR1-038), `cr1_research_batch5.jsonl` (CR1-172, CR1-175, CR1-176) —
each re-checked against the live DB immediately before this doc was written (all five: zero
existing rows, confirmed by exact-title `ilike` query, not inferred).

Format follows `URGENT_3RECORD_DRYRUN_2026-08-24.md` / `TUBITAK_6OLYMPIAD_DRYRUN_2026-08-24.md`.

Selection rationale: five, not eight — each closes a **different** measured gap
(`INTEREST_SUGGESTIONS` gap analysis) with its strongest available evidence, rather than padding
count. Two candidates considered and deliberately excluded: **International Biology Battle**
(strong data, but student-club provenance — lower confidence than this batch's institutional
sources) and **Genes in Space** (excellent data, but US-only — doesn't move a Türkiye-focused gap
the way these five do). Both stay in the broader corpus at their existing class (B).

---

## 1. International Brain Bee (IBB)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%brain bee%`. |
| **Official source** | `https://www.thebrainbee.org/` + `.../countries/` |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** No IBB-level deadline exists — entry is Local → National → World Championship, and Local/National dates are set per country, not published centrally. World Championship: 6–11 November 2026 (tentative), virtual, alongside the Society for Neuroscience annual meeting — an event date, not an application deadline. |
| **Age/grade** | Reported as 13–19 in secondary sourcing; **NOT independently confirmed on an official IBB page this session** — the landing page calls it "The Neuroscience Competition for Teens" with no numeric rule stated. Recorded as unresolved, not asserted. |
| **Country eligibility** | `self_registration_possible = false`. Verbatim: *"Students typically begin by participating in a Local Brain Bee where available, with top performers advancing to their country's National Brain Bee. Each year, National Brain Bees send one representative to compete at the IBB World Championship."* Official country list: **50+ countries**, spanning all six inhabited continents. |
| **Cost/fee** | **NULL.** Not stated on pages retrieved. |
| **Application URL** | None — see `self_registration_possible`. Actionable route below. |
| **Türkiye route (P1)** | **CONFIRMED.** IBB's own official country list (`thebrainbee.org/countries/`) shows Türkiye under Europe, linked to **Beyin Araştırmaları Derneği (BAD)** — `https://www.bad.org.tr/brain-bee-2024/`. Caveat: the linked page's URL slug is `/brain-bee-2024/`, so it may describe the 2024 edition rather than a current one; check for an active cycle before advising a student. |
| **Proposed `description`** | *"Entry is not direct. Ask your school to organise a Local Brain Bee, or contact Türkiye's national organiser (Beyin Araştırmaları Derneği, bad.org.tr) directly. Local and National round dates are set independently each year and are not published by the international body — confirm current-year timing with the national organiser before planning around it."* |
| **Unresolved** | Numeric age rule from an official IBB page (currently only secondary-sourced). Whether BAD's linked page reflects a current or a 2024 cycle. Any fee at the local/national tier — IBB itself states none, but a national organiser could differ. |

**Why it's here**: Psychology/Medicine measured at 1–0 actionable rows against `INTEREST_SUGGESTIONS`, and the corpus's one existing psychology-adjacent row (IPsyO) is currently closed for its cycle. This is the strongest genuinely federated, Türkiye-routed candidate found for that gap — 50+ countries, a real national organiser identified by name and domain, not inferred.

---

## 2. International Economics Olympiad (IEO)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%economics olympiad%`. |
| **Official source** | `https://ieo-official.org/` (canonical — `ecolymp.org` 301-redirects here; if any future record carries the old domain, this is the replacement) + `.../countries` |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** Last known edition: 2026, Shenzhen, China — exact dates not stated on the page retrieved. No student-facing deadline exists; entry is via each country's own national competition. |
| **Age/grade** | Verbatim: *"Ensure that the contestants will all be under the age of 20 years on 30 June of the year of the Olympiad."* Date-relative, not a plain age cap. |
| **Country eligibility** | `self_registration_possible = false`. Verbatim: *"Find your national competition"* → contact the national organiser; winners advance internationally. Team: *"no more than 5 contestants and 1 or 2 team leaders."* |
| **Cost/fee** | **`0.00`** — confirmed free. Verbatim: *"Participation is free of charge."* Travel costs are borne by the sending national organisation, not the student — worth stating alongside the zero rather than implying nothing costs anything. |
| **Application URL** | None. Actionable route below. |
| **Türkiye route (P1)** | **CONFIRMED, and unusually well-documented.** IEO's own per-country page (`ieo-official.org/countries/turkiye`) names the national selection competition directly: **"Turkey Economics Olympiad"**, first participation **2021**, **6 editions**, national coordinator **Sena Kademoglu**. Achievements to date: 1 gold, 4 silver, 12 bronze. **2026 roster is live** — the page lists current-year contestants, confirming this is an active, not historical, route. |
| **Proposed `description`** | *"Entry is not direct. Compete in the Turkey Economics Olympiad — Türkiye's IEO national selection competition, running since 2021. IEO's own page notes 'No active long-term partners' for Türkiye's coordination, meaning continuity should be confirmed each year via the yearly site (2026.ieo-official.org) or IEO directly rather than assumed."* |
| **Unresolved** | Exact 2026/2027 competition dates. Whether the "no active long-term partners" note signals any risk to next-cycle continuity. |

**Privacy note**: IEO's country page also publishes the full names of 2026 contestants (minors) and a coordinator's personal email. Neither is reproduced in this record — the actionable facts are the competition's name and its official country-page URL; AGENTS.md §12 (minimise data collection on minors) governs the omission, consistent with how CR1-070/CR1-074 handled the same situation tonight.

**Why it's here**: Economics measured at 2 actionable rows despite being AGENTS.md's own worked example throughout the spec. Of everything found tonight for Economics, this has the single best-documented Türkiye route — a named competition, a participation count, and a live current-year roster confirming it is genuinely running now, not merely listed.

---

## 3. Taiwan International Student Design Competition (TISDC)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%TISDC%` or `%taiwan international student design%`. |
| **Official source** | `https://www.tisdc.org/en/` + `.../rules/` + `.../2026-tisdc-the-worlds-largest-student-design-competition-call-for-entries-coming-soon/` |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL — the 2026 submission window is known but the page is explicitly headed "Call for Entries Coming Soon."** Window when open: **2026-04-27 to 2026-07-06**. Recording this as a known future window rather than a current deadline; do not treat as open today. |
| **Age/grade** | Verbatim: *"Students currently enrolled in high school or above (under 30 years old)"* — includes, does not require above, secondary students. |
| **Country eligibility** | **Not an explicit rule; strong participation evidence instead.** No quoted "open to all countries" sentence found. Official published statistics (2008–2025) show **73 countries, 1,029 schools, 16,329 entries** in 2025 alone, with 18 consecutive years of published country counts. Brochure offered in 8 languages including Arabic, Korean, Japanese. `self_registration_possible = true` (individual/team entry via the competition's own registration, no national gatekeeper). |
| **Cost/fee** | **`0.00`** — confirmed free. Verbatim: *"No registration or exhibition fees."* |
| **Application URL** | `https://www.tisdc.org/en/registration/` (site navigation confirms a registration section exists; not yet live for 2026 per the cycle-status note above). |
| **Türkiye route** | Not applicable in the national-gatekeeper sense — entry is direct, not through a Turkish national body. Whether Türkiye has historically been among the 73 participating countries was not itemised in the statistics table extracted (aggregate counts only, not a per-country breakdown). |
| **Proposed `description`** | *"Direct entry — no national qualifying round. Five categories: Product Design, Visual Design, Digital Animation, Architecture and Landscape Design, Fashion Design. Run by Taiwan's Ministry of Education since 2010 (predecessor editions from 2008). 2026 submission window 27 April – 6 July 2026; registration was not yet open as of retrieval (23 Aug 2026) — re-check closer to April."* |
| **Unresolved** | Team size. Exact 2026 registration opening date beyond the known submission window. Per-country participation breakdown (is Türkiye specifically represented in the published totals?). |

**Why it's here**: Design measured at 2 actionable rows. This is the only design-competition candidate found tonight backed by an 18-year, government-published participation record rather than a single year's marketing claim — the strongest evidence base of any Design candidate researched.

---

## 4. FIRST Global Challenge

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%first global%`. |
| **Official source** | `https://first.global/fgc/` + `.../faq/` |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = upcoming` |
| **Exact deadline + timezone** | **NULL — no student application deadline exists; national-team selection timing is set by each country's own partner, not published centrally.** Event date: **7–10 October 2026**, Incheon, Republic of Korea (an event date, not an application deadline). |
| **Age/grade** | Verbatim: *"Participants are limited to students between 14-18 years old."* Exact match to ORYN's own stated 14–18 target band — not "high school," not 13–19, but this precise range, stated by the operator. |
| **Country eligibility** | `self_registration_possible = false`. Verbatim: *"There is only one national team for each country, and team selection is conducted by our in-country partner."* Team size: *"three to five students... along with one adult technical mentor/coach and one team organizer."* |
| **Cost/fee** | **NULL.** Not stated on pages retrieved; FIRST Global events historically involve real travel costs to the host country, so should not be assumed free. |
| **Application URL** | None. Contact is via the national partner, reached through the interactive team map at `first.global/fgc/#teams` — no single stable per-country URL extracted this session. |
| **Türkiye route** | **Presence confirmed, contact not yet extracted.** Türkiye appears by name on FIRST Global's official interactive country map among 190+ listed nations. The specific national partner's contact (organisation name, email) sits behind Türkiye's individual team-profile page on that map and was not opened this session — a genuine, stated gap, not an oversight elsewhere. |
| **Proposed `description`** | *"Entry is not direct. One national team per country, selected by an in-country partner — reach out via the team profile page on first.global's interactive map. 2026 event: Incheon, South Korea, 7-10 October, themed on wildfire-resilience robotics (one of the 14 Grand Challenges for Engineering). Team of 3-5 students aged 14-18 plus an adult mentor and organiser."* |
| **Unresolved** | Türkiye's specific national partner organisation and contact — present on the map, not yet extracted. Cost to a national team. Whether Türkiye's team has competed continuously (presence on the map is not the same as active recent participation — see CR1-079's IJSO lesson: listed is not always active). |

**Why it's here**: Engineering measured at 3. This is the largest robotics competition by country count found tonight (190+), with an age band that matches ORYN's own stated range more precisely than any other record produced this session.

---

## 5. International Environmental Olympiad (IEnvO)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%environmental olympiad%`. |
| **Official source** | `https://www.env-olympiad.com/` (**landing page is stale — see caveat**) + the authoritative `.../current-ienvo.html` |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = closed` |
| **⚠ STALE-BANNER CAVEAT — read before using any date from this competition's homepage** | The homepage CTA still reads *"Register for IEnvO 2026"* with a Global Grand Test date of **8 August 2026 — 15 days in the past** at retrieval. The dedicated current-cycle page states plainly: *"Registration for IEnvO 2026 has closed."* **Trust the dedicated cycle page, not the homepage banner** — the third time this exact pattern was found tonight (after Özyeğin and this lane's own initial IPsyO error). |
| **Exact deadline + timezone** | **NULL — 2026 cycle closed, 2027 dates not yet published.** Flag for re-check; no date to record today. |
| **Age/grade** | Verbatim: *"Grades 9-12"*; *"Currently enrolled high school students"*; *"Students graduating in 2027 or later"* — same graduating-year exclusion logic as IPsyO (bars the class that just finished). |
| **Country eligibility** | Not an explicit quoted rule; operational evidence instead. Homepage states *"50+ Countries"* / *"10K+ Students"*; the current-cycle page schedules the Global Grand Test across three continental time-zone blocks (Asia & Oceania / Europe & Africa / North & South America) — a structure that only makes sense for genuinely global participation. `self_registration_possible = false` — an advisor must register the student: *"Your advisor will register you through the official IEnvO website."* |
| **Cost/fee** | **NULL.** Not stated on either page. |
| **Application URL** | `https://www.env-olympiad.com/current-ienvo.html` (for whenever the next cycle opens). |
| **Türkiye route** | Not itemised — IEnvO's structure (Global Grand Test → International Final → School Team Awards) has no national-body layer the way the TÜBİTAK-routed olympiads do; a Turkish student's advisor registers them directly once the next cycle opens. |
| **Structural note, worth carrying** | This competition's mechanics — Global Grand Test / International Final / School Team Awards, continent-timezone blocks, advisor-verification requirement — are **structurally identical** to IPsyO's, researched earlier tonight. Neither page names an operating organisation, so a shared operator is a pattern worth flagging, not an asserted fact. |
| **Proposed `description`** | *"2026 cycle closed (Global Grand Test was 8 August 2026); 2027 dates not yet announced — re-check env-olympiad.com/current-ienvo.html, NOT the homepage, closer to next cycle. Five learning areas spanning hard science (Atmosphere, Water, Land, Biodiversity) through policy (Human Activity: 'sustainable development, environmental policy, green technology'). Requires an advisor to register the student."* |
| **Unresolved** | Organising body's name (not stated on either page). Cost. 2027 cycle dates. Whether this and IPsyO share an operator. |

**Why it's here, with the honest caveat**: Environmental Science measured at 3. Recording this closed-for-now with an explicit re-check instruction is more useful than silence, and directly prevents the exact error (trusting the stale homepage banner) that a less careful pass would make.

---

## Summary for approval

| # | Record | New/Existing | Türkiye route | Cost | Blocking gap |
|---|---|---|---|---|---|
| 1 | Brain Bee | New | confirmed (BAD, bad.org.tr) | NULL | numeric age unconfirmed on an official page; BAD cycle currency |
| 2 | IEO | New | confirmed, live 2026 roster, 6 editions since 2021 | 0.00 | exact 2026/2027 dates; "no active long-term partner" continuity risk |
| 3 | TISDC | New | n/a (direct entry) | 0.00 | per-country breakdown not itemised; 2026 registration not yet open |
| 4 | FIRST Global | New | presence confirmed, contact not extracted | NULL | Türkiye's specific national partner contact |
| 5 | IEnvO | New | n/a (direct advisor registration) | NULL | 2026 closed, 2027 unannounced — **closed status, not blocked** |

All five: `deadline = NULL` where no genuine student-facing date exists (four of five), or `cycle_status = closed` with the reason stated (IEnvO). No cost figure written without an explicit source statement — two carry `0.00` (IEO, TISDC — both quoted "free"), three carry `NULL` (Brain Bee, FIRST Global, IEnvO — genuinely unstated, not assumed free).

Awaiting review before write. Per CEO's framing, this closes tonight's research pass — no open thread requiring further founder or CEO input beyond reviewing this document.
