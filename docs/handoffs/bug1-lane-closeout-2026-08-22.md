# BUG-1 lane close-out — 2026-08-22

Written for a cold session with none of today's context. BUG-1's assignment today was
the live RLS verification package: four surfaces, real GoTrue sessions against
`oryn-qa-scratch`, no simulated JWTs. It grew into a fifth thing (an INSERT-forgery
sweep) and closed with a sixth (the migration that fixes it). This document is what a
successor needs before touching any of it, plus a corrected pointer to where the actual
evidence lives — one of the citations in `docs/known-issues.md` turned out to be wrong,
found while writing this.

## Read this first

**Four real security holes were found and fixed today, and every one of them was
invisible from reading the schema or the policy SQL in isolation** — each needed a real
authenticated session against a live database to surface. All four fixes are written
and merged as code+migration pairs, but **none of the migrations are applied to any
real database**. That split matters more than it sounds:

- The **application code** for every fix already went out normally — each PR merged to
  `main` and auto-deployed. Right now, in production, every write this package touched
  already goes through the correct, hardened client.
- The **database hardening** — the RLS policies and guard triggers that are the actual
  security boundary — is sitting unapplied in `supabase/migrations/`, founder-gated,
  because these are exactly the kind of change (narrowing what an authenticated session
  can do, schema-wide) that gets one coherent founder decision, not four drip-fed ones.

**Until a founder applies `0061`–`0065`, every gap described below is still live and
exploitable** in any real deployment of this schema — not through the app's UI (the app
code is already fixed), but through a direct, authenticated request to Supabase's own
API, bypassing the app entirely. That gap between "the app behaves correctly" and "the
database still permits the attack" is the single fact most worth carrying forward.

## 1. Surfaces 1–4 — what was established, and what wasn't

The assignment was four surfaces. All four returned a real finding or a real "checked,
clean." Read each with its own scope, not as one undifferentiated sweep — each covers a
narrower slice than "this table is safe," stated below.

### Surface 1 — `/u/[id]` public-profile exposure

9 live checks against `public_profiles` (migrations 0023/0024) and
`canViewBasicProfile`. 8 passed — connection-state gating, direction-asymmetry,
declined-keeps-leaking, all held. **1 failed**: an anonymous caller with no account
could read the full safe-column set of any profile marked public — the view's grant to
`authenticated` was never the real gate, because this project's schema-wide default ACL
already grants `anon` baseline access to every object in `public`, and the view's own
`is_public = true` branch never checks caller identity. Fix: `0061` (unapplied).

**What this surface's own follow-up sweep did establish, exhaustively**: every one of
the ~90 live RLS policies in `public`, read individually, branch by branch, not
sampled — plus both views in the schema, checked for `security_invoker`. This is a
genuinely complete sweep for one specific defect shape: *a permitting branch inside an
OR chain that never references the caller's identity at all*. It found exactly one more
instance beyond `public_profiles` — an identical gap in `0058`'s (unapplied) social-posts
policy, fixed in place — and confirmed nothing else in the schema shares that shape. Full
detail: `docs/research/verification/rls-live-verification-2026-08-22.md`.

**What it did not check**: this sweep is specifically about missing identity checks. It
says nothing about whether an identity-correct policy still lets an authenticated owner
write *arbitrary values* into a row they're allowed to own — that's a structurally
different defect, and it's what surfaces 2 and the later INSERT-forgery work found.
Conflating "swept and clean" from this section with "no writes can be forged" would be
wrong; see the INSERT-forgery section below for that separate, narrower-scoped check.

### Surface 2 — admin gate: critical, live, self-service privilege escalation

Before testing whether `requireAdmin()` blocks a non-admin from `/admin`, tested
whether anything at the database level stops a user from setting `is_admin = true` on
their own row directly. **Nothing did.** A real, ordinary, non-admin QA account ran
`update profiles set is_admin = true where id = <own id>` through its own real
authenticated session and it succeeded outright — no error, no rejection. `profiles`'
RLS is row-scoped only (`id = auth.uid()`); row-scoping governs *which row*, not *which
columns within it*, and `is_admin` had no protective trigger. Reverted in the same test
run, independently re-confirmed reverted via a separate query afterward.

Once past `requireAdmin()`, every admin action switches to the service-role client,
bypassing RLS entirely — so this wasn't "read an admin page," it was unrestricted,
self-grantable, full-schema access. Fix: `0062` (unapplied) — a `BEFORE UPDATE OF
is_admin` guard trigger, reset-not-raise. The same cross-reference method that found
this also found two more unguarded "looks computed, isn't protected" columns on
`profiles` (`profile_strength_score`, `completeness_percent`) — folded into `0063`
alongside four more tables found the same way (below).

**What this surface established beyond `profiles`**: the *method* — cross-referencing
every "owner full access" policy against columns the app only ever writes via the
service-role client — not a claim that every such column everywhere was found. It was
applied to `profiles` directly, then to the tables the rest of this package's own prior
work had already touched. It was never run as an exhaustive pass over every owner-scoped
table in the schema. See "What this package did not audit," below — that gap is real
and is the most important thing in this section to not silently drop.

### Surfaces 3 + 4 — sendConnectionRequest / sendMessage, block / report

**Correction, found while writing this**: `docs/known-issues.md` currently cites
`docs/research/verification/rls-live-verification-2026-08-22.md` as the evidence source
for surfaces 3+4. That file only ever contained surfaces 1 and 2 — checked directly
(302 lines, two commits total, both from surface 1/2 work). Surfaces 3+4's actual
findings live in the per-table sections of
`docs/research/verification/insert-forgery-inventory-2026-08-22.md` instead (the
`connections`, `messages`, `blocked_users`, `message_reports` sections). Fixed the
citation in `known-issues.md` as part of this close-out — a stale pointer left standing
would have sent the next reader to the wrong file for exactly the evidence they'd need
most.

Live, empirical INSERT-time checks (each performed as a real raw insert through the
caller's own RLS-scoped session, not inferred from policy text):

- **`connections`** — closed. Forging `requester_id` to someone else: rejected.
  Setting `status = 'accepted'` at creation, skipping the request/accept flow: rejected.
- **`messages`** — closed. Forging `sender_id`: rejected. Sending with no connection:
  rejected. Sending while the connection is still `pending`, not `accepted`: rejected.
- **`blocked_users`** — closed. Forging `blocker_id`: rejected.
- **`message_reports`** — **real gap, fixed**. `reported_user_id` was never cross-checked
  against the actual message's `sender_id` — a caller could file a report accusing an
  unrelated third party of something a different real user actually sent. Fix `0064`
  (unapplied) was **amended once before ever being applied**: the first version closed
  only the path through `message_id`, on the premise that no legitimate insert leaves it
  null. That premise was wrong — `reportRecommendation()` does exactly that via a second
  reference column, `recommendation_id`, reachable without ever calling the function the
  original finding was framed around. Caught before merge. Final form checks both
  branches. This incident is now rule 30 in `docs/ORYN-ORG-STRUCTURE.md`.

**What surfaces 3+4 did not check**: every test above is an INSERT-time / `WITH CHECK`
check. None of it tested UPDATE or DELETE paths on `connections`, `messages`, or
`blocked_users` — for example, whether a `pending` connection's `status` can be flipped
directly by either party outside the accept/decline actions, or whether a message's
content can be edited after sending. Not known to be a problem; genuinely not tested
either way, and shouldn't be assumed clean by the absence of a finding.

### The generalization: INSERT-forgery across six more tables — now closed

`0063`'s own work on `profile_score_snapshots` (append-only, no UPDATE path at all)
surfaced the general shape: a `BEFORE UPDATE` guard protects an *existing* row from
being overwritten, and does nothing for a freshly inserted row carrying a fabricated
value from the start. ORYN-CEO had this traced across every table the package had
touched — `docs/research/verification/insert-forgery-inventory-2026-08-22.md` — then
asked for a design proposal (`docs/handoffs/insert-forgery-design-proposal-2026-08-22.md`)
rather than six ad hoc patches, since the fix is one deliberate, INSERT-scoped decision
(the RLS INSERT grant is `authenticated`-wide across three feature areas), not a
mechanical extension of the UPDATE-guard pattern.

**This is now built and merged**: `supabase/migrations/0065_close_insert_forgery_six_tables.sql`
(PR [#113](https://github.com/akirik28/ORYN/pull/113)) closes all six —
`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
`student_requirement_evaluations`, `evidence_files`, and `ai_recommendations` (see
below — folded in, not left open). `docs/known-issues.md`'s "six more tables
inventoried, not yet fixed" entry is now stale as of this close-out and has been
corrected in the same pass as this document.

**What this pass did not check, stated precisely rather than implied clean**: the
inventory was scoped to tables this package had *already touched* — eleven tables total
(the six above, plus `profiles`, `connections`, `messages`, `blocked_users`,
`message_reports`). It was never run as an exhaustive sweep over every owner-scoped
table in the schema, unlike surface 1's own identity-check sweep, which was exhaustive
for its defect class. Migration `0014`'s shared `owner_tables` array alone lists 25
tables (`education_records`, `courses`, `test_scores`, `activities`, `awards`,
`certifications`, `projects`, `research_experiences`, `volunteering_experiences`,
`work_experiences`, `skills`, `languages`, `student_interests`, `career_goals`,
`target_universities`, `applications`, `application_requirements`,
`saved_opportunities`, `weekly_plans`, `weekly_actions`, `advisor_conversations`,
`advisor_messages`, plus three of the six already closed) carrying the identical
bundled `"owner full access"` policy shape. Most of these are plausibly fine — their
fields are meant to be freely student-authored (a project's own title/description isn't
a "computed" value to forge) — but that's an assumption based on what each table
*appears* to be for, not a verified trace of every writer the way the six closed tables
got. **Nobody has checked whether any of these 19 remaining tables hides a
system-computed column the same way `profile_scores` did.** Worth a bounded pass by
whoever picks this up next, not an emergency.

## 2. Migrations 0062–0065 — state and ordering

All four: **written, not applied, founder-gated.** All four are security-critical
(narrow what an authenticated session can do) and all four are being presented to the
founder as one queue rather than four separate asks, per ORYN-CEO's explicit
preference.

| migration | closes | depends on |
|---|---|---|
| `0062` | `profiles.is_admin` self-grant | none |
| `0063` | `profiles.profile_strength_score`/`completeness_percent`, plus UPDATE-guards on `profile_scores`, `profile_score_snapshots`, `opportunity_matches`, `student_requirement_evaluations.status`, `evidence_files.verification_status` | `0062` (see below) |
| `0064` | `message_reports` cross-column forgery | none — different table, no overlap with 0062/0063/0065 |
| `0065` | INSERT-forgery on the same six tables `0063` guards, plus `ai_recommendations` | none at the SQL level (see below) — but see the code-vs-migration point |

**On ordering — what's a stated requirement, what's convention, and what's already
safe:**

- **`0062` before `0063` is `0063`'s own explicitly stated requirement** (see that
  migration's header). This close-out relays that stated dependency rather than
  re-deriving it from scratch — I re-read `0062`'s and `0063`'s SQL and, mechanically,
  `0063`'s `create or replace function` + `drop trigger if exists`/`create trigger`
  would likely produce the same end state applied standalone, but I did not exhaustively
  verify that claim, and there's no reason to contradict what the migration itself
  says. **Apply in order.**
- **`0064` has no technical dependency on any of the other three** — it touches
  `message_reports` only, a table none of `0062`/`0063`/`0065` reference. It can be
  applied independently, any time, in any position relative to the others.
- **`0065` has no SQL-level dependency on `0063` having been *applied*** — it only
  edits RLS policies, and never references any function or trigger `0063` creates. What
  it *does* depend on is the paired code change for each of its six tables' writers
  already being live — and that is **already true today**, for all six, regardless of
  migration-apply order: four came from `0063`'s PR, two from `0065`'s own PR
  (`#113`), and both PRs already merged and auto-deployed. So applying `0065` before
  `0063` would not, as far as this trace goes, break anything live.
- **Standard migration discipline still says apply all four in strict numeric order**
  regardless of the above — skipping or reordering breaks the assumption that the
  migrations directory is the schema's actual incremental history, which matters for
  every future migration, not just these four. Treat the independence findings above as
  "nothing catastrophic happens if forced out of order," not as permission to do so.

**The operational hazard this package kept re-finding, restated once more because it's
the one a founder actually needs before clicking apply**: pairing a migration with its
code change in the *same PR* is what kept this from becoming a live incident twice
already (`0063`'s first version crashed four page renders when `SUPABASE_SECRET_KEY`
was unset, caught before it shipped; `0065`'s header names the same hazard on the
INSERT side and was built with the code change in the same commit). That discipline is
already reflected in what's sitting in the queue — nothing here needs a founder to
manually sequence a code deploy against a migration apply. The only sequencing decision
left is the founder's own: when to apply `0062`–`0065` to a real database.

## 3. `ai_recommendations` — resolved, do not reopen

Carried across `0063`'s comment and `docs/known-issues.md` as a separate, undecided
design question: "should a student's RLS-scoped client be inserting advisor output at
all." **That question is answered and closed, not deferred a third time.** The design
proposal traced the actual writer (`lib/plan/persist.ts`, one INSERT site) and found it
structurally identical to `evidence_files` — a trusted, server-derived `user_id` at
every call site, content that's either AI-generated or hardcoded, never caller input,
and no legitimate student-authored use of this table today or implied by the spec (it's
specifically the advisor's own "avoid/consider/do" output, AGENTS.md Phase 39/62). It's
folded into `0065`'s scope on that basis. `known-issues.md`'s "separate design question"
framing is now stale and has been corrected in the same pass as this document — if a
future session encounters that framing anywhere else (an old chat, a stale comment), it
is describing a question that has already been answered, not one still open.

## 4. Testing note: `messages` and `message_reports` have no DELETE policy — by design

Not a defect. Recorded because it silently broke this pass's own test cleanup once and
will do it again to the next lane if this isn't carried forward: both tables have **no
RLS DELETE policy at all**, deliberately — permanent message and moderation-report
history. A cleanup script running on the RLS-scoped client that calls `.delete()`
against either table **returns no error and silently removes nothing** — RLS's
default-deny resolves an unmatched policy to zero affected rows, not a permission
error. This was caught only by re-querying row counts after "cleanup" instead of
trusting the delete call's own success.

**For any future live test against these two tables**: verify cleanup by re-counting
rows afterward, never by the absence of an error from the delete call itself, and
remove any leftover test rows via direct admin/service-role access — the RLS-scoped
client cannot delete from either table regardless of whose session runs it. This is not
known to generalize to other tables (`connections`/`blocked_users`'s own DELETE policies
were not specifically re-checked as part of this note) — stated narrowly, for the two
tables actually confirmed.

## Files and PRs, for reference

- `supabase/migrations/0061_public_profiles_require_authenticated.sql` — written, not applied.
- `supabase/migrations/0062_profiles_guard_protected_columns.sql` — written, not applied.
- `supabase/migrations/0063_guard_computed_score_columns.sql` — written, not applied. Paired code change already merged and live.
- `supabase/migrations/0064_message_reports_verify_reported_user.sql` — written, not applied.
- `supabase/migrations/0065_close_insert_forgery_six_tables.sql` — written, not applied. Paired code change already merged and live.
- `docs/research/verification/rls-live-verification-2026-08-22.md` — surfaces 1+2, full detail.
- `docs/research/verification/insert-forgery-inventory-2026-08-22.md` — surfaces 3+4 findings, plus the six-table INSERT-forgery map.
- `docs/handoffs/insert-forgery-design-proposal-2026-08-22.md` — the Option A design decision, approved.
- `docs/ORYN-ORG-STRUCTURE.md`, rule 30 — the `message_reports` premise-verification lesson, formalized.
- PRs merged today touching this lane: `#94` (message_reports fix), `#100` (rule 30), `#108` (design proposal), `#113` (migration 0065 + paired code change).
