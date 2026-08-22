# RES-I2 package I2-3 — DLOPP monotonicity guard + pre-ingestion dedup baseline, 2026-08-22

**Status: PREP COMPLETE, read-only throughout, nothing written to the live DB.**

Package assigned by ORYN-BASORG: (1) build and dry-run-prove the RULE-INGEST-003
monotonicity guard for the DLOPP ingestion path before it's needed, (2) run
`npm run audit:opportunity-duplicates` as a pre-ingestion baseline. Both done. One
consequential finding surfaced during the dry run that goes beyond this package's
original scope — flagged to BASORG separately, summarized here (see "Beyond RES-V1's
21" below).

## 1. RULE-INGEST-003 guard

`lib/opportunities/monotonic-guard.ts` (new) — pure, unit-testable, column-agnostic per
BASORG's requirement (not hardcoded to `cycle_status`). Mechanical rules, applied to any
field:

- proposed empty, live populated → **skip** (would erase)
- proposed populated, live empty → **write** (populates a gap)
- proposed equals live → **write** (idempotent refresh)
- proposed populated but not an exact member of a closed vocabulary → **skip** ("no
  live-constraint equivalent," never coerced toward a nearby valid value)
- a live value in an explicit placeholder set (`cycle_status`'s `"unverified"` — the
  schema's own "not yet known" state) is treated as empty, not as a real fact, so it can
  be populated without triggering the "different populated values" case below
- proposed populated, live populated, **different**, both otherwise valid → **hold**,
  never a default write or skip — this is a correction claim the module cannot verify
  alone. An explicit `ResolvedCorrection` (recordId + field, `approved: true/false`, with
  a reason) is the only way out of hold, in either direction. Absence from that list
  means held, full stop — matching BASORG's ruling on DLOPP-B1-01/B5-13 exactly.

The "proposed empty" branch also checks for an explicit approved correction before
defaulting to skip — needed for Ron Brown (below), where the correct write is *clearing*
a populated field because the evidence shows it's fabricated, not merely absent.

**Tests**: `__tests__/opportunities/monotonic-guard.test.ts`, 19/19 passing, covering
every branch above plus the concrete DLOPP cases (Ashoka, IPsyO, CyberPatriot, the two
held records, Ron Brown's approved erasure). Full repo: typecheck clean, lint clean on
the new files, full suite **123 files / 1877 tests passing** (no regressions).

## 2. Dry run against live data — "demonstrated firing," not just written

Live state for all 15 of RES-V1's flagged opportunity ids re-measured immediately before
this run (`docs/handoffs/i2_dlopp-guard-dryrun.md`'s own live snapshot, taken 2026-08-22
via Supabase MCP `execute_sql`, project `qtcvcflzxbuagvvwahhu`) — matched RES-V1's table
exactly, no drift. `scripts/dryrun-dlopp-monotonic-guard.ts` runs the real guard module
against these values and the DLOPP batch's proposed values verbatim, using
`DLOPP-RCHECK-01/02/03` in place of the superseded `B1-03/B4-10/B4-12` per BASORG's
supersession instruction. Read-only; not wired into `package.json` (one-off verification
script, kept for reproducibility, output is the actual deliverable).

**Result: 15 records, 45 field decisions — WRITE 4, SKIP 27, HOLD 14.**

BASORG's two rulings, wired in as `resolvedCorrections` and confirmed firing correctly:

- **Ron Brown (DLOPP-B5-13)**: `cycle_status` → **WRITE** `date_not_announced` (evidence
  affirmatively contradicts live `upcoming`). `deadline` → **WRITE** `null`, clearing the
  live `2026-12-01` (RES-V2 confirmed this was an award-year projection, never a
  published date — "a well-reasoned prediction is still a prediction"). Both fired
  exactly as ruled.
- **120 Hours (DLOPP-B1-01)**: `cycle_status` → **SKIP**, stays `closed` (source is
  silent, not contradictory — the correction bar isn't met). Fired exactly as ruled.

The other 16 destructive findings from RES-V1's table (unknown/no-vocab-equivalent
values, null-over-populated erasures) all skip mechanically, as designed. Full per-field
output with reasons: `scripts/dryrun-dlopp-monotonic-guard.ts`'s run, reproduced by
re-running the script (deterministic given the same inputs).

## 3. Beyond RES-V1's 21 — a finding, not a decision I made myself

Running the guard against **every** relevant field (not only the ones RES-V1's table
flagged) surfaced **12 more hold cases** the original 21-finding table didn't cover:

- **3 new `cycle_status` holds**: CyberPatriot, IPPF, and The Concord Review all propose
  `open` against a live `upcoming` — different, both valid, no resolution on file. RES-V1's
  table didn't include these because their audit's premise was "no live-constraint
  equivalent" (the 9 `unknown` records) plus null-over-populated erasures (the 5 deadline
  records) — `upcoming`→`open` is neither; it's a same-vocabulary state change that could
  be a legitimate cycle progression (registration having since opened) or a wrong
  overwrite, and the guard can't tell which without evidence, so it holds rather than
  guessing either way.
- **9 new `current_cycle_label` holds**: every record where live and proposed are both
  populated but phrased differently (120 Hours, Ashoka, ASSIP, BSPEE, CyberPatriot, Girl
  Up, IPsyO, IPPF, STEM Racing, Concord Review — 10 by count, 1 already counted above via
  Ron Brown's separate hold on this field, so 9 net-new beyond the table). RES-V1's table
  only flagged `current_cycle_label` where the *proposed* value was empty (a clean
  erasure case); it didn't audit the "different non-empty replacement" case for this
  field. Checked before treating this as noise rather than signal: `current_cycle_label`
  is rendered directly to students (`app/(app)/opportunities/[id]/page.tsx:101`), so a
  wrong or lower-quality replacement is a real trust-defect risk, same class as the
  enum fields — the conservative default is proportionate here, not overcautious.

None of these 12 are resolved in this package — they hold, exactly as designed, pending
whatever review path BASORG assigns (most likely RES-V2, same pattern as Ron Brown/120
Hours). Reported to BASORG directly; not deciding routing myself.

## 4. Pre-ingestion dedup baseline (RULE-DEDUP-001)

`npm run audit:opportunity-duplicates` could not run directly — this environment has no
local `SUPABASE_SECRET_KEY` (same constraint noted elsewhere in this org's cross-session
notes for machines without local credentials). Reproduced the exact same computation —
same `findDuplicateCandidates` from `lib/opportunities/duplicates.ts`, same query shape
(`select id, title, official_url, status where status != 'disabled' order by title asc`),
same output format — via a one-off local driver fed by a live snapshot pulled through the
Supabase MCP tool instead of the script's own `fetch()`. Zero logic drift: it's the real
function, not a reimplementation. Driver was scratch-only, not committed; this report and
the saved output are the durable record.

**Baseline, 2026-08-22: 385 live (non-disabled) opportunities scanned.**

- deterministic: **0**
- probable: **7** — Phillips Exeter Academy pair (0.60), two Wharton FBW/LBW pairs
  (0.56/0.43×2), Columbia Pre-College Online/Commuter (0.50), Immerse Education
  Essay/Summer School (0.50), Georgetown HOYA/Summer Programs (0.50), Pioneer
  Research/Academics (0.50), UCSB Research Mentorship ×2 naming (0.50)
- needs_review: **9** — Sabancı ×2, Bocconi ×2, RISD ×2, Brown/Summer@Brown, Stony Brook
  Garcia/Simons, Wharton Investment Competition, Bath ×2

Full pairs with ids: see this run's saved output, reproducible by re-running the driver
against a fresh snapshot.

**Diamond Challenge pair correctly does not appear** — checked deliberately rather than
assumed absent. BASORG flagged it as an expected `deterministic`/1.0 hit that's "the tool
working correctly, one row already disabled, no action needed." With one side already
`status='disabled'`, the `status != 'disabled'` filter now only returns one of the two
rows, so the pair has no partner left to match against — its absence from this baseline
is the expected, already-resolved state, not a miss.

**Nothing acted on.** Per RULE-DEDUP-001 and org rule 10 (never fuzzy-merge — non-exact
matches go to a review queue), this baseline exists so the post-DLOPP-ingestion run is
interpretable against it, not to trigger any resolution now.

## Explicitly not done in this package

No DLOPP write. No resolution of the 12 newly-surfaced holds. No action on any dedup
candidate. Package I2-3 was read-only prep, per BASORG's assignment; all three are
next-package or BASORG-routing decisions.
