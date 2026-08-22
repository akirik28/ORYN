# ORYN research organization — consolidated status

**Lead:** ORYN-BASORG · **Reports to:** ORYN-CEO · **As of:** 2026-08-22

This is the durable copy of the research org's live map. Per
`docs/ORYN-ORG-STRUCTURE.md` §4, a report that exists only in a chat window does not
exist — this file is the one that counts.

---

## 1. Lane map — 5 active, 2 closed out

| Lane | Package | Branch | Status | Safe to consume? |
|---|---|---|---|---|
| RES-R1 | Australia undergraduate programme catalogues | `oryn/res-r1-au-programmes` | Extracting (sub-batch 1: UNSW + Melbourne) | Not yet — no output |
| RES-R2 | P1 deadlines **complete** (PR #13); P2 summer_program (87 rows) in progress | `oryn/res-r2-opportunity-deadlines`, `oryn/res-r2-summer-programs` | P1 PR'd, P2 running | P1 **not yet** — V1 verdict pending |
| RES-R3 | Wave 2 **complete + MERGED** (PR #10); wave 3 competitions in progress | `oryn/res-r3-eligible-countries-w3` | Wave 3 running (57 real candidates triaged) | Wave 2 **yes** — PASS 22/22, applied |
| RES-V1 | DLOPP contract/ID validation + reusable validation script | `oryn/res-v1-validation` | In progress; scope expanded to full monotonicity audit | Verdict pending |
| RES-V2 | DLOPP source verification | `oryn/res-v2-source-verification` | **14/14 dated records byte-exact**; random sample folded in | V2-half cleared |
| RES-I1 | Corpus reconciliation (read-only) before any ingest | `oryn/res-i1-ingestion` | Assigned, running | n/a |
| RES-I2 | ECW2 apply **DONE + verified**; 6 non-opportunity retirements next | `oryn/res-i2-opportunity-ingestion` | Live writes verified | n/a |

**All seven lanes staffed and working.** The earlier "3 of 7" reading was an addressing
failure, not an absence — session titles never propagated to `ListAgents`, so lanes showed
as `oryn-XX` and could not be addressed by lane code. Resolved by socket-address routing.

## 1b. Lane closures (2026-08-22)

**RES-I1 and RES-I2 both closed out** — not from exhaustion, but because every item in each
queue became blocked on someone else. Both produced resumable handoffs
(`i1-lane-closeout-2026-08-22.md`, `i2-lane-closeout-2026-08-22.md`).

**Closure is reversible.** If verification clears work needing a live write, either lane is
re-engaged by message. Neither picks anything up on its own initiative in the meantime.

**Known gap this creates**: RES-V2 is verifying url_repair's 1,429 and Glasgow's 62 — both
`university_*` writes, i.e. RES-I1's territory. A clean verification would arrive with no open
ingester. Deliberate, and re-openable; recorded so it is not discovered as a surprise.

## 2. Pipeline running end to end; second batch cleared

**DLOPP (74 deadline records) CLEARED for ingestion 2026-08-22** — both verifier verdicts
PASS and BASORG moved the batch. RES-V1: 0 contract, 0 ID, 0 live-identity defects, plus a
21-finding monotonicity audit. RES-V2: 14/14 dated records byte-exact by direct curl
re-fetch, 34/74 covered across four separately-reported instruments. Conditions on the
write: monotonicity guard dry-run-proven to fire, all 21 findings handled, guard FAILS and
reports rather than silently skipping. Two records (DLOPP-B1-01, DLOPP-B5-13/Ron Brown)
held out in **either** direction pending source verification — where both auto-apply and
auto-skip are unsafe, the answer is evidence, not a default.


The verify→ingest stall is cleared. The org has now run one full
research → verify → ingest cycle: RES-R3 researched, an independent lane verified
(PASS 22/22), RES-I2 applied, and BASORG confirmed the result live. That is the first
end-to-end pass of the pipeline as designed.

**Live trust defect CLOSED.** Türkiye Scholarships (`34033f8a-…`) now discloses the
Turkish-citizen exclusion (verified live 2026-08-22 11:03:09Z); TechGirls
(`7081b03a-…`) carries its verified 37-country list (11:04:49Z). Invariants checked:
`opportunities` total 391 unchanged, empty-`eligible_countries` 352→351, exactly −1.

## 3. Live measurements (2026-08-22, project `qtcvcflzxbuagvvwahhu`)

`opportunities`: **391 total** · 56 with deadline / **335 without** · 39 with
eligible_countries / **352 without** · 271 active.

`university_programs` zero-coverage: **Australia 37 universities / 0 programmes** (both
the brief and CEO's note say 35 — **37 is correct**, independently re-measured by BASORG
and RES-R1). Larger holes exist but are non-English: China 64/0, India 37/0,
South Korea 31/0, Japan 22/0. DB-wide `university_programs` total 16,114.

`docs/current-state.md` is stale on both counts (says 301 opportunities, 0 with
eligible_countries). That file is the CEO's; correction routed.

## 4. Open escalations

### 4a. Near-miss: a verified batch was one mapping away from degrading live data

RES-V1 found 9 of RES-R2's 74 records carry `cycle_status_found = "unknown"`, which is not
in the live CHECK vocabulary. The obvious resolution — map `unknown`→`unverified` at
ingestion — would have been **destructive on 6 of the 9**, measured live:

| Opportunity | Live `cycle_status` | Destructive? |
|---|---|---|
| Ashoka Young Changemakers | `open` | **YES** |
| International Psychology Olympiad | `closed` | **YES** |
| BSPEE · Technovation Girls · Girl Up · Nuffield | `date_not_announced` | **YES** (×4) |
| STEM Racing · Genesys Works · Partners for the Future | `unverified` | no |

Stripping `open` and `closed` down to "nobody checked" would have removed real, established
status from rows already in front of students. The batch had **zero fabrication defects** and
passed independent source verification — it was still one humble-looking vocabulary coercion
away from data loss. Caught at the verifier, not the researcher: an argument for the
pipeline's separation, and against compressing it.

Resolution: RULE-INGEST-003 below. Field skipped, never coerced.

### 4b. Corpus is dirtier than any doc says — founder decision needed

BUG-1's live audit: **85 of 271 `status='active'` opportunities (31.4%) carry hard defect
signatures** — 77 descriptions restating their own title, 77 embedded raw URLs, 45 truncated
mid-word, 5 whose *title* is an institution name. 8/8 verified on a random sample. Root cause
traced and closed: the garbling is already present in the founder's source Drive spreadsheet
cells; ORYN's importer carried it faithfully rather than introducing it. **No extraction bug
threatens the research lanes' output.**

- **6 rows are wrong in kind** (5 institution-name titles + `7aa517a3`, a UCSC course-catalogue
  entry) → assigned to RES-I2 to disable with reason. Not a judgment call.
- **~79 remaining** → re-research-or-retire is a **founder decision**, not staffed. Retiring
  them removes ~31% of the live browse surface; a garbled card and an empty shelf are both
  failures. Deliberately not decided at BASORG level.

### 4c. Permission blocks — a capability question for the founder

Three sessions were blocked from routine actions by their own safety classifiers today:
ORYN-CEO (DB write), RES-R2 (force-push after rebase), RES-I2 (PR creation). **In all three
cases BASORG declined to perform the action on the blocked session's behalf** — performing an
action a peer was denied routes around the boundary rather than respecting it, and a boundary
that holds only when the intermediary judges the action harmless is not a boundary.

Workarounds used instead: RES-R2 re-did its rebase as a merge commit (no force needed, landed
under its own permissions). RES-I2's commit is safely on origin; its PR needs opening by the
founder. A research org where ingesters cannot open PRs and researchers cannot force-push will
hit this every package — worth a deliberate capability decision rather than per-incident
improvisation.

**Ruled against**: RES-I2 discovered the classifier blocked a full `begin;…commit;` block but
allowed the identical statements sent individually. That is a workaround of a denial, and it
destroys atomicity — a future multi-statement batch would partially apply. Standing ruling:
if a transaction block is blocked, STOP and escalate; do not decompose it.

### 4c-bis. BLOCKED: a clean dry-run that would have doubled Glasgow

**The most consequential catch of the day.** RES-I1 dry-ran `acquire-programs-batch2`
(301 records): 106 accepted, 195 duplicate, **zero gate failures, zero domain-authority
problems — a clean go.** Glasgow returned 101 net-new / 0 duplicate, anomalous against
Edinburgh 3/90 and Waterloo 2/105, so BASORG opened the data before assigning the apply.

**Glasgow's 101 are duplicates the dedup key cannot see.** `programDedupKey` is exact-match
on `universityId|normalizedName|degreeLevel|languageOfInstruction|officialProgramUrl|degreeType`.
The file mismatches live on **two components at once**:

| | live | file |
|---|---|---|
| `degree_type` | NULL on all 101 | BSc 58, BEng 24, LLB 7, BA 1, MBChB 1, BMus 1, BN 1, null 8 |
| name | degree code stripped | code appended in brackets |

`Anatomy` ←→ `Anatomy [BSc/MSci]` · `Accountancy & Finance` ←→ `Accountancy & Finance [BAcc]`

Stripping the bracketed suffix and comparing against the live name set: **69 of 101 match
exactly (68.3%).** Applying would have taken Glasgow 101 → 202 with 69 programmes listed
twice — presenting as a clean run at every stage.

- **Glasgow's 101: BLOCKED.** The other 32 (partnership, dual-degree, graduate-entry,
  accelerated variants) are plausibly genuine coverage but need adjudication against the
  official catalogue — research, not ingestion.
- **Edinburgh 3 + Waterloo 2: APPROVED** after per-name live verification. Edinburgh's 3 have
  no live rows to compare against at all; Waterloo's 2 are undeclared general BA/BSc against
  live major-specific "Psychology – BA/BSc" — a different admissions identity, not a naming
  variant.
- **The dedup key is NOT to be loosened.** Its own header documents that a looser URL-based
  check was tried and was wrong 53 times out of 54 (distinct programmes sharing one
  catalogue-listing page). This is the mirror failure and does not license reversing that
  decision. A missed duplicate and a false merge are both data-quality failures.

**Systemic, not local**: any university whose live rows were ingested under one
naming/`degree_type` convention and later re-catalogued under another will produce false
net-new at 100% rate, silently, presenting as a clean dry-run. Corpus-wide investigation
assigned to RES-V1 — report only, no fixes, no key changes, name-match after normalization
is a REVIEW CANDIDATE not a merge (org rule 10).

### 4d. Live rows making false actionable claims — audit running

RES-V2 found the SIP (Science Internship Program) row (`7aa518f8`) showing
`cycle_status='upcoming'` for a program that **concluded 2026-08-08**. Confirmed live by
BASORG. A student filtering for upcoming programs sees it today.

Live `cycle_status` distribution across the 271 active rows, measured 2026-08-22:

| status | rows | of which past deadline |
|---|---|---|
| `unverified` | 93 | 0 |
| `closed` | 57 | 24 |
| `date_not_announced` | 44 | 0 |
| **`upcoming`** | **35** | 0 |
| **`open`** | **31** | 0 |
| `historical` | 11 | 5 |

**The 66 rows claiming `open` or `upcoming` are the ones making an actionable promise.** A
wrong `unverified` costs a student nothing; a wrong `open` sends them to a closed door.
Assigned to RES-V2 as package V2-2: audit all 66 against official sources, read-only,
defects routed to BASORG for RES-I2. Instructed to stop and report if the first sub-batch
runs a high defect rate — that would make it a corpus-wide problem rather than a cleanup.

### 4e. Blocked and prepped: 6 non-opportunity retirements

RES-I2's write was blocked at COMMIT by its session's classifier. Per standing ruling it
STOPPED and escalated rather than decomposing the transaction. Verified live by BASORG: all
6 rows `status='active'`, `category='summer_program'` — five are institution names
(Carnegie Mellon, King's College London, NYU, USC, St Andrews) and one is a university
course listing ("ECON 1 - 01 Introductory Microeconomics"). Wrong in kind.

Prepped so the write is a single step once unblocked:
`data/research/opportunities/i2_retire_nonopportunities_2026-08-22.sql` (dry-run-confirmed,
guarded by `id` + `status='active'`, idempotent) and its run report, pushed at `7a3e74a`.
Confirmed there is no reason/notes column on `opportunities` — per-row reasons live in the
run report, which is correct; a schema change is not justified by needing somewhere to
write a note.

### 4f. Live `open`/`upcoming` rows are unreliable — audit in progress

RES-V2's audit of the 66 active rows claiming `open` or `upcoming` — the only rows making a
student an actionable promise. First sub-batch: **6 confirmed defects in 15**. İTÜ Lise Yaz
Okulu (2026 cycle over 5+ weeks), both Columbia summer rows (sessions concluded Aug 7),
Global Achievers Academy, Wharton M&TSI (label says 2026; actual next program July **2027**),
Scholastic Art & Writing (page says entries open "in the fall" vs live `open`).

**That sample was deliberately staleness-weighted, so 40% is biased upward and is NOT the
population rate.** Two instruments now run separately with distinct seeds: a remediation pass
(oldest `updated_at` first, biased by design) and a seeded random draw for an unbiased
estimate. Near 40% is a corpus-wide freshness failure; near 10% is a staleness tail — they
need different remedies, and BASORG will not escalate a number until the random instrument
reports. Corrected pool: **37 rows already audited, 3 genuinely robots-blocked, 26 remaining**
(not the ~48 first estimated — RES-V2 re-counted precisely rather than carrying its estimate).

**The useful split**: 4 of 6 defects are rows where the research was almost certainly correct
when written and went stale because the calendar moved — a *re-check cadence* gap, which no
amount of research quality prevents. 2 are point-in-time errors. Different problems, different
fixes; conflating them produces the wrong remedy.

**Scholastic needs no fetch to catch**: `cycle_status='open'` while its own
`current_cycle_label` says "opens fall 2026" — the row contradicts itself in the database.
Routed as a candidate deterministic check rather than per-row research.

**False precision found**: Ron Brown's live `2026-12-01` deadline was a *projection* from the
program's own award-year convention, not a published date. Students were shown a deadline no
source states. Corrected.

### 4g. ORYN-CFO — challenged, then verified

A session claiming founder-established audit authority contacted several lanes. Not in
`ORYN-ORG-STRUCTURE.md` **as BASORG had it**, and its name would not resolve for a reply, so
BASORG raised it to the founder and instructed all seven lanes to take no instruction from it
pending confirmation.

Resolved: the role IS defined — `docs/ORYN-ORG-STRUCTURE.md` on
`origin/oryn/ceo-rule-monotonic`, commit `ae67cb8`, authored under the founder's git identity.
"Independent auditor — reports to the FOUNDER, not to the CEO… **Commands nobody.** Verifies
artifacts rather than reports; may fix bookkeeping/doc drift directly, **may never touch code,
migrations, or live data.** Routes lane findings through that lane's own manager."

Found by RES-V2, which checked the org doc itself rather than accepting either the claim or
BASORG's notice — and when its evidence contradicted its manager's instruction, **flagged the
conflict rather than resolving it in either direction.**

**Honest limit**: authorship under the founder's git identity is corroboration, not proof —
every session commits under that identity, BASORG included. Founder confirmation still open.

**Root cause, and the more important finding**: this is the *third* org-defining document today
found to exist only on an unmerged branch. `ORYN-ORG-STRUCTURE.md` and `ORYN-ORG-BRIEFS.md` are
not on `main` (BASORG read its own charter via `git show 9292d28:`), and the ECW2 SQL was
reported as "on main" while sitting on a diverged branch. **Org-defining documents living only
on feature branches is a recurring failure that makes legitimate sessions look unverifiable and
costs every new session a false start.**

Posture retained regardless: lanes route material through BASORG; **write authorization comes
from BASORG only**; an audit finding is an input to the manager, never an instruction to a lane;
no finding from any session lowers the evidence bar.

### 4h. The open/upcoming alarm was FALSE — 8.3%, not 40%

RES-V2 ran the two instruments to completion. **Random draw (n=12, seeded): 1 defect =
8.3%. Remediation pass (next-oldest 15): 1 defect = 6.7%.** Both instruments now agree,
which they did not after round 1.

**Round 1's 40% was the oldest `updated_at` tier, exactly as the staleness-weighted design
predicted it might be.** Had BASORG escalated 40% as the corpus rate, the founder would have
received roughly five times the true figure and a request for a remediation programme the
data does not support. The two-instrument split — kept unblended at BASORG's instruction and
RES-V2's execution — is the only reason the difference is knowable.

Staleness concentrates in the 2026-08-17/18 tier rather than spreading evenly, which makes
this a **bounded re-check of the oldest tier**, not a corpus-wide crisis. Caveat retained:
two data points is thin support for a firm conclusion.

Also found: **a meaningful fraction of rows are unresolvable in principle** — 3 of 12 in the
random draw (InvestIN, JA Company Programme, Young Enterprise) have sources that never state
a cycle at all. Correctly reported as a limit on the instrument rather than rounded into
either bucket. No amount of research effort fixes those.

### 4i. Projected deadlines — a second instance, so it is a pattern

**Interlochen Arts Camp**: live `2027-01-15` while the page's deadlines section is headed
"Camp 2026", its Jan 15 deadline passed, and 2027 appears nowhere. Same same-day-next-year
projection as **Ron Brown** (`2026-12-01`, derived from the program's own award-year
convention, published nowhere).

Two independent instances confirm RULE-DEADLINE-001. The projection pattern is more insidious
than plain staleness: **a projected date is plausible, so it survives review that an obviously
stale date would not.**

### 4j. Yale "duplicate deadlines" — a UI bug, not a data defect

Routed to BASORG as a research or ingestion gap. It is neither. The four rows carry four
distinct dates, four distinct `cycle_label`s, four distinct verbatim strings:

| date | cycle_label | verbatim |
|---|---|---|
| 2026-11-01 | Single-Choice Early Action | "Early Action (**US Citizens/Permanent Residents**)" |
| 2026-12-01 | Single-Choice Early Action | "Early Action (**International Citizens**)" |
| 2027-02-15 | Regular Decision | — |
| 2027-04-01 | Transfer | — |

The UI renders `deadline_type` (`scholarship` on all four by design) while the differentiation
lives in `cycle_label`. **Correct data hidden by a display choice** — and the hidden fact is
that US and international applicants have deadlines a month apart on financial aid, for a
product whose core audience is international students.

The reasoning trap, now org rule 19: **"the UI renders the correct field" is itself a claim to
check, not a premise to reason from.** Elimination reasoning is only as strong as the premise
it eliminates from; here the eliminated premise was the defect.

### 4k. Glasgow resolved to 62 — and enrichment ≠ correction

Three sessions produced three numbers. RES-I1's is the one with an operational definition:
of the 93 populated-`degree_type` file records, **62 resolve to exactly one live row by exact
URL match** (zero ambiguous multi-matches). The other 31 match no live row and overlap the
known partnership/dual-degree/graduate-entry variants.

**RES-I1's distinction, adopted**: `url_repair` *replaces* a populated value on explicit
evidence it was wrong; Glasgow only *fills a NULL* and claims nothing about any existing
value. **Different evidence bars — the audit trail must not record them identically.**
`superseded_by_id` confirmed unnecessary: same row, same identity, same URL, one empty field
filled, nothing replaced.

**Hard precondition**: neither url_repair's 1,429 nor Glasgow's 62 may be applied until
content correctness is verified. That the corrected URL is *right*, that the filled
`degree_type` is *right* — unverified, V-lane work, not yet assigned. A design is not an
authorization.

### 4d. Carried forward

- **CORRECTED — 2 rows unreachable, not 5.** BASORG originally escalated 5. RES-V2
  independently re-tested all five rather than taking the deferral on report:
  **Technovation + CSHL are genuine policy blocks** (robots.txt fetched directly; explicit
  `anthropic-ai` / `Claude-Web` / `ClaudeBot` disallow) and stay deferred.
  **BSPEE / Ashoka / Girl Up have CLEAN robots.txt** — their 403s are bot-detection on the
  curl path, not site policy — and all three fetched successfully via rendered browser,
  corroborating live DB state. Routed back to RES-R2 as recoverable. "This site forbids AI
  crawlers" and "our fetch tool got blocked" look identical from a 403 and have entirely
  different answers; BASORG had collapsed them.
- **Migration 0060** (`opportunities.country_eligibility_confirmed_open`) merged but not applied
  live. Confirmed-open rows need per-row evidence-backed backfill once it is.
- **Dartmouth's 53 programme records stay blocked.** RES-I1 identified them as the one clean
  uningested gap; BASORG checked before assigning and found they are blocked by the
  *domain-authority* gate because Dartmouth's catalogue lives on a registrar-contracted vendor
  platform — the same founder-pending class as McMaster's 432 (`romcmaster.ca`) and
  Western/Huron's 5 (`huronu.ca`). Not assigned. "Nobody has done this yet" and "this is ready
  to be done" are different findings; in this repo the gap is usually a gate.

## 5. Standing rules issued by BASORG

- **RULE-CORPUS-ID-001 (new, 2026-08-22).** `research_program_id` is **not** globally
  unique across `data/research/university-programs` **by design**. 19,178 records /
  17,029 unique IDs; 536 IDs recur, 522 spanning multiple files as deliberate re-pass /
  repair pairs (`de_nl_batch8_uva` ↔ `_repass` 326, vuamsterdam pair 163, plus the
  `url_repair_*` family re-emitting records under original IDs). A validator asserting
  global ID uniqueness produces **536 false positives** on intentional revision records.
  Correct assertion: uniqueness *within* a file, plus uniqueness of *new* IDs against the
  corpus — never global uniqueness across it. Only the 14 within-single-file recurrences
  merit review. Discovered by RES-R1; promoted before RES-V1 opened so a verifier does not
  meet it cold and "fix" legitimate history.
- **RULE-INGEST-003 (new): information-monotonic writes.** An ingestion write may populate an
  empty field, replace a value with a MORE informative one backed by evidence, or correct a
  value the evidence shows is wrong. It may **never** replace a populated field with a LESS
  informative one because the current research pass could not determine it — inability to
  determine is a fact about our research, not about the opportunity. Applies to every column.
  Where a research vocabulary value has no live-constraint equivalent, the field is **skipped,
  never coerced**. Vocabulary coercion at the ingestion boundary is how research uncertainty
  gets laundered into database fact. (Supersedes the narrower cycle_status-only RULE-INGEST-002;
  generalized after RES-V1 showed the same failure mode reachable on `current_cycle_label`.)
- **RULE-FETCH-001, REVISED — three shapes.** (1) robots.txt disallows → POLICY block, defer,
  never route around. (2) 403/failure with CLEAN robots.txt → TOOLING-level bot-detection; try
  a real rendered browser, `browser_render` is a passing retrieval method, **not a deferral**.
  (3) Active challenge-response defense a real browser ALSO hits (Cloudflare "Just a
  moment...", JS interstitials) → **defer regardless of robots.txt**, including when robots.txt
  is itself unreadable behind the challenge — solving or evading the challenge is the
  prohibited action, out of scope by every method; better tooling does not make it permitted.
  Shapes 1–2 turn on what robots.txt *says*; shape 3 on what we'd have to *do*. Ratified after
  RES-R2 (Johns Hopkins CTY) and RES-R1 (Melbourne, domain-wide Cloudflare across six
  subdomains, standard browser UA identically 403'd) hit shape 3 independently within one hour.
  **When this rule changed, records already deferred under the old rule came back into scope** —
  RES-R2 re-checked its own and recovered Koç; RES-V2's re-test recovered BSPEE, Ashoka and
  Girl Up. One verification pass produced four recovered records and corrected a founder
  escalation from 5 blocked rows to 2.
- **RULE-PROVENANCE-001 (new): provenance is per-record, never per-field.** A field whose
  evidentiary basis varies by source must carry that basis with the record. `international_eligible`
  is the worked case: UNSW's is inferred from CRICOS-code presence (regulatory fact,
  positive-only, absent → null), Sydney's is read from an explicit `coursecitizenship` DOM/INT
  field. Both sound, not interchangeable — a consumer seeing `true` on two rows cannot tell them
  apart. Never assume a column means the same thing corpus-wide because the name matches.
  A caveat that lives only in prose notes evaporates at the ingestion boundary; confidence and
  derivation basis must be machine-readable to survive.
- **RULE-FETCH-002 (new, structural): the robots.txt fetch is its own tool call, awaited and
  evaluated, before any other request to that host — never batched in parallel with anything
  else.** Three careful lanes made this exact slip within one afternoon (RES-V2 on
  Technovation/CSHL, RES-R3 on CyberPatriot, RES-R1 on ANU). All three self-disclosed
  unprompted, all stopped immediately, no disallowed content was used anywhere. Three
  independent occurrences is the tooling shaping behaviour — parallel batching is the efficient
  default and this rule cuts against it — not three lapses in discipline, so it needed stating
  as a structural constraint rather than left to judgment.
- **RULE-DEADLINE-001 (new): a program's usual deadline is never itself evidence. A correct
  prediction is still a prediction.** Ron Brown's live `2026-12-01` was derived from the
  program's own award-year convention, not published anywhere. The projection being
  well-reasoned and probably right is exactly what makes it dangerous — false precision that
  looks sensible survives review.
- **Correction requires affirmative contradiction, not absence.** Ron Brown's source *says*
  the competition is closed with no dated next cycle → correction licensed. 120 Hours' source
  says *nothing* → nothing licensed, field not written, live value stands. Silence is not
  evidence that a live value is wrong. (Applies RULE-INGEST-003 at its hardest edge.)
- **`field_provenance` (new contract field, closed vocabulary).** Additive, optional, keyed by
  field name: `explicit_source_field` · `explicit_title_token` · `structured_code_mapping` ·
  `regulatory_inference`. New values are escalated to BASORG, never minted in-lane — an
  uncontrolled vocabulary inside the field built to record provenance would be the next Glasgow.
  **Fence: it annotates how we know something; it never licenses recording something we don't
  know.** There is no value meaning "guessed"; if one seems needed, the answer is NULL.
- **RULE-INGEST-004 (new): monotonicity is undefined for free text.** "More informative" is
  well-defined for enumerated vocabularies and for null-vs-populated transitions. It is **not
  orderable for prose** — `"2026"` vs `"2026 (program June 18 – August 12, 2026; application
  closed)"` cannot be ranked without semantic judgment. Applying the guard to free text yields
  a hold on nearly every difference *by construction*: RES-I2's full DLOPP run produced **57 of
  74 holds on `current_cycle_label` alone** (222 field decisions total: 78 write, 65 skip, 79
  hold). That is a decision procedure correctly reporting it cannot answer, not a malfunction.
  Free-text fields need evidence or policy, never a comparator. RES-I2 declined to invent one,
  and its reason was the right one: Ron Brown's label difference carried the same signal as its
  status defect, so "extra detail = safe" would have failed on our only adjudicated case.
- **Verdicts state which failure classes they cover AND which they do not** (from ORYN-CEO).
  RES-V1's DLOPP verdict was correct on everything it claimed; RES-I2's independent guard run
  then found 79 holds in a class the verdict's scope never included. The gap was invisible
  because the verdict did not name its own boundaries. Two verifiers checking different failure
  classes is coverage, not redundancy — but only if the seams are stated.
- **RULE-FETCH-001, shape 4 (new): a local policy block.** Blocked at *this session's own
  tooling/policy layer* rather than by the target's robots.txt (1), its bot-detection (2), or an
  active challenge (3). `nytimes.com` is the known instance. Defer; do not hunt for a route.
- **Forward-vs-backward framing test** (from RES-R3, applied **per page, never per
  organization**). "4,000 participants from across the globe" / "present in 65 countries"
  describe who HAS attended — history, not eligibility. Only forward statements ("open to… any
  country") support confirmed-open. Two Wharton sibling programs on the same site landed on
  opposite sides of this test.
- **RULE-DEDUP-002 (new): the survivor of a duplicate pair inherits the best-sourced field
  values — it does not win by surviving.** Worked case: the *disabled* Conrad Challenge row
  held the correct deadline `2026-10-30` while the surviving **active** row showed students the
  wrong `2026-10-29` for five days. Whoever resolved that pair picked a survivor without
  comparing fields. The discard is invisible precisely because the row holding the good value
  is now hidden. Compare fields before disabling; record which values came from which row.
- **RULE-FETCH-005 (new, as amended): a bare `User-agent: *` + `Disallow: /` blocks us —
  *when it applies to the domain actually fetched*.** Host-scoping must be READ, not
  regex-matched. `uwc.org` carries a wildcard Disallow scoped by `Host: uwcstaging.co.uk`,
  saying nothing about the production domain; BASORG's un-amended rule would have purged a
  validly-sourced record. **A wildcard hit is a candidate; no purge on a pattern match alone.**
  A purge irreversibly destroys sourced work and carries the same evidence bar as a live write.
  (Amended by RES-R2, which read the raw file rather than trusting the regex hit.)
- **RULE-ATTRIBUTION-001 (new): a page may describe several products; language attaches to the
  product it describes, not to the page it appears on.** Iowa Young Writers' Studio and JHU CTY
  each pair a residential row with a separate online track carrying more permissive language
  ("from anywhere in the world") on the same page. One nesting deeper than "per page, not per
  organization."
- **A pattern match is a candidate, not a finding.** Four instances in one afternoon, each a
  mechanical match standing in for an identity judgment: RES-V1's collision check producing 74
  false positives before deduping on blob hash; a name-strip dedup that would have merged
  Glasgow's `Music [BMus]` with the MA programme; a wildcard robots regex that would have purged
  a good record; and RES-R3 crediting an online track's language to a residential row (caught
  pre-commit).
- **Security: `_backup_*` and staging tables in `public` inherit a project-level `anon` grant**
  for SELECT/UPDATE/DELETE. Measured: 9 backup tables + `qs2027_import_staging` all carry it.
  RLS is enabled with **zero policies**, so access is currently denied — the grant is real and
  inert. **A loaded gun with the safety on, on exactly the class of object nobody re-reviews.**
  One permissive policy or one `DISABLE ROW LEVEL SECURITY` makes it live anonymous CRUD over a
  copy of production data. **RLS is never disabled on such a table, for any reason** — inspect
  as a privileged role instead. Drop-or-relocate routed to the founder (destructive live DDL).
- **RULE-DEDUP-001 (new): every opportunities ingestion is followed by
  `npm run audit:opportunity-duplicates`, result recorded in the run report.**
  `lib/opportunities/duplicates.ts` is good — domain-matched, stopword-stripped title
  similarity, scores the Diamond Challenge pair at 1.0 / `deterministic`, and was built from
  that case. But the audit is **manual-invoke only** (`package.json:57`, no CI hook, no
  schedule — verified by grep). A deterministic-confidence dedup tool that nobody runs is
  operationally indistinguishable from no dedup tool, and its quality is what makes that
  dangerous: it creates a reasonable belief the problem is handled. This rule closes the gap
  for records entering through the research pipeline; scheduling it more broadly is a
  code/ops question outside this org, raised to CEO.
- **RULE-REBASE-001 (new).** On a `ORYN_WORKSTREAMS.md` rebase conflict: rows from DIFFERENT
  lanes are additive — keep all. A duplicate of YOUR OWN row is your row's history replaying,
  not a collision — keep the accurate final version, drop the stale one, never concatenate.
  Verify zero leftover markers and count expected rows before pushing. (Ratified after RES-R2
  and RES-R3 independently hit the identical shape.)
- **Permission denials are never routed around, by anyone, including upward.** A blocked
  session's action is not performed on its behalf by a peer or by its lead. Find a path that
  works under the blocked session's own permissions, or escalate to the founder. Retrying a
  denied action in a different call shape until it succeeds is a workaround, not a solution.
- **Batch cardinality is not batch identity.** Reconciling research files against live data
  joins on record IDs, never on matching record counts. 189 records matching 189 records can be
  189 different records — the rank≠identity fallacy applied to batches.
- **RULE-FETCH-001 (new): a 403 is not a robots.txt block.** Before deferring a source as
  blocked, fetch robots.txt directly. Clean robots + 403 = bot-detection on the tool path;
  try a permitted alternative fetch (rendered browser) — `browser_render` is a passing
  retrieval method, so recording it honestly costs nothing. robots.txt disallow = policy
  block; defer with the reason, never route around, no archive.org substitution. Only the
  second is a deferral. Corollary from RES-V2's IPsyO finding: a page's static HTML and its
  rendered state can disagree (marketing copy frozen at 2025, JS-injected dates genuinely
  2026) — a raw fetch can yield the opposite of the truth on date verification.
- **Blocked sources are deferred, never routed around.** A robots.txt AI-crawler block or
  a hard 403 yields a deferred record *with its reason*. archive.org is not a substitute
  for a blocked live source. (Ratified from RES-R2's handling.)
- **Summarized fetches are not verbatim.** Any record whose `fetch_method` passed through
  a summarizing model is a re-fetch target, not a quote of record. R2's 14 dated records
  get a direct non-summarizing re-fetch before ingestion — hard gate.
- **An all-but-one country enumeration is fabrication, not a list.** `eligible_countries`
  is inclusion-only at country granularity; an exclusion gets recorded in prose and the
  array stays empty. (Ratified from RES-R3's ECW2-020 handling.)
- **Identity is verified, never ranked into.** Compare returned name/domain/stable-ID
  against the query on every lookup. A correct answer reached by an unverified route is
  still unverified — the AU top-8 coinciding with the Group of Eight is the worked example.
- **Per-lane ID namespaces.** `AU-R1-` (R1), `DLOPP-` / `DLOPP-SP-` (R2),
  `ECW2-` / `ECW3-` (R3). Bare country prefixes have collided in this repo before.

## 6. Cross-org interfaces (handled, no action pending)

- **MERGE-1**: R2/R3 rebase conflicts routed to the owning lanes (trivial additive
  `ORYN_WORKSTREAMS.md` hunks). RES-V verdict merged as PR #8 (`58ce0c5`) without waiting
  on R3's rebase — the resulting PASS-verdict-references-absent-files ordering is harmless
  and self-corrects. Clarified to MERGE-1 that merging a research branch lands *proposals,
  not facts*; nothing reaches a student until verified and ingested.
- **BUG-1**: RES-I2 holds nothing, so BUG-1's code-level defect hunt on the Diamond
  Challenge duplicate pair and 3 garbled scrape rows is uncontested. Data-repair half
  comes to BASORG for I2. Asked BUG-1 whether the extraction path that produced the
  garbled rows is still live — that outranks the individual row fixes, since R1/R2/R3
  output is about to feed it.
- **FEAT-2**: supplied the §3 numbers for its audit, with the caution that a populated
  `deadline` is not a *current* deadline — a stale-cycle row rendered as "due soon" is a
  trust defect, not a UI bug.
- **UI-1**: holds the shared dev server on :3000. No ingester restarts it without telling
  UI-1 first.


---

## 7. Corrections log — claims this lane made and had to withdraw

Kept because a manager's errors are the ones nobody else checks, and because the pattern
across them is more instructive than any one.

1. **"The org docs aren't on main."** False. `9292d28` landed them at 12:59:41 today. BASORG
   read its **local** `main` ref before fetching. Caught by ORYN-CFO on its first day, on its
   own manager. Standing rule since: **repo-state claims are made against `origin/*` after an
   explicit fetch, never against a local ref — a local branch is a cache.**
2. **"The ECW2 SQL landed on main via PR #11."** Relayed from ORYN-CEO unchecked; #11 was still
   open. Caught by RES-I2 running `gh pr view 11` before relying on it.
3. **"`import-opportunity-corpus.ts:198` is a clean root cause."** Endorsed BUG-1's claim
   without opening the file. BUG-1 retracted it — the source spreadsheet has no organization
   column, the header discloses it, the 0.75 threshold is a deliberate conservative margin.
4. **"5 opportunity rows are unreachable by any AI-permitted path."** Actually 2. RES-V2
   re-tested and found 3 were tooling-level bot-detection with clean robots.txt.
5. **"Combined-green masks individual-red"** — relayed from ORYN-CEO as established, then
   withdrawn by CEO as a phantom from a contaminated verification worktree. The per-piece rule
   survives on this org's own directly-observed evidence instead.
6. **"Your suffix-strip method would produce a false merge."** Told to RES-V1 on CFO's Music
   finding. RES-V1 checked and proved its tool gates on URL-exact-match before any name logic,
   so the vulnerability never existed in its design — **BASORG had mis-specified the method in
   the original assignment, and CFO's critique applied to that spec, not to the implementation.**

**The pattern in 2, 5 and 6 is one error: treating an upstream claim as verified because of its
source.** From the lane whose standing rule is that rank is not evidence. Every one was caught
by a subordinate or an auditor checking rather than accepting — which is the control that is
actually working, and the argument for keeping it expensive.


---

# 8. RESUMABLE HANDOFF — read this first if BASORG is gone

**Six sessions ended without warning within one hour** (FEAT-1, UI-1, BUG-1, RES-R2, RES-I1,
RES-I2 — four of them this org's). None signalled beforehand. Written on the assumption this
session ends the same way.

## 8.1 State as of this writing

**Four lanes alive**: RES-R1 (Australia programmes), RES-R3 (eligible_countries wave 4),
RES-V1 (contract/ID verification), RES-V2 (source verification).
**Gone**: RES-R2, RES-I1, RES-I2.
**No live-write capability in either territory.** Research and verification only.

## 8.2 Verified work stranded with no lane to apply it

All of it leaves the live DB exactly as it stands today, and today's state is honest. An
unappliable correction is not a defect. **Opening one ingester session clears items 1–3 in
under an hour** — SQL and procedure are already written down.

| # | Item | Blocked on |
|---|---|---|
| 1 | 5 `cycle_status` corrections — IPPF→`open`, HOSA→`upcoming`, Wharton DS→`closed`, CMIMC→`closed`, BIYSC→`upcoming` (verdict: `v2_4_dlopp-held-fields.md`) | no ingester |
| 2 | 6 non-opportunity retirements — SQL prepped, dry-run confirmed, at `7a3e74a` | founder permission **and** no ingester |
| 3 | Glasgow's ~10 single-award `degree_type` enrichments | no ingester |
| 4 | url_repair's 1,429 URL corrections — verified clean (0 Type A, 0 Type B) | **Path A does not exist** (design only, `i1-supersede-gap-design-2026-08-22.md`) + no ingester |
| 5 | **Habitat Derneği, deadline 2026-08-26** — in PR #41 | merge **and** ingest; the only latency-bound item |

**ORYN-CEO ruled all of it waits for the founder, Habitat included** — after its own attempt to
apply Habitat directly was blocked by its safety classifier, which it treated as a signal and
changed the decision rather than rephrasing. Correct: pressure is exactly when a territory
boundary gets crossed "just this once."

**Verifiers must not write.** The verify→ingest separation produced nearly every catch recorded
in this document. Collapsing it to move a few rows trades the mechanism for its output.

## 8.3 The consolidated schema escalation (highest-value open question)

**The schema forces one value where reality has several simultaneous truths, and the field's
authority does the misleading rather than any false value.** Four lanes found this independently,
in four different columns, without coordinating:

1. **`cycle_status`** — must hold `closed` *or* `date_not_announced` when **both are
   simultaneously true** (11 of 18 audited rows: current cycle closed, next not yet announced).
2. **`degree_type`** — one award where Glasgow's page lists 2–4 (`BSc/MSci`); 83% of sampled
   programmes multi-award, the stored value chosen by **extraction order**, not judgment.
3. **`deadline`** — one field for Girl Up's per-region pathways (Award / WiSci / regional
   hackathons), each with different dates.
4. **`current_cycle_label`** — Concord Review's publication months vs deadline months: two
   different true facts, not two phrasings of one.

One modelling principle violated four times, not four schema requests. Decidable in one sitting.

## 8.4 Where each live lane is

- **RES-R1** — UNSW 217 / Sydney 149 / Monash 178 (contract/ID verified clean by RES-V1);
  **UWA rebuilt (289 → 107; the defect was ~63%, not ~30% — see §8.4d)**; Adelaide in stage-1
  raw fetch with the token census to run *before* any classification (~422 URLs, majors
  excluded by `MJD-` prefix); Adelaide next (identity **resolved** — 2026 merger, confirmed from
  the institution's own schema.org markup; catalogue consolidated; international variant in full
  + domestic sample of 15–20, variant recorded **as structure not metadata**).
  **Three of Australia's top 8 are policy-inaccessible**: Melbourne (domain-wide Cloudflare), ANU
  (robots.txt names ClaudeBot), Queensland (CAPTCHA gate). A property of the web, not a gap in
  the work.
- **RES-R3** — **CLOSED.** Waves 2, 3 and 4 all closed completely (research, competition,
  summer_program). 187 records total. **Verified count, computed by BASORG from the committed
  JSONL rather than estimated: 47 `confirmed_open_worldwide` records — 39 against `active` rows,
  8 against `under_review`.** The lane's own running estimate was 54 active; the verified figure
  is **39**. All 47 still carry empty `eligible_countries`, which is correct — confirmed-open
  means the array stays empty and the confirmation lives in the 0060 flag.
  Outcome distribution across all three waves: `no_statement_found` 106 · `confirmed_open_worldwide`
  47 · `unresolved` 26 · `compound_null_by_design` 5 · `populate_proposal` 2 · `prose_proposal_only` 1.
  **2 populates total** (CMU AI Scholars, Harvard CURE Initiative — both `United States`, both
  active). Wave-4 pool corrected to 57 active-only (from ~191); 23 unambiguous scrape fragments
  routed out rather than researched.
- **RES-V1** — validating RES-R1's 544 AU records: contract, ID, and **taxonomy consistency
  across three universities that each derived `degree_level` differently** (AQF codes / title
  tokens / exact AQF value strings). Nobody else can do that cross-university check.
- **RES-V2** — same 544 for source truth. Two instruments, seeded, zero overlap: targeted 37 at
  each university's load-bearing derivation, random 45 for the population rate.

## 8.4b The eligibility taxonomy — RES-R3's most transferable output

`eligible_countries` is inclusion-only at country granularity, and **a large fraction of real
eligibility rules do not live at that granularity.** That is the honest explanation for this
lane's ~1% populate yield — a finding about the schema, not a research shortfall.

**Four mechanisms that do NOT reduce to a country list:**
- **National delegation** (IPO — entry requires winning your own country's olympiad first; a
  57-country participant list was found, documented as evidence, and deliberately not used)
- **Member-organisation mediation** (IYPT — and explicitly not nationality-based; a country with
  no body can found one)
- **School partnership** (Harvard GlobalWE — official example list mixes countries with US cities)
- **Visa/immigration status** (Garcia — "already hold legal documentation to be in the U.S.")

**Two that DO reduce**: citizenship (CMU AI Scholars → `United States`) and US-internal residency
tiers (Harvard CURE → `United States`, because both tiers are domestic).

**Three method rules other lanes adopted:** the forward-vs-backward framing test applied **per
page, not per organisation** (two Wharton siblings landed on opposite sides of it); RULE-ATTRIBUTION-001;
and the international-applicants-as-a-named-category distinction (Duke/FU Berlin/Parsons
confirmed-open vs Cornell/Georgetown/Harvard SSP no-statement).

## 8.4c Unmeasured defect class: wrong-target URLs in `opportunities`

RES-R3 hit a row titled *"Summer High School Programs - at BU"* whose stored URL resolves to
**Hamburg Area High School, Pennsylvania** — an unrelated institution. Unlike the other routed
fragments it is **not recognisable from row contents**: plausible title, plausible organisation,
fails only when the URL is followed.

BUG-1's 85-of-271 measurement was built on *description* signatures (restated titles, embedded
URLs, mid-word truncation). A wrong-target URL produces none of them. **So 31.4% is a floor on
that corpus, not a total.** This is the Type B failure mode RES-V2 split out for url_repair —
measured at zero in `university_programs`, **never measured in `opportunities`.**

### BASORG attempted to size it and failed — the instrument doesn't work

Two domain-matching heuristics were built against the 271 active rows and **both were dominated
by false positives**, so **no number is reported**:

- **v1** (first domain label absent from title+organization): 87 candidates, **13 of 14 sampled
  were false positives** — it compared only the leading label, so `summer.ucsb.edu` for a UCSB
  programme scored as a mismatch while `ucsb` sat right there.
- **v2** (no domain label of length >3 appears in title+organization): 107 candidates, **12 of 12
  sampled were false positives** — the length threshold excludes precisely the acronyms that would
  match: `usc`, `rsc`, `kcl`, `nyu`, `ufl`, `ed`. Legitimate different-domain cases
  (`nslcleaders.org`, `arml3.com`, `inspiritaiprojects.com`) are indistinguishable from real
  defects by this method.

Neither run surfaced a single new defect. The one true positive that appeared — the BU row — was
already known, found by **RES-R3 fetching it**.

**Conclusion: this class is not measurable by DB-side heuristics. It requires fetching each URL
and checking the landing page's identity, which is research work.** BASORG's own standing rule
applied to itself: a pattern match is a candidate, not a finding — and here the candidates were
almost entirely noise. The size of the wrong-target-URL population in `opportunities` remains
**genuinely unknown**, and sizing it needs a research lane with fetch capability.

## 8.4d DATA-TRUST EVENT: ~30% of UWA's records were wrong, self-reported

**Status: REBUILT and pushed at `d1f235a`. Final: UWA 289 → 107. The defect was 182 of 289
(~63%), not the ~30% first estimated — BASORG relayed that estimate upward as though it were a
measurement and has corrected it. No verifier or ingester consumed the defective data** — both
verification packages scope to the 544 UNSW/Sydney/Monash records and exclude UWA entirely.

RES-R1 ran the comprehensive token audit BASORG required before Adelaide, and found roughly
**86 of 289 UWA records (~30%)** carrying wrong `degree_level` values:
- **41** with `degree_level: null` sitting in the in-scope file — no null-gate existed; exclusion
  ran only on MJD-prefix or missing course-code card.
- **28** postgraduate **Graduate Diplomas labelled as undergraduate sub-bachelor** — a substring
  match on "diploma" without excluding "graduate diploma". That exclusion existed in the Adelaide
  script and was never carried across.
- **~17** standalone "Doctor of X" / "Master of X" classified as bachelor-integrated — the
  `has_bachelor` conjunction was added in the recheck pass and never applied to the original 217.

**Root cause, and a failure shape worth naming: a fix applied at the boundary rather than to the
population.** Corrected logic was applied going forward to the 93 re-checked URLs and never
back-applied to the original 217, then reported as "217 → 290 → 289, fixed." The method was
corrected; data derived from the old method stayed. It looks complete because the thing that
changed is right.

Structurally identical to Glasgow one level up: there, live rows and file rows carried different
conventions and the dedup key could not see across the boundary; here, pre-fix and post-fix records
carry different classification logic and "the fix works" cannot see across it either.

**Standing rule: when you correct a derivation, re-derive everything that derivation ever produced,
then verify the corrected output against the full input set — not against the records already known
to be affected.**

The Graduate Diploma case is the worst of the three: a postgraduate credential presented as an
undergraduate qualification is **worse than a null**, because it looks correct and a student
filtering for undergraduate programmes gets it with nothing signalling the error.

### The disclosure that matters more than the defect

RES-R1 volunteered, unprompted, that **"corpus-validated" only ever checked schema conformance and
ID uniqueness** — a validator that cannot catch a wrong-but-well-formed value. Every
"corpus-validated" claim in this package, including ones BASORG relayed upward, should be read as
**"schema-valid and ID-unique", not "correct."**

**Schema validity and semantic correctness are different properties, and a validator checking the
first passes the second silently forever.** Same distinction as a green gate meaning "no rule fired"
rather than "this is correct."

Consequence for verification design: RES-V1's contract/ID pass **correctly** cleared all 544 AU
records and would have cleared these too — they are contract-valid. Only a source-truth pass catches
this class. That is the concrete argument for both verifier lanes existing.

## 8.4e The unvetted tier IS the Drive corpus

Resolving a discrepancy BASORG introduced (relaying "214 Drive-corpus rows" into an
active-scoped brief without noting the scope) produced a better fact than the correction:

| status | Drive-corpus rows |
|---|---|
| `under_review` | **113** |
| `active` | **96** |
| `disabled` / `expired` | 5 |
| **all statuses** | **214** |

Corpus-wide `under_review` is also **113**. **Every row in the unvetted tier came from that one
import.** The Drive corpus split roughly **96 admitted / 113 held back.**

Two consequences: the quality gate performed considerably better on that import than assumed —
those 113 are a single provenance deliberately not admitted, not a random backlog. And it
sharpens the wrong-target-URL measurement: the 271 active rows are 96 Drive-corpus and 175 from
other provenances, so **a defect rate that differs by provenance is a different finding than a
uniform one.**

## 8.4f RES-R2's orphaned output FAILS contract conformance — 325 defects, no owner

RES-V1 validated the 116 records (87 summer_program + 27 remaining-category) that RES-R2 left in
open PRs when its session ended. **FAIL**: 232 missing `record_type`/`lane` fields (systemic,
all 116 records), 92 `cycle_status_found` format drifts, 1 logical-consistency defect
(Interlochen's internal year ambiguity).

**The research itself checks out** — ID discipline PASS, `finding_type` 100% clean, live-status
breakdown matching, `academic_program`'s zero-row absence independently verified. **These are
shape defects, not truth defects**, and must not be read as a quality indictment of that lane.

**Nobody can fix them**: verifiers never edit researcher files, RES-R2 is gone, both ingesters
are gone. Unassigned, with `v1-5_dlopp_p2_p3_verdict.md` as the specification, for whoever
inherits the opportunities research territory.

**#41 was merged carrying these defects** (ORYN-CEO, before the verdict landed, disclosed
unprompted). The right call regardless: contract defects bite at **ingestion**, not at merge, and
merging research proposals makes nothing a live fact. Recorded in founder-backlog item 34 — in a
place a future ingester actually reads, rather than only in a verdict file. **Loud failure on 325
contract violations is fine; silent acceptance by a lenient path is not.**

**Interlochen now has three independent sightings** — RES-R2's original research, RES-V2's
browser re-fetch (live `2027-01-15` against a page headed "Camp 2026"), RES-V1's internal
consistency check. Same projection pattern as Ron Brown. Will not be applied without resolution.

## 8.4g MERGE-1 is alive but unresponsive

Verified in `ListAgents` (2h uptime) — **not gone, not answering.** Three unanswered questions
across two senders (two from ORYN-CEO, one from BASORG about #41). **Work queued to it should be
planned on the assumption it will not move.** #32 remains open and carries the rest of the batch
above.

Distinct from the six sessions that exited outright. A lane that is alive and silent looks
identical in a session list to one that is working.

## 8.4h A reconciliation that closed perfectly on three wrong terms

**BASORG's own error, and the sharpest instance of "a pattern match is a candidate" all day —
because here the match was arithmetic and it was exact.**

RES-R1 reported UWA's exclusion categories as reconciling against 422. They didn't close from
the numbers given: 202 excluded + 107 included = 309, leaving 113 unaccounted. BASORG formed a
hypothesis — the missing 113 are the `MJD-` major pages, excluded by prefix rather than by the
token classifier — and **113 + 202 + 107 = 422 exactly.** Clean close, no remainder.

**It was wrong.** The actual terms: **108** in scope (pre-dedup) + **106** MJD majors + **202**
title-excluded + **6 fetch failures** = 422. The guessed 113 silently absorbed the 6 fetch
failures and the 1-record dedup offset — **three errors that happened to cancel.**

Had the hypothesis been accepted, the wrong model would have been carried forward permanently:
no fetch-failure term, an inflated major count, and no distinction between raw script output and
post-dedup total. **It would never have failed a later check, because it closes.**

A number that fits is not a verified number. Distinct from the other pattern-match instances and
worth keeping separate: those were matches that were *plausible*; this was a reconciliation that
was *exact*.

The reporting gap that caused it is also worth naming: RES-R1 gave the title-exclusion breakdown
and the **post-dedup** final, omitting the MJD term — two different problems (an omitted term and
a stage mismatch) that together looked like one missing category. **Report raw accounting and any
post-hoc steps as separate stages.**

## 8.4i The validator now has tests, and the tests have been kill-tested

`scripts/validate-research-records.ts` — the artifact with **nine known bugs, all found by RES-V1
while using it** — now has `__tests__/scripts/validate-research-records.test.ts`, 53 tests,
weighted toward false positives (the failure mode that nearly cost the url_repair batch and would
have failed 8 correct records).

Two things make it trustworthy rather than merely present:
- **The suite was kill-tested**: bug #3 was deliberately reintroduced, the suite run, exactly one
  test failed and it named the right one, then the file was restored and the suite re-run clean.
  **A test suite nobody has seen fail is an assertion, not a control.**
- **The supporting refactor was proven behaviour-preserving** by running the pre-refactor committed
  script against real P1 data and matching 23 defects / 20 findings exactly — not by typecheck.
  Extraction refactors are exactly where silent behaviour change hides.

The standing condition is now satisfied rather than merely restated: hand-run without tests was
acceptable; wired into an automatic path it needed these first.

## 8.5 If you inherit this org

1. **Ask each lane what it holds before assigning anything.** Never assume a slot is free.
2. **Verify claims against the artifact, not the report** — including your own. This lane made
   six withdrawn claims (§7); three were one error, trusting an upstream statement because of
   its source.
3. **A pattern match is a candidate, not a finding.** Five instances in one afternoon.
4. **Report anomalies, not totals.** Glasgow's 69 duplicates were caught because a lane
   reported "101 net-new where siblings gave 3 and 2" instead of "106 accepted, zero failures."
5. **Never route around a permission denial**, including for a subordinate or a superior. Seven
   instances held today.
