# INSERT-forgery closure — design proposal for the six remaining open tables

**2026-08-22, BUG-1.** Assigned by ORYN-CEO after
`docs/research/verification/insert-forgery-inventory-2026-08-22.md` mapped the
first-write forgery class and left six tables open with a shared root cause:
migration `0063`'s guard triggers close the *repeat*-write forgery (overwriting a row
the real engine already computed) but do nothing for the *first*-write forgery
(inserting a row for a key the engine has never touched), because a `BEFORE UPDATE`
trigger has no event to fire on for a row that doesn't exist yet.

**This is a proposal, not an implementation package. No code changes and no migration
are included or were written for this document — that was the explicit brief.**

Per the assignment, this document covers, in order: the options and their real costs;
what breaks under each option, traced from the actual current writers rather than
assumed; what stays open regardless of which option is chosen; and an explicit
founder-gating call.

## Executive summary

- **Recommendation: Option A** — remove the `authenticated`-role INSERT path entirely
  on all six tables, via an RLS policy split, not a new permissive policy layered on
  top (permissive Postgres RLS policies OR together, so *adding* a service-role-only
  INSERT policy on top of the existing owner policy would not remove the student's
  own INSERT path — the existing policy has to be edited, not supplemented).
- **This confirms ORYN-CEO's instinct, with one correction on mechanism and one on
  scope.** The mechanism is cheaper than "move the INSERT path to service-role" may
  sound: for four of the six tables, the legitimate write already goes through the
  service-role client (migration `0063`), so the fix is a pure RLS-policy edit with
  zero application-code change. For the other two, it is exactly the one-line client
  swap `0063` already established as the pattern, applied now to their one remaining
  call site each.
- **Scope correction:** `ai_recommendations` was carried in `docs/known-issues.md` and
  `0063`'s own comment as a separate, undecided design question. Tracing its actual
  writer resolves that question — it is the same shape as the other five, not a
  different one — so this proposal recommends folding it in rather than continuing to
  defer it. Reasoning below.
- **This is founder-gated**, for the same reason `0060`–`0064` already are: it changes
  what an authenticated session can and cannot do, across three feature areas
  (scoring, opportunity matching, requirement evaluation) plus evidence and advisor
  output. If the shape below is agreed, it becomes one migration (`0065`, the next
  free number as of this document) plus one paired code change, landing together in a
  single PR — a sixth item added to the founder's queue, not six more.

## Method

For each of the six tables, this document traces: every file in the repository (not
only the directories the original inventory pass happened to be working in) that
references the table via `.from("<table>")`, which Supabase client each write uses,
what values in the written row are server-computed versus caller-influenced, and the
table's current RLS policy text as it actually exists in the migration history today
— not as summarized by an earlier document. Every claim below with a file:line is a
grep result re-run for this document, not carried over from memory or from the
inventory doc's own summary table. Where this document's conclusion differs from or
sharpens the inventory doc's, that's noted explicitly rather than silently.

Searched: `app/`, `lib/`, `features/`, `scripts/`, and `supabase/functions/` (the last
does not exist in this repository yet — confirmed, not assumed). Six tables in scope:
`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
`student_requirement_evaluations`, `evidence_files`, and — per the scope correction
above — `ai_recommendations`.

## What's actually true today, re-verified

All six tables carry the identical RLS shape, and it has not changed since creation:

```sql
create policy "owner full access" on public.<table>
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

(`profile_scores`/`profile_score_snapshots`: migration `0017`. The other four: the
shared `owner_tables` loop in migration `0014`.)

One `for all` policy covers SELECT, INSERT, UPDATE, and DELETE together. The `with
check` clause pins `user_id = auth.uid()` — a student cannot insert a row claiming to
belong to someone else — but constrains nothing else. Every other column is free-form
on INSERT. This is the exact and only mechanism behind the forgery: not a missing
check, but a check narrow enough to leave every computed column unconstrained. `0063`
added column-level `BEFORE UPDATE` guards on top of this same policy; those guards
cannot and do not touch INSERT, by construction — restated here because it's the
premise the rest of this document depends on, and this package's own rule about
premises is to check them, not carry them forward from memory.

### Every writer, traced fresh

| table | writer (file:line) | client | values written |
|---|---|---|---|
| `profile_scores` | `lib/scoring/persist.ts:88` | **admin** (service-role, since `0063`) | fully computed by `computeCareerProfile()` before either client is touched |
| `profile_score_snapshots` | `lib/scoring/persist.ts:111` | **admin** (since `0063`) | same computation, appended as a snapshot |
| `opportunity_matches` | `lib/opportunities/persist-matches.ts:143` | **admin** (since `0063`) | fully computed by `computeOpportunityMatch()` |
| `student_requirement_evaluations` | `lib/requirements/persist.ts:68` | **admin** (since `0063`) | fully computed by `evaluateRequirement()` |
| `evidence_files` | `app/(app)/documents/actions.ts:36` | **`supabase`, RLS-scoped — not yet migrated** | `user_id` from session; `verification_status` hardcoded `"evidence_added"`; `linked_table`/`linked_id` checked against a same-user ownership query first (line 27) |
| `ai_recommendations` | `lib/plan/persist.ts:96` | **`supabase`, RLS-scoped — not yet migrated** | `user_id` always `session.userId!` at every call site (checked: `app/(app)/plan/actions.ts`, `app/(app)/plan/page.tsx`, `app/(app)/dashboard/page.tsx`); `title`/`reason` are AI-generated, not caller input |

Confirmed exhaustive by grepping the whole repository for `.from("<table>")` against
all six names, not just the directories each table's own feature area lives in — one
INSERT call site per table, no others, anywhere. No Supabase Edge Function or
standalone script touches any of the six.

**The four tables already on the admin client cost nothing to close at the code
level** — `0063` already did that work. The RLS split for those four is a pure policy
migration. **The two tables still on the RLS-scoped client need the same one-line
swap `0063` made for the other four**, applied to their one remaining call site each,
in the same PR as the RLS change — not before it, not after it. That ordering
constraint is not hypothetical: it's exactly the shape of the regression `0063`
itself introduced and this package already had to fix once today (`tryCreateAdminClient`
vs. the throwing `createAdminClient`, caught by ORYN-CEO via static trace before it
reached a real user). Landing the RLS restriction first, or the code change without
it, reproduces that failure mode on the INSERT path instead of the UPDATE path.

## The `ai_recommendations` call

`0063`'s own comment and `docs/known-issues.md` both carried this table as a separate,
undecided question: "should a student's RLS-scoped client be inserting advisor output
in the first place." Tracing the writer answers that question rather than leaving it
open.

- **Same shape as `evidence_files`, not a different one.** One INSERT call site
  (`lib/plan/persist.ts:96`), a trusted server-derived `userId`, and content that is
  either AI-generated or hardcoded — no field in the written row originates from
  caller input. The RLS-scoped-vs-admin distinction is a mechanical detail of which
  client carries an already-decided value, identical in kind to the fix `0063` already
  applied to the other four.
  - No legitimate student-authored use of this table exists today or is implied by
    the spec: `ai_recommendations` is specifically the advisor's "avoid/consider/do"
    output (AGENTS.md Phase 39, Phase 62), never a student's own note or reminder —
    confirmed by reading every call site, not inferred from the table name.
- **If anything, the severity case for closing this one is stronger than the other
  five, not weaker.** A forged row here doesn't just let a student inflate their own
  metrics — it lets them fabricate words in the advisor's own voice. AGENTS.md Phase
  39 calls "don't do this" logic a differentiating product feature, and Phase 62 says
  the reasoning behind a recommendation "is essential" — both premised on
  `ai_recommendations` actually being the advisor's output. A forged row is a direct
  authenticity violation of that premise, not a side-channel score inflation.
- **Recommendation: include it in Option A, on the same terms as the other five.**
  This reverses the "separate design question" framing, with the reasoning that
  resolves it shown here rather than deferred again.

## The options

### Option A — remove the `authenticated` INSERT path (recommended)

**Mechanism.** For each of the six tables, replace the single `for all` policy with
separate `for select`, `for update`, `for delete` policies carrying the exact same
`user_id = auth.uid()` condition the current policy already enforces for those three
operations — and no INSERT policy at all. This is not a new idea in this codebase:
it's the exact shape `profiles` already uses today (no INSERT policy exists on
`profiles`; a row is created only by the `handle_new_user()` trigger, and that table
was correctly assessed as "closed, not exploitable" in the original inventory pass).
RLS defaults to deny — a role with no permissive policy for an operation simply cannot
perform it, regardless of the table-level GRANT `authenticated` otherwise holds from
this project's standing default ACL. `service_role` bypasses RLS entirely regardless
of any policy on the table, so none of this affects the admin client's writes.

**Explicitly not the mechanism:** adding a new `for insert to service_role with check
(true)`-style policy *alongside* the existing `"owner full access"` policy. Postgres
evaluates multiple permissive policies for the same command with OR — the existing
policy's INSERT branch would still independently permit a same-user insert, so
layering a service-role policy on top would add a second legitimate path without
removing the first. The existing policy has to be edited to drop its INSERT branch,
not supplemented.

**Cost.**
- `profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
  `student_requirement_evaluations`: zero code cost. Pure RLS migration; the
  legitimate writer already authenticates as `service_role`.
- `evidence_files`, `ai_recommendations`: one write call site each swapped from
  `createClient()` to the admin client, in the same PR as the migration. Every read in
  both files stays on the RLS-scoped client, unchanged — a student's own visibility
  into their own data is unaffected, matching `0063`'s own established discipline of
  never widening a read while narrowing a write.
- `evidence_files` specifically: the cross-table ownership check in `uploadEvidence`
  (does `linked_id` actually belong to this user, checked against `linked_table`'s own
  RLS-scoped SELECT) is unaffected by this change — that check runs before the
  `evidence_files` insert and validates a *different* table's row under the caller's
  own RLS, which Option A does not touch.

**What this closes completely, not partially.** Unlike `0063`'s column-scoped UPDATE
guards (which, per that migration's own comment, deliberately left some columns
unguarded — `dimension` on `profile_scores`, `reasoning`/`evaluated_at` on
`student_requirement_evaluations`), Option A closes the *entire row* on INSERT. There
is no column left open the way there was for UPDATE, because there's no reason to
leave one open: nothing in this codebase has a legitimate reason to insert a
partially-student-authored row into any of these six tables.

**What Option A does not close** — see "What stays open regardless" below. It is not
nothing.

### Option B — a `BEFORE INSERT` trigger that computes or silently drops

Considered and rejected as the primary mechanism, for reasons specific to what these
six tables actually are, not in the abstract.

- A trigger that *recomputes* the correct value at insert time (the INSERT-side
  analogue of `0063`'s reset-to-`OLD`, since there is no `OLD` to reset to on insert)
  would require the scoring/matching/evaluation logic to run inside Postgres. For
  `ai_recommendations` specifically this is not a hard engineering problem, it's
  categorically impossible without changing the product: the content comes from an
  Anthropic API call (`generateWeeklyPlan`), and a Postgres trigger cannot make an
  outbound HTTP request as part of a transaction in this architecture. For the other
  five, it would mean duplicating deterministic-but-real scoring logic in PL/pgSQL,
  maintained in parallel with the versioned TypeScript implementation
  (`career_profile_v1` and siblings) the spec deliberately keeps evolvable
  (AGENTS.md Phase 6.1). That's a second implementation of the product's own scoring
  engine to keep in sync, not a security fix.
- A trigger that *silently drops* a non-service-role insert (`NEW := NULL`) is
  mechanically viable and roughly equivalent in effect to Option A, but is strictly
  worse as an implementation: it's a bespoke function per table instead of a policy
  edit, and a silently-dropped insert is a stranger failure mode to debug than a clean
  RLS permission denial — including for legitimate code, if a future call site is
  accidentally written against the RLS-scoped client instead of admin. RLS's rejection
  is loud and immediate; a silently-dropped trigger insert looks like nothing
  happened, which is a worse signal for exactly the class of regression `0063` already
  produced once today.

### Option C — accept it as a bounded, self-correcting risk

Worth stating honestly rather than dismissing by assumption, since "it gets
overwritten anyway" is itself a negative claim that needs checking, not asserting.

Every legitimate writer upserts with `onConflict` on the row's natural key
(`user_id,dimension,calculation_version`; `user_id,opportunity_id`;
`user_id,requirement_id`) and runs on close to every relevant page view. **For a key
the engine has already computed and will compute again, a forged row's lifetime is
bounded** — the next legitimate recompute overwrites it. This is real and worth
naming: it's why this class of bug, while real, was correctly assessed as not
critical in the original inventory pass.

**It is not self-correcting for the case that matters most.** A forged row for a key
the engine has *never* touched — most concretely, `profile_scores` inserted with a
`calculation_version` string of the forger's own choosing — will never be targeted by
a legitimate upsert's conflict clause, because the real engine only ever writes
`career_profile_v1` (or whatever the current version constant is). That row does not
get overwritten "eventually." It sits there until someone looks for it directly. A
blanket "the real engine will fix it" claim is false for exactly this case, which is
also the cheapest case for an attacker to construct on purpose. Option C is a
reasonable description of the residual risk *after* Option A ships, not a substitute
for it.

## What stays open regardless of which option is chosen

- **Historical rows.** Option A prevents new forgeries; it does not retrospectively
  validate rows already in the table. No live adversarial testing against
  `oryn-qa-scratch` was performed for these six tables as part of this proposal — the
  surfaces-3/4 live-verification pass was scoped to messages, connections,
  blocked_users, and message_reports, not these six — so this document does not claim
  a forged row currently exists in any real project. Whether a one-time audit query
  (comparing stored values against what the current deterministic engine would
  produce) is worth running is a separate, smaller decision from the write-path fix
  itself, and is not resolved here.
- **Cross-user blast radius on `profile_scores`, confirmed while tracing this
  document, not carried from the original inventory pass.** `lib/benchmarking/cohort.ts`
  (`getCohortDimensionScores`) reads `profile_scores` across every peer in a cohort via
  the admin client, with no bounds-checking or outlier rejection, to build the
  percentile comparison shown to *other* students. A forged `profile_scores` row does
  not only misrepresent the forger's own dashboard — while it exists, it also skews
  the benchmark every other student in that cohort sees. This gives `profile_scores` a
  cross-user stakes profile the original inventory pass's summary table didn't call
  out (it named `opportunity_matches` as the highest-stakes table of the group; this
  is a second, differently-shaped high-stakes path worth weighing alongside it, not
  instead of it).
- **The narrow scope of what's being decided.** This proposal is about INSERT only.
  It does not reopen `0063`'s deliberately narrow UPDATE-guard column lists (e.g.
  `student_requirement_evaluations` guards `status` but not `reasoning`), does not
  touch DELETE on any of these tables (all six currently allow owner-scoped delete;
  none of that changes here), and does not touch `messages`/`message_reports`/other
  tables already resolved in the original inventory pass.
- **This document itself.** No code and no migration were written. If the shape above
  is agreed, someone still has to write, gate, and hold `0065` for the founder — the
  same as every migration before it in this package.

## Is this founder-gated?

**Yes, plainly, for the same reasons `0060` through `0064` already are.** It narrows
what an authenticated session can do across three product surfaces (scoring,
opportunity matching, requirement evaluation) plus evidence and advisor output, on
tables with real product-trust stakes (`opportunity_matches` directly, per the
original inventory pass; `profile_scores` via the cohort cross-user path identified
above). It is exactly the kind of change this package has treated as
founder-decision material all day, not lane-level judgment.

**Recommendation on packaging:** one migration covering the RLS split on all six
tables, plus the paired `evidence_files`/`ai_recommendations` client-code change, in a
single PR — matching `0063`'s own precedent of landing a guard and its paired code fix
together, and matching ORYN-CEO's stated preference for presenting one coherent
decision rather than a further trickle of individually-gated migrations. If agreed,
this occupies migration number `0065` (the next free number as of this document,
confirmed against the current `supabase/migrations/` listing, not assumed from an
earlier count) — a sixth item joining `0060`–`0064` in the founder's queue, not a
seventh and eighth.

This document is the map. Turning it into `0065` and its paired code change is a
follow-up implementation package once the shape above is agreed, not a continuation of
this one.
