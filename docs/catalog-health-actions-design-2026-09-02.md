# Catalog health — action list and confirmation model — 2026-09-02

Course correction, relayed by CEO from the founder directly: *"sen bana rapor tarzı bir şey
yapıyorsun, ben bana yönetmede çok çok yardımcı olacak bir sayfa istiyorum"* — control panel, not
report. Four actions, all touching real student-facing data staged and waiting on manual SQL for
hours. **Design only — nothing below is built.** No migration, Server Action, or UI written this
pass. Read-only on live throughout this design's own verification (confirmed the AI Scholars row
and the cleanup file's exact statement shape live; wrote nothing).

## The two hard constraints, applied concretely to each action below

CEO held two constraints hardest for this panel specifically, because these actions touch real
student-facing records:

1. **Preview before it changes.** Not "apply, then report a count" — old value, new value, per
   row, before the button that commits anything is even enabled.
2. **Never silently partial.** A batch that succeeds 34-of-35 must show which one didn't take and
   why, not fold it into an aggregate.

Both are held for every action below, not just the batch one — a single-row action's "preview"
is just that one row's before/after, and "never silently partial" degenerates to "never silently
fail" for a single row.

## Action 1 — Apply the 35-row description cleanup

**What exists already**: `data/research/opportunities/description_contamination_cleanup_2026-09-02.sql`
— 35 `UPDATE ... WHERE id = ... AND left(description, N) = '<exact prefix>'` statements, every
guard dry-run verified against live before the file was finalized. The file's own header already
states the correctness bar: *"A correct run prints `UPDATE 1` thirty-five times... If any
statement instead prints `UPDATE 0`: STOP and do not re-run it forced... the other 36 are
unaffected and safe to apply as-is."* CEO's own words confirm this stays the model: *"34 applying
and 1 flagged is better than all-or-nothing."* So the confirmation model here is not a new
decision — it's this file's own specification, read as a UI spec instead of an operator's runbook.

**Mechanism, checked against what's actually expressible without new DB infrastructure**: each
guard is an exact-prefix match, which is a plain PostgREST `.like('description', prefix + '%')`
filter — no custom Postgres function or multi-statement transaction needed. 35 independent
`admin.from("opportunities").update({ description: newText }).eq("id", id).like("description",
prefix + "%")` calls, each returning its own `{ data, error, count }`. Postgres/PostgREST doesn't
error on a zero-row match, so a guard miss is a normal, visible `count: 0` result, not an
exception to catch — this composes with "never silently partial" for free rather than needing
special-case error handling.

**Data shape decision, flagged for CEO's call rather than made here**: the 35 (id, guard prefix,
new text) tuples currently live only as hand-written SQL text. Two options: (a) convert to a
typed `const CONTAMINATION_CLEANUP_2026_09_02: { id: string; title: string; guardPrefix: string;
newDescription: string }[]` in `lib/opportunities/` — type-checked, testable, and this is a
closed, one-time batch that will never grow, unlike the never-written-column watchlist which is
designed to; or (b) parse the SQL file at runtime, matching the pattern `getMigrationReality`
already established for a different, open-ended file. Recommending (a) — a fixed, 35-entry batch
gains nothing from being re-parsed from SQL text on every admin-panel load, and a typed array is
directly unit-testable (confirm all 35 ids are distinct, confirm every `newDescription` is
non-empty) in a way parsed SQL isn't as cleanly.

**Preview UI**: for each of the 35 rows, fetch the current `description` live, show the stored
`newDescription` beside it, and show whether `left(current, len(guardPrefix)) === guardPrefix`
right now — a row whose guard would currently fail is shown as "will be skipped, description
changed since 2026-09-02" *before* the apply button is pressed, not discovered after. Apply button
disabled until this preview has loaded.

**Audit**: one row per attempted update in the new log (see the shared model below), recording
old description, new description (or the fact that it was skipped and why) — this is the one
action of the four where the audit row's own diff *is* the primary evidence the action did what
it claimed, not a secondary record of it.

## Action 2 — Disable a single opportunity

**Concrete case**: `3f7170ba-9486-40b0-b450-42462471e88d`, "AI Scholars" — confirmed still live,
`status: 'active'`, description still carrying the raw contamination text from the CMU-merge
finding, unchanged since it was flagged. Confirmed directly against live before writing this, not
assumed from memory.

**Mechanism**: `OpportunityStatus` (`types/database.ts`) already has `'disabled'` as a real,
existing value — no schema change needed. A single `admin.from("opportunities").update({ status:
"disabled" }).eq("id", id)`, gated on a required, non-empty reason string (feeds the audit log;
also the field CEO's own two-CMU-programmes finding would go in for this specific row).

**Preview**: title, current description, current status, and — since this is a moderation
decision, not a data fix — the reason text the admin is about to record, shown back before the
confirm click, not just typed and immediately submitted.

**This is the smallest lift of the four** — existing column, single-row, no batch semantics, no
new capability to build beyond the Server Action and its audit write.

## Action 3 — Force re-verification of one record

**The honest scoping problem, stated plainly rather than glossed over**: CEO's own words point at
`docs/opportunity-reverification-job-design-2026-08-23.md`'s model, and that model is real and
detailed — but every part of it that actually establishes a fact (§8.5's seven preconditions for
`source_verified_at`, the P1 outcome: fetch the real official source, extract, compare) requires
genuine external fetching and judgment that has never been built, not even at the single-record
level. This is categorically different from actions 1, 2, and 4, which wire a button to a
mechanism that already exists in some form. A "force re-verify" button whose backend doesn't yet
exist would be exactly the "fake button that does nothing" AGENTS.md forbids outright if shipped
as a real check — and the design's own §8.6 is explicit that a cheap stand-in (`coalesce(verified_at,
last_verified_at)`, or by extension anything that fakes a real fetch) is a lie, not a shortcut.

**Recommended V1, scoped honestly rather than either refusing the button or faking the check**: the
button queues the record — writes a request timestamp (a new `reverification_requested_at`
column, or a small `reverification_requests` table if more than one outstanding request per row
ever needs tracking) — and the admin UI shows "queued, not yet checked" rather than a result. The
*real* fetch-and-judge pipeline (§8.5's P1 outcome) is separate, larger work this design doc
already scoped and did not build; a queue is the honest, buildable primitive available today, and
it's still a genuine improvement over "nothing anywhere lets you ask for a recheck." Recommend
sequencing this action's real backend as a later phase, explicitly — not silently deferring it by
shipping a button that looks complete and isn't.

## Action 4 — Mark a record for review / clear the flag

**Mechanism, unified with Action 2 rather than a separate one**: `under_review` is the *same*
`OpportunityStatus` enum `'disabled'` belongs to — so this is the identical `setOpportunityStatus`
primitive as Action 2, just toggling between `'active'` and `'under_review'` instead of to
`'disabled'`. One Server Action, two call sites (or one, parameterized by target status), not two
separate mechanisms to build and keep consistent.

**Scope boundary, worth stating precisely so it isn't read as more than it is**: this is a flag
toggle, not a promotion path. docs/opportunity-verification-gate-tightening-impact-2026-09-02.md's
own "flagging forward" section already found no `under_review` → `active` promotion exists
anywhere in the codebase, and building one is separate, larger work this action does not attempt.
"Mark for review" and "clear the flag" both just move a row between `active` and `under_review`;
neither claims to solve what happens to the 107-row `under_review` pool structurally.

## The shared confirmation model, one mechanism for all four

- **Authorization**: `requireAdmin()`, the same gate every other admin action already uses — no
  new auth layer.
- **Preview before commit**: each action's Server Action pairs with a read-only "preview" call
  that returns exactly what the confirm screen needs (current value(s), and for Action 1, guard
  status per row) — never inferred from a stale value already in the page.
- **No silent partial**: every mutation, single-row or batch, returns a per-item outcome shape
  (`{ id, applied: boolean, reason?: string }[]`), not a bare count — a UI rendering a bare
  `updated: 34` would already be the failure mode CEO named.
- **A minimal audit log, scoped to these four actions, not a general system.** CEO named the
  existing gap directly (docs/known-issues.md, referenced twice already, no field-level audit
  trail anywhere in this codebase today). Proposing one new table:

  ```sql
  create table admin_actions (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null references profiles(id),
    action text not null,           -- 'disable_opportunity' | 'mark_under_review' | 'clear_review_flag' | 'apply_description_cleanup' | 'queue_reverification'
    target_table text not null,
    target_id uuid not null,
    reason text,
    before_value jsonb,
    after_value jsonb,
    created_at timestamptz not null default now()
  );
  ```

  Written in the **same request** as the mutation itself, never a separate best-effort call
  after — the exact "read and write live on the same path, never two paths that could drift"
  discipline this session has applied to every write-once flag built tonight (most recently the
  Ultra welcome moment's `ultra_welcome_seen_at`). A mutation whose audit write fails should fail
  the whole action, not silently mutate with no record — the inverse of most of this codebase's
  read-side degrade-on-absence philosophy, and deliberately so: here the record *is* the point.

## What building this actually requires, sequenced

1. Actions 2 and 4 share one Server Action (`setOpportunityStatus`) — smallest, no new schema
   beyond `admin_actions`. Buildable first.
2. Action 1 needs the SQL→typed-data conversion decision made (recommending option (a) above),
   then the same `admin_actions`-logging Server Action pattern, batched.
3. Action 3's honest V1 (queue, not real check) needs one new column/table and the same pattern;
   its real backend is explicitly out of scope for this round.
4. `admin_actions` itself is one migration, shared by all four — build it once, first, before any
   of the four actions, not per-action.

## What this pass did not do

Did not write the `admin_actions` migration, any Server Action, or any UI. Did not decide the
SQL-vs-typed-data question for Action 1 — flagged with a recommendation, not decided
unilaterally, since it's a real design choice CEO or the founder may have a view on. Did not
build any part of Action 3's real verification backend — scoped it honestly instead of shipping
a button with nothing behind it. Did not touch `lib/admin/queries.ts`'s six read-only functions
from the original assignment (docs/catalog-health-queries-2026-09-02.md) — those are complete,
verified, and unaffected by this course correction; they're the visibility layer these actions
sit on top of, not replaced by them.
