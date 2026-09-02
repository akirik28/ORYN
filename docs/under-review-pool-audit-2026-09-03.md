# The `under_review` opportunity pool — reconfirmed, not re-derived, plus what's actually new

2026-09-03, oryn-6e (was oryn-4e), CEO's brief: confirm the no-promotion-path claim against the code,
then characterize the pool and answer whether a one-way door is correct. Same column
(`opportunities.status`/`cycle_status`) as the unverified-cycle package, same rules — no writes to
live, SQL staged, founder applies.

## 0. This was already thoroughly investigated once — cited, not re-derived

`docs/known-issues.md`, section **"All 122 `under_review` opportunity rows, traced"** (2026-09-01,
CEO-directed) already did the load-bearing work here: traced all 122 rows to two origins, ran the
exhaustive `pg_proc` + code-grep check for a promotion path, and found none. Everything below either
**reconfirms that document still holds today** or **adds something genuinely new since 2026-09-01**
— not a restatement of what it already found.

## 1. The one-way-door claim, reconfirmed against today's code and today's database

Re-ran the same check that doc used, not trusted from its own conclusion:

```sql
select proname from pg_proc join pg_namespace n on pronamespace = n.oid
where nspname = 'public' and proname ilike '%opportunit%';
-- {"proname":"opportunity_matches_guard_computed_columns"}
```

Still exactly one function, still not promotion-shaped — identical result to 2026-09-01. Grepped
`app/`, `lib/`, `scripts/` for every write to `opportunities.status` (15 call sites) — every one is
either a read-side filter, an insert that sets the row's *initial* status, or (`setOpportunityDisabled`,
`app/(app)/admin/actions.ts`) a disable/reactivate toggle. Its only caller
(`features/admin/opportunity-disable-control.tsx`) only ever invokes the reactivate direction when
the row's current status is already `disabled` (`isDisabled={row.status === "disabled"}` gates which
button even renders). **No path today promotes `under_review` → `active`. Confirmed, not inherited.**

### One thing beyond the prior doc: `setOpportunityDisabled` doesn't check current status, only today's caller does

```ts
const targetStatus = disabled ? "disabled" : "active";
if (before.status === targetStatus) return { changed: false };  // no-op guard only
```

The function computes its target from the `disabled` boolean alone — it never branches on
`before.status`. The one-way-door invariant holds **today** only because the one caller happens to
only pass `disabled: false` when a row is already `disabled`. If a second caller were ever added (a
bulk action, a different admin surface, a script calling this directly) and passed
`(someUnderReviewId, false)`, this function would promote it to `active` with no research behind the
claim — silently. Not a live bug (one caller, correctly gated) — a missing defense-in-depth check,
the same three-layer discipline (picker won't offer it / action independently refuses it / render
path re-checks) applied everywhere else tonight. Worth closing regardless of what else happens with
this package.

## 2. The population: 112 today, not CEO's 107 or the prior doc's 122 — and the drift is a good sign

```sql
select count(*) from opportunities where status = 'under_review';  -- 112
```

Population has moved 122 (2026-09-01) → 107 (CEO's figure) → 112 (today) — not a contradiction, the
same "corpus moves during a working night" pattern the unverified-cycle package already reported.
**Traced the delta, not just noted it**: of the 15 "direct fetch" rows the prior doc flagged as
"closer to ready" (14 UK Mathematics Trust + 1 Barnard Athena), **10 of the 14 UKMT rows are now
`status='active'`** — someone already did exactly what that doc said was the only way out
("someone running SQL by hand"). This is real, positive evidence: when a human reviews this specific
subset, it mostly promotes cleanly. Only 5 direct-fetch rows remain under_review (4 UKMT + Barnard).

## 3. Origin of the 112, confirmed against the prior doc's own trace

**~107 rows — the deterministic default, not a moderation decision made per-row.** Prior doc traced
this to `scripts/drive-import/generate_sql.py`'s `opp_status()`:
```python
def opp_status(current_cycle_status, current_cycle_details):
    if any(sig in details_l for sig in CLOSED_SIGNALS): return "expired"
    if "2026 cycle confirmed" in (current_cycle_status or ""): return "active"
    return "under_review"
```
`under_review` is the fallback — a row only ever became `active` at import time if the source
research explicitly said the current cycle was confirmed. `import-opportunity-corpus.ts` (the script
that actually inserts) never decides status itself, it writes whatever this generator already
decided. Confirmed today: the bulk-import batch this produced (source string "Founder
school-counselor Drive corpus...") inserted in a **3-minute window on 2026-08-18**
(23:56:41–23:58:11 UTC) — one generation event, not 107 independent calls.

**Composition, checked live today, consistent with (not contradicting) the prior doc's "thinner
field coverage" finding**: within that same source batch, under_review rows (107) actually have
*longer* average descriptions (685 vs 593 chars) and a *higher* share of `high` source_confidence
(50% vs 16%) than the active rows from the identical batch — but almost none carry `organization`
(1/107 vs 17/82 active) or `deadline` (3/107 vs 11/82 active). Read together: **the generator's
"under_review" default correlates with missing *structured, actionable* fields (a confirmed cycle
date, a named operator), not with weaker research** — the prose and source quality are comparable or
better. This is a sharper statement of the prior doc's own conclusion, not a different one.

**5 rows — a small, separately-originating batch, one INSERT each on 2026-08-24**, source strings
"UK Mathematics Trust (direct fetch)" / "Barnard Athena Center... (direct fetch)". No script anywhere
produces these source strings (searched again today, same result as the prior doc). Circumstantial,
stated as such: `lib/counselor/state.ts` names a precedent for "pulling a record to `under_review`"
one day earlier (Wharton Hack-AI-thon, 2026-08-23) — consistent with a researcher deliberately
holding well-sourced rows pending review, not provable from what's actually recorded.

## 4. The 5 remaining direct-fetch rows — actually finished, not just re-flagged as "closer to ready"

The prior doc recommended "a lighter review (confirm the date and URL, no new research)" for this
batch and didn't do it. Small and tractable, so done here — each page opened directly today:

| Title | Verdict | Finding |
|---|---|---|
| BMO Round 1 | **PROMOTABLE** | Live 2026-27 cycle confirmed: competition 18 Nov 2026, answer-sheet deadline 19 Nov 2026 (checked ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1, 2026-09-03) |
| BMO Round 2 | **PROMOTABLE** | Live 2026-27 cycle confirmed: competition 20 Jan 2027, answer-sheet deadline 21 Jan 2027 (checked ukmt.org.uk/senior-challenges/british-maths-olympiad-round-2, 2026-09-03) |
| Senior Team Mathematical Challenge | **PROMOTABLE** | Live 2026-27 cycle confirmed: registration opens 10 Sept 2026 (7 days from today), regional finals Nov 2026, national final Feb 2027 — no single clean deadline date to store, left null rather than guessed (checked ukmt.org.uk/team-challenges/senior-team-mathematical-challenge, 2026-09-03) |
| Team Maths Challenge (Junior) | **UNRESOLVABLE** | Real UKMT page, but shows a **2025-26** cycle ("relaunching... registration opens October 2025," national final "June 2026") — both already past — while its 3 siblings above show fresh 2026-27 data. Genuinely can't tell if this specific page is stale/unrefreshed or the junior challenge isn't running this cycle; a follow-up to the team-challenges hub page 404'd. |
| Athena Summer Innovation Institute (Barnard) | **UNRESOLVABLE** | Real Barnard Athena Center page, but carries no dates at all — explicitly directs to "Barnard's Office of Pre-College Programs" for dates. Follow-up fetch to that office page failed on a certificate error. |

3 promotable, 2 unresolvable, 0 dead — same shape as the larger unverified-cycle population: real,
well-sourced content, genuinely blocked on a narrow technical or content gap, not on anything wrong
with the underlying program.

## 5. Item 6, folded in per CEO's instruction: a third live instance of the same named gap

Three rows from the unverified-cycle report (Student Science Training Program, Harvard CURE, Kadir
Has Kış Okulu) carry a verification timestamp that didn't catch their own cited dates had already
elapsed. Traced further today: **all three share the identical `source` string as the 107-row
under_review batch** — same 2026-08-18 bulk import, just landed on the `active` side of the
generator's rule instead of `under_review`. Kadir Has is the sharpest case: `last_verified_at =
2026-08-31 18:08:18` — real sub-day precision, not the midnight-UTC pattern that marks a hand-typed
date, meaning *something* touched this specific row again 13 days after import — and even that later
touch didn't notice the row's own stated dates (19–30 Jan 2026) had already passed by 31 Aug 2026.

**This isn't a new defect to fix — it's a third confirmed live instance of exactly what
`docs/opportunity-reverification-job-design-2026-08-23.md` already names and already designed a fix
for**: `verified_at`/`last_verified_at` assert "a pipeline or a person touched this row," never "the
specific facts on this row are still true." Stanford Anesthesia (design doc's own example) and ISSYP
were the first two documented live instances; Kadir Has is a third, found tonight, independently.
The design doc's own proposed fix — a purpose-built `source_verified_at` field, written only by a
real fetch that re-confirms decision-critical facts — is still unbuilt and is still the right fix.
No field-level audit trail exists to identify what specifically touched Kadir Has on 2026-08-31 (a
known, separately-documented gap, not new here), so the actionable finding is the pattern, not a
specific line of code to change.

## 6. Is a one-way door correct?

**Yes for automatic promotion — no for the absence of ANY reviewable path.** Two different questions,
worth answering separately:

- **Should a row ever promote itself automatically** (on a timer, on a confidence score, on nothing
  but time passing)? No — that's exactly the "manufacture a value" failure this product's whole
  design already refuses everywhere else, and the generator's own default (hold back unless the
  research explicitly confirmed the cycle) is the correct conservative posture for an import-time
  decision.
- **Should there be zero mechanism for a human to promote a row, ever, without hand-written SQL?**
  That's the actual gap, and tonight is direct evidence it's a real one — a human already reached for
  raw SQL to promote 10 UKMT rows, with no audit trail beyond whatever that session happened to log
  (`admin_action_log` has no entry for it; only `disable_opportunity`/`reactivate_opportunity` are
  logged actions today), and the admin panel already lists every `under_review` row
  (`OpportunityModerationList`) but offers it no action beyond "Disable."

**Recommendation, not built here**: extend the existing admin moderation list with an explicit,
audited "Approve" action for `under_review` rows — same shape as `setOpportunityDisabled`
(`requireAdmin()`, a real reason, an `admin_action_log` entry), which closes §1's defense-in-depth
gap as a side effect (the promotion path becomes a real, current-status-checked branch instead of a
theoretical one nobody guards). Scoped, not attempted here without confirming it's wanted — a
feature addition, not a data/research task, and this package's brief was investigation.

## 7. What's genuinely not done, named rather than silently skipped

**Did not individually verify all ~107 Drive-corpus rows against their official pages.** That's the
same scale of work as the unverified-cycle package (74 rows, ~5 hours with parallel agents) applied
to a population the prior doc already correctly sized as needing "fresh per-row research confirming
the current cycle," not a quick check — a distinct, comparably-sized next package if wanted, not
something to silently attempt or silently omit mentioning.

## 8. Prepared SQL — staged, not applied

`data/research/opportunities/under_review_promotions_2026-09-03.sql` — 3 `UPDATE` statements (the 3
promotable UKMT rows from §4). Dry-run validated live (`begin`/`rollback` via the connector) before
writing this file — all 3 matched and applied cleanly, confirmed rolled back after.
