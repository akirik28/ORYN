# Never-written columns sweep — 2026-09-02

CEO's ask: the inverse of the migration audit — every column with no writer, sorted by
consequence not count, plus the reverse `?? default` check. Read-only, report don't fix.

Full report: `docs/unwritten-columns-sweep-2026-09-02.md`.

## Headline

Triaged 180 defaulted columns (the population where an unwritten column can misrepresent itself
as a real answer) by shape, deep-checked ~20 highest-risk candidates against real write paths,
plus an independent codebase-wide grep for self-documented instances of this exact bug shape.

**One new finding**: `university_requirements.is_exclusion` was a real instance of the same class
CEO found by accident in 0076 — an ingestion path that never set a column meant to flag exclusion
clauses, silently dropping real "programmes EXCLUDING the above-listed" rules and leaving a
genuinely-excluded student reading a general requirement as if it applied to them. **Already
fixed** in `lib/requirements/ingest.ts` (confirmed: the field is now required and explicitly set
on every accepted row) — but `lib/requirements/shape-audit.ts`'s own comment still describes the
bug in the present tense, the identical "documentation didn't keep up with a fix" shape as the
ten migration headers, just in application code. Flagged for a corrective note, not fixed here.

Everything else checked came back clean: `opportunity_matches.eligible` (highest-stakes
candidate by shape — a wrong default would show false availability), `education_records.is_current`,
`weekly_actions.impact_level`, and the full 9-table `source`/`cv_import` family are all
confirmed explicitly written, not defaulting. The `canonical_entities` satellite tables are a
structurally different, script-populated research-corpus subsystem — their unwritten columns are
untidy by design, not a live defect, confirmed nothing reads them expecting a real signal either.

The reverse check (item 3, `?? default` masking a genuinely-unpopulated column) was validated
against tonight's own two live examples (`plan_tier`, `notify_*`) — both correct — rather than an
independent fresh sweep; noted precisely as a spot-check, not exhaustive.

**Scope stated plainly, not left implicit**: ~700 total columns exist across 82 tables; this pass
individually verified ~20 against real write paths, categorized the rest of the 180-column
defaulted population by shape, and did not touch the ~520 non-defaulted nullable columns (lower
risk by construction — a null read is visibly "unknown," not a false claim, everywhere this
codebase's own evidence-state conventions were checked tonight).

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — [see commit]. Documentation-only change;
no `next build` per current policy. No `npm ci`/`npm install` in this worktree — symlinked
`node_modules` from the main checkout.
