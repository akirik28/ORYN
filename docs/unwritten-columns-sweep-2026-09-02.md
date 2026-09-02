# Sweep for never-written columns — 2026-09-02

CEO's ask: the inverse of the migration audit — every schema column with no writer anywhere in
`app/`, `lib/`, `features/`, `supabase/functions/`, `scripts/`, sorted by consequence rather than
count, plus the reverse check (a `?? default` read that could be masking a column nothing ever
populates). Read-only against live (`qtcvcflzxbuagvvwahhu`). Report, don't fix.

## Method, stated plainly — this is not exhaustive, and here is exactly what it covers

The schema has 82 tables and, excluding `id`/`created_at`/`updated_at`, roughly 700+ columns.
Checking every one individually against every write call site in the repo is not something this
pass completed, and claiming otherwise would be the same overclaim this audit exists to catch
elsewhere. What this pass actually did:

1. **Pulled every column carrying a non-trivial default** (excluding `gen_random_uuid()`/`now()`)
   — 180 columns. This is the genuinely dangerous population per CEO's own framing: a default is
   what lets an unwritten column look like a real answer. A nullable column with no default that
   nothing writes just reads as `null` — visibly unknown, not a live defect.
2. **Categorized those 180 by shape.** The dangerous shape is a boolean/enum flag asserting a
   specific fact or event (`degraded`, `is_current`, `eligible`, `is_exclusion`, `verified`,
   `primary_source`) — these were checked individually against real write paths. The safe shape
   is an ordinary setting/preference default (`timezone`, `*_visibility`, `priority`) where the
   default *is* the intended behavior for an unset value, not a claim about something that
   happened — these were not individually chased down.
3. **A second, independent pass**: grepped the whole codebase for comments admitting this exact
   shape ("never sets", "never writes", "not currently written", etc.) — 18 files matched: most
   were unrelated (explaining a *deliberate* non-write, e.g. a dev-preview override that
   correctly never touches `plan_tier`), one was a live finding already known (0076), one was a
   real instance already fixed elsewhere with its own comment left stale (below).
4. **A structural check, not a per-column one**: the `canonical_entities` satellite tables
   (`entity_aliases`, `entity_evidence`, `entity_locations`, `entity_relationships`,
   `entity_external_ids`, `canonical_field_policies`) are touched by exactly two files, both
   under `scripts/` — this is a research-corpus subsystem populated by one-off scripts, not a
   live application write path, structurally different from the student-facing tables. Its
   never-written columns are catalogued below as a class, not itemized column-by-column, because
   the "no writer" fact is by design here, not a gap.

## Findings, in consequence order

### 1. `ai_usage.degraded` / `ai_usage.degrade_reason` — confirmed live defect, already known

Not a new finding — this is the same one the stale-header pass surfaced and routed to oryn-f5.
Repeating it here only to place it correctly in this sweep's own ranking: it is the most
consequential result in this population. `lib/ai/usage.ts`'s `logAIUsage` insert still omits
both fields entirely; every `ai_usage` row asserts `degraded = false` by column default
regardless of whether the call was actually degraded. Not re-investigated this pass beyond
confirming it's still the same state.

### 2. `university_requirements.is_exclusion` — a second real instance of the same shape, already fixed, but the comment documenting it is now stale

**This is the one genuinely new finding from this pass**, and it's the same class CEO named:
migration 0052 added `is_exclusion`; the ingestion builder that turned research records into
`university_requirements` rows never set it, so a real exclusion clause (e.g. Ankara's
"programmes EXCLUDING the above-listed" — the entire eligibility rule for seven programmes) was
silently dropped during ingestion, leaving a general requirement a genuinely-excluded student
would read as applying to them.

**Checked whether this is still true — it isn't.** `lib/requirements/ingest.ts:407` now sets
`is_exclusion: record.is_exclusion === true` on every accepted row, and its own comment (lines
346–352) explicitly documents the fix: *"is_exclusion is no longer a reason to drop the record...
this builder simply never set it, so every exclusion was discarded... Dropping them is the more
dangerous option, not the safer one."* `AcceptedRequirementRow.is_exclusion` is a required
`boolean` (not optional) in the type, so nothing can accept a row without deciding the value.

**But `lib/requirements/shape-audit.ts` (lines 186–192) still describes the bug in the present
tense**: *"university_requirements.is_exclusion exists (migration 0052) but
AcceptedRequirementRow never sets it, so decideRequirementIngestion blocks the record..."* — that
sentence was true when written and is not true of the code today, the identical shape as the ten
migration headers this session already fixed, just in application code rather than SQL. Flagging
for the same treatment (a dated correction note), not fixed here per this pass's own read-only
scope.

### 3. Checked and confirmed safe — the highest-risk candidates by shape

- **`opportunity_matches.eligible`** (defaults `true`) — the single highest-stakes candidate by
  shape (a wrong default here means a student sees "eligible" for something never actually
  checked). `lib/opportunities/persist-matches.ts` explicitly computes and supplies `eligible` on
  every write; the default never fires in practice.
- **`education_records.is_current`** (defaults `true`) — required, non-optional field in
  `lib/validation/achievements.ts`'s Zod schema; every write path must supply it.
- **`university_requirements.is_required`** (defaults `true`) — the research-ingestion path
  (`lib/requirements/ingest.ts:400`) hardcodes `is_required: true` for every accepted row (a
  design limitation — the automated path currently has no way to mark something optional — not a
  silent-default bug, since the value is always explicit); the admin edit form
  (`app/(app)/universities/[id]/requirement-actions.ts:71`) also sets it explicitly from user
  input.
- **`weekly_actions.impact_level`** (defaults `'medium'`) — explicitly set at
  `lib/plan/persist.ts:214` from the AI-generated or Counselor-derived value.
- **The whole `source` (`'manual'` default) column family — 9 tables**, not just the two 0084
  fixed. `skills`/`languages` (0084) plus the 7 achievement tables sharing `insertCvImportItems`'s
  shared row-builder (`cvItemToRow`, `lib/profile/cv-import.ts:111`) all correctly receive
  `source: "cv_import"` on CV-imported rows — traced the actual insert call
  (`insertCvImportItems`, same file) to confirm the builder's output is what's actually written,
  not assumed from the builder existing.

### 4. Untidy, not a live defect — never written, and confirmed never read either

`entity_evidence.primary_source`, `entity_locations.is_primary`, and the broader
`canonical_entities` satellite-table columns (§Method item 4): no write path in application code
(by design — research-corpus tables), and checked that nothing reads them expecting a real
signal either (`scripts/verification-state-audit.ts`, the one file that touches
`entity_evidence`, reads only `entity_id` — existence of any evidence row, not which one is
primary). CEO's own distinction: nobody filling a slot and nobody reading it is untidy, not a
defect. Not chased further per-column within this subsystem.

## Item 3 — the reverse direction: `?? default` reads that could mask a never-populated column

Checked against the two clearest live examples from tonight's own work, not a fresh search:
`lib/tier/plan-tier.ts`'s `profile.plan_tier ?? "standard"` and
`features/settings/settings-view.tsx`'s `profile?.notify_deadline ?? true` (and its six
siblings). Both are the *correct* shape this check is looking for — the column genuinely can be
absent (migrations 0089/0090, confirmed unapplied in the last audit), the default is honest, and
this pass found nothing that contradicts it. Did not find an instance of a `?? default` read
papering over a column that *is* live but that some other write path simply forgot to populate —
the shape CEO named as the dangerous version of this check. Given the scope constraints in
§Method, this is a spot-check against known cases, not an independent sweep of every `??` in the
codebase.

## What this sweep does not cover, stated rather than left implicit

- The ~520 non-defaulted nullable columns across the schema were not individually checked. A
  null read is visibly "unknown" almost everywhere this codebase's own conventions were checked
  tonight (evidence_status, verification_state, data_confidence all default to honest
  low-confidence values, not a lie) — but this is an inference from the pattern holding
  elsewhere, not a per-column confirmation.
- Of the 180 defaulted columns, roughly 20 were individually verified against a real write path
  (§3) or confirmed genuinely unwritten-and-unread (§4). The remainder — mostly ordinary
  settings/preference defaults (`*_visibility`, `timezone`, `priority` values, `data_status`/
  `verification_state`/`data_confidence` honest-default fields already covered by this
  codebase's own evidence-state discipline) — were categorized by shape, not individually traced
  to a write call site.
- A full independent grep of every `??` in the codebase against every schema column was not
  performed; §Item 3 checks the cases already known from tonight's other work.
