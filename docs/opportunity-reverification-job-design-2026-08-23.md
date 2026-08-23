# Opportunity re-verification job — design

**Status:** design only. No code, no migration, no scheduler, no database write.
**Date:** 2026-08-23. **Author lane:** ORYN-PRODUCT.
**Implements:** AGENTS.md Phase 30 Job B ("upcoming deadline validation") and Job E ("stale data
detection"), which `lib/opportunities/lifecycle.ts` names as the only real fix for the blind spot
it documents.

---

## 0. Summary

Three read-time guards in `lib/opportunities/lifecycle.ts` now correctly exclude closed cycles,
past deadlines, and (as of #143) deadline-less rows with no verification record. None of them can
see an opportunity that closed quietly without anyone recording a date. Only going back to the
source on a schedule can.

This document specifies that job. Its first purpose is to **rescue** the 51 opportunities the new
third guard currently excludes, by actually reading their pages — not to police them.

The design's load-bearing commitment: **an unreadable source is an absence of evidence, never
evidence of absence.** Every failure path below is built so that a page we could not read leaves
production truth exactly as it was.

---

## 1. What I re-measured, and three places the brief is wrong

All figures below were measured today (2026-08-23) against project `qtcvcflzxbuagvvwahhu`,
read-only. Where they differ from the brief I have said so rather than designing around a false
premise.

| Claim in brief | Measured | Verdict |
|---|---|---|
| 392 rows in `opportunities` | 392 | Confirmed |
| 271 `active` | **272** | Drifted by 1 during today's work. Immaterial, but the corpus is moving under us. |
| 51 counselor-recommendable, deadline-less, never verified | 51 | **Confirmed exactly**, reproducible predicate in §9.1 |
| Age-based staleness is a no-op (oldest `last_verified_at` = 2026-08-15) | Confirmed; 0 rows older than 30 days | Confirmed |
| Stanford Anesthesia is `active`, `cycle_status='upcoming'`, deadline null | `active`, **`cycle_status='closed'`**, deadline null, `verified_at='2026-08-15'` | **Stale.** Already fixed since `lifecycle.ts` was written. See §1.1. |
| Rows carry `verification_state='verified_current'` while `last_verified_at IS NULL` — "the enum asserts a verification the timestamp says never happened" | Literally true, but the framing is wrong | **Misdiagnosed.** See §1.2 — this is the most consequential finding in this document. |

### 1.1 The canonical live example no longer exists

`lifecycle.ts` cites Stanford Anesthesia Summer Institute (`2f842782-…`) twice as the confirmed
live case of a quietly-closed row. It is now `cycle_status='closed'`. A researcher fixed it
between that comment being written and today.

This does not weaken the case for the job — it strengthens it. The row was corrected by a human
reading the page, which is exactly the manual labour that does not scale to 272 active rows. But
two comment blocks in `lifecycle.ts` now cite a live example that is no longer live, and the "100
active rows with a null deadline and `cycle_status='unverified'`" figure in the same comment is
now 86. **Flagging, not editing** — that file belongs to the lane that shipped #143.

There is no longer a *confirmed* instance of the quietly-closed shape in the corpus. That is a
statement about our detection capability, not about the corpus: the shape is undetectable from
stored data by construction, so "we cannot currently point to one" is exactly what a corpus full
of them would also look like. The design proceeds on that basis, and the dry run in §9 is
partly an experiment to find out how many there really are.

### 1.2 There are two verification timestamps, and the gate reads the one that was never written

`opportunities` has **both** `last_verified_at` (migration 0008, the original Phase 29 freshness
column) and `verified_at` (migration 0041, added alongside `verification_state` and
`cycle_status` as part of the verification taxonomy).

Measured across all 392 rows:

| | count |
|---|---|
| Neither timestamp set | **0** |
| Both set | 116 |
| Only `verified_at` set (`last_verified_at IS NULL`) | **85** |
| Only `last_verified_at` set | 191 |
| Of the 85: carry `verification_state='verified_current'` | **85 (all)** |
| Of the 85: carry `verification_state` ≠ `verified_current` | 0 |

Every row in the corpus has been touched by *some* verification pass. The 85 rows the third guard
treats as "never verified" are the rows written by the 0041-era research pipeline, which recorded
its result in `verified_at` — its own paired column — and never wrote the older `last_verified_at`.

So the enum is not lying. It is corroborated by the timestamp that was designed to pair with it.
`last_verified_at IS NULL` is currently a proxy for **"which pipeline generation wrote this row"**,
not for "was this ever verified."

Narrowing to the 51 rows the guard actually excludes:

- **51/51** have `verified_at` set
- **51/51** carry `source_confidence='high'`
- **34/51** have a provenance row in `opportunity_sources`

**The tempting fix is wrong.** A reconciliation pass that copies `verified_at` into
`last_verified_at` would rescue all 51 rows instantly, cost nothing, and require no page to be
read. It would also convert a bookkeeping artifact into a verification claim — manufacturing
exactly the false confidence the guard exists to prevent. Do not do it.

**But the guard is not vindicated either.** Neither column currently means "a machine read the
source page and confirmed this claim":

- 138 of 201 `verified_at` values are exactly midnight UTC, and 214 of 307 `last_verified_at`
  values likewise — hand-entered dates, not machine timestamps.
- Stanford Anesthesia carried `verified_at='2026-08-15'` *while its page said closed*. A
  populated `verified_at` did not prevent the corpus's flagship stale-open row.

**Design consequence.** The job must not reconcile the two existing columns. It must establish a
third, unambiguous fact — *a machine attempted a read on this date, and here is what it found* —
recorded in a purpose-built place (§8). Only a P1 outcome may write `last_verified_at`. The two
legacy columns are left exactly as they are; disentangling them is a separate data-hygiene job,
and this design deliberately does not touch them.

### 1.3 "Job B" is already taken by something that is not Job B

`app/api/jobs/deadline-reminders/route.ts` documents itself as "Phase 30, Job B". But
`lib/deadlines/scan.ts` sends *notifications* about deadlines already in the database — it never
re-reads a source. Deadline *validation* against the source is unbuilt, as the brief says; the
name is not free. This job is `opportunity_reverification` to avoid the collision, and the stale
comment on the reminders route should be corrected by whoever owns it.

### 1.4 Infrastructure that already exists and should be reused

| Component | State | Reuse |
|---|---|---|
| `app/api/jobs/<name>/route.ts` + `verifyCronRequest` (CRON_SECRET bearer) | 4 jobs live | Yes — same pattern |
| `lib/jobs/run-with-tracking.ts` → `external_sync_jobs` | Live; 2 recorded runs, both `deadline_reminders` | Yes — run-level audit, no new table needed |
| `provider_health` (provider, status, last_success_at, last_failure_at, last_error) | Table exists | Yes — circuit-breaker state |
| `opportunity_sources` (381 rows / 370 opportunities) | Live, append-only | Partially — see §8 |
| `entity_verification_queue` (queue_state, priority, blocker, last_checked_at, next_check_at) | Live, scoped to canonical entities | As the shape precedent for the new runs table |
| `tavilyProvider.extract(urls)` returning markdown + `failed_results[{url,error}]` | Live in `lib/providers/tavily.ts` | Yes — primary fetch tier |
| A configured scheduler | **None.** No `vercel.json`, no cron in `.github/workflows/ci.yml`. API_SETUP.md §153 says jobs "exist as protected Route Handlers rather than a cron dependency" | Must be chosen — see §2 |

The discovery pipeline (`lib/opportunities/discover.ts`) is **entirely LLM-free** — Tavily search
plus deterministic parsing. That is the precedent for §5.

---

## 2. Scheduling policy

**Cadence: daily, one bounded batch.**

There is no scheduler configured today, so "daily" is a requirement this design places on
deployment, not a description of what happens. Concretely, one of:

1. Vercel Cron via a `vercel.json` entry (simplest, if the project deploys to Vercel).
2. A GitHub Actions `schedule:` workflow issuing the authenticated POST (works regardless of host;
   `ci.yml` already exists to extend).
3. Supabase `pg_cron` + `pg_net`.

Recommend (2) — it is host-independent, its logs are already where the team looks, and it does not
depend on the Vercel plan tier that §5 shows constrains batch size.

**Time: 02:15 UTC.** Off-peak for a student user base spanning US/UK/Europe/Turkey (worst case
21:15 US Pacific, 05:15 Turkey), so a run that misbehaves degrades nothing anyone is looking at.
The :15 offset keeps it clear of the top-of-hour congestion every other scheduler fires into.

**Why daily rather than weekly.** The batch is bounded at ~25 rows (§5). Daily × 25 covers the
272-row active corpus every ~11 days; weekly × 25 would take 11 weeks, which is slower than the
fastest TTL bucket needs and would let an open-cycle row go a full quarter without a look. Daily
also means a bad run costs one day of coverage, not a week.

**Why one job rather than separate B and E.** Phase 30 lists deadline validation and stale-data
detection separately, but they are the same fetch of the same page differing only in what is
compared afterwards. Running them as two jobs would double the fetch cost for zero additional
information. This job does both and reports them as separate outcome classes.

**Steady state vs. cold start.** On day 1 every row is due (nothing has a machine-check record),
so the backlog is ~272 and drains at 25/day over ~11 days. After that the due set is far smaller
than the batch cap on most days — with the TTLs in §3 the steady-state daily due count is roughly
15–20 rows. The batch cap is a ceiling, not a quota; the job checks what is due and stops.

---

## 3. Freshness TTL

TTL answers one question: **how long can this row's claim be wrong before a student is harmed by
it?** Not "how often does this page change" — how fast does staleness become damage. Every number
below is argued from that, and the buckets are sized from measured corpus counts.

### 3.1 By lifecycle state

Active-row counts measured today (272 total).

| Bucket | Rows | TTL | Why this number |
|---|---|---|---|
| `open`, no deadline | 24 | **7 days** | The highest-risk shape in the corpus. Oryn asserts "you can apply now" with nothing dated behind it, so nothing except a re-read can falsify it, and it is fully exposed to recommendation. 7 days bounds the harm window to one school week. |
| `open`, future deadline | 11 | **7 days**, forced to **3 days** inside T-14 | A dated commitment can still move, and cohorts fill early. The tightening at T-14 is not arbitrary: `REMINDER_THRESHOLDS` in `lib/deadlines/scan.ts` starts notifying students at 14 days out, so that is exactly when Oryn's outbound claim rate rises. Data behind an active push should be days old, not weeks. |
| `upcoming`, no deadline | 18 | **7 days** | The Stanford Anesthesia shape precisely — the one shape with a confirmed historical failure and no date that can ever self-heal it. Tied for tightest for that reason alone. |
| `upcoming`, future deadline | 16 | **14 days** | A future dated commitment exists and the read-time deadline guard already protects the student if it passes. What we are watching for is the date moving, which is a slower and rarer event than a cycle closing. |
| `date_not_announced` | 44 | **21 days** | By definition the source has nothing new to say most of the time; we are waiting on an announcement. Daily checking burns budget on a page that is unchanged by construction. 21 days risks being at most three weeks late to an announcement — acceptable, because the announcement itself is followed by an application window measured in months. |
| `unverified` | 86 | **30 days** | Largest bucket, lowest urgency: 74 of the 86 also carry `verification_state='unverified'`, so they cannot reach a recommendation surface at all. This is backlog, not risk. It gets the leftover budget. |
| `closed` / `historical` | 73 | **45 days** | Already non-actionable at read time, so staleness here produces **false negatives** (a reopened cycle stays hidden), not false positives. Cheaper failure, slower cadence. Not longer than 45 days because an annual programme that closed in spring reopens in autumn; 45 days guarantees we notice a reopening within about six weeks. |
| `discontinued` | 1 | **180 days** | One row, under review, not worth budget. |

### 3.2 By opportunity type

The brief is right that a fixed-annual competition, a rolling journal, and a between-cycles
programme do not decay alike. State alone does not capture this, so a second TTL is computed from
type and **the tighter of the two wins**: `effective_ttl = min(state_ttl, type_ttl)`.

| Type | TTL | Why |
|---|---|---|
| **Fixed-annual** (deadline recurs near the same calendar date) | **Phase-dependent**: 30 days when more than 90 days from the anniversary of the last known deadline; **7 days** within 30 days of it | A flat TTL is actively wrong here. Between cycles the page is frozen and weekly checks buy nothing; approaching the anniversary, everything changes at once. Tying the cadence to the anniversary spends the budget where the information is. |
| **Rolling / continuous** (no cycle to miss) | **60 days** | What can change is whether the programme still exists, which is slow. Being 60 days stale on a rolling programme means recommending something that almost certainly still runs; checking it weekly costs 8× for near-zero information gain. |
| **Between cycles** | inherits `date_not_announced` / `closed` above | Already covered by state. |
| **Unclassified** | no type TTL; state TTL governs | Default. |

**Honest limitation: this table is largely unenforceable today.** There is no `deadline_mode`
column on `opportunities` — `lifecycle.ts` documents it as "approved in principle and deliberately
NOT implemented", and I confirmed it is absent from the live schema. Without it, "rolling" cannot
be selected. `category` is a weak proxy (`online_program`, `volunteering` skew rolling — measured
3 and 5 rows respectively in the `open`/no-deadline bucket) but it is a proxy, not a declaration,
and treating it as one would be the same class of error as trusting `verification_state`.

So: **ship with state TTLs only.** The type dimension activates when `deadline_mode` lands. Until
then a genuinely rolling programme is checked on the `open`/no-deadline 7-day cadence — wasteful,
but wasteful in the safe direction, and the waste is bounded at ~8 rows.

### 3.3 Freshness never gates recommendation on day one

`MAX_VERIFICATION_AGE_DAYS` stays `null`. `lifecycle.ts` is right that an age threshold today
would exclude nothing while looking protective. It should be set to a real number only once this
job has been running long enough that a stale timestamp means "the job tried and could not
confirm" rather than "the job has not reached this row yet" — i.e. **not before two full corpus
passes (~22 days) of steady operation.** Turning it on earlier would mass-exclude rows for the
sole reason that the job is young.

---

## 4. Prioritisation by exposure and risk

### 4.1 The ranking function

Additively weighted, not multiplicative. Phase 38 explicitly warns against blindly multiplying
priority factors "if it produces unstable behavior", and a product of five normalized terms
collapses to near-zero whenever any single term is small — which would let one zero factor
(e.g. a row with no matches yet) mask genuine risk.

```
priority =
    0.40 × exposure_norm
  + 0.25 × risk_weight
  + 0.25 × overdue_norm
  + 0.10 × saved_norm
```

**`exposure_norm` = (max_match_score / 100) × (n_eligible_users / n_active_users)**

This is the brief's "matched to every user and ranked highly" made concrete: both terms must be
high to score high. Measured across the 51: `max_match_score` spans 51–91, `n_eligible_users`
spans 0–7 against 7 active users, giving `exposure_norm` from 0.00 (3 rows with no matches) to
0.91 (JA Company Programme).

**`risk_weight`** — probability the stored claim is wrong *and* that being wrong sends a student
somewhere they cannot act:

| State | Weight |
|---|---|
| `open` no deadline / `upcoming` no deadline | 1.0 |
| `open` with deadline | 0.8 |
| `upcoming` with deadline / `date_not_announced` | 0.5 |
| `unverified` | 0.3 |
| `closed` / `historical` | 0.2 |

**`overdue_norm` = clamp(days_since_last_machine_check / effective_ttl, 0, 2) / 2**

Saturating at 2× TTL is deliberate. An unbounded age term lets one ancient, irrelevant row
outrank a high-exposure row indefinitely — age would eventually dominate every other signal.
Saturation caps how much staleness alone can buy.

**`saved_norm` = min(n_saved, 3) / 3.** Only 3 `saved_opportunities` rows exist corpus-wide, so
this term does almost nothing today. It is weighted 0.10 precisely because it is currently
near-useless but becomes a genuine intent signal as usage grows. An explicit save is the strongest
statement a student makes about an opportunity, and the ranking should already be listening.

**Tie-break:** deadline ascending (nulls last), then `id`, for run-to-run determinism.

### 4.2 The 51 rise to the top without a special case

A row with no machine-check record has undefined `days_since_last_machine_check`. Rule:
**treat it as `overdue_norm = 1.0` (saturated).** Every one of the 51 is in that position, so
each gets the full 0.25 overdue contribution plus its risk weight, and exposure orders them
among themselves.

Worked, using measured values:

| Row | exposure_norm | risk | overdue | priority |
|---|---|---|---|---|
| JA Company Programme (`upcoming`, no deadline, 7 users, score 91) | 0.91 | 1.0 | 1.0 | **0.864** |
| Coursera (`open`, no deadline, 7 users, score 73) | 0.73 | 1.0 | 1.0 | **0.792** |
| BIYSC (`date_not_announced`, 7 users, score 67) | 0.67 | 0.5 | 1.0 | **0.643** |
| A zero-exposure row in the same bucket as JA | 0.00 | 1.0 | 1.0 | **0.500** |
| A `closed` row checked yesterday | 0.00 | 0.2 | 0.02 | **0.055** |

The 51 occupy the top of the queue as an emergent property of the function, not as a hardcoded
exception. That matters: when they are cleared, the same function keeps prioritising sensibly
without anyone editing a special case out.

**Consequence to state plainly:** at 25 rows/day the 51 are fully re-checked in **~2 days**, and
the highest-exposure ones on **day 1**.

---

## 5. Batch size, LLM necessity, cost and runtime

### 5.1 The job does not need an LLM for the common case

The question the job asks is narrow and closed-form: *does this page still assert an open or
upcoming cycle, and does it state a date?* That decomposes into deterministic steps:

1. Fetch → markdown (`tavilyProvider.extract`, already in the codebase).
2. Match a fixed phrase set for closure ("applications are closed", "applications now closed",
   "no longer accepting", "deadline has passed", "check back") and for opening ("applications
   open", "apply by", "deadline:").
3. Regex date candidates.
4. Compare against stored `cycle_status` / `deadline`.

None of that needs a model, and `lib/opportunities/discover.ts` is already LLM-free precedent.
**The cheaper answer is defensible, so it is the answer.**

**Where a model earns its place: adjudicating disagreement only.** When the deterministic pass
finds closure language on a row stored as open (or the reverse), a single small-model call over
the matched ~2KB excerpt classifies it, returning a Zod-validated structured verdict per Phase 26.
It is a classifier over text we already fetched — never a fact source, never asked "when is the
deadline for X", which is precisely the shape that fabricates.

*Assumption:* 15–25% of checks disagree initially. The corpus was hand-verified within the last
eight days, so most rows should agree; this rate should fall as the corpus stabilises and should
be measured in the dry run rather than trusted.

### 5.2 Batch size: 25 rows/day

Chosen against the runtime ceiling, not picked round:

- 25 URLs, Tavily Extract batched 5 per request = **5 requests**
- Basic-depth extract typically 2–6s per request; 5 × 6s worst case = 30s
- 1s inter-request politeness pause × 4 = 4s
- ≤5 adjudication calls × ~3s = 15s
- **Total ≈ 49s worst case, comfortably under 60s**

**This constraint is real and may bind.** A Vercel Node serverless function allows 60s on Pro but
**10s on Hobby**. If the deployment is Hobby, 25 rows will time out and the batch must drop to
~8 rows/day (which stretches a full corpus pass from 11 to 34 days), or the job must move to a
Supabase Edge Function or an external runner. *I did not verify the deployment tier* — there is no
`vercel.json` in the repo and no deployment config I could read. **This needs confirming before
the batch size is fixed.**

**Per-domain cap: 2 fetches per run.** Measured, the 51 span **47 distinct domains** with a
maximum of 2 rows on any one (genclikhizmetleri.gov.tr, girlup.org, precollege.sps.columbia.edu,
stonybrook.edu). So the cap costs nothing today and prevents hammering a single host if the corpus
grows lopsided.

### 5.3 Cost

Expressed as volumes rather than dollars, because I would be guessing at current rates —
API_SETUP.md documents no credit figures, noting only "rate limiting on the free tier if the
discovery job runs too often."

| Resource | Daily | Monthly | Assumption |
|---|---|---|---|
| Tavily Extract requests | 5 | ~150 | 5 URLs/request at basic depth |
| Tavily credits | ~5 | ~150 | **Assumes 1 credit per 5-URL basic extract.** Confirm against current Tavily pricing. |
| LLM calls | ~5 | ~150 | At the assumed 20% disagreement rate |
| LLM tokens | ~11.5K | ~350K | ~2K input + ~300 output per call |
| Wall clock | ~50s | — | §5.2 |

At Haiku-class pricing 350K tokens/month is cents. Even at Sonnet-class it stays in low single
dollars. **The dominant cost is Tavily credits, not the model** — which is the strongest argument
for keeping the model out of the common path.

---

## 6. Retry and failure behaviour

### 6.1 Outcome classes

Every attempt is classified into the project's four evidence classes plus a transport class.
**Only P1 may create or refresh production truth.**

| Outcome | Evidence class | Meaning |
|---|---|---|
| `p1_confirmed` | P1 | Official page read; stored claim supported |
| `p1_changed` | P1 | Official page read; states something different from stored |
| `p2_unreadable` | P2 | Official source exists but cannot be machine-read (403, cert failure, JS-only, empty body) |
| `p3_secondary_only` | P3 | Only a secondary source had anything to say |
| `p4_contradicted` | P4 | Read content contradicts stored data, or a claimed source fact could not be located in the fetched content |
| `transport_error` | — | Timeout, 5xx, connection reset. Not an answer; a failure to get one. |

### 6.2 In-request retry

**At most one immediate retry**, only for `transport_error`, after a 2s pause.

Never retry a 403 or 404 in-request. Those are answers — the server told us something, and asking
again immediately gets the same answer while looking like diligence. Phase 75 requires avoiding
infinite retries; a second immediate retry on a 403 is just a second 403.

**Timeout: 15s per URL** (Tavily Extract latency plus margin).

### 6.3 Row-level backoff

Backoff attaches to the **row**, not the request:

```
next_check_at = now + min(2^(attempt-1) days, 30 days)
              → 1, 2, 4, 8, 16, 30, 30, …
```

### 6.4 When to stop

**After 4 consecutive non-P1 attempts, stop scheduling the row automatically** and move it to the
human-review queue with `blocker` set to the last failure class.

Four is chosen from the backoff arithmetic, not preference: 1+2+4+8 = **15 days** of elapsed
attempts. Long enough that a transient outage (rockefeller.edu's 0-byte response) resolves on its
own; short enough that a permanently-hostile domain (maa.org's 403) stops consuming budget inside
about two weeks.

Measured blast radius: across the three known-hostile domains the corpus holds **4 rows total,
2 of them active** (rockefeller.edu ×2 / 1 active, maa.org ×1 / active, cjsjournal.org ×1 /
inactive). The review queue will not flood.

### 6.5 Run-level circuit breaker

If more than **50%** of a run's attempts end in `transport_error`, abort the remainder, mark the
run degraded, and write `provider_health` (`provider='tavily'`, `status='degraded'`,
`last_failure_at`, `last_error`). That table already exists with exactly these columns — reuse,
not new schema.

A whole-job wall-clock budget of **90s** with a clean early stop: a partial batch that records
what it did is strictly better than a killed process that records nothing.

---

## 7. Source-unavailable handling

> **An unreadable source is an absence of evidence, never evidence of absence.**

This is the section the design exists to get right. maa.org returns 403 to automated fetches;
cjsjournal.org has a broken certificate chain; rockefeller.edu returned 0 bytes; some pages are
JS-rendered and their real content never appears in fetched HTML. None of that says a programme
closed.

### 7.1 What P2 writes, and what it must never write

**Writes:**
- One run record: `outcome='p2_unreadable'`, `evidence_class='P2'`, the HTTP status or error
  class, the URL attempted, the fetch method
- `next_check_at` per §6.3, `consecutive_failures` incremented

**Must never write — each for a specific reason:**

| Column | Why not |
|---|---|
| `cycle_status` | A 403 from maa.org means MAA has a bot filter, not that the AMC stopped running. **P2 must never map to `closed`.** |
| `verification_state` | A moderation/taxonomy judgment, never a fetch outcome |
| `last_verified_at` | **The subtle one.** Refreshing freshness on a *failed* read would make an unread row look freshly verified — exactly the lie the third guard exists to prevent, reintroduced by the job meant to fix it. Only P1 touches this column. |
| `deadline` | Nothing was read |
| an `opportunity_sources` row | That table means "we retrieved this." A failed fetch retrieved nothing. |

Net effect of a P2: the row is untouched and the student-facing surface is exactly as it was. The
only thing that changed is that we now know we tried.

### 7.2 A 200 response is not a successful read

Three guards before any content is parsed, each encoding a specific failure observed today:

1. **Content-length floor — reject below 500 characters of extracted markdown.** rockefeller.edu
   returned 0 bytes; a JS-rendered page returns a shell. Without this floor both parse as "no
   closure language found" → "still open", turning a failed fetch into a false confirmation.
2. **Page-identity check.** The content must contain a recognisable token from the opportunity's
   title or organization. Otherwise we fetched a redirect, a cookie wall, or a 404 page rendered
   with HTTP 200. This encodes today's hardest-won lesson: *"I fetched it successfully" is not
   evidence that a fetch happened* — a purported verbatim official quote was found not to exist on
   the source when independently checked. If the excerpt cannot be located in the fetched content,
   the outcome is P4, not P1.
3. **Vocabulary check.** No date-like token and no application vocabulary anywhere → treat as P2.
   A page that says nothing about applying has not answered our question.

`tavilyProvider.extract` already surfaces `failed_results[{url, error}]` in its Zod schema, so the
P2 signal is available without new plumbing.

### 7.3 P3: secondary sources may flag, never write

If the official page is unreadable but a secondary source says something (deadline moved, cycle
closed), that goes to the **review queue as a flag with the claim in notes**. It writes no
production column.

This encodes the other hard lesson: **WebSearch fabricates plausible dates** — it produced "2027"
deadlines for three programmes that were mechanically the real 2026 date plus one. A date
appearing only in a search summary and not on the official page is not a date.

Enforced mechanically in §8.3's anti-fabrication rule, not left to good intentions.

### 7.4 Fetch tiering

1. **Tavily Extract** (primary). It renders server-side, which handles a meaningful share of both
   the JS-only and 403 cases without special handling.
2. **Direct fetch** (fallback, only if Tavily reports the URL in `failed_results`) with a normal
   browser UA and a 15s timeout.
3. If both fail → **P2. Stop.** No third tier, no headless browser, no CAPTCHA handling, no
   attempt to route around a bot filter. A site that has decided not to serve automated clients
   has told us something we should respect; those rows belong in the human queue, and there are
   two of them.

---

## 8. Audit trail

### 8.1 Does `opportunity_sources` fit? Partially — and the gap is structural

**It fits P1 outcomes well.** It is precisely a "we read this URL at this time with this
confidence, here is the excerpt" record — `opportunity_id`, `source_url`, `source_domain`,
`retrieved_at`, `source_type`, `confidence`, `raw_excerpt`. It is append-only, already populated
for 370 of 392 opportunities, and already carries `source_type` values including `official_primary`
(144 rows) and `official_site` (21). A P1 outcome should insert one with
`source_type='reverification_official'` and the matched text in `raw_excerpt`.

**It cannot hold the other outcomes**, for structural reasons rather than stylistic ones:

- `source_url`, `retrieved_at` and `confidence` are all **NOT NULL**. A failed attempt has no
  retrieval time and no confidence.
- `confidence` is the `DataConfidence` enum (high/medium/low). There is no value meaning
  *"could not read"*, and mapping P2 to `low` would be a factual error — low confidence means we
  know something weakly, not that we know nothing.
- No attempt counter, no `next_check_at`, no run linkage, no outcome column.
- **Decisive:** all 381 existing rows mean "retrieved". Writing non-retrievals into the same table
  silently changes what a count of it means, for every reader present and future.

### 8.2 New table: `opportunity_verification_runs` (design only, no migration here)

Shaped after `entity_verification_queue`, which already solves this problem for canonical entities
with `last_checked_at`, `next_check_at`, `queue_state`, `priority`, `blocker`, `required_actions`.

```
id                     uuid pk
opportunity_id         uuid not null references opportunities(id) on delete cascade
run_id                 uuid references external_sync_jobs(id)
attempted_url          text not null
fetch_method           text            -- 'tavily_extract' | 'direct'
outcome                text not null   -- §6.1
evidence_class         text            -- 'P1' | 'P2' | 'P3' | 'P4' | null for transport
http_status            int
matched_excerpt        text            -- the text the verdict rests on
detected_deadline      date
detected_cycle_signal  text
proposed_change        jsonb           -- what it would write
applied                boolean not null default false
consecutive_failures   int not null default 0
next_check_at          timestamptz
error                  text
created_at             timestamptz not null default now()
```

`on delete cascade` is deliberate and safe here — these records are *about* an opportunity and are
meaningless without it. (Contrast Phase 58's warning against cascades that can destroy global
university data; this cascade destroys only the audit of a row being deleted anyway.)

A future session can answer *what was checked, when, by what, and with what outcome* from
`opportunity_verification_runs` joined to `external_sync_jobs`, with `matched_excerpt` making the
evidence itself reviewable — not just the verdict.

### 8.3 Two rules enforced at write time

**Anti-fabrication.** Reject a `detected_deadline` that equals a stored deadline plus exactly one
year *unless the date appears verbatim in the fetched content*. That is the precise shape of
today's observed fabrication (three programmes given "2027" dates that were the real 2026 date
plus one). Cheap to check, and it catches the specific failure that already happened.

**Excerpt-or-nothing.** Any run record claiming P1 must carry a non-empty `matched_excerpt` that
is a literal substring of the fetched content. No excerpt, no P1. This makes "I fetched it
successfully" mechanically unassertable.

### 8.4 No new scheduling column on `opportunities`

The scheduler needs "when did we last attempt this row?", which is
`max(created_at)` from the runs table. **Do not add a `last_machine_check_at` column** unless that
query proves slow — at 272 active rows it is free, and §1.2 is a standing demonstration of what a
third overlapping timestamp on this table costs in comprehension. If denormalization is ever
needed, it must be documented as *scheduling state* and never as evidence of verification.

Run-level tracking needs no new table: `runWithTracking('opportunity_reverification', …)` already
records start, finish, items processed and error to `external_sync_jobs`.

---

## 9. Demotion: may the job change a row, or only flag it?

**Position: yes, but asymmetrically — the job may demote, may not promote, and ships with
demotion disabled.**

The framing "demote vs. never demote" is the wrong axis. The right axis is *which direction, on
what evidence, with what reversibility.*

**For demotion:** the whole point is the Stanford Anesthesia case — a row saying open while its
page said closed. If the job can read the page and cannot act, the harm persists until a human
looks, and the human backlog is why the problem exists. Demotion is also conservative in the
direction that matters: a wrongly-closed opportunity is a false negative (a student does not see
something), while a wrongly-open one is a false positive (a student wastes effort on something
they cannot apply to, and Oryn's credibility takes the hit). The spec is unambiguous that fake
availability is the worse failure. And `lifecycle.ts` is built so a demotion is **not permanent**:
its gates "self-heal the moment ingestion refreshes `deadline` to a genuine next-cycle date."

**Against:** an unreadable page mistaken for a closed one silently shrinks a 272-row catalogue —
a parser bug that demotes 20 rows costs 7% of it. And closure language is genuinely ambiguous:
"2026 applications are closed" on a page that also announces 2027 dates means *upcoming*, not
*closed*.

**The safety envelope that resolves it:**

1. **Demotion to `closed` allowed** only when *all* hold: P1 (content floor, page identity,
   excerpt located), an explicit closure phrase matched, and **no future-dated application signal
   found on the same page**. That last condition is what handles the "2026 closed / 2027
   announced" ambiguity.
2. **Promotion to `open` never automatic.** Telling a student something is open is the claim that
   costs them effort and costs Oryn trust. The job may only *propose* it.
3. **`deadline` writes** only from a date parsed from official page body content (P1), never from a
   search summary (P3), and subject to §8.3's anti-fabrication rule.
4. **`verification_state` and `status` never written by the job.** Moderation and taxonomy
   judgments belong to humans.
5. **Volume guard:** if a single run would demote more than **10% of its batch** (≥3 of 25), it
   applies **none** of them and flags the whole run. A parser regression demotes everything at
   once; a genuine wave of closures does not arrive inside one batch of 25. This is what makes the
   "silently shrink the corpus" scenario non-silent.
6. **Ships off.** `REVERIFY_ALLOW_DEMOTION=false` until the §10 dry run is reviewed, then one week
   of flag-only operation, then on.

Under (1)+(5), a P2 can never become a demotion, because P2 never reaches the demotion path at all.

---

## 10. The dry run

Bounded, reviewable, and executable by someone who was not in this conversation.

### 10.1 Which rows: 63

**(a) The 51.** Exactly the set the third guard excludes, reproducible:

```sql
select o.id, o.title, coalesce(o.official_url, o.source_url) as url
from opportunities o
where o.status = 'active'
  and o.verification_state = 'verified_current'
  and o.cycle_status not in ('closed','historical','discontinued')
  and o.deadline is null
  and o.last_verified_at is null
order by o.id;
```

Verified 2026-08-23: returns 51 rows, 295 eligible `(user, opportunity)` pairs across 7 users,
47 distinct domains. Composition: 22 `date_not_announced`, 13 `open`, 11 `upcoming`,
5 `unverified`.

**(b) 10 known-answer controls.** Rows with `cycle_status='closed'` **and** a past deadline, where
the correct verdict is already known independently (28 such rows exist — measured 2026-08-23 — so
sample 10 at random with a fixed seed for reproducibility). This makes the dry run measure
**precision**, not merely produce output. A job that cannot recognise a closed programme as closed
must not be trusted to demote anything.

**(c) 2 hostile-domain canaries.** The active rows on maa.org and rockefeller.edu. The run must
classify both P2 and propose nothing. This is the direct test of §7's central invariant.

### 10.2 What it changes: nothing

- Zero writes to `opportunities`. `applied=false` on every proposed change.
- One `external_sync_jobs` row (`job_name='opportunity_reverification_dryrun'`).
- Run records if the table is migrated; otherwise a JSON artifact at
  `data/research/opportunities/reverification-dryrun-<date>.json`, matching the repo's existing
  convention of dated research artifacts.

**Run it as a script (`scripts/`), not through the route handler.** 63 rows exceeds the §5.2
serverless budget, and the repo already uses dated one-off scripts for exactly this.

### 10.3 What it reports

Per row: id, title, url, fetch method, HTTP status, outcome, evidence class, matched excerpt,
detected deadline, proposed change.

Aggregates:

1. **Outcome distribution** across P1-confirmed / P1-changed / P2 / P3 / P4 / transport.
2. **Disposition of the 51** — the number that decides whether the guard is helping or
   over-blocking:
   - *confirmed still open* → rescued; the guard can stop excluding them
   - *contradicted* → quietly closed, the Stanford shape, and the first real measurement of how
     common it is
   - *unreadable* → need a human
3. **Control precision** — of the 10 known-closed rows, how many were correctly identified.
4. **Canary check** — both hostile rows P2 with zero proposed changes.
5. **Per-domain fetch success rate** — which sources are machine-readable at all.
6. **Measured wall clock and Tavily credits**, against §5.3's estimates, so the assumptions there
   are replaced by numbers.
7. **Disagreement rate**, against §5.1's assumed 15–25%.

### 10.4 Acceptance gate

Nothing is enabled until all hold:

- Control precision **10/10**. Anything less blocks enablement — a parser that misses a known
  closure will also miss real ones.
- Both canaries P2 with zero proposed changes. **Any** proposed change on an unreadable source is
  a hard stop; it means §7's invariant is not actually implemented.
- A human has read the proposed changes **with their excerpts** — spot-checking the evidence, not
  the verdicts.

Then: enable daily with `REVERIFY_ALLOW_DEMOTION=false` for one week, review the flags, then
enable demotion.

---

## 11. Assumptions register

Explicit, because several of these are load-bearing and unverified.

| # | Assumption | Confidence | How to settle it |
|---|---|---|---|
| A1 | Tavily Extract bills ~1 credit per 5-URL basic-depth request | **Low** — no credit figures in API_SETUP.md | Check current Tavily pricing; measure in the dry run |
| A2 | 15–25% of checks disagree with stored data initially | **Low** — an estimate from the corpus being freshly hand-verified | Measured directly by the dry run |
| A3 | Deployment allows a 60s function; 25 rows/batch fits | **Unverified** — no `vercel.json`, no deployment config in repo | Confirm the hosting tier before fixing batch size |
| A4 | Tavily Extract resolves a useful share of JS-rendered and 403 cases | Medium — it renders server-side, but untested against these specific domains | Per-domain success rates from the dry run |
| A5 | `verified_at` reflects a real research pass, not a bulk backfill | Medium — 138/201 values are exactly midnight, suggesting hand-entered dates | Not blocking: the design deliberately never trusts this column |
| A6 | 7 active users is the denominator for `exposure_norm` | High — measured | Recompute per run |
| A7 | Closure/opening phrase matching is accurate enough to gate demotion | **Unproven** | Exactly what the 10 controls in §10.1(b) measure |

---

## 12. Out of scope

- **Reconciling `last_verified_at` and `verified_at`.** §1.2 argues the job must not do this. It is
  real data-hygiene work and it needs its own owner and its own design.
- **The `deadline_mode` column** (§3.2). Approved in principle, not implemented; the type TTLs
  wait on it.
- **Setting `MAX_VERIFICATION_AGE_DAYS`.** Not before two full corpus passes (§3.3).
- **Discovery of new opportunities.** Job A, already built.
- **University data freshness** (Phase 30 Job C). Same pattern, different corpus, separate design.
- **Fixing the stale comments in `lifecycle.ts`** (§1.1) and the mislabelled "Job B" comment on the
  reminders route (§1.3). Flagged for their owners.
