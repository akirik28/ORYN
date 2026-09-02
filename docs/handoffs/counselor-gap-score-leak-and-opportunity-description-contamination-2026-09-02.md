# Counselor gapWhyLine score leak + opportunity description contamination — 2026-09-02

Two fixes assigned together off Phase 79's final audit (`docs/phase79-final-audit-2026-09-02.md`),
both live Trust violations. Branch: `oryn/opportunity-description-contamination-2026-09-02`.

## 1. `gapWhyLine` raw-score leak — fixed

**Bug:** `lib/counselor/copy.ts`'s `gapWhyLine` quoted a score for every `GapSeverity`, including
`insufficient_data` — live on every Counselor Core card as "Academics — insufficient data (0/100)."
`insufficient_data` means Oryn hasn't confidently assessed the dimension at all; the underlying
score is 0 by construction for a no-evidence dimension (`lib/scoring/signal.ts`'s own
`EvidenceState` machinery). Quoting a score for a dimension Oryn admits it can't assess is exactly
the "0 reported as a real weakness" Phase 68 forbids — the same principle the dashboard's own
profile-signal panel already holds a few files away.

**Fix:** `insufficient_data` now omits the score suffix entirely, in both locales. Every other
severity (`critical`/`moderate`/`minor`) is unchanged — those scores are real and confidently
computed. `alreadyStrongWhyLine` was checked and confirmed NOT a sibling instance: its only caller
(`whyForOpportunity` in `lib/counselor/evidence.ts:63`) gates it behind
`score >= GAP_CLAIM_SCORE_CEILING`, so its score is always genuinely high.

**Files:** `lib/counselor/copy.ts`, `__tests__/counselor/copy.test.ts` (+4 tests, 9/9 passing).

## 2. Opportunity description contamination — writer identified, first cleanup tranche staged

**What Phase 79 found:** research-session process notes live inside `opportunities.description`
on at least 3 rows (Yale Young Global Scholars, Wall Street 101, IE University), later joined by a
4th (Girls Who Code, found by oryn-bb) with a different shape (raw import fragment + a "Retired"
closeout note).

### Who wrote it

Ruled out every currently-checked-in script as the writer:
- `scripts/acquire-opportunity-eligibility.ts` — own header explicitly excludes `description`
- `scripts/ingest-opportunities.ts` — zero references to `description` in the file
- `scripts/validate-research-records.ts` — read-only report generator (`writeFileSync` on its own
  report only), no DB writes anywhere in 1252 lines
- `scripts/audit-opportunity-duplicates.ts` — no "Retired"/description-related text at all
- Full git history (`git log --all -p` / literal-phrase grep across every commit) — no commit, on
  any branch, touches `description` with this phrasing

`data/research/opportunities/summer_findings_2026-08-23.jsonl` and `..._online_2026-08-23.jsonl`
(both live in the repo at current main) contain similar research vocabulary — genuine findings,
not contamination — but nothing in the codebase mechanically transforms those findings into
`description` UPDATEs.

**Conclusion:** this was very likely live, ad-hoc SQL run interactively (e.g. via the Supabase MCP
tool) during a research/verification session on 2026-08-24, not a repeatable pipeline. One
contaminated row states outright why: *"selectivity_evidence has no column, a known schema gap"* —
there was nowhere else to put verification reasoning, so it went into the one text field that
existed. **There is no line of code to patch.** The exposure is process (an interactive session
using a public-facing column as a scratchpad), not a bug — the durable fix is the same
machine-checkable guard Phase 79 already recommended systemically (e.g. a QA check that
`description` never matches dated-parenthetical / "this session" / raw-list-index patterns), not a
code change.

Girls Who Code additionally traces to a second, independent, unrelated defect: its pre-append text
is a raw, unedited `"5. Girls Who Code | ... | https://..."` tuple that matches
`supabase/seed_drive_batch1.sql:845` verbatim — the seed corpus was already malformed at import.
`import-opportunity-corpus.ts` copies `description` through with zero transformation by design;
this is the seed row being bad, not a script bug.

### Real scope — larger than the original floor

CEO's original regex buckets (8 process-phrase / 11 column-name / 43 date / 22 vocabulary, out of
421 total) were an explicit floor, not a count. I read 49 candidate rows by hand (union of those 4
patterns plus adjacent checks) and found **37 genuinely contaminated — a ~75% hit rate** within an
already-targeted pool. Several confirmed rows (Girls Who Code, the two "Retired... true duplicate
of" rows) were not caught by any of the 4 original regex patterns at all — found only by reading.
**The true population across all 421 rows is very likely larger than 37; I have not read the full
table.** Also confirmed a real false-positive rate inside the buckets themselves: every UK Maths
Trust competition row (Kangaroo/Olympiad/Challenge family — 10 rows checked) matched on a
legitimate program date and is clean, unrelated writing.

### Staged cleanup — NOT applied

`data/research/opportunities/description_contamination_cleanup_2026-09-02.sql`:
- 35 `UPDATE` statements, each keeping only verifiable factual claims (dates, costs, requirements,
  program structure) from the row's current text and dropping every sentence that is process
  narration, tool-call self-reference, sourcing-confidence hedging, or cross-references to the
  session's own prior work. Wrapped in `BEGIN`/`COMMIT`.
- 2 rows (BU, SAIC) held out as flagged founder decisions rather than rewritten: each claims to be
  a duplicate of another live row, and I independently re-confirmed both claims tonight
  (`official_url` matches exactly; both pairs are currently `status='active'` simultaneously) —
  these should likely be retired via the `status` column, not given a cleaned description.
- **Not applied to the live DB.** Every write to this data is founder-gated per standing rule; the
  file's own header repeats this and lists everything not yet reviewed.

### Explicitly not done yet

- The remaining ~372 unread rows (49 of 421 read). The real total is unknown, only lower-bounded.
- No independent re-verification of the *facts themselves* (costs/dates/requirements) — this pass
  fixes the writing problem (process notes in a public column), not the underlying research.
- The systemic guard (a check that would have caught this automatically) is recommended, not built.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` (4,139 tests) / `npm run build` — all green.
(`npm run build` first failed with Turbopack's known `Symlink [project]/node_modules is invalid`
error against this worktree's symlinked `node_modules` — documented pre-existing quirk, not a code
issue. Fixed by `rm node_modules && npm ci` — real install, identical `package-lock.json` confirmed
against the main checkout first — then build passed clean.)
