# RES-CR1 → CEO / DATA — dry-run handoff

Lane **RES-CR1** (competitions/olympiads + genuine research) · night of 2026-08-23/24
**No production writes were made.** Nothing below has been executed.

## Artifacts

| File | Contents |
|---|---|
| `cr1_2026-08-23_TRACKER.md` | lane log, baseline, checkpoints |
| `cr1_2026-08-23_RESEARCH_CATEGORY_DECISION.md` | all 13 live `research` rows classified |
| `cr1_2026-08-23_TUBITAK_2204A_ADMISSION_BENEFIT.md` | §7.1.1 vs §7.1.2 separated verbatim |
| `cr1_finding1_journals.jsonl` | CR1-010…022 — dispositions for the 13 research rows |
| `cr1_research_batch1.jsonl` | CR1-001…003 — BL4S, TÜBİTAK 2204-A, ISEF |
| `cr1_olympiads_batch1.jsonl` | CR1-030…041 — flagship olympiads, STS, SJWP, TÜBİTAK 2202 |
| `cr1_research_batch2.jsonl` | CR1-050…059 — research programmes and further competitions |

**FINAL (session close): 100 records. Class A 56 · B 30 · C 3 · C_INCOMPLETE 4 · D 6 · D-for-research-B-as-itself 1.** 37 net-new opportunities proposed. All JSONL validated: 0 parse errors, 0 duplicate record_ids, 0 typed-field string pollution, 0 date contradictions (full validation pass run twice, see tracker 02:00 and 02:15 entries).

**Türkiye national-route resolutions: 11.** Six international bodies (IBO, IMO, IChO, IPhO, IOI, IOAI) independently confirm TÜBİTAK as the national gateway, across six subjects. IESO resolves to a *different* body (tceder.org) — checked, not assumed, after six-for-six made assuming tempting. IJSO: listed but dormant since 2021 — not a usable route today.

**Product-derived gap analysis (measured against `INTEREST_SUGGESTIONS`), before -> after this session's proposals:** Law 0->1 (shipped) · Psychology 0->2 · Economics 2->4 (1 shipped) · Design 2->3 · Engineering 3->4 · Biology 2->4 · Environmental Science 3->4 · Medicine 1->2. Re-run the query after any ingest — it catches what row counts hide.

## A0. DEADLINE BOARD — what is actually close, and what the corpus knows about it

Computed against DB `current_date = 2026-08-23`.

| Days | Opportunity | In corpus? | Deadline stored? |
|---:|---|---|---|
| **+7** | **Marshall Society Essay Competition** (economics, free, single essay, no institution needed) | **NO** | — |
| **+19** | **Wharton Global HS Investment Competition** | yes | yes — but does not say you need a **team of 4-6 and a teacher advisor** |
| **+23** | **Breakthrough Junior Challenge** | yes | **yes** — but no age, no country, and **no mention that it must be in English** |
| **+28** | **HMMT registration closes** (~"September 20") | yes | **NO — field is empty** |
| **+38** | **AMC early-bird** (2026-09-30) | yes | stores 2026-10-15 — the **school's** later, dearer deadline |
| **+38** | **Columbia Junior Science Journal** | yes | yes — but `official_url` **does not resolve** |
| **+74** | Regeneron STS | **NO** | — |
| +182 | Blue Ocean Competition | yes | yes |
| +220 | Blackstone Law Review (Junior) — registration opens **+9d** | **NO** | — |

**The pattern across the top five:** in every case the *date* is not the hard part. What is missing is
the thing that decides whether the student can act at all — an eligibility rule, a working link, or
the fact that the deadline belongs to their school rather than to them.

Three of the top six (Marshall, HMMT's date, STS) are not in the corpus or not stored at all. Of the
three that ARE stored correctly, each still withholds the fact that decides feasibility: Wharton needs
a team and a teacher, Breakthrough needs English, CJSJ's link is dead.

## A. Blocked on a schema decision — do not attempt without it

**Six live rows are publication venues, and `opportunity_category` has no value that fits.**
Confirmed against the live enum:

```
competition, research, internship, summer_program, fellowship, scholarship,
volunteering, entrepreneurship, hackathon, academic_program, conference,
student_program, online_program
```

There is no honest home for "a journal you submit finished work to". `academic_program` and
`student_program` both misdescribe it. So the fix is one of:

1. **add** a `publication_venue` enum value (migration — founder call), or
2. **park** the six at `status='under_review'` (no migration, hides them, loses real information), or
3. **leave** them in `research` with a corrected description (cheapest, least honest).

I recommend (1) but it is not my call. **Rows:** JRHS `51ea0b34`, IJHSR `61558e02`,
JEI `35f7475c`, AJSR `19ebc71c`, CJSJ `e0e1584c`, STEM Fellowship Journal `b51bf24f`.

**Second schema gap — fee timing.** `cost` cannot distinguish $350-at-submission-against-30%-acceptance
(JRHS) from $350-only-if-accepted (IJHSR). Same number, opposite risk. Also affects AJSR, whose
waiver must be requested *before* acceptance. CEO reports #152 now carries `cost` into advisor and
weekly-plan context; **timing still is not represented anywhere.**

## B. Ready to apply — no schema change, evidence attached

| # | Row | Change | Evidence |
|---|---|---|---|
| 1 | CJSJ `e0e1584c` | `official_url` → `http://columbiajuniorsciencejournal.org/` | stored domain does not resolve (`dig` no answer; `curl` exit 6); `www.` → `192.168.1.1`, private RFC1918 = local NXDOMAIN hijack. Correct domain serves the journal and confirms the stored 2026-09-30 deadline. |
| 2 | Georgetown Pre-College `948b2e5f` | set `cost` = **1895.00**; remove from `research` | *"$1,895"*; it is a taught online course — *"video lectures"*, capstone is designing a hypothetical care team; *"Certificate of Completion"*, **not** credit; no selection process. |
| 3 | JEI `35f7475c` | set `cost` = **49.00** | *"$49 fee for each submission"*; *"All submission fee payments are nonrefundable."* Currently NULL while the $350/$496 venues are populated — the data gap runs systematically in favour of the expensive option. |
| 4 | Interlochen Review `95093e1a` | remove from `research`; `cycle_status` → `closed` | *"an online literary journal produced by the creative writing students of Interlochen Arts Academy"*; *"Currently not open for submissions. Check back in January, 2027."* |
| 5 | RSI `d5e774ed` | `verification_state` → `verified_current`; add two-route eligibility | verified from cee.org this pass. *"International Applicants: Each participating country has its own selection procedure… Please contact RSI to determine if your country participates."* |
| 6 | SEES `ad0ef06f` | replace age floor with the grade rule; note a fee-based route exists | official rule is *"10th & 11th graders"*, not `minimum_age=16` — a 15-year-old 10th grader is eligible by the real rule and excluded by ours. Page distinguishes scholarship students from *"fee-based students"*, so NULL cost must not read as free. |
| 7 | Pioneer `bdc4bdb5` | add aid conditionality + official selectivity | *"restricted to cases in which the financial need of students' families can be reliably verified through partnering schools and non-profit organizations"* — aid is gated on the school being a Pioneer partner. *"less than a third of applicants… are accepted."* |

## C. New records proposed — 25, all P1-sourced

**Highest value first:**

1. **TÜBİTAK 2204-A** — free, pays travel, genuine research, and its prizes convert into **university
   admission rights** (§7.1.1 ek katsayı / §7.1.2 sınavsız yerleştirme). No TÜBİTAK competition exists
   in the corpus at all. See the dedicated doc; the two rights must not be merged.
2. **TÜBİTAK 2202 Ulusal Bilim Olimpiyatları** — 9 branches, one application. **The entry route** to
   every international science olympiad for Turkish students. Excludes final-year students, so it is
   an early-planning item for 14-16s.
3. **CrowdMath** — free, worldwide, **no selection gate at all**, MIT PRIMES + AoPS mentors, and its
   participants appear as named co-authors in real journals (*Int. J. Algebra & Computation*,
   *Communications in Algebra*, *Discrete Applied Mathematics*). MIT PRIMES' own page routes
   international students here. The strongest answer found to "how does a student with no money and
   no national route do real research?"
4. **CERN Beamline for Schools** — free, *"Students from all over the world are eligible"*, winners'
   travel + accommodation + 3 meals/day covered. No age floor to compete; 16+ only to travel.
5. **The Junior Academy (NYAS)** — free, 13-17, *"from anywhere in the world"*, direct application.
   Scope recorded honestly as mentored innovation work using research methods, **not** original research.
6. **Regeneron STS** — **deadline 2026-11-05, 74 days out.** Direct application, individuals only.
7. **Regeneron ISEF** — 9-12, under 20, teams ≤3, entry only via an affiliated fair.
8. **Stockholm Junior Water Prize** — 15-20, federated across **39 countries incl. Türkiye**;
   Türkiye's organiser is **Devlet Su İşleri (DSİ), Ankara**. Accepts social-science/policy projects.
9. **Davidson Fellows** — $100k/$50k/$25k, opens Fall 2026, and **not STEM-only** (Literature, Music,
   Philosophy, Outside the Box).
10. **IJSO** — *"under sixteen years old on 31st December"*. The only flagship where a 14-year-old is
    the intended competitor rather than an outlier — the best structural fit found for ORYN's
    youngest users.

Plus: IMO, IOI, IBO, IChO, IPhO, IOL, IEO, IOAI, ICYS, MIT PRIMES, Simons SRP, CREST Gold, IRIS,
Research Placements (ex-Nuffield), Big Bang UK.

## B2. Nine `unverified` competition rows — `active`, match rows for all 7 users, **Browse-only**

> **Corrected after first draft.** I originally headed this "THE ACTUAL HARM SURFACE" and said these
> rows were "the ones actually reaching students". **That was wrong.** `verification_state='unverified'`
> is filtered out of the recommendation path — confirmed in the code at two layers:
> `lib/counselor/state.ts:143` restricts the query with `.eq("verification_state","verified_current")`,
> and `lib/counselor/eligibility.ts:45` re-checks it as defence-in-depth (spec §37). These rows are
> visible in **Browse** only. I had inferred reach from the presence of `opportunity_matches` rows,
> which sit upstream of the gate. See CR1-129.
>
> **This inverts the priority order.** The batch that genuinely reaches recommendations is
> **section B3** — the eight `verified_current` rows with no eligibility data. Fix those first.
> Every finding below still stands on its merits; only its urgency changes.

Found after the first handoff draft. These are the rows actually reaching students. Evidence:
`cr1_active_unverified_fixes.jsonl` (CR1-120…128). **Four are seriously defective.**

### Time-critical — act this week

| Row | Problem | Real date |
|---|---|---|
| **HMMT** `570ba029` | **No deadline stored at all** | Site banner: *"Registration is open! Applications close on September 20."* ≈ **28 days out** |
| **AMC - AIME** `4ce6fd8f` | Stored deadline is the **school's** registration deadline, not the student's; `official_url` points at MAA **MathFest** (a mathematicians' conference) | Early-bird **2026-09-30** ($55), 38 days out |

**AMC's core defect is the action, not the date.** *"Students and parents do not register directly
with the MAA."* Seven users are being shown a date only their school can act on. The row also merges
AMC (open, school-hosted) with **AIME (invitational — you cannot enter it, you earn it)**, and stores
no age data despite three distinct caps: AMC 8 under 15.5, AMC 10 under 17.5, AMC 12 under 19.5, each
measured on competition day.

**Türkiye's AMC route resolved:** MAA serves only USA/Canada/APO addresses plus registered
international partners. International students enter through an **International Group Leader**;
Türkiye's is **Brad Hart** (also Albania, Bosnia, Croatia, Cyprus, Greece, Kosovo, Lithuania,
Montenegro, North Macedonia) — mathcontest.org. *The IGL list is headed "for 2025-26" and may change.*

**HMMT carries a warning worth surfacing to students directly:** *"HMMT does not partner with any
organizations connected to competing teams. Any non-HMMT person or group claiming to represent HMMT
is untruthful, especially if they claim to represent HMMT in a specific country."* Entities are
falsely selling themselves as HMMT national representatives — and an international student is exactly
the target. Note this **inverts** the national-route pattern found everywhere else tonight: for HMMT
there is no legitimate country representative, and anyone claiming to be one is a red flag.

### Wrong entity / wrong corpus — remove

- **Stockholm Water Prize** `c8eb3d40` — a professional **career-achievement award** for established
  researchers, still `active` and matched to all 7 users. Independently reached by `oryn-ce` via
  kva.se before their lane closed. Meanwhile the genuine youth award — **Stockholm Junior Water
  Prize**, ages 15-20, 39 countries including Türkiye (organiser: **Devlet Su İşleri**, Ankara) — is
  **absent**. The corpus holds the wrong one and lacks the right one; the names differ by one word.
- **Institute of Competition Sciences** `f493d81f` — not a competition. A **directory of other
  people's competitions**, i.e. exactly the class of source my brief treats as discovery-only. It kept
  surfacing in my searches *for* real competitions, which is what a directory does.

### Wrong URL — fix

- **Nat Geo Slingshot** `2b1886f1` — `official_url` is a **Spanish-language "7 Tips" PDF whose own
  filename says "Draft-2"**. Correct: `nationalgeographic.org/society/projects/slingshot/`. The
  programme itself is good and worth keeping: **ages 13-18, a one-minute video** — the best
  effort-to-value ratio found in this lane, and it reaches down to 13.

### Needs a decision before being shown to 14-18s

- **Major League Hacking** `c8cd2706` — a **league sanctioning 1000+ events in 100 countries**, not an
  event. No single deadline exists. **Whether high schoolers may participate at all is NOT STATED** —
  the most decision-relevant unknown on any row in this batch.
- **iGEM High School** `c83420f7` — genuine and prestigious; **not** a duplicate of `931e7fc2` (CEO
  verified: umbrella/collegiate product, correctly parked). Its page is unusually honest —
  *"Below are details from the 2025 Competition season for reference."* But **no team fee is published
  anywhere**, on a team competition requiring travel to a Jamboree in Paris. NULL cost is a real risk here.
- **Princeton Ten-Minute Play Contest** `0f182854` — eligibility is *"limited to U.S. or international
  students in the **eleventh grade**"*. **A single year group**, and the row stores no grade data while
  matching all 7 users. Notably it *does* explicitly welcome international students, unlike almost
  everything else US-based. Clean negative result: the discontinued Milberg Poetry Prize named on the
  same page is **not** in the corpus, so there is no stale row to clean.

### Could not verify — reported as such

- **Both NYT rows** (`d24e59bd`, `031502eb`) — nytimes.com is **blocked by policy in both WebFetch and
  the Browser pane**. That is a block on my side, not evidence about the programme. Without fetching I
  can still say the editorial-contest URL is the **2025-26** calendar — a full academic year stale.
  Route to someone whose environment can reach it; do not treat these as cleared.

## B3. **FIX FIRST** — 8 `verified_current` rows that DO reach recommendations, carrying zero eligibility data

Evidence: `cr1_verified_depth_fixes.jsonl` (CR1-130…137). All matched to 7 users except Purple Comet (2).

| Row | What's missing | Why it matters |
|---|---|---|
| **Breakthrough Junior Challenge** | age, country, **English-language requirement** | **Deadline 2026-09-15 — 23 days.** Free, individual, ≤2-min video, $250k scholarship. Entries *"are in English, including all scripts and voiceovers"* — a real capability gate for a Turkish student, and it must be said **before** they invest effort. Age rule has two measurement dates (13 by 11 May 2026; not yet 19 on 1 Oct 2026). Only country bar is residence under comprehensive US sanctions — Türkiye is not. |
| **USACO** | the split rule | *"All are welcome to participate in online USACO contests and training. Only pre-college students in the USA are eligible for selection as finalists to attend the USACO training camp."* Free worldwide participation; US-only national-squad selection. **The schema cannot say "you may compete but not be selected", and either flattening is wrong.** |
| **The Concord Review** | worldwide eligibility, 4 deadlines, 5% rate | $70 **at submission**, official *"We publish about 5% of the essays we receive."* Explicitly worldwide incl. home-schoolers. Four quarterly deadlines; only one stored. |
| **The Earth Prize** | deadline | Ages 13-19, 2027 registrations **open now**, no deadline stored. |
| **Blue Ocean** | age, cost | Teams 1-5, 5-minute video. "173 countries" is a participation count, **not** an eligibility rule. |
| **DECA** | country coverage | Names 14 non-US chartered associations — **Türkiye is not among them.** Likely not actionable for ORYN's core audience. |
| **HOSA** | everything | Only solid fact: membership is via a school Health Science class. Held at C_INCOMPLETE. |
| **Purple Comet** | deadline semantics | Stored "deadline" 2027-04-15 is the **last day of the contest window** (06–15 April 2027), not an application date — it will drive false urgency. |

**Cost discipline applied throughout** (per founder's rule): `0.00` only where the source states free;
`NULL` where unknown. HMMT is left NULL — its registration flow includes *"Step 6: Apply for financial
aid"*, which proves a fee exists but no amount is published.

## D. Two structural findings worth more than any single record

**1. Almost nothing at the top is self-serve.** I recorded `self_registration_possible` on every
competition. Across the entire flagship tier it is **false**: IMO *"by invitation only"*; IOI national
delegation; IBO *"you have to win the Biology Olympiad in your country"*; IOL/IEO/SJWP national
organiser; ISEF affiliated fair. The **only** direct-entry exceptions found: **CERN BL4S**, **Regeneron
STS**, **NYAS Junior Academy**, **CrowdMath**, **Davidson Fellows**.

Consequence for the product: for most of these, "apply by date X" is the **wrong action**. The right
action is "find and enter your national competition", which happens **months earlier** and often under
a different organisation's name. A record that stores only the international deadline will reliably
give students an action they cannot take.

**2. URL existence ≠ URL liveness.** `evaluateRecommendationReadiness()` checks `official_url` is
present, never that it resolves. CJSJ passes every hard blocker with a dead domain. One broken link in
a sample of 13 — a corpus-wide liveness sweep is a cheap script and is a different question from both
provenance and freshness.

## E. Cross-lane

- Per CEO's overlap rule I wrote **no proposals** against existing competition rows owned by
  `oryn-ce`. Stockholm Water Prize (professional award) and the AMC-AIME wrong URL were handed over,
  not edited. My SJWP record is a **new entity**, not a correction of that row.
- `oryn-ce` verified the JRHS-vs-IJHSR fee-timing split independently; I confirmed both from the
  operators' own pages.

## F. Open questions needing a human, not more searching

1. **IBO** — *"You should be enrolled in a regular secondary school for general education (e.g. not
   specific for STEM or biology)."* Read literally this excludes Türkiye's **Fen Lisesi** students and
   every comparable national science-school system. That reading seems implausible against who
   actually competes, but the rule is stated. **Needs a direct question to the IBO office.** Until
   then say nothing to students either way.
2. **Does TÜBİTAK send 2204-A winners to Regeneron ISEF**, and is TÜBİTAK Türkiye's ISEF-affiliated
   fair? §7.1.2 turns on which international competitions count and never names them. If yes, 2204-A
   is simultaneously the Turkish route to ISEF *and* to exam-free university placement.
3. **Türkiye participation is unverified** for IEO, IOL, IBO, IOAI and RSI. Each needs a per-body
   check before any Turkish student is told a route exists.
4. **The magnitude of the ek katsayı** lives in the ÖSYM YKS guide, not the TÜBİTAK call. **No numeric
   coefficient appears anywhere in my artifacts** and none should be added without that source.

## G. Deliberate non-actions

- **IPhO 2027 host** not recorded as verified. Saudi Arabia is news-sourced only; the official site
  still fronts the July 2026 edition. Held at `C_INCOMPLETE`.
- **Özyeğin** left `closed` despite its own page banner reading *"APPLICATIONS FOR 2026 ARE NOW
  OPENED"* — on 23 August a summer programme with a 15 May deadline has already run. Flagged, not flipped.
- **No `rolling`** recorded anywhere except where an operator says so verbatim (IJHSR, JRHS). CREST,
  SJWP and CrowdMath all lack deadlines and none is marked rolling.
- **No cost recorded as 0.00** on the strength of silence. IChO's *"3000 USD for one team"* was
  explicitly **not** written to `cost` — it is billed to the country, not the student.
