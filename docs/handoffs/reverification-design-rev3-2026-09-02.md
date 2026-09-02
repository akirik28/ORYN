# Re-verification pass design — rev 3, 2026-09-02

CEO's ask: design a re-verification pass, not build one. What follows is not a new document —
it's a rev 3 addendum to one that already existed and already answered the assignment.

## The actual finding: this was already designed, at a rigor I would not have matched fresh

`docs/opportunity-reverification-job-design-2026-08-23.md` — 1536 lines before this pass, dated
2026-08-23, already at "rev 2," explicitly cited by section number from `lib/opportunities/
lifecycle.ts`'s own comments (§1.2, §3.3, §8.4, §12). Read in full before writing anything, on the
same "check what already exists" discipline that caught the known-issues.md near-miss earlier
tonight. It already answers all five things CEO asked for:

1. **What "re-verified" means, structurally distinct from lineage** — §8.5's `source_verified_at`,
   with 7 explicit preconditions designed to make it "unforgeable by construction" (a
   verification-runs-table row must exist *first*, in the same operation).
2. **Ordering** — §4's additively-weighted priority function (exposure × risk × overdue × saved),
   already re-verified live tonight (§4.2's "when #146 deleted the special population, no line of
   §4.1 needed editing" held again, ten days and twelve rows later).
3. **What happens to a row that fails** — §9's asymmetric demotion: may demote to closed on strict
   evidence, may *never* auto-promote to open, ships with demotion disabled, staged rollout (dry
   run → 2 full passes flag-only → enable). Exactly the "not obviously disable" nuance CEO asked
   for, already built in.
4. **The honest limit** — §7 is entirely this: "an unreadable source is an absence of evidence,
   never evidence of absence." A row that can't be verified is left exactly as it was, routed to a
   human queue after 4 consecutive failures, never silently hidden or falsely confirmed.
5. **Cost** — §5.3 gave volumes (Tavily credits, LLM tokens) but explicitly declined dollars: "I
   would be guessing at current rates." This is the one genuine gap, and it's the one thing that
   didn't exist on 2026-08-23 to check against.

Writing a second, competing design would have been strictly worse than what exists. I didn't.

## What rev 3 actually adds

**New §5.4 — cost in real dollars, closing the gap rev 2 left open.** `lib/ai/limits/
job-budget.ts` (merged since rev 2) is a real, code-enforced, per-feature monthly Anthropic-spend
cap. Priced the LLM side against it: ~$1.30–3.50/month for a full corpus pass at the offered
cadence — comfortably affordable. **But the answer to CEO's actual question ("fits inside that or
needs its own") is: needs its own, and not because of the dollar total.** The existing
`opportunity_extraction` $25/month bucket is already ~60% claimed by Job A's discovery pipeline
(job-budget.ts's own comment sizes it at ~$15/month). Sharing the tag would (a) make per-feature
spend attribution — the entire reason this mechanism exists — unanswerable for either job without
a join, and (b) couple re-verification's availability to an unrelated job's spend: a discovery-side
bug or growth spurt could silently exhaust the shared budget and stop re-verification's adjudication
path for a reason that has nothing to do with re-verification. Recommends a third
`JobBudgetFeature` value, `opportunity_reverification`, at a $5/month default. Tavily spend remains
priced as before (§5.3) and ungoverned by this same mechanism — genuinely unresolved, not newly
discovered, carried forward as Assumption A1.

**Fresh live re-measurement, in the rev 3 header note.** Every core number rev 2 measured,
re-checked today: 271→283 active rows (catalog growth), the §10.1(a) high-risk query 42→45 (same
query, re-run verbatim), the `closed`-with-past-deadline control pool unchanged at 28 (a real
stability check, not just a re-count), and the `unverified`-cycle count actually *improved*,
86→75 — independently cross-corroborated the same night by two sessions computing it from two
different predicates (the 74-vs-75 resolution from the dashboard-badge task). The ISSYP canary
(§10.1(c)) is still `under_review`/`unverified`, still a valid, live test case.

**Two items added to §12's "flagged for other owners" list**, matching that section's existing
style: the new job-budget entry above, and a re-confirmation (grepped directly, not assumed) that
the `machine_checked_at` → `source_verified_at` rename flagged since rev 1 still hasn't happened —
still free, still zero production readers, still not this document's file to change.

## What this explicitly is not

Not a rewrite. Not a renumbering — `lifecycle.ts`'s citations by section number (§1.2, §3.3, §8.4,
§12) remain valid, per rev 2's own explicit instruction not to renumber them. Not an
implementation — no migration, no route handler, no scheduler, exactly as both prior revisions
state. No code touched outside this one markdown file.

## Gates

`npm run typecheck` / `npm run lint` — both green (per CEO's current fleet-wide gate policy: no
build in-lane, CEO runs it once at merge). No test files affected — documentation-only change.
