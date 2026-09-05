# Ranking tiebreaker fix (2026-09-05)

CEO's dispatch on reopening the fleet: fix the ranking-instability gap found the night before
(`docs/home-strip-ranking-stability-2026-09-04.md`) — but not just the one line. Two explicit
requirements: (1) prove the fix's own test can actually go red against the old code, not just
assert the new code looks right, and force the underlying Postgres-level instability empirically
if at all possible rather than settle for "it happened to be stable when I checked"; (2) audit
every other `.order(` call site for the identical single-column-sort-into-a-"top N" shape.

## Part 1 — the fix

`lib/opportunities/home-strip.ts`'s `getHomeOpportunityStrip` ordered `opportunity_matches` by
`match_score DESC` alone before slicing to `HOME_STRIP_CANDIDATE_POOL`/`HOME_STRIP_SIZE`. Fixed
by adding `.order("id", { ascending: true })` as a secondary key — `opportunity_matches.id` is
its own `uuid primary key` (migration `0008_opportunities.sql`), confirmed always-unique per row
(unlike `calculated_at`, which a same-instant batch recompute could still tie).

### Red proven first, not asserted

Added a test to `__tests__/opportunities/home-strip.test.ts` asserting the exact sequence of
`.order()` calls the query makes, via a hand-rolled `vi.fn()` chain builder (modeled on
`__tests__/scoring/monthly-review.test.ts`'s own pattern) — not
`__tests__/stubs/mock-supabase-table.ts`, which documents `.order()` as a deliberate no-op
("nothing under test depends on ordering correctness"); this is the first test where something
does. Run against the code before this fix landed:

```
AssertionError: expected [ [ 'match_score', …(1) ] ] to have a length of 2 but got 1
```

Confirmed genuinely red, not a typo in the test — the assertion fails for the real reason
(exactly one `.order()` call existed). After the fix: 10/10 pass.

### The empirical proof CEO actually asked for: forcing real Postgres-level instability

Asserting the query now *asks for* a specific order isn't the same claim as "the old query's
order was actually undefined" — CEO's own framing: measuring twice and finding it stable by luck
doesn't prove the absence of the bug, since 2026-09-04's own investigation found exactly that
(stable both times, on a quiescent table, purely because nothing had written to it). CEO
suggested two ways to force it: interleave a write, or force a sequential scan instead of an
index scan. Went with the second — deterministic and repeatable, unlike hoping a write causes a
page split.

Local ephemeral Postgres 17 (`initdb`/`pg_ctl`, custom port 5511 + a short `/tmp` socket dir —
the scratchpad's own path is too long for a Unix socket, confirmed by the literal `initdb`
error), a table shaped exactly like `opportunity_matches`, 20 rows for one student all tied at
`match_score = 50`, indexed on `match_score`:

**Old query (`ORDER BY match_score DESC LIMIT 5`), same data, same query, plan forced two ways:**

| Forced plan | Result (opportunity_id, rank 1→5) |
|---|---|
| `enable_seqscan=off` → Index Scan Backward | `ba61b6e5…`, `3eeaeae9…`, `3f208be5…`, `4a4cc4f4…`, `7c08c199…` |
| `enable_indexscan=off; enable_bitmapscan=off` → Seq Scan + Sort | `3eeaeae9…`, `3f208be5…`, `4a4cc4f4…`, `7c08c199…`, `ba61b6e5…` |

**Different order** — `ba61b6e5…` sits at rank 1 under one plan and rank 5 under the other, same
unchanged data, same query text. This is the empirical proof, not an inference from reading the
code: the old query's result order genuinely is plan-dependent, exactly as the missing-tiebreaker
theory predicted, and this is a real reproduction, not the "stable both times" result 2026-09-04's
own investigation had to report honestly as inconclusive.

**New query (`ORDER BY match_score DESC, id ASC LIMIT 5`), identical setup, same two forced
plans**: byte-identical result both times. The fix removes the plan-dependence, not just in
theory — confirmed against the same data that just proved the old query unstable.

Ephemeral instance torn down after (`pg_ctl stop`, scratch dir removed) — nothing persisted, no
live database touched.

### Same fix applied to a second, real instance found during the audit (see Part 2)

`lib/parent/panel-data.ts`'s `fetchOpportunities` — the parent panel's own "top 5 opportunities"
— had the identical shape (`order("match_score", ...).limit(20)`, no secondary key, sliced to 5
after filtering). Not explicitly named in CEO's dispatch, but a one-line, zero-judgment-call fix
identical to the one just proven correct; applying it rather than only reporting it, per this
project's own "make the sensible call, document it, keep it reversible" standing rule (AGENTS.md
Rule 1) — flagged here plainly rather than silently bundled in. Same red→green proof in
`__tests__/parent/panel-data.test.ts` (own dedicated spy, not the file's shared `chainable()`
helper, since that helper's `.order()` is also an intentional no-op for the same reason as the
other mock).

## Part 2 — audit: does the same bug exist elsewhere?

CEO's own framing: this is an assumption, not a measurement — verify, and say "no" if it's
genuinely no. Grepped every `.order(` call in `lib/` and `app/` (excluding tests), then filtered
to the specific shape that actually matters: a single-column `.order()` on a column that can
plausibly tie in real data, immediately followed by a `.limit()` that could silently swap which
rows survive the cutoff. Ordering-without-truncation (no `.limit()` at all) doesn't have this
risk — every row still comes back, just possibly in a cosmetically different order among ties —
so those were excluded even where a tie is plausible (`lib/social/featured.ts`'s
`display_order`: no `.limit()`, and it's a small, self-curated per-user list, not a competitive
cutoff).

**Confirmed second real instance**: `lib/parent/panel-data.ts:76` (fixed above).

**Checked and excluded, with reasoning, not by assumption**:
- Every other `.order(...).limit(...)` site orders by a timestamp (`created_at`, `started_at`,
  `calculated_at`) or `stat_year` — near-unique in practice (millisecond-resolution timestamps),
  and where a genuine tie did occur (two rows sharing one `stat_year`) that would itself be a
  separate, pre-existing data-quality question (see
  [[reference_a_unique_constraint_over_a_nullable_column_never_fires]]), not this bug's shape.
- Admin-only lists (`lib/admin/queries.ts`'s provider-health/message-reports/opportunity-list
  reads) aren't a competitive "best N of many eligible candidates" surface a student trusts as
  personalized — lower stakes even if a tie did occur.
- `.limit(1).maybeSingle()` sites (`lib/scoring/persist.ts`, `lib/universities/detail-reads.ts`,
  `lib/admissions/persist.ts`) ask "the single latest row," a different correctness question
  (whether more than one row can legitimately share the latest timestamp/year at all) than "which
  N of many equally-ranked candidates makes the cut."

No 4th instance found. Reported as a real "no" for the rest, not silence.

### Addendum — raw SQL `ORDER BY`, not just `.order(` calls

CEO's follow-up: the first pass only greps PostgREST `.order(` calls in TypeScript — a
`security definer` SQL function's own `ORDER BY` (called via `.rpc()`) would be invisible to
that grep entirely. Searched `supabase/migrations/*.sql` and `supabase/functions/*` for
`order by` directly. Four real hits, none a new instance of this bug:

- **`get_parent_child_commentary` (`0130_parent_commentary_entries.sql:106`)**:
  `order by e.generated_at desc limit greatest(1, least(p_limit, 50))` — single-key, real
  tie risk (a digest batch could plausibly write several rows with the same `generated_at`).
  But its only caller (`lib/parent/commentary.ts:38`) always passes `p_limit: 1` — this asks
  "the single latest commentary entry," the same already-excluded `.limit(1)` question above
  (which of several same-instant rows counts as "the" latest), not "which N of many tied
  candidates survives a competitive cutoff." Same exclusion, found by the other search method.
- **The canonical-entity-resolution function** (`0038_canonical_entity_registry.sql:720`,
  reconciled again verbatim in `0039_canonical_registry_reconciliation.sql:84`):
  `order by case verification_state ... end, last_verified_at desc nulls last limit 1` —
  already a TWO-key order (verification tier, then recency), inside a
  `pg_advisory_xact_lock` scoped to the exact same normalized name+country+city. A residual tie
  needs two candidate entities matching on both keys at once, and the result decides which
  existing entity a NEW mention attaches to at write time (once per mention created), not a
  value re-rendered to a student on every visit. Lower severity by construction (two keys, not
  one) and lower stakes (a write-time backend dedup choice, not a repeated live ranking
  surface) — noted, not fixed; a real residual, but not this bug's shape.
- **The fuzzy entity-search function** (`0038_canonical_entity_registry.sql:665-673`):
  `row_number() over (partition by entity_id order by score desc, matched_via) ... order by
  score desc, display_name limit greatest(1, least(p_limit, 50))` — two-key order at both the
  per-entity dedup stage and the final ranking, an admin/ingestion-time entity search, not a
  student-facing recommendation surface. Same reasoning as above.

No raw-SQL instance of the actual bug shape (single-key order, no tiebreaker, feeding a
repeated live "top N > 1" surface) found. The two-key cases above are already meaningfully
better-guarded than `home-strip.ts`'s original single-key order was, not equivalent to it.

## Not done here

Nothing merged to `main` — CEO is sole merge authority. No live database touched (this was a
local ephemeral Postgres instance, entirely separate from Supabase). Full gate (typecheck, lint,
vitest) run before push; see commit message for the exact numbers.
