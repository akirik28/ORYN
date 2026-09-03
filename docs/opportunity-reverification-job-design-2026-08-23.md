# Opportunity re-verification job — design

**Status:** design only. No code, no migration, no scheduler, no database write.
**Date:** 2026-08-23. **Revised:** 2026-08-23 (rev 2, after #146). **Author lane:** ORYN-PRODUCT.
**Implements:** AGENTS.md Phase 30 Job B ("upcoming deadline validation") and Job E ("stale data
detection"), which `lib/opportunities/lifecycle.ts` names as the only real fix for the blind spot
it documents.

> **Revision note (rev 2).** Rev 1 was written alongside #143 and merged as #145. Since then #146
> corrected the guard's predicate; a second round of live source probing contradicted every
> per-domain assumption rev 1 inherited; and a parallel research lane surfaced ISSYP, a live example
> that forced a principle rev 1 assumed without stating (§7.6).
>
> **Rewritten:** §0 · §1 (measurement table, §1.1, §1.2) · **new §1.2a** (the `discover.ts` write
> path) · **new §1.5** (timestamp semantics — the core of this revision) · §2 (entirely: it was
> scheduler-prescriptive, and is now an invocation contract) · §3.1 · §3.3 · §4.1–§4.2 · §5.2 · §5.3
> · §6.4 · §6.5 · §7.0/§7.0/§7.2a/§7.3/§7.5 · **new §7.6** (provenance ⊥ liveness) · §8.2 · §8.4 ·
> **new §8.5** (`source_verified_at`) · **new §8.6** (no backfill) · §10 · §11.
>
> **Left intact:** §1.3 · §1.4 · §3.2 · §5.1 · §6.1–§6.3 · §7.1 · §7.2 · §7.4 · §8.1 · §8.3 · §9 ·
> §12. Section numbers §1.2, §3.3, §8.4 and §12 are cited by name from `lib/opportunities/
> lifecycle.ts` and have deliberately **not** been renumbered.

> **Revision note (rev 3), 2026-09-02, ORYN-31, CEO-assigned.** Not commissioned by a gap in
> rev 2 — commissioned to check whether one exists, after an unrelated pass (the dashboard
> verification-badge fix, same session) surfaced the exact blind spot §0 names: 74–75 active
> `cycle_status='unverified'` rows reaching a recommendation surface on the strength of a
> lineage timestamp, not a re-confirmed cycle. Read this document in full before writing
> anything, on the same discipline §1's own header models — and it already answers every
> question the assignment asked. **This revision does not redesign anything.** It re-measures
> what rev 2 measured (below), and closes the one gap rev 2 stated it could not close on its
> own: cost in real dollars against a real, code-enforced budget, which did not exist as a
> checkable fact on 2026-08-23 (**new §5.4**). No section is renumbered; nothing in §0–§4, §6–§12
> is edited. `lib/opportunities/lifecycle.ts`'s citations by section number remain valid.
>
> **Re-measured today, live, read-only** (project `qtcvcflzxbuagvvwahhu`) — full detail in new
> §5.4's opening table:
>
> | Figure | Rev 2 (2026-08-23) | Today (2026-09-02) | Note |
> |---|---|---|---|
> | `active` rows | 271 | **283** | Catalog growth, +4.4% over 10 days — consistent with continued research/ingestion work, not a design-invalidating shift |
> | §10.1(a) high-risk query (open/upcoming, null deadline) | 42 | **45** | Same query, re-run verbatim. Still the shape that dominates the priority queue |
> | `cycle_status='unverified'`, active | 86 | **75** | **Moved the favorable direction** — 11 fewer rows in the riskiest bucket, likely other lanes' research work closing real gaps rather than any effect of this document. Independently corroborated the same night by two different sessions computing this count from two different predicates (see this doc's own §1.2's caution about predicates: one count included a `deadline IS NULL` filter the other didn't, and the 1-row gap between 74 and 75 resolved exactly on that difference) |
> | `closed`-with-past-deadline control pool | 28 | **28** | **Unchanged.** A genuine stability check — the control population §10.1(b) samples from is not drifting |
> | Distinct users in `opportunity_matches` | 7 | **8** | `exposure_norm`'s denominator (§4.1); recompute per run as already specified |
> | ISSYP canary (`8980e51b-…`) | `under_review` / `unverified` | **unchanged** | Still `under_review` / `unverified` today — the canary in §10.1(c) is still live and still correctly outside the `status='active'` filter that would otherwise hide it from this measurement |
>
> Everything else in this document — the priority function (§4.1), the demotion envelope (§9),
> the outcome taxonomy (§6.1/§7.5), the `source_verified_at` semantic contract (§8.5) — was
> re-read against these fresh numbers and needs no change. The mechanism was built to be
> data-derived (§4.2's own point: "when #146 deleted the special population, no line of §4.1
> needed editing") and that held again, ten days and twelve rows later.

> **Implementation note, 2026-09-03.** CEO-assigned build ("build `source_verified_at`" —
> three confirmed live instances of the gap this closes: Stanford Anesthesia, ISSYP, Kadir
> Has). Built to this document as read, not redesigned — every section number, every
> invariant, every precondition below is implemented as specified. Migration 0103
> (`opportunities.source_verified_at`, `opportunity_verification_runs` per §8.2, plus one
> Postgres view, `opportunity_verification_latest`, needed to express "latest run per
> opportunity" through this app's PostgREST-only access — the one schema addition this
> document didn't anticipate, since it's pure infrastructure for a query §2.1 already
> requires). Code lives in `lib/opportunities/reverification/`, route at
> `app/api/jobs/opportunity-reverification/route.ts`. Every flagged item in §12 was also
> applied: the `machine_checked_at` → `source_verified_at` rename in `lifecycle.ts`, the
> `discover.ts` `last_verified_at` stamp removed, `JobBudgetFeature` gained
> `opportunity_reverification` at $5/month.
>
> **One assumption in this document turned out to be wrong, corrected during the build:**
> §7.2's closing line ("`tavilyProvider.extract` already surfaces `failed_results` … so the
> P2 signal is available without new plumbing") was checked against the real code, not
> trusted — `extract()`'s success path returned only `results`, silently discarding
> `failed_results` even though its own Zod schema already parsed it. Fixed in
> `lib/providers/tavily.ts` (confirmed zero existing callers before changing the return
> shape); §7.3's corroboration ladder needed this signal and would otherwise have had no way
> to read it.
>
> **The lease mechanism (§2.2) is a transient run row, not a lock** — "an equivalent
> conditional update" to `FOR UPDATE SKIP LOCKED`, the specific alternative this section
> itself offers, adapted to what this app's service-role PostgREST client can actually
> express. A new `lease_claimed` outcome value, excluded from every real-outcome
> aggregation, is this implementation's own addition to make it work; see the migration's own
> comment for the full reasoning.
>
> **Deliberately deferred, not silently skipped:**
> - §7.3 rung 4 (PDF text extraction) — a PDF-primary row fails the content-floor guard and
>   correctly lands on `p2_unreadable`/`reached_unusable`, the honest degradation §7.5's own
>   table already defines, not a misparse. Affects 6 corpus rows, 2 already miscategorized
>   faculty CVs per this document's own §7.0.
> - §7.4's P3 (secondary-source flagging when the official read fails) — the outcome value
>   exists in the schema; nothing in this pass actively searches for a secondary source on a
>   P2. A human reviewing the retirement queue (§6.4) can do this today; automating it is a
>   real follow-up, not a v1 requirement (P3 "writes no production column" regardless).
> - §10's dry run itself — not run. `runReverificationPass` (the same function the route
>   calls) is directly callable from a future script exactly as §10.2 describes, so nothing
>   about this build makes the dry run harder to add; it simply wasn't part of this pass.
>
> **Ships exactly as §9.6 and §2.4 specify: demotion disabled (`REVERIFY_ALLOW_DEMOTION`
> unset), scheduler off (not added to `vercel.json`).** Arming either is a founder/CEO
> decision, not this pass's to make.
>
> Gates: `npm run typecheck` / `npm run lint` — both green. Full suite green (336 files /
> 5285 tests as of this pass), including 98 new tests across the five pure-logic modules
> (`priority.ts`, `ttl.ts`, `classify.ts`, `demotion.ts`, `corroborate.ts`) plus the
> `lifecycle.ts` rename's own updated coverage. `run-job.ts`'s orchestration itself is
> exercised end-to-end only by composing those already-tested pieces plus the full gate —
> genuine integration testing against a real corpus is what the (not-yet-run) dry run is for.

> **§10's dry run, run for real, 2026-09-03 (CEO dispatch: "run it... tell me what it would
> have done").** Added `dryRun: true` to `RunOptions` — suppresses claimLease/writeRun/
> writeSourceVerifiedAt/applyDemotion unconditionally (automated proof:
> `__tests__/opportunities/reverification/run-job-dry-run.test.ts`, which forces
> `REVERIFY_ALLOW_DEMOTION=true` to test the SUPPRESSION specifically, not an
> already-off switch, and separately confirms the identical mocked pipeline DOES write when
> `dryRun` is false — a test that can't fail is not a proof). The route
> (`dry_run: true` in the body) bypasses `runWithTracking` entirely for a dry run rather than
> threading the flag through it — that wrapper writes a real `external_sync_jobs` row on
> every call, and "no writes" should mean exactly that, not "no writes except the job's own
> tracking metadata." `scripts/opportunity-reverification-dry-run.ts` also exists per §10.2's
> own preference, requiring a one-line no-op shim for `server-only` on the module path (that
> package is bundled inside Next.js, not a resolvable standalone dependency for a plain
> `tsx` process — its real implementation is already a no-op outside a browser, so the shim
> changes nothing about behavior, only resolvability).
>
> **Confirmed directly, not assumed, before running anything: migration 0103 is genuinely
> unapplied on the real database** (`qtcvcflzxbuagvvwahhu`/`oryn-qa-scratch`) — direct
> `information_schema` probe, zero rows for the table, the view, or the column. This also
> surfaced a real bug fixed before the run: `loadCandidatePool`'s `.select()` NAMED
> `source_verified_at` explicitly, and per this codebase's own documented rule
> (`lib/supabase/errors.ts`, "wildcard vs. named select, not read vs. write") a named column
> that doesn't exist yet fails the WHOLE query, not just that field — an unguarded version
> would have silently reported zero due candidates for a reason having nothing to do with
> what's actually due. Fixed with the same `isUndefinedColumnError`-retry pattern this
> codebase already uses elsewhere.
>
> **Bounded run: 20 rows, real Tavily/browser-UA/Wayback/Anthropic calls, zero writes.**
> Full numbers and analysis in the completion report to CEO; the headline finding is NOT the
> one this dispatch asked about — corroboration itself checked out well (2/2 unreadable
> fetches this run were falsified by a healthy Wayback capture, though n=2 is far too small
> to call a rate) — it's that **16 of 20 rows (80%) landed on `p2_unreadable`/
> `reached_unusable` via §7.6's liveness-silent path**, meaning the exact §5.1 phrase set
> this document specifies (`"applications open"` / `"apply by"` / `"deadline:"` for opening;
> five closure phrases) essentially never matches real programme pages, which phrase their
> calls to action in ways the fixed list doesn't anticipate ("Apply Now", "Enrollment open",
> "Register today", etc.). Zero P1 outcomes of either kind occurred in this sample —
> `source_verified_at` would not have been written once across 20 real, successfully-fetched
> pages. This directly answers Assumption A12 ("liveness-silent P1 rate is unproven... if
> high, §7.6 mechanism 1 is the job's primary value, not a safeguard") — measured high, not
> merely possible. Implemented exactly as this document specifies; not a bug in this pass,
> a now-measured property of the design's own phrase-matching approach that needs a decision
> before arming produces any real value.

> **Update, 2026-09-03: the phrase set, derived from real pages.**
> `docs/reverification-phrase-set-corpus-2026-09-03.md` — CEO dispatch: "derive the phrase
> set from real pages instead of from intuition," after the finding directly above. A
> stratified 49-page sample (all 12 categories, 6 cycle_status values, not the
> priority-ranked due-set) read by hand found the dominant failure was word order/tense, not
> only missing vocabulary — real pages write "is now closed," never the hardcoded
> "applications now closed." `classify.ts`'s §5.1 phrase set is extended with 8
> evidence-traced regex patterns (each cited to a specific real page in the file's own
> comment) and "check back" is removed as a standalone closure trigger (a confirmed
> false-positive source, 3 separate instances across two passes). Re-running dry run #1's
> exact same 20-row population: **0 P1 outcomes → 8 p1_confirmed + 1 p1_changed**, the one
> change being a genuine Stanford-Anesthesia-shape catch (USC Pre-College: stored open,
> page says "are now closed"), confirmed by adjudication, correctly not applied. On the
> broader 46-row sample, still 67% liveness-silent even after the fix — a real improvement,
> not a solved problem; A12 remains answered on the pessimistic side. Two things measured
> and deliberately not fixed here: a real share of the corpus is Turkish with zero English
> signal (structural, not a tuning problem), and a genuine false-positive trap (Columbia's
> own course-filter UI, literal "Status - Any - Open Closed") argues against a blunter,
> unanchored expansion.

---

## 0. Summary

Three read-time guards in `lib/opportunities/lifecycle.ts` exclude closed cycles, past deadlines,
and rows with no verification evidence at all. None of them can see an opportunity that closed
quietly without anyone recording a date. Only going back to the source on a schedule can.

This document specifies that job. **Rev 1 said its first purpose was to rescue the 51 rows the
third guard excluded. That number is now 0** — #146 narrowed the predicate from `last_verified_at
IS NULL` (which measured pipeline lineage, not evidence) to "no deadline commitment *and* neither
verification timestamp set", and no row in the corpus is in that state. Re-measured today: 392
rows, **0** with both timestamps null. There is no rescue backlog. The job's purpose is therefore
the one it always should have been:

**To create a fact that does not currently exist in this database** — *"Oryn fetched this
opportunity's official source on this date and established its decision-critical facts"* — and to
keep that fact fresh. Every timestamp on `opportunities` today is either a hand-entered date or a
record of which pipeline touched the row (§1.5). None of them can support the claim the product
needs to make, and no amount of reconciling them will produce it. Only a fetch produces it.

The design's load-bearing commitment is unchanged and now has sharper evidence behind it: **an
unreadable source is an absence of evidence, never evidence of absence.** Today's probing (§7.0)
found that readability is not even a stable property of a domain — the same host returned 403 and
200 to the same tool minutes apart depending only on a request header. Every failure path below is
built so that a page we could not read leaves production truth exactly as it was.

And one principle that justifies the job in a single sentence, added in this revision because rev 1
assumed it without ever stating it:

> **Provenance and liveness are orthogonal.** The P1–P4 taxonomy answers *"is this claim supported
> by its source?"* Phase 30 answers a different question: *"does this thing still exist?"* A record
> cannot be treated as current merely because its claims are well-sourced.

ISSYP (§1.1) is the proof: its eligibility text is among the cleanest P1 evidence in the corpus — a
formal Eligibility section, quoted verbatim from the official domain — for a programme that has not
run since 2023. Perfect provenance, zero liveness. No amount of source-quality work finds that; only
re-reading on a schedule does. This is why §8.5's `source_verified_at` asserts that *decision-critical
facts* were established, not merely that a source was read.

---

## 1. What I re-measured, and where the inputs to this revision were wrong

All figures below were re-measured today (2026-08-23) against project `qtcvcflzxbuagvvwahhu`,
read-only. Rev 1's own figures are re-checked here too, not assumed. Where anything differs from
the brief that commissioned this revision, or from rev 1, it is stated rather than designed
around.

**Held steady since rev 1** (same numbers, re-run): 392 total rows · 0 with both timestamps null ·
116 both set · 85 only `verified_at` · 191 only `last_verified_at` · 138/201 `verified_at` values
at exactly midnight UTC · 214/307 `last_verified_at` likewise · 51 rows matched by the *old* #143
predicate · 28 `closed`-with-past-deadline control candidates · 381 `opportunity_sources` rows
across 370 opportunities · 3 `saved_opportunities` · 7 users with matches.

**Moved since rev 1:**

| Figure | Rev 1 | Today | Note |
|---|---|---|---|
| `active` rows | 272 | **271** | Back to the #143 figure. The corpus oscillates by ±1 during a working day; no design number should be tuned to it. |
| Rows excluded by the third guard | 51 | **0** | #146. The predicate now requires *both* timestamps null. This is the change that reframes §0, §4 and §10. |
| `upcoming` + future deadline | 16 | **15** | §3.1 updated. |
| `discontinued`, active | 1 | **0** | That bucket is now empty; the TTL row is kept for when it is not. |
| `unverified`, active | 86 | **86** | Steady. |

**Contradicted outright** — three claims in the brief for this revision did not reproduce. See
§7.0 for the probe data; all three point the same way, so the rule they motivate survives while
every specific fact behind it changes:

| Claim | Measured today | Verdict |
|---|---|---|
| "`maa.org` returns 403 to some tools but not others — WebFetch succeeded where curl failed" | 403 to **both** curl (with and without a browser UA) and WebFetch, on root and deep path, 103-byte body | **Did not reproduce.** maa.org is currently 403 to everything tried. |
| "`ku.edu.tr` returns 403 to every tool tried" | `www.ku.edu.tr/en/` → curl **200, 332 KB**; WebFetch **403**. `research.ku.edu.tr` → curl with browser UA **200, 220 KB**; curl bare **403, 919 B** | **Contradicted, and more usefully so.** The same host, same tool, same minute, flips on the User-Agent header alone. |
| "`cjsjournal.org` has no working HTTPS at all" | Neither scheme connects, but the cause is **DNS: `Could not resolve host`** — not a certificate problem | **Misdiagnosed.** A different failure with different meaning (§7.5). |
| "`ukmt.org.uk` returns 403 to some tools" | `https://www.ukmt.org.uk/` → **301** → `https://ukmt.org.uk/` → **200, 368 KB** | **Not a 403 at all** — an unfollowed redirect. Also: **zero rows** in the corpus point at ukmt.org.uk, so it has no blast radius here. |
| `rockefeller.edu` "returned 0 bytes" (rev 1) | **Connection timeout** after 20 s | Transport error, not an empty body. Reclassified in §7.5. |

The direction of every one of these corrections is the same: **we were attributing to the domain a
property that belongs to the (tool, headers, redirect policy, moment) tuple.** That is precisely
why the hard rule in §7.3 has to be mechanical rather than a matter of judgment.

### 1.1 The canonical live example, and the comments that cited it

Rev 1 flagged that `lifecycle.ts` cited Stanford Anesthesia Summer Institute as a live
quietly-closed row when the row had already been corrected to `cycle_status='closed'`. **#146 fixed
those comments**, so this is now closed rather than outstanding: both blocks read as past tense,
and the "100 active rows with a null deadline and `cycle_status='unverified'`" figure was corrected
to 86 (still 86 today).

The substantive point survives the correction. The row was fixed by a human reading the page, which
is exactly the manual labour that does not scale to 271 active rows.

**And a live example now exists again — a better one.** A parallel research lane found it tonight;
I confirmed the row directly rather than taking the description on trust, and the confirmation
changes what it proves:

| Field | Value (verified 2026-08-23) |
|---|---|
| id | `8980e51b-9889-4cb0-a6dc-e11a60a59e51` |
| title | International Summer School for Young Physicists (ISSYP), Perimeter Institute |
| `status` / `cycle_status` / `verification_state` | `under_review` / `unverified` / `unverified` |
| `verified_at` / `last_verified_at` | null / `2026-08-15 00:00:00+00` (midnight — hand-entered) |
| stored URL | `insidetheperimeter.ca/perimeter-institutes-issyp-summer-program/` |

Perimeter's own site states the programme *"will not be offered in 2024"* and it is absent from
their current student-programme directory. **The programme has been dead since 2023 and no stored
field on our row says so.**

Two precise qualifications, because ISSYP and Stanford prove *different* things and conflating them
would overstate the case:

- **ISSYP is not a "looks verified but isn't" case.** It is honestly marked `unverified` on both
  enums and is `under_review`, so it cannot reach a student. Stanford remains the sharper example of
  the dangerous shape — `verified_current` and `upcoming` while its page said closed. ISSYP is the
  sharper example of the *durable* shape: three years stale and invisible to every stored signal.
- **What makes it valuable is the orthogonality it demonstrates** (§0, §7.6). Its eligibility
  statement is the cleanest P1 evidence in its batch — a formal Eligibility section on the official
  domain, quoting *"International Applicants: Students around the world who meet the eligibility
  criteria are welcome to apply"* — attached to a programme that no longer runs. Provenance was
  perfect. Liveness was zero. Nothing in the P1–P4 taxonomy can catch that.

*Also worth noting from the row itself:* the stored URL points at Perimeter's **news blog**, not the
programme directory. A news article about a programme does not stop existing when the programme
does, so it will keep returning a clean 200 forever. §7.6 draws the rule out of this.

There is still no confirmed instance of the *Stanford* shape — a `verified_current` row contradicted
by its own page — live in the corpus today. That remains a statement about our detection capability
rather than about the corpus: the shape is undetectable from stored data by construction, so "we
cannot currently point to one" is exactly what a corpus full of them would also look like. The dry
run in §10 is partly an experiment to find out how many there really are.

### 1.2 There are two verification timestamps, and neither means what the guard needed

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

Every row in the corpus has been touched by *some* verification pass. The 85 rows the old predicate
treated as "never verified" are the rows written by the 0041-era research pipeline, which recorded
its result in `verified_at` — its own paired column — and never wrote the older `last_verified_at`.

So the enum was not lying. It was corroborated by the timestamp designed to pair with it.
`last_verified_at IS NULL` is a proxy for **"which pipeline generation wrote this row"**, not for
"was this ever verified."

That lineage is measurable directly. Cross-tabulating `source` against which timestamp is set:

| `source` | rows | only `verified_at` | only `last_verified_at` | both |
|---|---|---|---|---|
| `official_primary` | 156 | **85** | 0 | 71 |
| Founder counselor Drive corpus (cross-checked 2026-08-15) | 214 | 0 | **191** | 23 |
| `manual_research` + 11 named single-site rows | 22 | 0 | 0 | 22 |

**All 85** of the rows the old guard could see are `source='official_primary'`, and **all 85** are
`status='active'`. The guard was not merely mis-targeted — it selected on provenance pipeline and
excluded the highest-provenance one. #146 states this and fixes it; it is repeated here because the
same reasoning governs what the new field in §8.5 may assert.

**The tempting fix was wrong, and remains wrong.** A reconciliation pass copying `verified_at` into
`last_verified_at` would have "rescued" all 51 rows instantly, cost nothing, and required no page to
be read. It would have converted a bookkeeping artifact into a verification claim. #146 explicitly
declined it. §1.5 and §8.6 extend that refusal to the new field.

**And the guard was not vindicated either.** Neither column means "a machine read the source page
and confirmed this claim":

- 138 of 201 `verified_at` values are exactly midnight UTC, and 214 of 307 `last_verified_at`
  values likewise — hand-entered dates, not machine timestamps.
- Stanford Anesthesia carried `verified_at='2026-08-15'` *while its page said closed*. A populated
  `verified_at` did not prevent the corpus's flagship stale-open row.

**Design consequence.** The job must not reconcile the two existing columns, and must not adopt
either as its own output. It must establish a fact neither can express (§1.5), recorded in a
purpose-built place (§8). The two legacy columns are left exactly as they are; disentangling them
is a separate data-hygiene job, and this design deliberately does not touch them.

### 1.2a `last_verified_at` is written by unattended web search

One write path decides the meaning of the older column more than any other.
`lib/opportunities/discover.ts` (the insert at ~line 76) writes, in a single object literal:

```
source: "tavily",
source_url: result.url,
last_verified_at: new Date().toISOString(),
```

The timestamp is stamped at insert time from an **automated Tavily search result**, with no read of
an official page and no human in the loop. The paired `opportunity_sources` row it writes
immediately afterwards is honest about what happened — `source_type: "web_search"`,
`confidence: "medium"` — but `last_verified_at` on the opportunity itself carries no such
qualification. Anything reading that column as "verified" reads a search hit as a verification.

Two precise qualifications, because the difference matters for how urgently this is handled:

1. **No row in the corpus currently carries `source='tavily'`.** Measured today: the 392 rows split
   across the counselor Drive corpus, `official_primary`, `manual_research` and 11 named single-site
   sources. So this path has not *yet* polluted the data — the hazard is **latent in code**, not
   historical in data. That is the good case: it can be fixed before it produces a single row.
2. It is nonetheless the reason a freshness gate must never be pointed at `last_verified_at`. The
   moment Job A runs, freshly-inserted search results become the *newest* `last_verified_at` values
   in the table, and any age-based rule would rank them as the best-verified rows in the corpus.

**Flagged, not fixed here** — `discover.ts` is Job A's file and this is a design document. The
recommendation for its owner is that the insert should not write `last_verified_at` at all: the
`opportunity_sources` row already records what actually happened, at the confidence it actually
deserves.

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
| A configured scheduler | **None** (re-confirmed today). No `vercel.json`, no `schedule:` in `.github/workflows/ci.yml`, no `maxDuration` export on any job route. API_SETUP.md §153 says jobs "exist as protected Route Handlers rather than a cron dependency" | **Not needed.** Rev 1 said "must be chosen"; §2 makes the job correct without one, and it stays off |
| `runWithTracking`'s concurrency behaviour | **No lock.** It inserts a `running` row unconditionally; `external_sync_jobs` has no constraint preventing two | Reuse as-is for run audit; the guard lives in the due-set query (§2.2), not the wrapper |

The discovery pipeline (`lib/opportunities/discover.ts`) is **entirely LLM-free** — Tavily search
plus deterministic parsing. That is the precedent for §5.

### 1.5 Timestamp semantics: what each column asserts, and which one Phase 30 writes

This section exists because the founder's requirement is stated in terms of *meaning*, not storage:
we need a timestamp that means **"Oryn successfully checked the official source and established
current decision-critical facts at this time"** — not "some pipeline touched this row around this
date." Below is what each existing column can and cannot support, measured rather than assumed.

**"Decision-critical facts"** is used throughout with one fixed definition: the facts a student
would act on and could be harmed by being wrong about — **(a)** whether the cycle is currently
accepting applications, and **(b)** the application deadline, where one is stated. Not the
description, not the fee, not the age range.

#### `verified_at` (migration 0041, `timestamptz`, nullable, 201 set)

*What it actually is:* the date a **human researcher** recorded as having reviewed the row, written
by the 0041-era research pipeline alongside `verification_state` and `cycle_status`.

*Evidence for that reading:* **138 of 201 values (69%) are exactly midnight UTC**, including the
most recent one (`2026-08-23 00:00:00+00`). A machine writing `now()` produces a midnight timestamp
roughly once in 86,400 tries; 138 times is a date typed by a person, widened to a timestamp by the
column type. The full range is 2026-08-15 → 2026-08-23 — a nine-day research push, not a
continuous process.

*What it can support:* "a human asserted this row was reviewed on approximately this date."
That is genuinely worth something — it is the corpus's highest-provenance signal, and #146 is right
to treat its presence as a floor against total absence of evidence.

*What it cannot support:*
- **Any time-of-day precision.** The value is a date rendered as a timestamp. Arithmetic finer than
  one day over it is arithmetic over a rendering artifact.
- **A claim about the source.** It records that a review happened, not what the source said, nor
  that the source was reached. Nothing links it to a URL, a fetch, or an excerpt.
- **Freshness.** Stanford Anesthesia is the standing counter-example: `verified_at='2026-08-15'`,
  eight days old and among the freshest in the table, on a row whose own page said applications
  were closed. A recent `verified_at` did not prevent — and could not have detected — the corpus's
  flagship stale-open row.
- **Machine re-derivation.** Nobody can reconstruct what was checked. There is no artifact.

#### `last_verified_at` (migration 0008, `timestamptz`, nullable, 307 set)

*What it actually is:* **two different things wearing one name.** For the 214 midnight values, the
same hand-entered date semantics as `verified_at`, from the counselor Drive corpus. For the
remainder, an insert-time `new Date()` from `discover.ts` — an automated search hit (§1.2a). The
newest value in the table (`2026-08-23 15:25:58.105609+00`) has real sub-second precision, so both
kinds are live in the column right now.

*What it can support:* "some ingestion pipeline wrote this row, around this date." Its presence
distinguishes a written row from an empty one. That is all, and #146 uses it for exactly that and
nothing more.

*What it cannot support:* everything `verified_at` cannot, **plus** the ability to distinguish a
researcher's review from an unattended web search — because it holds both, indistinguishably, with
no discriminator column. A single `last_verified_at` value cannot be interrogated about which kind
it is. That property is not repairable by reading the column more carefully; it is a loss of
information at write time.

#### Neither one, and why not a third reading of them

The requirement has four parts, and the existing columns fail at least two each:

| The claim requires… | `verified_at` | `last_verified_at` |
|---|---|---|
| a **source** was fetched (a URL, at a time) | no linkage | no linkage |
| the fetch **succeeded** and returned the real page | not represented | not represented |
| **decision-critical facts** were located in the returned content | no artifact | no artifact |
| the time is a **machine event**, not a typed date | 69% typed | 70% typed, rest is a search hit |

No predicate over these two columns yields the required fact, because the fact was never recorded.
This is worth stating flatly: **the claim the product needs to make is not currently derivable from
this database at any confidence.** It is not hiding in a column we have been reading wrong. It has
to be created by doing the work.

#### What Phase 30 writes

**Neither existing column.** Phase 30 writes a new provenance-backed field, specified in **§8.5**,
plus one immutable audit record per attempt in the runs table (§8.2). The two legacy columns are
read-only to this job, forever. Concretely:

| Column | Phase 30's access |
|---|---|
| `verified_at` | **read only.** Never written, never copied from, never copied to. |
| `last_verified_at` | **read only.** Rev 1 said "only a P1 outcome may write `last_verified_at`" — **that is withdrawn.** §1.2a shows the column already means something else, and adding a third meaning to a column that holds two is how it got this way. |
| `source_verified_at` (new, §8.5) | **written, by P1 outcomes only.** |
| `opportunity_verification_runs` (new, §8.2) | **appended, on every attempt including failures.** |

The withdrawal in row two is a genuine correction to rev 1, not a restatement. Rev 1 reached for
the existing column because it was there; §1.2a is the reason that instinct was wrong.

---

## 2. Invocation contract

Rev 1 titled this "Scheduling policy", recommended GitHub Actions, and fixed the run at 02:15 UTC.
**That was the wrong shape.** It made correctness depend on a deployment decision nobody has made,
and it bound the batch size to a runtime ceiling (§5.2) that nobody has verified. This revision
replaces it with a contract the job satisfies *regardless of who calls it or how long it is given*.

### 2.1 The five required properties, and how each is obtained

The founder's requirement is that the worker be **resumable, idempotent, retry-safe, small-batch
and scheduler-agnostic**. These are not five independent features; four of them fall out of one
design decision, stated first.

> **The due set is derived from stored state, never from run state.** A row is due when
> `next_check_at <= now()` (or is null). The job holds no cursor, no offset, no page token and no
> checkpoint. "Where we got to" is not a thing the job remembers — it is a thing the data already
> says.

| Property | How it is obtained | What would break it |
|---|---|---|
| **Resumable** | Each row's outcome is committed **immediately after that row's own fetch**, as a single insert plus a single `next_check_at` update. A run killed at row 7 of 25 has 7 durable outcomes and 18 rows still due. The next invocation recomputes the due set and continues. No recovery path, because there is no partial state to recover. | Batching all writes to the end of the run. A killed run would then lose everything it learned and re-fetch it all — the failure mode that makes long jobs untenable on short runtimes. |
| **Idempotent** | Committing a row's outcome advances its `next_check_at`, which removes it from the due set. Re-invoking immediately therefore selects *different* rows, not the same ones. The runs table is append-only by design — two records of two real attempts is accurate history, not duplication — but the second attempt cannot happen inside the TTL window because the first advanced the clock. | Deriving the due set from "rows not in this run's already-processed list". That is run state, and it dies with the run. |
| **Retry-safe** | A caller that retries a timed-out POST (or a scheduler that double-fires) is safe by the same mechanism, plus the lease in §2.2 to stop two *concurrent* runs claiming the same row. Every write is a single statement; there is no multi-statement transaction that can be half-applied. | Any write that is only correct if the whole run completes — e.g. a run-level summary that mutates `opportunities`. |
| **Small-batch** | The job stops at whichever comes first of: the row cap, the caller's time budget, or the due set being exhausted (§2.3). Both limits are **inputs**, not constants. | A hardcoded batch constant, or a wall-clock budget baked into the job rather than supplied by the caller. Rev 1 had both. |
| **Scheduler-agnostic** | The job is a protected route handler that answers "what is due right now, given this budget?". It is correct when called hourly, daily, weekly, twice in one minute, or once by a human with `curl`. It never reads a clock to decide *whether* to run, only to decide *what is due*. | Any assumption of cadence — a TTL expressed as "checks per run", a rate limiter keyed to expected frequency, an alert on "job did not run today". |

**Consequence worth naming.** Under this contract, cadence is a *tuning* decision, not a
*correctness* decision. Calling the job more often makes the corpus fresher; calling it less often
makes it staler; calling it erratically does neither harm. That is what lets the scheduler stay off
without the design being incomplete.

### 2.2 Concurrency: a lease, because `runWithTracking` has no lock

`lib/jobs/run-with-tracking.ts` inserts an `external_sync_jobs` row with `status='running'` and
never checks whether one is already running. `external_sync_jobs` has no unique constraint that
would prevent it. Two overlapping invocations today would both proceed. For the four existing jobs
that is mostly harmless; for this one it means paying twice for the same fetch and writing two
outcome records for one real reading of a page.

**Row-level lease.** Claiming a row sets `next_check_at = now() + lease_duration` **before** the
fetch, in the same statement that selects it (`... FOR UPDATE SKIP LOCKED`, or an equivalent
conditional update). Two concurrent runs then partition the due set instead of colliding, and a run
that dies mid-fetch leaves the row unavailable only until the lease expires.

**Lease duration: 15 minutes.** Long enough to exceed any plausible single-row fetch including the
retry in §6.2; short enough that a crashed run costs at most one lease period of delay on the rows
it had claimed. It is deliberately *not* tied to the run's time budget, which the job does not know
in advance and which differs per caller.

This is the one place the design asks for behaviour `runWithTracking` does not currently provide.
It does not require changing that helper — the lease lives in the due-set query, not the wrapper.

### 2.3 Two independent stopping conditions, both supplied by the caller

```
POST /api/jobs/opportunity-reverification
Authorization: Bearer $CRON_SECRET
{ "max_rows": 25, "budget_ms": 45000, "allow_demotion": false }
```

Both bounds default to conservative values and both are **checked between rows, never inside one**.
A row is either fully attempted and committed, or not started. The job never abandons a fetch it
has already paid for.

- `max_rows` — hard ceiling on rows attempted.
- `budget_ms` — wall-clock budget. Before starting each row, the job checks elapsed time against
  budget minus a one-row reserve (the observed p95 single-row duration, or a conservative 8 s until
  the dry run measures it). If the next row would not fit, it stops cleanly.

The response reports what happened and what remains:

```json
{ "attempted": 18, "committed": 18, "stopped_by": "budget",
  "due_remaining": 34, "has_more": true, "degraded": false }
```

**`has_more` is the whole point of the contract.** A caller on a 10-second runtime calls the job
five times with `budget_ms: 8000` and gets the same total coverage as one caller with 50 seconds.
A caller that does not care can call it once and let the remainder wait for tomorrow. Neither is
more correct.

### 2.4 What this design does *not* decide

**The scheduler stays off.** No `vercel.json`, no `schedule:` block in `ci.yml`, no `pg_cron`. This
document does not add one and does not recommend one — API_SETUP.md's existing position, that jobs
"exist as protected Route Handlers rather than a cron dependency", is the right one and is now a
design property rather than a gap. When a scheduler is eventually chosen, no code in this job
changes.

**The deployment tier is not assumed.** Rev 1 asserted a 60 s function and sized the batch to it.
**That assumption is removed entirely**, not re-verified: there is still no `vercel.json`, no
`maxDuration` export on any of the four existing job routes, and no deployment config in the repo.
Under §2.3 the tier is no longer a design input — it is a caller-side choice of `budget_ms`. Vercel
Hobby (10 s), Vercel Pro (60 s), a Supabase Edge Function, a GitHub Actions runner and a laptop are
all valid callers with different budgets and identical semantics.

**Cadence guidance, offered and non-binding.** For whoever eventually schedules it: daily is a
reasonable starting point. At 25 rows/call it covers the 271-row active corpus in ~11 days, and the
§3 TTLs then keep the steady-state due count below the cap on most days. Weekly would leave an
open-cycle row unchecked for a quarter. But nothing in the job enforces or detects this.

**Why one job rather than separate B and E.** Phase 30 lists deadline validation and stale-data
detection separately, but they are the same fetch of the same page differing only in what is
compared afterwards. Running them as two jobs would double the fetch cost for zero additional
information. This job does both and reports them as separate outcome classes.

**Cold start.** On the first call every row is due, because no row has a `source_verified_at` and
none has a `next_check_at`. The backlog is the full active corpus and drains at whatever rate the
caller supplies. There is no special cold-start path — an empty due-set history is just the state
the job starts in.

---

## 3. Freshness TTL

TTL answers one question: **how long can this row's claim be wrong before a student is harmed by
it?** Not "how often does this page change" — how fast does staleness become damage. Every number
below is argued from that, and the buckets are sized from measured corpus counts.

### 3.1 By lifecycle state

Active-row counts re-measured today (**271** total; rev 1 said 272).

| Bucket | Rows | TTL | Why this number |
|---|---|---|---|
| `open`, no deadline | 24 | **7 days** | The highest-risk shape in the corpus. Oryn asserts "you can apply now" with nothing dated behind it, so nothing except a re-read can falsify it, and it is fully exposed to recommendation. 7 days bounds the harm window to one school week. |
| `open`, future deadline | 11 | **7 days**, forced to **3 days** inside T-14 | A dated commitment can still move, and cohorts fill early. The tightening at T-14 is not arbitrary: `REMINDER_THRESHOLDS` in `lib/deadlines/scan.ts` starts notifying students at 14 days out, so that is exactly when Oryn's outbound claim rate rises. Data behind an active push should be days old, not weeks. |
| `upcoming`, no deadline | 18 | **7 days** | The Stanford Anesthesia shape precisely — the one shape with a confirmed historical failure and no date that can ever self-heal it. Tied for tightest for that reason alone. |
| `upcoming`, future deadline | **15** | **14 days** | A future dated commitment exists and the read-time deadline guard already protects the student if it passes. What we are watching for is the date moving, which is a slower and rarer event than a cycle closing. |
| `date_not_announced` | 44 | **21 days** | By definition the source has nothing new to say most of the time; we are waiting on an announcement. Daily checking burns budget on a page that is unchanged by construction. 21 days risks being at most three weeks late to an announcement — acceptable, because the announcement itself is followed by an application window measured in months. |
| `unverified` | 86 | **30 days** | Largest bucket, lowest urgency: 74 of the 86 also carry `verification_state='unverified'`, so they cannot reach a recommendation surface at all. This is backlog, not risk. It gets the leftover budget. |
| `closed` / `historical` | 73 | **45 days** | Already non-actionable at read time, so staleness here produces **false negatives** (a reopened cycle stays hidden), not false positives. Cheaper failure, slower cadence. Not longer than 45 days because an annual programme that closed in spring reopens in autumn; 45 days guarantees we notice a reopening within about six weeks. |
| `discontinued` | **0** | **180 days** | The bucket is empty today (rev 1 measured 1). The rule is retained so the bucket is governed if it refills. |

One shape worth flagging rather than encoding: **1 active row is `cycle_status='closed'` with a
*future* deadline.** That combination is internally contradictory — a closed cycle advertising a
date still to come — and is more likely a data error than a real state. It is a single row and it
falls in the 45-day bucket, but it is exactly the sort of thing a P1 read will adjudicate, and it
is worth a human glance independently.

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
passes of steady operation.** Turning it on earlier would mass-exclude rows for the sole reason
that the job is young.

Two constraints on how that threshold is eventually wired, both of which #146 has already built the
seam for:

1. **It is measured against `source_verified_at` (§8.5) and against nothing else.** Never
   `verified_at`, never `last_verified_at`. Both are majority hand-entered midnight dates (§1.5);
   day-level arithmetic over them manufactures precisely the certainty the corrected gate exists to
   avoid. `isOpportunitySufficientlyVerified` already routes its age arithmetic through a separate
   `machine_checked_at` field for this reason — see §8.5 on the naming.
2. **A null must read as "not yet reached", never as "stale".** #146 implements this correctly
   (`if (!machineCheckedAt) return true`). It is restated here because the opposite convention is
   the natural one to reach for and would, on the day the threshold is enabled, exclude every row
   the job had not yet visited — turning the job's youth into a catalogue-wide outage.

"Two full corpus passes" is deliberately expressed in **passes, not days**. Rev 1 said "~22 days",
which silently assumed a daily cadence and a 25-row batch. Under §2 neither is fixed, so the gate
is: two complete traversals of the active corpus, whatever wall-clock time that takes.

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

**`exposure_norm` = (max_match_score / 100) × (n_eligible_users / n_matched_users)**

Both terms must be high to score high. The denominator is the count of distinct users appearing in
`opportunity_matches` — **7 today**, against 10 `profiles` rows. Rev 1 called this "active users",
which is the wrong name for what is being measured: three profiles have no matches at all, and
whether they are inactive or merely un-matched is not something this table knows. Renamed rather
than reasoned about.

**`risk_weight`** — probability the stored claim is wrong *and* that being wrong sends a student
somewhere they cannot act:

| State | Weight |
|---|---|
| `open` no deadline / `upcoming` no deadline | 1.0 |
| `open` with deadline | 0.8 |
| `upcoming` with deadline / `date_not_announced` | 0.5 |
| `unverified` | 0.3 |
| `closed` / `historical` | 0.2 |

**`overdue_norm` = clamp(days_since_source_verified / effective_ttl, 0, 2) / 2**

Saturating at 2× TTL is deliberate. An unbounded age term lets one ancient, irrelevant row
outrank a high-exposure row indefinitely — age would eventually dominate every other signal.
Saturation caps how much staleness alone can buy.

**`saved_norm` = min(n_saved, 3) / 3.** Only 3 `saved_opportunities` rows exist corpus-wide, so
this term does almost nothing today. It is weighted 0.10 precisely because it is currently
near-useless but becomes a genuine intent signal as usage grows. An explicit save is the strongest
statement a student makes about an opportunity, and the ranking should already be listening.

**Tie-break:** deadline ascending (nulls last), then `id`, for run-to-run determinism.

### 4.2 What rises to the top now that "the 51" is zero

Rev 1 built this subsection around the 51 rows the third guard excluded, and argued they would
reach the top of the queue without a special case. **#146 took that set to 0**, so the argument
needs a new subject — and it turns out to have one that was always the better target.

**On the first call, every row is maximally overdue.** A row with no `source_verified_at` has
undefined `days_since_source_verified`. Rule: **treat it as `overdue_norm = 1.0` (saturated).** All
392 rows are in that position today, so on day one `overdue_norm` is constant across the corpus and
contributes nothing to the ordering. Ranking is decided entirely by `exposure_norm` and
`risk_weight` — which is the correct behaviour, not a degenerate one: with no freshness information
to discriminate on, the queue should be ordered by how much damage a wrong row does.

**The set that rises is the 42 highest-risk rows**, and it is a better-chosen set than the 51 ever
was. Measured today: **42 active rows are `open` or `upcoming` with a null deadline** (24 + 18),
spanning **41 distinct domains**. These carry `risk_weight = 1.0` because they assert current or
imminent availability with no date behind the claim and no possibility of self-healing. Crucially,
**zero of the 42 have zero exposure** — every one is matched to at least one user, so every one is
reachable by a recommendation surface. The old 51 included 3 rows with no matches at all.

Worked, using values measured today:

| Row | exposure_norm | risk | overdue | priority |
|---|---|---|---|---|
| JA Company Programme (Europe) (`upcoming`, no deadline, 7/7 users, score 91) | 0.91 | 1.0 | 1.0 | **0.864** |
| Boston University Summer Term — High School (`upcoming`, no deadline, 7/7, score 73) | 0.73 | 1.0 | 1.0 | **0.792** |
| İTÜ Lise Yaz Okulu 2026 (`upcoming`, no deadline, 7/7, score 73) | 0.73 | 1.0 | 1.0 | **0.792** |
| A `date_not_announced` row, 7/7 users, score 67 | 0.67 | 0.5 | 1.0 | **0.643** |
| A hypothetical zero-exposure row in the 42 | 0.00 | 1.0 | 1.0 | **0.500** |
| A `closed` row checked yesterday (steady state) | 0.00 | 0.2 | 0.02 | **0.055** |

The three-way tie at 0.792 is broken by deadline-ascending-nulls-last then `id`, per §4.1 — all
three have null deadlines, so it falls through to `id`. Arbitrary but deterministic, which is what
the tie-break is for.

The 42 occupy the top of the queue as an emergent property of the function, not as a hardcoded
exception — the same property rev 1 claimed for the 51, and the reason the ranking survived the set
underneath it disappearing. **This is the argument for keeping it additive and data-derived:** when
`#146` deleted the special population, no line of §4.1 needed editing.

**Coverage, expressed without assuming a cadence:** the 42 are cleared in **2 calls at
`max_rows: 25`**, and the highest-exposure rows on the first call. At a smaller budget — say
`max_rows: 8` on a 10-second runtime — it is 6 calls. Neither is more correct (§2.1).

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

### 5.2 Batch size: a default, not a constant

Rev 1 fixed the batch at 25 rows and derived it from a 60-second Vercel Pro function. **Both halves
of that are withdrawn.** The tier is still unverified — no `vercel.json`, no `maxDuration` export on
any of the four existing job routes, no deployment config in the repo — and under §2.3 it no longer
needs to be. Batch size is a caller-supplied `max_rows`; runtime is a caller-supplied `budget_ms`;
the job stops on whichever binds first and reports `has_more`.

**`max_rows: 25` is offered as the default** because the per-row cost model supports it comfortably
where a 45-second budget is available:

- 25 URLs, Tavily Extract batched 5 per request = **5 requests**
- Basic-depth extract typically 2–6 s per request; 5 × 6 s worst case = 30 s
- 1 s inter-request politeness pause × 4 = 4 s
- ≤5 adjudication calls × ~3 s = 15 s
- **≈ 49 s worst case**

The arithmetic is unchanged from rev 1; its *status* is what changed. It sizes a sensible default,
not a ceiling the job depends on. **The per-row cost is what actually matters** — roughly **1.5–2 s
amortised**, dominated by the batched extract — because that is the number `budget_ms` divides by.
A 10-second Hobby invocation with an 8-second budget and a 1-row reserve fits ~4 rows; a 60-second
Pro invocation fits ~25; a laptop running `curl` with `budget_ms: 600000` fits the whole corpus.
All three are the same job.

**Sizing is therefore a deployment note, not a design decision.** For whoever deploys it: measure
the p95 per-row duration from the dry run (§10.3 item 6) and set `budget_ms` to the platform's
limit minus a 20% margin. Do not set `max_rows` from the platform at all — set it from how much
Tavily spend per call is acceptable.

**Per-domain cap: 2 fetches per run.** Re-measured against the corpus this now serves: the 271
active rows span **248 distinct domains**, and the 42 top-priority rows span **41 domains**. Domain
concentration is very low, so the cap costs essentially nothing today. It exists to prevent
hammering a single host if the corpus grows lopsided — and, per §7.3, because repeatedly hitting one
host is the fastest way to turn a readable domain into a 403 one.

### 5.3 Cost

Expressed as volumes rather than dollars, because I would be guessing at current rates —
API_SETUP.md documents no credit figures, noting only "rate limiting on the free tier if the
discovery job runs too often."

Costed **per row and per 25-row call**, not per day — under §2 the job has no cadence, so a daily
column would be an assumption dressed as an estimate. Multiply by whatever call frequency is
eventually chosen.

| Resource | Per row | Per 25-row call | Full pass over 271 active rows | Assumption |
|---|---|---|---|---|
| Tavily Extract requests | 0.2 | 5 | ~55 | 5 URLs/request at basic depth |
| Tavily credits | ~0.2 | ~5 | ~55 | **Assumes 1 credit per 5-URL basic extract.** Confirm against current Tavily pricing. |
| LLM calls | ~0.2 | ~5 | ~55 | At the assumed 20% disagreement rate |
| LLM tokens | ~460 | ~11.5K | ~125K | ~2K input + ~300 output per adjudication |
| Wall clock | ~1.5–2 s | ~50 s | — | §5.2 |

A full corpus pass therefore costs roughly **55 Tavily credits and ~125K LLM tokens**. At daily
25-row calls that is ~150 credits and ~350K tokens per month; at weekly, a seventh of it. At
Haiku-class pricing the token side is cents, and even at Sonnet-class it stays in low single
dollars. **The dominant cost is Tavily credits, not the model** — which is the strongest argument
for keeping the model out of the common path.

### 5.4 Cost in real dollars, against a real budget — closes the gap §5.3 left open (rev 3, 2026-09-02)

§5.3 above declined to price this in dollars because, at the time, no dollar figure existed to
check against — "I would be guessing at current rates." One now does: **`lib/ai/limits/
job-budget.ts`, merged since rev 2, is a real, code-enforced, per-feature monthly Anthropic-spend
cap**, keyed to `ai_usage.feature` and summed against `estimated_cost` on every call before it is
allowed to proceed (`assertWithinJobBudget`, `checkJobBudget`). This section prices the LLM side
of §5 against it. It does not and cannot price the Tavily side — that remains ungoverned by this
mechanism and unresolved for the reason §5.3 already gives (Assumption A1, §11).

**The LLM side is cheap, and the question is not whether it fits — it's whether it should share.**
Using §5.3's own per-call shape (~2K input + ~300 output tokens per adjudication, Sonnet 5
pricing $3/$15 per M — the same rate `job-budget.ts`'s own comment uses for
`opportunity_extraction`) puts one adjudication call at roughly **$0.0105**. At the assumed
~55 calls per full 283-row corpus pass (§5.3, 20% disagreement rate — still unmeasured, still
Assumption A2), that is **≈$0.58 per full pass**. At the offered default cadence (`max_rows: 25`,
daily — §2.4's non-binding guidance, ~11–12 calls to cover the corpus once, so a little over two
full passes per month), that's **≈$1.30–1.50/month**. Even doubling every input generously —
40% disagreement, Sonnet on every call, no Haiku routing — stays under **$3.50/month**.

**It fits inside the existing $25/mo `opportunity_extraction` budget with room to spare in raw
dollar terms. That is not the same question as whether it should share the bucket, and the
answer to the second question is no.** Three reasons, none of them about the dollar total:

1. **The existing bucket is not empty.** `job-budget.ts`'s own comment sizes
   `opportunity_extraction`'s *current* occupant — Job A's discovery pipeline — at up to 30
   Tavily-sourced extraction calls/night, "~$15/month unbounded at today's query count," inside
   the same $25 cap. Re-verification sharing that tag would be a second, unrelated consumer of a
   bucket already ~60% claimed by the job it is not part of.
2. **Shared attribution defeats the reason `job-budget.ts` exists.** The whole point of a
   per-*feature* (not per-app) budget is that `ai_usage.feature = X` answers "which job spent
   this" without a join. Tagging re-verification's adjudication calls as `opportunity_extraction`
   makes that question unanswerable from the same query the codebase already uses everywhere
   else to answer it — a genuine, avoidable regression in the exact observability this mechanism
   was built to provide.
3. **Coupled availability is the wrong failure mode for two independent jobs.** `job-budget.ts`
   stops the caller outright when the monthly cap is hit — deliberately, per its own header, the
   opposite of the student-facing degrade-to-cheaper-model policy, because "nothing is 'hit' by a
   wall" for a background job. That reasoning is correct *within* one job. Shared across two, it
   stops being harmless: a discovery-side query-count bug or a genuine growth spurt in candidate
   URLs could exhaust the shared $25 mid-month and silently stop re-verification's adjudication
   path — the one thing standing between "unverified" being an honest, temporary label and a
   permanent one — for a reason that has nothing to do with re-verification's own behaviour or
   cost.

**Recommendation: a third `JobBudgetFeature` value, own small budget.** Concretely:
`JobBudgetFeature` (currently `"opportunity_extraction" | "requirement_extraction"`) gains
`"opportunity_reverification"`, with its own `JOB_BUDGET_USD` entry and its own
`AI_JOB_BUDGET_OPPORTUNITY_REVERIFICATION_USD` env override, matching the existing pattern
exactly — this is additive to that file's own `Record`, not a restructuring of it. **$5/month is
the offered default** — roughly 3–4× the $1.30–3.50 estimate above, the same "headroom for the
number to be wrong without moving the ceiling" reasoning `job-budget.ts`'s own comment already
uses for the existing two features, sized down because this job's LLM usage is genuinely smaller
than either of them by design (§5.1: the model adjudicates disagreement only, never the common
path). Like the existing two, this is an estimate pending real `ai_usage` data, not a
founder-specified figure, and should be checked against actual spend after the job has run.

**Tavily remains the dominant and unresolved cost, exactly as §5.3 already says, and this
revision does not change that.** `job-budget.ts` prices Anthropic calls only; nothing in the
codebase gates Tavily credit spend per feature today. Confirming current Tavily pricing and
deciding whether it needs its own governance is still open work — carried forward as Assumption
A1 (§11), not newly discovered here, and not this section's gap to close.

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

Measured blast radius, re-counted today across every domain named as an obstacle in §7.0:

| Domain | Rows | Active | Today's behaviour |
|---|---|---|---|
| `ku.edu.tr` + `research.` + `vprd.` + `highschoolprograms.` | 5 | **3** | **Readable** with a browser UA — would have been wrongly queued under rev 1's ladder |
| `rockefeller.edu` | 2 | 1 | Timeout |
| `maa.org` | 1 | 1 | 403 to everything |
| `cjsjournal.org` | 1 | 0 | DNS failure |
| `ukmt.org.uk` | **0** | 0 | Readable after one redirect; no corpus exposure at all |

So the genuinely hostile set is **2 active rows** (rockefeller.edu, maa.org) out of 271. The review
queue will not flood — and the largest single group among the "known-hostile" domains turned out to
be readable, which is §7.3's whole argument in one line.

### 6.5 Run-level circuit breaker

If more than **50%** of a run's attempts end in `transport_error`, abort the remainder, mark the
run degraded, and write `provider_health` (`provider='tavily'`, `status='degraded'`,
`last_failure_at`, `last_error`). That table already exists with exactly these columns — reuse,
not new schema.

Two refinements to how the breaker interacts with §2:

**Minimum sample before tripping: 5 attempts.** A 50% rate over 2 attempts is one failure, which is
noise. On a small-budget caller (`max_rows: 4` on a 10-second runtime) an unguarded ratio would trip
the breaker constantly. Below 5 attempts the run completes and reports its outcomes; the ratio is
only consulted at or above 5.

**No whole-job wall-clock constant.** Rev 1 specified a 90 s job budget. That is removed — the
stopping condition is the caller's `budget_ms` (§2.3), and a job that imposes its own ceiling on top
of the caller's is exactly the scheduler assumption §2 exists to eliminate. The principle rev 1 was
protecting is kept and generalised: **a partial batch that records what it did is strictly better
than a killed process that records nothing** — which under §2.1 is guaranteed structurally, because
every row commits its own outcome before the next row starts.

**Breaker state does not persist across calls.** A degraded run writes `provider_health` for humans
and dashboards; it does not prevent the next invocation from trying. Persisting a trip would make
the job's behaviour depend on when it was last called, which is precisely the scheduler coupling
§2.1 forbids. If Tavily is genuinely down, the next call trips again cheaply — 5 attempts — and
`provider_health` accumulates the evidence.

---

## 7. Source-unavailable handling

> **An unreadable source is an absence of evidence, never evidence of absence.**

This is the section the design exists to get right, and it is the section this revision changed
most — because a second round of probing showed rev 1's picture of *why* sources are unreadable was
substantially wrong, in a direction that makes the invariant harder to honour, not easier.

### 7.0 What the sources actually did today

Every domain rev 1 and the brief cited as a known obstacle was re-probed on 2026-08-23 with
multiple tools and header configurations. **Not one behaved as documented.**

| Target | curl, browser UA | curl, no UA | WebFetch | Rev 1 / brief said |
|---|---|---|---|---|
| `maa.org/student-programs/amc/` | **403**, 103 B | **403** | **403** | "403 to some tools but not others; WebFetch succeeded" |
| `maa.org/` (root) | **403**, 103 B | **403** | — | — |
| `www.ku.edu.tr/en/` | **200**, 332 KB | — | **403** | "403 to every tool tried" |
| `research.ku.edu.tr/` | **200**, 220 KB | **403**, 919 B | — | — |
| `www.ukmt.org.uk/` | **301** → `ukmt.org.uk` → **200**, 368 KB | **301** | — | "403 to some tools" |
| `cjsjournal.org` (https *and* http) | **DNS failure** — `Could not resolve host` | same | — | "no working HTTPS at all" |
| `rockefeller.edu/…/summer-science-research-program/` | **timeout** at 20 s | — | — | "returned 0 bytes" |

Four distinct lessons, each of which changes a rule below:

1. **Readability is a property of `(tool, headers, redirect policy, moment)`, not of a domain.**
   `research.ku.edu.tr` returned **403 with 919 bytes** and **200 with 220 KB** to the *same tool in
   the same minute*, differing only in the `User-Agent` header. Any per-domain "this site is
   unreadable" fact is a category error. This is the empirical basis for §7.3.
2. **A tool's failure is evidence about the tool.** WebFetch got 403 from `ku.edu.tr` while curl got
   332 KB. Had the job been WebFetch-only, it would have recorded a readable Turkish university as
   P2 and left it there.
3. **Redirects were being misread as blocks.** `ukmt.org.uk` was never returning 403 — it returns a
   301 that some tools do not follow cross-host. Its content is fully available (368 KB) one hop
   away. *Separately: `ukmt.org.uk` has **zero rows** in the corpus, so it never had any blast
   radius here — it was an obstacle observed during research that got carried into a design document
   as if it were a corpus problem.*
4. **"Cannot fetch" hides several different facts** with different meanings. §7.5 separates them.

**None of this weakens the invariant — it is the strongest argument yet for it.** If the corpus had
been demoted on any single tool's failure today, `ku.edu.tr` (3 active rows) and `ukmt.org.uk` would
have been wrongly marked unreadable, and `maa.org` would have been marked unreadable for a reason
that may well not hold next week.

**A standing caution about these numbers.** The table above is a snapshot from one network vantage
point at one moment. It should not be transcribed into code as a domain allowlist or blocklist —
that would repeat, in a new place, exactly the mistake it documents. Its purpose is to justify the
mechanism, and to set the expectation that P2 rates will be **noisy and non-stationary**.

#### Why a programme's page resists reading

maa.org sits behind a bot filter; some pages are JS-rendered and their real content never appears in
fetched HTML; some content lives only in linked PDFs and not in the HTML at all. **Measured: 6 rows
in the corpus have a `.pdf` as their primary URL**, and the job's extractor must either read PDFs or
classify them honestly as P2 rather than parsing an empty HTML body as "no closure language found."

*Flagged in passing, because it is a data problem rather than a fetching one:* of those 6 PDF URLs,
**two are faculty CVs** (`cmu.edu/physics/.../cv_oct24.pdf`, `fordham.edu/.../Dr.-Popescu-CV.pdf`).
A CV is not an opportunity page, and no re-verification job can make it one. The page-identity check
in §7.2 will classify these P4 rather than P1, which is the correct handling — but the underlying
URLs are wrong and want a human. **Flagging, not fixing.**

None of that says a programme closed.

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

### 7.2a The hard rule: P2 never refreshes source-verification truth

Stated as an invariant, because it is the one thing in this document that must not be softened by a
future optimisation:

> **A P2 outcome, or any unreadable-source attempt, must never write `source_verified_at`, never
> advance it, and never contribute to any freshness calculation. An unreadable page is not evidence
> of anything.**

The reasoning is short. `source_verified_at` asserts *"Oryn read the official source and established
its decision-critical facts"* (§8.5). A P2 attempt establishes no fact about the opportunity — only a
fact about the fetch. Letting it touch the field would make an unread row indistinguishable from a
confirmed one, which is the precise failure #143 tried to guard against and #146 had to unwind.

This separates cleanly into two fields, and the separation is the mechanism:

| Fact | Field | Refreshed by |
|---|---|---|
| "we last **tried** at T" — scheduling state | `next_check_at` / `max(created_at)` in the runs table | **every** attempt, including P2, P3, P4 and transport errors |
| "we last **succeeded** at T" — evidence | `source_verified_at` (§8.5) | **P1 only** |

A domain that 403s forever therefore accumulates attempt records indefinitely (until §6.4 retires
it) while its `source_verified_at` stays frozen at whatever a real read last established, or null if
there never was one. That is the honest representation: *we keep trying, and we still do not know.*

**Corollary — a null `source_verified_at` is not a demotion trigger.** It means the job has not yet
established the fact, whether because it has not reached the row or because the source will not be
read. Neither is a reason to hide the opportunity from a student (§3.3).

### 7.3 One tool's failure is not "unreadable"

Directly from §7.0's measurements: **a single fetch method's failure must never be recorded as
`p2_unreadable`.** `ku.edu.tr` returned 403 to WebFetch and 332 KB to curl; `research.ku.edu.tr`
returned 403 without a browser UA and 220 KB with one. A job that concluded "unreadable" from its
first attempt would have been wrong about three active rows today.

**P2 requires the full escalation ladder to be exhausted**, with each rung recorded:

| # | Attempt | Rationale |
|---|---|---|
| 1 | `tavilyProvider.extract` | Renders server-side; handles a share of JS-only and bot-filtered pages without special handling |
| 2 | Direct fetch, **realistic browser User-Agent**, redirects followed | The single highest-yield rung, measured: it is the *only* difference between 403/919 B and 200/220 KB on `research.ku.edu.tr` |
| 3 | Direct fetch of the **final URL after redirects**, if step 2 landed on a different host | `ukmt.org.uk` is 301 → 200. A cross-host redirect that the fetcher declines to follow is not a block |
| 4 | If the URL is a PDF, or step 2/3 returned a PDF content type: **extract the PDF text** | 6 corpus rows are PDF-primary; treating them as empty HTML would silently produce "no closure language found" |

Only when **all applicable rungs fail** is the outcome `p2_unreadable`. The runs record stores the
per-rung results (`fetch_attempts` in §8.2), so "unreadable" is always auditable as *what was tried*
rather than asserted.

**The corroboration rule: P2 requires a second, independent fetcher to have failed too.**

Exhausting our own ladder is necessary but not sufficient, because every rung shares our network
egress, our IP reputation and our TLS stack. Four rungs failing can still be one vantage point
failing. So the final precondition for `p2_unreadable` is evidence that a fetcher **we do not
control** also cannot read the page:

| Corroborating signal | What it establishes |
|---|---|
| **Internet Archive** has no successful capture on recent attempt dates, or its crawler recorded the same status | The strongest available signal. IA crawls from its own infrastructure on its own schedule; repeated failures there mean "closed to everyone", not "closed to us" |
| Tavily's `failed_results` reports the same status for the URL | Independent commercial infrastructure, already in the codebase |
| An archived snapshot **exists** and is readable | **Falsifies P2.** The page is machine-readable; our fetch is what failed. Outcome is a transport failure to retry, not an unreadable source |

This is exactly the discipline that separates the two cases in §7.0. maa.org 403s to curl, to curl
with a browser UA, and to WebFetch — three independent attempts agreeing, which is corroborated
evidence of a real bot wall. `ukmt.org.uk` was described as a "403 wall" on the strength of **one
tool's failure**, and turned out to be a 301 to a fully readable 368 KB page.

*A note on that comparison, since I measured it rather than inheriting it.* The parallel lane
reported UKMT as "curl 403, WebFetch fine". My probe found curl returning **301** (a redirect it was
not asked to follow), not 403. The two accounts disagree on the status code and agree completely on
the lesson — and the disagreement is itself the point: **two competent observers produced two
different failure descriptions for the same host within a day.** A design that lets any single such
observation write production state is under-specified. The rule stands on the agreement, not on
either measurement.

**Cost control:** corroboration is only sought when our own ladder has already failed, which §6.4
bounds at a handful of rows per pass. It never runs on the success path.

**And corroboration still does not license a demotion.** A confirmed-unreadable page is a confirmed
*absence of evidence* — a stronger claim than "our fetch failed", and still not evidence that a
programme closed. It changes how confidently we route the row to a human, never whether we may
change the row ourselves.

**Where the ladder stops, and why.** No headless browser, no CAPTCHA solving, no proxy rotation, no
UA cycling to defeat a filter. Step 2 uses a realistic UA because sending a default `curl/8.x` is an
accident of tooling rather than an honest self-description, not because the goal is evasion. A site
that blocks a normal browser UA has made a decision, and the correct response is P2 and the human
queue — measured blast radius, 2–4 active rows (§6.4).

**And a caution the measurements earned:** because readability is non-stationary, a row that went P2
last week may read cleanly this week. The backoff in §6.3 already retries; §6.4's retirement after 4
consecutive non-P1 attempts is what stops it being infinite. Neither should be tightened on the
strength of one bad week for one domain.

### 7.4 P3: secondary sources may flag, never write

If the official page is unreadable but a secondary source says something (deadline moved, cycle
closed), that goes to the **review queue as a flag with the claim in notes**. It writes no
production column.

This encodes the other hard lesson: **WebSearch fabricates plausible dates** — it produced "2027"
deadlines for three programmes that were mechanically the real 2026 date plus one. A date
appearing only in a search summary and not on the official page is not a date.

Enforced mechanically in §8.3's anti-fabrication rule, not left to good intentions.

### 7.5 Not all fetch failures mean the same thing

Rev 1's fetch-tiering list is superseded by the ladder in §7.3. What replaces it here is the
distinction rev 1 was missing: **"could not read it" collapses several different facts**, and
today's probing produced four of them at once. They differ in what they license and how they should
be retried, so the runs record stores the class, not just "failed".

| Class | Observed today | What it licenses | Retry |
|---|---|---|---|
| **Blocked** (403/429 after the full ladder) | `maa.org`, 403 to every tool, 103-byte body | Nothing. The server is refusing us, not describing the programme. | §6.3 backoff; retire per §6.4 |
| **Unreachable — transport** (timeout, connection reset, 5xx) | `rockefeller.edu`, 20 s timeout | Nothing. Most likely transient. | One in-request retry (§6.2), then backoff |
| **Unreachable — DNS** (`Could not resolve host`) | `cjsjournal.org`, both schemes | Nothing *about the cycle*, but it is a **material signal about the organisation** — see below | Backoff; escalate to human queue faster |
| **Reached but unusable** (200 with a shell, wrong page, PDF-only, under the content floor) | the 6 PDF-primary rows | Nothing. Distinct from blocked: we got bytes, they just were not the answer. | §7.3 rung 4, then backoff |

**The DNS case deserves its own treatment, and rev 1 got its diagnosis wrong.** The brief and rev 1
both described `cjsjournal.org` as a TLS/certificate problem. It is not: the domain **does not
resolve at all**, on either scheme. A domain that has stopped resolving is meaningfully different
from one that is blocking us — it is weak evidence the organisation itself is gone, where a 403 is
evidence of nothing.

Even so: **it still may not demote.** DNS resolution fails for local resolver problems, network
egress policy and transient registrar issues, none of which say anything about a programme. The rule
is therefore: **route a persistent DNS failure to the human queue with an explicit
`blocker='dns_nxdomain'`, and never to `closed`.** A human can establish in thirty seconds what the
job cannot establish at all. Corpus exposure is one row, and it is already inactive.

**Where the ladder stops** is unchanged in spirit from rev 1 and restated in §7.3: no headless
browser, no CAPTCHA handling, no attempt to route around a bot filter. Those rows belong in the
human queue, and there are very few of them (§6.4).

### 7.6 A readable page is not a live programme

The whole of §7 so far concerns pages we could not read. This subsection concerns the opposite and
more dangerous case: **pages we read perfectly, that tell us nothing true about whether the
programme still exists.**

> **Provenance and liveness are orthogonal.** P1–P4 grade *how well a claim is supported by its
> source*. Liveness is *whether the thing still happens*. A record can be maximally well-sourced and
> completely dead.

ISSYP (§1.1) is the worked example: a formal Eligibility section on the official domain, quoted
verbatim, describing who may apply to a programme that has not run since 2023. Graded on provenance
alone it is the **cleanest P1 in its batch**. Graded on liveness it is worthless. Anything that
treats P1 as a synonym for "current" would have promoted it.

Three mechanisms follow, and none of them is new machinery — they are constraints on machinery
already specified:

1. **`source_verified_at` asserts liveness facts, not source quality** (§8.5, precondition 5). The
   excerpt must positively support a *decision-critical* fact — that the cycle is accepting
   applications, or the deadline. An eligibility paragraph, a programme description, a fee table and
   a contact address are all P1-clean and all liveness-silent. **Reading a page and finding only
   such content is P2, not P1.** ISSYP would fail precondition 5 outright.
2. **Absence of closure language is not evidence of opening.** Already stated in §7.2 guard 3 and
   restated because ISSYP is what it looks like in practice: a page with no closure phrase anywhere,
   because the programme was not closed so much as quietly never renewed. Nothing announces that.
3. **Prefer the programme page over anything narrating it.** ISSYP's stored URL is Perimeter's
   **news blog**, which will return a clean 200 about a dead programme indefinitely — a news article
   does not expire when its subject does. The page-identity check (§7.2 guard 2) should therefore
   verify not just that the content mentions the opportunity, but that it is a page that *would
   change* if the programme's status changed. A row whose only URL is a news item, a press release
   or a third-party listing cannot support liveness at any confidence, and belongs in the human
   queue with `blocker='no_authoritative_url'` rather than being graded P1 forever.

Mechanism 3 is a genuine gap this revision opens rather than closes. **How many corpus rows point at
a narrating page rather than an authoritative one is unmeasured**, and it is a better use of the
dry run than any of the estimates in §11. Added as §10.3 item 10.

**A directory absence is a signal, and still not a demotion.** ISSYP is missing from Perimeter's
current programme directory, which is real evidence — but "not listed on the page we checked" is one
step from "we could not find it", and §9's demotion envelope requires an explicit closure phrase on
the opportunity's own page. Directory absence routes to the human queue. It never writes.

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
final_url              text            -- after redirects; ukmt.org.uk is 301 -> 200 (§7.0)
fetch_method           text            -- rung that produced the verdict
fetch_attempts         jsonb not null  -- [{rung, method, http_status, bytes, error}] per §7.3
outcome                text not null   -- §6.1
evidence_class         text            -- 'P1' | 'P2' | 'P3' | 'P4' | null for transport
failure_class          text            -- §7.5: blocked | transport | dns | reached_unusable
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

Three fields are additions in this revision, each forced by a §7 finding rather than added for
completeness:

- **`fetch_attempts`** makes §7.3 auditable. Without it, `p2_unreadable` is an assertion; with it,
  "unreadable" always carries the list of what was tried and what each rung returned. Given that
  `research.ku.edu.tr` returns 403 or 200 depending only on a header, the header story has to be in
  the record.
- **`final_url`** exists because a 301 was being misread as a block (§7.0, lesson 3).
- **`failure_class`** exists because §7.5 shows "failed" collapses four facts with different
  meanings and different retry policies.

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

### 8.4 No new *scheduling* column on `opportunities`

The scheduler needs "when did we last attempt this row?", which is `max(created_at)` from the runs
table. **Do not add a `last_machine_check_at` column** unless that query proves slow — at 271 active
rows it is free, and §1.2/§1.5 are a standing demonstration of what an extra overlapping timestamp
on this table costs in comprehension. If denormalization is ever needed, it must be documented as
*scheduling state* and never as evidence of verification.

This is unchanged from rev 1 and is **not** in tension with §8.5. The distinction is the one drawn
in §7.2a: *attempt recency* is scheduling state and stays in the runs table; *successful source
verification* is evidence and is the one fact worth surfacing on the row. One is derived and cheap
to recompute; the other is read on every recommendation path and is the product's central claim.

Run-level tracking needs no new table: `runWithTracking('opportunity_reverification', …)` already
records start, finish, items processed and error to `external_sync_jobs`. It does **not** provide
the concurrency guard §2.2 needs; that lives in the due-set query, not the wrapper.

### 8.5 The new field: `source_verified_at`

This is the field the founder's requirement asks for, and §1.5 establishes that no existing column
can carry it. **The migration is deliberately not designed here** — schema decisions are reserved,
and they should be made from the real records this job produces, not from this document's theory
about them. What follows is the *semantic contract* the eventual column (or view) must satisfy,
which is the part that has to be settled before any implementation.

**Name:** `source_verified_at`, `timestamptz`, nullable, default null.

Not `machine_checked_at` — the name #146 provisionally used for the seam in
`OpportunityVerificationFacts`. That name describes the wrong fact: **a 403 from maa.org is a
machine check.** So is a DNS failure, and a 200 that returned a cookie wall. A field named for
"checked" invites exactly the write §7.2a forbids, and names are the cheapest enforcement mechanism
available. `source_verified_at` cannot be read as satisfied by a failed fetch.
**Recommendation for the lane that owns `lifecycle.ts`: rename the optional
`machine_checked_at` field on `OpportunityVerificationFacts` to `source_verified_at`.** It has no
column behind it and no production readers today, so the rename is free right now and will not be
later. *Flagging, not editing* — that file is not this document's to change.

**What writing it asserts, exactly:**

> At this instant, Oryn fetched the opportunity's official source URL, received content that passed
> every integrity guard in §7.2, and **located in that content** the decision-critical facts stored
> on this row — whether the cycle is accepting applications, and the deadline where one is stated.

Three things it deliberately does **not** assert: that the stored data is *correct* in every field
(only the decision-critical ones were checked); that the page will still say this tomorrow; that a
human agreed with the reading.

**Preconditions — all must hold, no exceptions, no override flag:**

1. Outcome is **P1** (`p1_confirmed` or `p1_changed`). Never P2, P3, P4 or transport error.
2. The content floor passed (§7.2 guard 1) — not a shell, not an error page rendered with HTTP 200.
3. The page-identity check passed (§7.2 guard 2) — this is the opportunity's page, not a redirect
   target, cookie wall or 404-with-200.
4. A **non-empty `matched_excerpt` that is a literal substring of the fetched content** exists
   (§8.3's excerpt-or-nothing rule).
5. The excerpt **positively supports** a decision-critical fact. Absence of closure language is not
   support; the page must actually say something about applying. A page that mentions the programme
   but says nothing about its cycle is P2 (§7.2 guard 3), not P1.
6. A corresponding `opportunity_verification_runs` row was committed **first**, in the same
   operation. The evidence exists before the claim does — never after, never optionally.
7. The value written is **`now()` at the moment of the successful fetch**. Never a date parsed from
   the page, never a value copied from another column, never a date supplied by a human, never
   backdated.

**Precondition 6 is the structural one.** It makes `source_verified_at` unforgeable by construction:
every non-null value has a runs row behind it carrying the URL, the fetch ladder, the HTTP status
and the excerpt the verdict rests on. That is the difference between this field and the two it
replaces — `verified_at` and `last_verified_at` have no artifact behind them and never had, which
is why §1.5 concludes they cannot support the claim at any confidence.

**Consequence, stated plainly so nobody is surprised by it:** on the day this ships,
`source_verified_at` is **null for all 392 rows**, and it stays null for any row whose source cannot
be read. That is the honest state, and §3.3's rule — null means "not yet established", never
"stale" — is what stops it from being a catalogue-wide outage.

### 8.6 Legacy rows: no backfill, and specifically not the cheap one

**The one-line backfill is the thing to refuse.**

```sql
-- DO NOT DO THIS
update opportunities set source_verified_at = coalesce(verified_at, last_verified_at);
```

It would populate 392 of 392 rows instantly, satisfy any freshness gate immediately, cost nothing,
and require no page to be read. It is also a lie in one statement: it would assert that Oryn fetched
392 official sources and established their decision-critical facts, when Oryn fetched none of them.
Every value it wrote would violate at least four of §8.5's seven preconditions — no runs row, no
excerpt, no fetch, no integrity guards.

The specific harms are worth naming, because "it's just a convenience" is how this gets proposed:

- **It would import the very defect it was meant to escape.** 138 of 201 `verified_at` values and
  214 of 307 `last_verified_at` values are hand-entered midnight dates (§1.5). The new field would
  inherit them and mean exactly as little.
- **It would launder a web search into a verification.** `discover.ts` stamps `last_verified_at`
  from an automated Tavily hit (§1.2a). The `coalesce` above promotes that to "official source
  read."
- **It would recreate the Stanford failure on purpose.** That row carried a fresh `verified_at`
  while its page said closed. Backfilling would give it a fresh `source_verified_at` too, and this
  time the field would be the one gating recommendations.
- **It would destroy the job's own signal.** Once every row looks verified, the job can no longer
  tell what it has and has not established. There is no recovery except truncating the column.

**The transition, therefore, is that there isn't one.** `source_verified_at` starts null everywhere
and becomes non-null **only** by a P1 outcome, one row at a time, at whatever rate the job is
called. Rows fill in over roughly one corpus pass. Rows whose sources cannot be read never fill in,
and that is information rather than a gap to be closed.

**What the legacy columns are still good for.** Nothing is lost by refusing the backfill, because
#146 already uses them correctly: as a floor against the *total* absence of evidence, with no
arithmetic performed on either. They keep doing that job. Their meaning is documented in §1.5 so the
next reader does not have to re-derive it, and reconciling them remains explicitly out of scope
(§12).

**One migration property to preserve, without designing the migration:** whatever form it takes, it
must not carry a `DEFAULT now()` or any backfilling `UPDATE`. A default would stamp every existing
row at migration time, which is the same lie arriving through DDL instead of DML.

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

**Against:** an unreadable page mistaken for a closed one silently shrinks a 271-row catalogue —
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

### 10.1 Which rows: 57

Rev 1's set was built around the 51 rows the third guard excluded. **#146 took that number to 0**,
so (a) is replaced. The replacement is a better test population anyway — the old 51 were defined by
a bug in a predicate; these are defined by risk.

**(a) The 42 high-risk rows.** Every active row asserting current or imminent availability with no
date behind the claim — the shape §4.2 ranks to the top and the one Stanford Anesthesia belonged to:

```sql
select o.id, o.title, o.cycle_status, coalesce(o.official_url, o.source_url) as url
from opportunities o
where o.status = 'active'
  and o.deadline is null
  and o.cycle_status in ('open','upcoming')
order by o.id;
```

Verified 2026-08-23: returns **42** rows (24 `open`, 18 `upcoming`) across **41 distinct domains**,
every one matched to at least one user, top match score 91.

*For the record, the old predicate is preserved here so the change is checkable rather than
asserted.* Swapping the last two lines for `and o.verification_state = 'verified_current' and
o.cycle_status not in ('closed','historical','discontinued') and o.last_verified_at is null` still
returns exactly 51 rows; adding `and o.verified_at is null` — the #146 predicate — returns **0**.
Both re-run today. There is no rescue backlog, and this is how to confirm that in one query.

**(b) 10 known-answer controls.** Rows with `cycle_status='closed'` **and** a past deadline, where
the correct verdict is already known independently (**28** such rows — re-measured today, unchanged
— so sample 10 at random with a fixed seed for reproducibility). This makes the dry run measure
**precision**, not merely produce output. A job that cannot recognise a closed programme as closed
must not be trusted to demote anything.

**(c) 5 readability canaries**, expanded from rev 1's 2 and chosen from §7.0's measurements so that
the set spans every failure class in §7.5 *and* the false-positive case:

| Canary | Expected outcome | What it tests |
|---|---|---|
| `maa.org` active row | **P2**, `failure_class='blocked'`, no proposed change | §7.2a — a 403 must not touch `source_verified_at` |
| `rockefeller.edu` active row | **P2**, `failure_class='transport'` | Timeout handling, and one in-request retry only |
| A `ku.edu.tr` active row (3 available) | **P1 or P4 — never P2** | **The most important canary.** It reads fine with a browser UA. A P2 here means §7.3's ladder is not implemented, and the job is about to mark readable sources unreadable |
| A PDF-primary row (6 available) | **P1 or P2 with `failure_class='reached_unusable'`** | §7.3 rung 4. Must never parse an empty HTML body as "no closure language found" |
| The `closed`-with-future-deadline row (§3.1) | Any P1/P2 — **no automatic demotion** | An internally contradictory row must not be silently resolved by the job |
| **ISSYP** `8980e51b-9889-4cb0-a6dc-e11a60a59e51` | **P2 (liveness-silent), never P1** | §7.6. Its page is perfectly readable and its eligibility text is textbook P1 evidence, for a programme dead since 2023. A P1 here means the job grades provenance and calls it currency |

Two canaries carry most of the diagnostic weight. The `ku.edu.tr` one catches the job marking
readable sources unreadable; the ISSYP one catches the opposite and subtler error — the job marking
a dead programme verified because its page reads beautifully. Rev 1's design would have failed both:
it would have recorded `ku.edu.tr` as hostile on its first 403, and it had no concept that would
stop ISSYP being graded P1.

*Note the canaries overlap the other groups* — the `maa.org` row is `upcoming`/no-deadline and so is
already inside (a). ISSYP does **not** overlap: it is `under_review`, outside (a)'s `status='active'`
filter, and must be added explicitly. Deduplicated, the run is **≈57 rows**, not 42 + 10 + 6.

### 10.2 What it changes: nothing

- Zero writes to `opportunities`. `applied=false` on every proposed change. **No
  `source_verified_at` is written by the dry run at all**, even for clean P1 outcomes — the field's
  first real value should come from a reviewed, non-dry run.
- One `external_sync_jobs` row (`job_name='opportunity_reverification_dryrun'`).
- Run records if the table is migrated; otherwise a JSON artifact at
  `data/research/opportunities/reverification-dryrun-<date>.json`, matching the repo's existing
  convention of dated research artifacts.

**Run it as a script (`scripts/`), not through the route handler.** Not because 57 rows exceeds a
runtime budget — under §2.3 no such fixed budget exists — but because a dry run wants a long single
pass with full per-rung logging and no lease semantics, and the repo already uses dated one-off
scripts for exactly this.

### 10.3 What it reports

Per row: id, title, url, **final URL after redirects**, **the full per-rung `fetch_attempts`
ladder**, HTTP status, outcome, evidence class, **failure class**, matched excerpt, detected
deadline, proposed change.

The per-rung ladder is the addition this revision cares most about. §7.0 showed that which rung
succeeds is the difference between "readable" and "unreadable" for a meaningful share of the corpus,
so a report that only records the final verdict cannot tell whether the ladder is working.

Aggregates:

1. **Outcome distribution** across P1-confirmed / P1-changed / P2 / P3 / P4 / transport.
2. **Disposition of the 42** — the first real measurement of how common the quietly-closed shape is:
   - *confirmed still open* → the claim Oryn is making is true, and now has evidence behind it
   - *contradicted* → quietly closed, the Stanford shape, and the number that decides how urgent
     demotion is
   - *unreadable* → need a human
3. **Control precision** — of the 10 known-closed rows, how many were correctly identified.
4. **Canary check** — all five canaries hit their expected outcome in §10.1(c).
5. **Rung-yield distribution** — how many P1s came from Tavily (rung 1) vs. a browser UA (rung 2)
   vs. following a redirect (rung 3) vs. PDF extraction (rung 4). **If rungs 2–4 yield zero, the
   ladder is either unnecessary or unimplemented, and the report must distinguish which.**
6. **Per-domain fetch outcome** — which sources are machine-readable, and at which rung. Reported as
   observation, never persisted as a domain allowlist (§7.0).
7. **Measured per-row wall clock (p50 and p95) and Tavily credits**, against §5.3's estimates.
   The p95 is what sets the one-row reserve in §2.3, so it is a required output, not a nice-to-have.
8. **Disagreement rate**, against §5.1's assumed 15–25%.
9. **Would-be `source_verified_at` count** — how many rows satisfied all seven §8.5 preconditions.
   This is the single number that says whether the job can actually produce the fact it exists to
   produce. If it is low, nothing else in the report matters.
10. **Liveness-silent P1 rate** (§7.6) — of rows that fetched cleanly, how many contained *only*
    provenance-grade content (eligibility, description, fees) and nothing bearing on whether the
    cycle is running. **This is the ISSYP rate**, and it is currently unmeasured. A high value means
    the corpus is full of well-sourced records nobody can confirm are alive.
11. **Authoritative-URL audit** (§7.6 mechanism 3) — how many rows point at a news article, press
    release or third-party listing rather than a page that would change if the programme's status
    did. Unmeasured today; ISSYP is a confirmed instance of the failure.

### 10.4 Acceptance gate

Nothing is enabled until all hold:

- Control precision **10/10**. Anything less blocks enablement — a parser that misses a known
  closure will also miss real ones.
- **Zero proposed changes on any non-P1 outcome.** **Any** proposed change on an unreadable source
  is a hard stop; it means §7's invariant is not actually implemented.
- **The `ku.edu.tr` canary is not P2.** A P2 there means the §7.3 ladder is missing or broken, and
  the job would start recording readable sources as unreadable — the failure mode this whole
  revision exists to prevent. Hard stop.
- **No `source_verified_at` value anywhere in the dry-run output**, per §10.2.
- A human has read the proposed changes **with their excerpts and their fetch ladders** —
  spot-checking the evidence, not the verdicts.

Then: enable with `REVERIFY_ALLOW_DEMOTION=false`, run **at least two full corpus passes** in
flag-only mode, review the flags, then enable demotion. Rev 1 said "one week", which assumed a daily
cadence; under §2 the gate is passes, not elapsed time.

**The scheduler stays off through all of this.** Every step above is performed by a human invoking
the endpoint. Nothing in this document asks for a scheduler to be configured, and enabling one is
not part of the acceptance path.

---

## 11. Assumptions register

Explicit, because several of these are load-bearing and unverified.

| # | Assumption | Confidence | How to settle it |
|---|---|---|---|
| A1 | Tavily Extract bills ~1 credit per 5-URL basic-depth request | **Low** — no credit figures in API_SETUP.md | Check current Tavily pricing; measure in the dry run |
| A2 | 15–25% of checks disagree with stored data initially | **Low** — an estimate from the corpus being freshly hand-verified | Measured directly by the dry run |
| ~~A3~~ | ~~Deployment allows a 60 s function; 25 rows/batch fits~~ | **Retired, not settled** | **No longer an assumption.** §2.3 makes runtime a caller-supplied `budget_ms` and §5.2 makes batch size a default rather than a constant, so the tier is not a design input. Still genuinely unknown — no `vercel.json`, no `maxDuration` on any job route — and it no longer needs to be known. |
| A4 | Tavily Extract resolves a useful share of JS-rendered and 403 cases | **Low** — downgraded from Medium. Tavily was untested against these domains in rev 1, and §7.0 now shows the domains behave inconsistently even for simple tools | Rung-yield distribution from the dry run (§10.3 item 5) |
| A5 | `verified_at` reflects a real research pass, not a bulk backfill | Medium — 138/201 values are exactly midnight, suggesting hand-entered dates | Not blocking: the design never trusts this column, and §8.6 forbids copying from it |
| A6 | 7 is the denominator for `exposure_norm` | High — measured (distinct users in `opportunity_matches`; 10 `profiles` exist) | Recompute per run |
| A7 | Closure/opening phrase matching is accurate enough to gate demotion | **Unproven** | Exactly what the 10 controls in §10.1(b) measure |
| **A8** | A realistic browser User-Agent plus followed redirects converts a meaningful share of apparent blocks into successful reads | **Medium-high** — directly measured today on `research.ku.edu.tr` (403/919 B → 200/220 KB) and `ukmt.org.uk` (301 → 200/368 KB), but on two hosts only | Rung-yield distribution (§10.3 item 5) across all 57 dry-run rows |
| **A9** | Per-domain readability is **non-stationary** — the same host may read cleanly one week and 403 the next | **Medium** — inferred from rev 1's and the brief's per-domain claims all failing to reproduce within roughly a week (§1, §7.0) | Compare per-domain outcomes across two dry runs a week apart. **If true, no domain allowlist or blocklist may ever be persisted** |
| **A10** | The 6 PDF-primary rows can be text-extracted usefully | **Unverified** — and 2 of the 6 are faculty CVs rather than opportunity pages (§7.0), so the useful denominator may be 4 | The PDF canary in §10.1(c) |
| **A11** | An independent fetcher (Internet Archive, Tavily) is available and informative often enough to gate P2 on it (§7.3) | **Unverified** — demonstrated once, on ISSYP, where IA crawlers hit the same 403 on four dates | Measure IA coverage across the dry run's P2 candidates. If coverage is thin, P2 degrades to "ladder exhausted, uncorroborated" — a distinct, weaker outcome, never a silent P1 |
| **A12** | Liveness-silent P1 (the ISSYP shape) is rare | **Unproven, and the most consequential open question in this document.** ISSYP shows the shape exists and is invisible to every stored signal; nothing bounds how common it is | §10.3 item 10. If the rate is high, §7.6 mechanism 1 is the job's primary value, not a safeguard |

---

## 12. Out of scope

- **Reconciling `last_verified_at` and `verified_at`.** §1.2 argues the job must not do this, and
  §8.6 extends the refusal to backfilling the new field from either. It is real data-hygiene work
  and it needs its own owner and its own design.
- **The `deadline_mode` column** (§3.2). Approved in principle, not implemented; the type TTLs
  wait on it.
- **Setting `MAX_VERIFICATION_AGE_DAYS`.** Not before two full corpus passes (§3.3).
- **Discovery of new opportunities.** Job A, already built.
- **University data freshness** (Phase 30 Job C). Same pattern, different corpus, separate design.
- **The `source_verified_at` migration itself** (§8.5). Schema decisions are reserved for the
  founder and should be made from real run records, not from this document's theory. What is settled
  here is the semantic contract; the DDL is not.
- **Choosing or configuring a scheduler** (§2.4). The job is correct without one, and this document
  does not add one.

**Flagged for other owners** (this document changes no code):

- `lib/opportunities/discover.ts` writes `last_verified_at` at insert from an unattended Tavily
  search (§1.2a). No corpus row carries `source='tavily'` yet, so the hazard is latent — the
  recommendation is to drop that field from the insert before Job A next runs.
- `OpportunityVerificationFacts.machine_checked_at` in `lib/opportunities/lifecycle.ts` should be
  renamed `source_verified_at` (§8.5). Free today — no column, no production readers.
- The mislabelled "Phase 30, Job B" comment on `app/api/jobs/deadline-reminders/route.ts` (§1.3).
- Two corpus rows list a faculty CV PDF as their opportunity URL (§7.0), and at least one lists a
  news article rather than a programme page (§7.6, ISSYP). Data errors, not job behaviour.
- **New in rev 3:** `lib/ai/limits/job-budget.ts`'s `JobBudgetFeature` union should gain a third
  value, `"opportunity_reverification"`, with its own small budget line (§5.4 recommends
  $5/month) — not a share of `opportunity_extraction`'s existing $25. Whoever implements this job
  should add that entry alongside the other two rather than reusing the existing tag.
- **Still open, re-confirmed 2026-09-02:** the `machine_checked_at` → `source_verified_at` rename
  (§8.5, flagged since rev 1/rev 2) has not happened — grepped `lib/opportunities/lifecycle.ts`
  directly rather than assuming; the field is still named `machine_checked_at` at lines 312/384.
  Still free (no column, no production reader) and still not this document's file to change.
- **Resolved since rev 1:** the stale `lifecycle.ts` comments flagged in §1.1 were corrected by #146.
