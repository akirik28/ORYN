# `category='research'` — line-by-line classification (all 13 live rows)

Lane RES-CR1 · retrieved 2026-08-23 · every fact below is from the operator's own page (P1).
Evidence records: `cr1_finding1_journals.jsonl` (CR1-010 … CR1-022).
**No production writes were made.** This is a decision document.

## Headline

The `research` category has 13 rows. **5 are genuine research opportunities. 8 are not.**

| Disposition | n | Rows |
|---|---|---|
| Genuine research opportunity — KEEP | 5 | Pioneer, RSI, Özyeğin, SEES, SIP |
| Publication venue — not an opportunity | 6 | JRHS, IJHSR, JEI, AJSR, CJSJ, STEM Fellowship Journal |
| Wrong corpus | 1 | Interlochen Review (creative writing) |
| Wrong category — commercial taught course | 1 | Georgetown Pre-College Online |

**Correction to my own earlier number.** In my first message I estimated "~2–3 genuine" from the
stored rows. Verification puts it at **5 genuine, of which 3 are decision-grade** (Pioneer, RSI,
Özyeğin; SIP and SEES have unknown cost). Use 5/3, not 2–3.

## 1. Genuine research opportunities (keep)

| Row | Cost | Selectivity (official) | Status | Action |
|---|---|---|---|---|
| **Research Science Institute (RSI)** | **free** — *"cost-free to students"* | 100 places worldwide | 2026 closed | Promote to `verified_current`; **add the two-route eligibility** |
| **Özyeğin Summer Research Program** | **free** + free dorm + lunch | chosen by project academics | closed (see conflict) | Keep; broadest eligibility of any row: *"All high school levels can apply."* |
| **Pioneer Research Institute** | **$7,465** (+ up to 2% lab fee) | *"less than a third of applicants… are accepted"* | dates announced Oct/Jan | Keep; **surface cost + aid conditionality** |
| **SEES (NASA / UT Austin)** | unknown — a **fee-based route exists** | not stated | closed | Fix grade rule; record that "fee-based students" exist |
| **SIP (UC Santa Cruz)** | **unknown** | not stated | closed | Keep, but **not decision-grade** |

Two corrections worth making even if nothing else is actioned:

- **RSI's international route is unrecorded and the record is misleading without it.**
  *"Each participating country has its own selection procedure and selection schedule. Please
  contact RSI to determine if your country participates."* A non-US student **cannot apply
  directly**. The honest action is "ask CEE whether your country participates" — a different
  action from "apply by date X". Same national-agency pattern `oryn-ce` found for IPO/IYPT.
- **SEES stores `minimum_age=16`; the official rule is grade-based ("10th & 11th graders").**
  A 15-year-old in 10th grade is eligible by the real rule and excluded by ours.

## 2. Publication venues — where you SEND finished research, not a way to DO research

All six are miscategorised in the same way. The important part is that **their financial risk
profiles differ enormously while the `cost` column makes them look alike.**

| Venue | Fee | **When charged** | Refundable | Acceptance rate (official) |
|---|---|---|---|---|
| **JRHS** | **$350** | **at submission** | not stated | **~30%** — *"Approximately, 30% of the submitted research papers have been published."* |
| **AJSR** | **$496** | on acceptance only | *"non-refundable"* | not stated |
| **IJHSR** | **$350** | on acceptance only | n/a | not stated |
| **JEI** | **$49** | at submission | *"All submission fee payments are nonrefundable."* | not stated officially |
| **CJSJ** | not stated | — | — | not stated |
| **STEM Fellowship Journal** | amount not retrieved | on acceptance only | — | not stated |

**JRHS is the one that actually costs students money.** $350 up front against the journal's own
published ~30% acceptance ⇒ **~$1,167 expected cost per publication**, with no stated refund. That
arithmetic uses the journal's own number, not an estimate of ours.

**AJSR has a waiver trap.** *"Requests for APC reductions will not be considered once a manuscript
has been accepted."* The affordability decision must be made **at submission**, and the named
hardship proof is *"documentation of U.S. free or reduced-price lunch eligibility"* — which an
international student does not have. The waiver route is US-shaped.

**JEI is the only affordable one and the corpus hides it**: $49 with scholarships, explicitly
international (*"YES! JEI takes submissions from outside of the United States."*) — and its `cost`
is **NULL** while the $350/$496 venues have theirs filled in. The cheapest option looks like the
unknown one. It also carries an unrecorded blocker: *"Students are not allowed to submit their own
work as we require there to be an adult…"* — a student working alone cannot submit at all.

### CJSJ — a live defect worth fixing tonight regardless of the taxonomy decision

Row `e0e1584c` is `verified_current`, `cycle_status='open'`, **deadline 2026-09-30 — 38 days out** —
and its `official_url` **does not resolve**.

- `dig +short cjsjournal.org` → no answer; `curl -L` → *"Could not resolve host"* (exit 6).
- The `www.` variant resolves to `192.168.1.1`, a private RFC1918 address — local NXDOMAIN
  hijacking, not a real host.
- Real site: **`columbiajuniorsciencejournal.org`** — confirmed live, *"Student Submissions Due:
  September 30, 2026"*, *"High school students from anywhere in the world are welcome"*.

The stored **deadline is correct**, which makes this worse: a student acting on a real, near
deadline lands on nothing.

**Systemic point:** `evaluateRecommendationReadiness()` checks that `official_url` **exists**, never
that it **resolves**. A dead link passes every hard blocker. Worth a corpus-wide liveness sweep —
that is a cheap script, and this audit found one broken link in a sample of 13.

## 3. Wrong corpus — Interlochen Review

*"The Interlochen Review is an online literary journal produced by the creative writing students of
Interlochen Arts Academy."* Fiction, poetry, songs, visual art. **No research of any kind.**
Currently `unverified`; its own page says *"Currently not open for submissions. Check back in
January, 2027."*

This row alone shows the category problem is not cosmetic: a student whose weakest dimension is
Research could be handed **a poetry submission** as the fix.

## 4. Wrong category — Georgetown Pre-College Online (**$1,895**)

- A taught online course: *"video lectures"*, *"simulations, and curated assignments"*. The capstone
  asks students to *"design the ideal healthcare team"* for a hypothetical patient — applying taught
  concepts, **not original research**.
- **`cost` is NULL in the live row for an $1,895 product.**
- *"Earn a Certificate of Completion"* — explicitly **not academic credit**. Compare Pioneer:
  $7,465 buys 4 real Oberlin College credits; this buys none.
- **No selection process stated** — enrolment appears open to anyone who pays.

This is the clearest single instance of ORYN implying that **paying money substitutes for doing
research**.

## What I recommend, in priority order

1. **Fix the CJSJ URL.** One field, real student impact, hard deadline in 38 days.
2. **Record cost where it is missing and material:** Georgetown $1,895, JEI $49, and the existence
   of a fee-based route for SEES. Null-cost-reads-as-free is the recurring failure.
3. **Split "publication venue" from "research opportunity"** in the taxonomy. Six of thirteen rows
   answer a different student question ("where do I publish?") than the category promises.
4. **Store fee timing, not just amount.** $350-at-submission-with-30%-acceptance and
   $350-only-if-accepted are different products; the schema cannot currently tell them apart.
5. **Remove Interlochen and Georgetown from `research`.**
6. **Add RSI's two-route eligibility and fix SEES's grade rule.**

Items 3–4 are schema changes and are founder decisions, not mine. Items 1, 2, 5, 6 are data fixes
that need no new schema.

## Unresolved — do not publish as fact

- Whether **CJSJ charges any fee** — its own site never says. Secondary sources claim free.
- **SIP UCSC tuition** — unknown, and UCSC SIP has historically carried a substantial fee, so the
  null is a live risk, not a harmless gap. Its admissions URL 404s.
- **SEES fee-based amount**, and its official citizenship rule.
- **STEM Fellowship Journal** fee amount; whether it is open outside Canada.
- **JRHS refund policy on rejection** — unstated; worth one direct email.
- Whether **Türkiye participates in RSI**, and via which agency (plausibly TÜBİTAK given its role
  sending students to international competitions — **asserted by no official source**).
- **Özyeğin cycle conflict**: the official page banner says *"APPLICATIONS FOR 2026 ARE NOW OPENED"*
  while the DB says closed with a 2026-05-15 deadline. On 23 August a summer programme with a May
  deadline has already run, so the banner is almost certainly stale. **I did not flip the row on the
  strength of a banner.**
