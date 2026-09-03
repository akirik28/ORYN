# Does a parent account actually work, end to end — the verification plan

Seven lanes (P1–P7) are building one feature against an unmerged schema. Every branch will be
green in isolation — that proves each lane did what it claims, not that the assembled feature
does what G1 ("asla ama asla") and K2 (enforced in the database, not the interface) actually
require. **This is the design. Nothing below has been run — P1 isn't merged yet.** Run this as
branches land, in the order §5 gives.

## The actual problem

Two tools this fleet already reaches for both fail this specific job:

**`/design-preview/*` is fixture-only.** Confirmed directly on the rename-DB-render-check
(`docs/rename-db-render-check-2026-09-04.md`) and true here for a sharper reason: this
feature's entire risk surface is *whether the real RLS policy blocks a real cross-account
write*. A fixture has no RLS to violate — it would pass every check by construction and prove
nothing.

**A real logged-in browser view is out.** The shared browser pane holds the founder's live
session; a genuine login-and-click-through — the obvious way to "just check it works" — is
exactly the action the render-check task was warned off of, for the same reason.

So the actual problem isn't "run some checks" — it's **how do you prove a parent sees a real
child's real rows, and provably cannot write to them, without a real login and without a
fixture that can't fail?**

## The technique — proven today, not proposed

Postgres RLS keys off `auth.uid()`, which reads `request.jwt.claims`. A privileged SQL
connection can set that claim for itself, inside a transaction, run exactly the query a real
authenticated client would run, observe the real result, and **roll back before anything
commits.** No session, no cookie, no browser — and it isn't a workaround of RLS, it's RLS
running for real against a claim the query sets on purpose, then discarded.

Proved this against `profiles`' own live policies before writing this plan, not after:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<a real profile id>","role":"authenticated"}';
select count(*) from public.profiles;              -- unfiltered scan
rollback;
```

**Result: 1.** The real table has far more than one row; RLS narrowed an unfiltered scan down
to exactly the impersonated user's own row, live, today. A second proof, same session: an
`UPDATE` targeting a *different* user's row while impersonating the first returned **0 rows
affected** — no error, RLS simply made the row invisible to match against. That's the
observable signal write-denial actually produces: not an exception to catch, a row count to
check for zero. Both transactions rolled back; nothing in the live database changed.

This is the plan's method throughout: impersonate a specific `(parent_user_id)`, attempt the
real operation against the real schema, check the real result, roll back always. It's also a
strictly *harder* test than a click-through would be — a hidden button proves the UI didn't
offer the write; this proves the write is impossible regardless of what any future UI offers.

**Test data, not real accounts.** Rather than mutating a real student's data, the checks below
construct their own temporary rows inside the same rolled-back transaction — a throwaway
`profiles` row with `account_role='parent'`, a throwaway `parent_links` row at whatever status
the check needs, pointed at an **existing, already-rich QA persona** (the "Daniel Okafor"
account this session's own earlier walkthrough already confirmed has real opportunity matches,
applications, and scores) as the student side. Real content to check against, zero risk to it —
the link and the parent row never survive the rollback.

## A structural risk worth flagging before P1 lands, not after

**RLS is row-level, not column-level.** K1 lists `advisor_instructions` (the özelleşme
instructions) as something a parent must never see — but it's a plain column on `profiles`
(confirmed: `information_schema.columns`, no separate table), sitting on the *same row* as the
student's name, school, and everything else a parent legitimately needs to read. A policy that
grants a parent `SELECT` on a linked student's `profiles` row grants it on the *whole row* —
Postgres has no native way to let a policy hide one column while allowing the rest. If P1's
parent-read policy is a simple row-level grant on `profiles`, `advisor_instructions` comes
back in the same query as the student's display name, and K2's own standard ("enforced in the
database, not the interface") is failed by the exact table it's meant to protect the read on.

This needs either a security-definer view/RPC that projects only the safe columns, or the
policy scoped to a narrower table a parent-safe read actually uses — not a plain `profiles`
row-select. Named here so P1 can design around it; check **B1** below is what confirms whether
they did.

## The checklist

### A — source-read only, no schema dependency, checkable as each lane merges

| # | Check | Owner if it fails |
|---|---|---|
| A1 | Homepage `Sign in` reads `Student sign in` (G10) | P2 |
| A2 | `data-role="parent"` exists and drives a distinct (brown) palette, same mechanism as `data-tier="ultra"` (G4/K5) | P3 |
| A3 | The weekly parent email's send call is real code behind a real, unambiguous gate — not a comment promising it's off (G11/G13, K6) | P4/P5 |
| A4 | Parent invite-email is actually collected at signup and actually reaches `profiles.parent_invite_email` (G12) | P4 |
| A5 | `lib/tier/parent-tier.ts`'s parent row is never the target of a `plan_tier` write anywhere in the new code (grep, should be zero hits) | P6 (mine — re-confirms my own invariant once P2/P3 wire a real payment/tier surface against it) |
| A6 | P3's actual parent-dashboard queries — read the source, list every table/column touched, confirm none are in the forbidden set below | P3 |

### B — SQL-impersonation, needs P1 merged (the core of this plan)

Forbidden-content set, from K1, with real table names: `advisor_conversations`,
`advisor_messages`, `evidence_files`, `feedback_reports`, `weekly_actions.reflection_note`,
`profiles.advisor_instructions`.
Permitted-content set, from G2: `opportunity_matches` (fırsatlar), `target_universities`
(üniversiteler), `applications` (son başvurular + durum), `profile_scores` (neyi geliştirmeli).

| # | Check | Expected result | Owner if it fails |
|---|---|---|---|
| B1 | Impersonated parent, active link: `select *` on the student's `profiles` row | `advisor_instructions` is null/absent in what a parent-safe read returns — see the structural risk above | P1 |
| B2 | Same, unfiltered `select` on each permitted-content table, filtered only by the RLS the policy itself applies | Real rows come back, matching the student's own data | P1 |
| B3 | Same, unfiltered `select` on each forbidden-content table | Zero rows | P1 |
| B4 | Impersonated parent, **pending** link | Zero rows across every table in B2 and B3 — pending leaks nothing, not just tier (extends this lane's own P6 finding to reads) | P1 |
| B5 | Impersonated parent, **revoked** link | Zero rows across every table in B2 and B3 | P1 |
| B6 | Impersonated parent, no link at all to the target student | Zero rows across every table in B2 and B3 | P1 |
| B7 | Impersonated parent, active link: attempt `insert` into a student-owned table (e.g. `activities`) | 0 rows / rejected | P1 |
| B8 | Impersonated parent, active link: attempt `update` on the student's `profiles`, `applications`, or `profile_scores` row | 0 rows affected | P1 |
| B9 | Impersonated parent, active link: attempt `delete` on any student-owned row | 0 rows affected | P1 |
| B10 | Two active links, same parent, two different students: a query scoped to student A returns none of student B's rows | Confirms reads are scoped per-pair, not per-parent (same shape as this lane's own P6 tier finding) | P3 (query scoping) |
| B11 | `parent_links` unique `(parent_user_id, student_user_id)` — attempt a duplicate insert | Constraint violation | P1 |
| B12 | Every pre-existing `profiles` row has `account_role = 'student'` post-migration (backfill correctness) | `count(*) where account_role is distinct from 'student'` — matches only rows that should genuinely be parents (zero, tonight) | P1 |

### C — safe to check via `/design-preview/*`, on purpose

Visual/theme correctness doesn't depend on whether the underlying numbers are real — fixture
data is the *right* tool here, not a workaround. The brown theme rendering correctly (contrast,
the tier-glow-equivalent treatment, no leftover flame/amber tokens bleeding through) is a
legitimate design-preview check once P3 lands. Named explicitly so this plan doesn't read as
"never touch design-preview" — it's fixture-only, not useless; it's the wrong tool for data
correctness specifically.

### D — not attempted, on purpose

Real email delivery (K6 keeps sending off). Real payment (none exists — P6's own doc). A live
authenticated click-through (the hazard this whole plan exists to route around; B1–B12 are the
deliberately harder substitute, not a lesser one).

## Execution order

P1 gates everything in section B — nothing there is runnable before its migration merges. A1,
A5 are runnable now (A1 depends on P2 merging first for there to be a string to check; A5 is
already true per P6's own doc, worth re-confirming once something writes a real tier surface
against it). B11–B12 are runnable the moment P1 merges, standalone. B1–B10 need P1's real
policies; B10 additionally needs P3's real queries to point the impersonation at. A2–A4, A6, C
need their respective lanes.

## What this pass did not do

Did not run a single check in section B — P1 isn't merged. Did not touch any real user's data;
the two proof queries above were read-only reconnaissance against `profiles`, both rolled back.
Did not open a browser. Did not decide what P1's fix for the `advisor_instructions` risk should
be — named the problem, not the solution, since that's a real schema-design call for whoever
owns P1's policy, not something to guess at from outside it.
