# The 74 `cycle_status='unverified'` opportunities — read individually, sorted, sourced

2026-09-03, oryn-4e, CEO's brief. Read every active opportunity carrying `cycle_status='unverified'`
against its own official page — not a sample, not a re-measurement of the gate's impact (oryn-31 already
did that, see below), the actual re-verification pass that impact analysis said was still missing.
No writes to live at any point; SQL is prepared and staged, not applied — the founder applies it.

## 1. The gate, read from the code, not assumed

`lib/opportunities/lifecycle.ts` — the composed gate every recommendation-critical path calls
(`isOpportunityRecommendable`, wired into `app/(app)/dashboard/page.tsx`, `app/(app)/opportunities/page.tsx`,
`app/(app)/opportunities/[id]/page.tsx`, `lib/opportunities/browse.ts`, `lib/counselor/eligibility.ts`):

```
isOpportunityRecommendable = isOpportunityActionable(o) && isOpportunitySufficientlyVerified(o)
```

`isOpportunityActionable` excludes `status != 'active'`, `cycle_status ∈ {closed, historical, discontinued}`,
and any row whose `deadline` has passed. **`unverified` is not in that excluded set** — it is a
fully actionable cycle_status by this function's own rule.

`isOpportunitySufficientlyVerified` returns true if the row has a deadline commitment, OR (failing
that) if it has *any* verification timestamp at all — `verified_at` or `last_verified_at`, no
preference between them, no age check (`MAX_VERIFICATION_AGE_DAYS` is `null`). Neither timestamp
records that anyone re-confirmed the *current* cycle; both record which ingestion pipeline touched
the row, per the function's own extensive comment.

**CEO's framing was exactly right, confirmed by reading the code directly, not inherited:** every one
of the 74 carries a lineage timestamp, the gate checks for the timestamp's presence, not what
`cycle_status` says, and `unverified` specifically was never excluded to begin with. No reframing
needed.

## 2. The population, and a number that moved

CEO's brief said 75. My own count, run live at the start of this pass:

```sql
select count(*) from opportunities where status='active' and cycle_status='unverified';
-- 74
```

Not a correction of CEO's number — the corpus has genuinely moved by ±1 row several times tonight
already (86→75→74 across oryn-31's two documents earlier today, see
`docs/opportunity-reverification-job-design-2026-08-23.md`'s own rev-3 table), consistent with other
lanes actively researching/ingesting in parallel. 74 is what this pass worked against; stating it
rather than silently using 75.

## 3. Prior work checked first, not re-derived

Grepped memory and `docs/` before starting, per CEO's instruction. Two documents matter directly:

- **`docs/opportunity-verification-gate-tightening-impact-2026-09-02.md`** (oryn-31) — measured what
  *tightening* the gate would cost (a 74-row, mostly `summer_program`, category-collapsing loss) and
  concluded the real fix is re-verification, not narrowing the gate. Explicitly named the
  re-verification pass as unmeasured, separate, larger work — this document is that work.
- **`docs/opportunity-reverification-job-design-2026-08-23.md`** (design only, rev 3 same day) — the
  *automated* job this population eventually needs (TTLs, priority, cost). Not built. This pass is a
  manual instance of exactly what that job would do, on this one population, today.
- **`docs/opportunity-catalog-closeout-2026-09-02.md`** — a *different* investigation (null
  `organization` values, 421-row corpus) that happened to individually verify 11 rows that also sit in
  this 74-row population. Reused those 11 verdicts rather than re-checking pages already opened and
  confirmed live hours earlier — see §4.

## 4. The three piles

**59 PROMOTABLE** (10 reused from the closeout doc's own individually-verified pile + 49 freshly
checked against official pages today) · **0 DEAD** · **14 UNRESOLVABLE** · **1 DEFERRED** (University
of Maastricht — already on oryn-d0's queue as a confirmed `official_url` defect, not re-touched here).
59 + 0 + 14 + 1 = 74.

### 0 dead is the headline, and it needs a caveat so it isn't over-read

Not one of the 74 came back confirmed gone — no dead domain with no successor, no "programme
discontinued" page, no deadline years stale with nothing newer. This is a genuinely good result and
matches CEO's own closing hypothesis ("if it turns out the founder's `unverified` records are mostly
fine... that's a good outcome"). **What it does not mean**: 59 of 74 still needed a real correction —
mostly a null `organization` filled in from the program's own page, several dead/stale stored URLs
replaced with the program's current page, a few genuine title errors, two scope errors unrelated to
cycle_status (§6). "Not dead" and "stored correctly" are different claims; only the first one is true
across the board.

### 14 unresolvable — the pile CEO said matters most, broken down by *why*

Raw count (14/74, ~19%) undersells how much of it is a real content question versus a tooling gap:

**11 of 14 — tool/domain access blocked, not a program-health signal.** igem.org, hmmt.org,
cty.jhu.edu (×2 separate rows), ku.edu.tr (×2), ringling.edu, summer.gwu.edu, nytimes.com,
arts.princeton.edu all returned 403 or refused outright to every fetch attempt, including bare root
domains — and where a browser tool was tried as a fallback, it was independently denied by the same
sites, not merely by a hung tool. Northwestern's stored subpage failed with a TLS/connection error
while its parent domain loaded cleanly. This is exactly the design doc's own warning realized: *"an
unreadable source is an absence of evidence, never evidence of absence"* — these 11 would very
plausibly resolve cleanly with a different fetch path (a human browsing normally, or a tool with
different network permissions), not because anything about the programs themselves is in doubt.

**3 of 14 — genuine content-level ambiguity**, and these are the ones the design gap is really about:
- **Istanbul Bilgi Lise Yaz Okulu** — org and program both real and live, but the only dates found
  anywhere (site or search) are from 2025; no 2026 cycle referenced despite it being September. Can't
  tell if unrefreshed, paused, or ran quietly.
- **Columbia Spring Immersion Program** — stored URL resolves to a *different*, real Columbia program
  ("Academic Year Weekend") than the stored title claims. A plausible intended match exists but
  couldn't be confirmed directly.
- **Hochschule Bremen** — stored URL loads fine and is genuine, but describes a Master's degree
  requiring a completed bachelor's — structurally wrong for a 14-18 audience. This one is different in
  kind from the other 13: not absence of evidence, but confirmed evidence this specific link doesn't
  fit the product at all.

**The design implication is narrower than "we need a way to express deep uncertainty," which the
product already has (`unverified` + "Verification pending" badge, `lib/opportunities/lifecycle.ts`'s
own `insufficientVerificationReason`).** The bigger, more actionable gap is that any *automated*
re-verification job (the one already designed in `docs/opportunity-reverification-job-design-
2026-08-23.md`) will hit the same 403s this pass did against major `.edu` domains, `nytimes.com`, and
at least two Turkish university domains — worth a look before that job is built, not after.

## 5. Correction types found, beyond cycle_status itself

- **Organization backfilled** on ~35 of the 59 promotable rows (was `null`, filled from the program's
  own page).
- **Dead/wrong stored `official_url` replaced**: Garcia Summer Scholars (a 2018 news article →
  the program's real page), İTÜ Tasarım Atölyesi (a 404'd 2024 blog post → the 2026 announcement),
  Winchester/Discovery Summer (a Turkish reseller page → the operator's own site), USC "Dive Into
  Engineering" (generic landing page → the specific program page), Edinburgh (generic directory →
  the actual Pre-University Summer School page).
- **Title errors, flagged not silently rewritten** (founder's call, per the rules): Trinity College
  "London" is Dublin; "Dive Into Engineering!" isn't an official name (real program: "Discover
  Engineering"); LIYSF/Andover/Downing College/VTSP all carry a stale cycle year in the title itself
  (2026, when the live page markets 2027); the SAIC ECPOSI title is marketing copy, not a program
  name.
- **Confirmed org-mismatches** (the pattern this catalog keeps producing): Winchester College is only
  the venue, Discovery Summer is the operator; Oxford Royale explicitly disclaims University of
  Oxford affiliation on its own page; Inspirit AI explicitly disclaims official Stanford status;
  Harvard CURE is really run by Dana-Farber/Harvard Cancer Center, a Harvard-*affiliated* consortium,
  not Harvard University; HES-SO/HEIA-FR is a softer version of the same thing (title names the parent
  system, not the operating school).

## 6. Two things found that are real, but not this task's to fix

- **Caltech Summer Research Connection**'s `eligible_countries=["United States"]` is materially
  overbroad — the program's own page restricts to Pasadena Unified School District students only.
  An eligibility-scope defect, independent of cycle_status.
- **WashU College Prep Program**'s `official_url` is fine, but its separate `application_url`
  (`pathway.wustl.edu`) now redirects twice to a generic admissions page with zero program content —
  an apply-link rot defect, independent of `official_url`'s own correctness.

Neither is touched in the prepared SQL (§7) — different fields, different defect class, flagged for
whoever owns eligibility data and apply-link health respectively.

## 7. A third thing found, repeatedly, worth a look independent of this pass

**Three rows in this population already carry a `verified_at` or `last_verified_at` timestamp within
the last two weeks, despite sitting in the `cycle_status='unverified'` queue**: Student Science
Training Program (`verified_at=2026-08-23`), Harvard CURE (`verified_at=2026-08-23`), and Kadir Has
Kış Okulu (`last_verified_at=2026-08-31` — and in this last case, that recorded "verification" did
not catch that the page's own cited dates, 19–30 January 2026, had already elapsed by the time it
supposedly ran). This is a small, real signal that whatever wrote those three timestamps recently
did not check date currency — worth a look by whoever owns that write path, independent of anything
in this pass.

## 8. Prepared SQL — staged, not applied

`data/research/opportunities/unverified_cycle_status_promotions_2026-09-03.sql` — 59 `UPDATE`
statements, one per promotable row, each preceded by a comment naming the source checked and the
reasoning. **Dry-run validated against live, not just eyeballed**: wrapped the full statement set in
`begin; ... rollback;` and ran it against `oryn-qa-scratch` via the Supabase MCP connector — all 59
statements executed without error (valid enum values, valid columns), matched exactly 59 rows, then
rolled back. Confirmed post-rollback that `cycle_status='unverified'` count is still 74 — nothing
persisted.

Each `UPDATE` sets `cycle_status` (per-row, from the actual finding — `open` for rolling/ongoing
admission, `upcoming` for a confirmed future cycle with real dates, `date_not_announced` for a real
program whose most recent cycle has concluded with nothing next posted yet, `closed` for the one row
whose own stored `deadline` has already passed), `verification_state = 'verified_current'`, and
`verified_at` to today. Where a correction was found, `organization` and/or `official_url` are set
too. **Title corrections are never applied automatically** — every one is a SQL comment for the
founder to action separately, since a title is user-facing copy, not a verification fact.

**The per-row `cycle_status` assignment is offered as a considered starting point, not a claim of
certainty equal to the promotable/dead/unresolvable sort itself.** Two rows in particular are worth a
second look before applying: Georgia Tech Summer PEAKS and UAL both had pages stating "registration
open"/"book now" for a nominally-already-passed 2026 season, read directly by the verifying agent
rather than second-guessed — plausibly correct (rolling admission spanning into fall for the
*following* summer), plausibly a stale unrefreshed page. Flagged inline in the SQL comments.

Cycle_status distribution across the 59: 37 `date_not_announced`, 11 `open`, 10 `upcoming`, 1 `closed`.
