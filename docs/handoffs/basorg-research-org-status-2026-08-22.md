# ORYN research organization — consolidated status

**Lead:** ORYN-BASORG · **Reports to:** ORYN-CEO · **As of:** 2026-08-22

This is the durable copy of the research org's live map. Per
`docs/ORYN-ORG-STRUCTURE.md` §4, a report that exists only in a chat window does not
exist — this file is the one that counts.

---

## 1. Lane map — 7 of 7 staffed

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
