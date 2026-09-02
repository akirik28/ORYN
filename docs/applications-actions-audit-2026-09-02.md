# applications/actions.ts: the ownership question answered across all three layers, the degrade comment verified, and real tests added

Five server actions, previously zero tests. Two things checked before writing any test, per
the assignment; both are answered with live evidence, not inference.

## 1. `createApplication`'s ownership gap — covered, and here's where

`createApplication` inserts `target_university_id: params.targetUniversityId` with no check
that the target row belongs to the caller. Confirmed all three layers oryn-a7 named, plus
triggers as a fourth (the exact shape of the near-miss oryn-a7 referenced — RLS and grants
checked, triggers skipped, elsewhere):

| Layer | Checked | Result |
|---|---|---|
| Foreign key | `pg_constraint` on `applications` | `applications_target_university_id_fkey` → `target_universities(id) ON DELETE CASCADE` — existence only, no ownership tie possible from a plain FK |
| RLS on `applications` | `pg_policy` | One policy, `user_id = auth.uid()`, all commands — checks the row being inserted belongs to the caller, says nothing about what it references |
| RLS on `target_universities` | `pg_policy` | **Identical policy**, `user_id = auth.uid()` — this is what actually closes it |
| Triggers | `pg_trigger` on all three tables | Only `set_updated_at()` timestamp triggers, nothing access-control-related |
| Grants | `information_schema.role_table_grants` | Both `anon`/`authenticated` fully granted on both tables — RLS is reachable, not silently bypassed by a missing grant (the exact gotcha `reference_rls_policy_needs_underlying_grant` already documents elsewhere in this project) |

**The mechanism**: every read of `target_universities` in this codebase goes through the
request-scoped (RLS-enforced) client — `app/(app)/applications/[id]/page.tsx` queries it by
raw `id` with no additional `user_id` filter in the app code at all
(`.eq("id", application.target_university_id).single()`), and that is safe *only* because RLS
transparently filters the row to nothing when it isn't the caller's own. Traced what actually
happens if `createApplication` were exploited: the resulting `applications` row is still
correctly owned by the attacker (`user_id` passed RLS on insert), so this is not a path to
reading or modifying another student's data — the attacker only ever sees *their own* row,
with the university side permanently unresolvable. `applications/page.tsx`'s list view is
independently safe for a different reason: it builds `universityNameByTargetId` from a query
already scoped to `.eq("user_id", userId)`, so a forged `target_university_id` simply misses
that map and falls back to "Unknown" — it can't even accidentally resolve to the wrong name.

**Net effect of the gap**: a student could create a self-referencing-nothing-useful
application (permanently blank university info, confirmed via the detail page's own
null-handling — `universityId` stays `null`, every dependent query short-circuits, no crash).
That's a data-integrity nuisance for whoever does it to themselves, not a privacy or
cross-account write issue. Not fixing it — the assignment was to answer the question, not
necessarily act on it, and the fix (verifying `target_universities.user_id = session.userId`
before insert) is a one-line addition if it's wanted; noting it here rather than making that
call unilaterally, since deciding whether a data-integrity-only gap justifies a change is a
product call, not just an engineering one.

## 2. The best-effort degrade comment — verified against the actual function, not trusted

`createApplication`'s comment claims `computeReadiness` treats zero requirements as
"unmeasured," not zero-percent, so continuing past a failed default-checklist insert is safe.
Read `lib/applications/readiness.ts` directly:

```ts
const applicable = requirements.filter((r) => r.status !== "not_applicable");
if (applicable.length === 0) return { kind: "unmeasured" };
```

An empty `requirements` array (exactly what a failed insert leaves behind) produces an empty
`applicable` array, which hits this branch. Traced the full path, not just the one function:
both call sites (`applications/page.tsx`, `applications/[id]/page.tsx`) pass `?? []` when the
Supabase read returns `null`, so there's no gap between "insert failed" and "computeReadiness
sees zero requirements" for a different reason to sneak into. **The comment is accurate.**
Worth stating plainly given tonight's count of comments that asserted the safety property that
turned out to be false when checked — this one holds.

## 3. Tests added: `__tests__/applications/actions.test.ts`, 15 tests, all five functions

Mocked `@/lib/supabase/server`'s `createClient()` the same way
`__tests__/settings/delete-my-account.test.ts` already does — a configurable fake query
builder per table, `.from(table)`-keyed so `createApplication`'s two different tables
(`applications`, `application_requirements`) can be configured independently in one test. Real
branch coverage throughout; no source-text pins were needed — every one of the five functions'
Supabase usage turned out mockable with a plain chainable-and-`PromiseLike` builder, unlike
cases elsewhere in this codebase where a `createClient()` usage genuinely resists it.

Covered: both success and failure for all five actions; the ownership-scoping `.eq("id",
...).eq("user_id", ...)` pair on every update, asserted by inspecting the mock's recorded
calls, not just trusting the source; the notes-trim-to-null behavior on both notes actions;
the exact 8-item default-requirements payload shape; `logEvent`/`revalidatePath` called (or
correctly not called) on each branch; and the best-effort degrade itself — the applications
insert succeeding while the requirements insert fails still returns `{ applicationId }},
with the specific `console.error` call.

Also added one test with no failure mode to check — it exists to **pin the ownership finding
as current, tested behavior** rather than leave it as a claim in a doc: asserts
`createApplication` never queries `target_universities` at all. A future edit that adds an
ownership check will make this test fail and force a deliberate update, which is the point.

**Sanity-checked the suite isn't vacuous**: temporarily changed the best-effort-degrade branch
in the real source to return an error instead of degrading, reran the suite — exactly one test
failed (the one written for that behavior), the other 14 stayed green, then reverted and
confirmed a clean `git diff` on the source file. 3536/3536 project tests pass (3521 baseline +
15 new), `tsc --noEmit` clean.
