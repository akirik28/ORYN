# The founder has no admin access, and the DB disagrees with the repo — 2026-09-02

Two findings, both surfaced while checking something else: the founder asked for an admin
account, so I checked whether they had one.

Both need a live database write, so **both are founder-gated and neither has been done.**

---

## 1. The founder is not an admin. The only admin is a QA test account.

| account | email | `is_admin` | last sign-in |
|---|---|---|---|
| **Ada Sarp KIRIK** | `akirik28@my.uaa.k12.tr` | **false** | 2026-09-01 |
| oryn.qa.a | `oryn.qa.a@example.com` | **true** | 2026-08-24 |

One admin exists across eleven profiles and it is a throwaway QA account on an
`@example.com` address that hasn't been used in nine days.

The founder does have a real, active account — it's on their **school** address, not the
gmail on file — and `requireAdmin()` turns it away. So every admin surface being built right
now, including the spend and credit screens they specifically asked for, is invisible to
them. Seeing their own cost data would mean signing in as a test account.

They also **cannot fix this themselves through the app**: finding 2 below means the column
is trigger-guarded against exactly that. It needs a service-role SQL run.

**The fix, to run in the Supabase SQL editor:**

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'akirik28@my.uaa.k12.tr');
```

And, separately worth deciding rather than leaving: whether `oryn.qa.a` should keep admin.
A test account with a fake email holding the only admin role is not a posture to carry into
a pilot.

---

## 2. The live guard trigger is broader than the migration file that describes it

`supabase/migrations/0062_profiles_guard_protected_columns.sql` on `main` guards **one**
column and says so explicitly — "PROTECTED COLUMNS: `is_admin` only. NOT forgotten —
deliberately narrowed", because an earlier version that also froze
`profile_strength_score` and `completeness_percent` was judged likely to break score
recompute.

The database is running that earlier version:

```
profiles_00_guard_protected_columns
  BEFORE UPDATE OF is_admin, profile_strength_score, completeness_percent
```

with a function body that reverts all three for any caller that isn't `service_role`.

**This is not currently breaking anything, and it would be wrong to report it as an
outage.** I checked empirically rather than reasoning from the code: both columns are
populated with varied, plausible values across every active account, and dimension scores
are recent — the founder's own profile recalculated 2026-08-31. The writers go through the
service-role client, which the trigger exempts by design.

What it is instead is a **trap with no warning sign**. The repo says one column is
protected; three are. Anyone who later moves a score write to the ordinary authenticated
client — a reasonable-looking change — gets a silent revert with no error, and the migration
file they'd consult to understand why says the opposite of what's running.

**Resolve by deciding which version is correct and making both agree**, in whichever
direction. If narrowed is right, apply main's version. If the wide guard has earned its
place, main's file needs to say so and its comment needs rewriting. Do not leave them
disagreeing.

**Resolved, same day**: the wide guard is correct — confirmed the live function/trigger
are produced exactly by applying 0062 then 0063 in sequence (`pg_get_functiondef`/
`pg_get_triggerdef`, byte-for-byte, not inferred). Both files' headers rewritten in place
to say so; full writeup in `docs/migration-state.md`. Finding 1 above (the founder has no
admin access) is untouched and still open — that one needs a live write only the founder
or an explicitly-authorized session should make.

---

## A note on how this was nearly reported wrong

My first pass checked the RLS policies on `profiles` (`USING (id = auth.uid())`,
`WITH CHECK (id = auth.uid())` — row-scoped, no column restriction) and the column grants
(`authenticated` **does** hold `UPDATE` on `is_admin`). Both true, and together they look
exactly like a live privilege-escalation hole. I was one step from writing that up as
critical.

The guard is a **trigger** — a third mechanism neither of those two queries can see. Two
correct checks, one wrong conclusion, because the set of places a rule can live was larger
than the set of places I looked. Same shape as the eval leak-check bug found an hour
earlier, and the same question would have caught both: *what does this check not look at?*
