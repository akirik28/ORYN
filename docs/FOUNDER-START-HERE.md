# Founder: start here

**Rewritten 2026-08-22 by ORYN-CEO.** The previous version dated from 08-17 and had gone stale —
it described several things as blocking that have since been resolved, and none of what's
actually urgent now. Everything below was measured today, not carried forward.

One ordered path from "just got back" to "what needs me tonight." Each step says what to do,
where, and how to tell it worked.

- **What happened today**: `docs/ORYN-DAY-REPORT-2026-08-22.md` — read this first if you only
  read one thing.
- **The complete list of everything needing you**: `docs/founder-blocked-backlog.md` — this page
  sequences only the ones that matter tonight.
- **What is actually true right now**: `docs/current-state.md`.

---

## What is no longer blocking (so you don't redo it)

| Was blocking | Status now |
|---|---|
| `SUPABASE_SECRET_KEY` failing with "JWT issued at future" | **Resolved.** Never a bad credential — a transient server-side condition. Verified OK today. |
| No QA accounts | **Done.** Two exist and work: `oryn.qa.a@example.com` (admin) and `oryn.qa.b@example.com`. Passwords in `.env.qa-accounts.local` (gitignored). |
| Signup blocked by "Confirm email" | **Worked around.** The setting is still on, but the two QA accounts were created pre-confirmed via the admin API, so browser QA is unblocked without it. Only turn it off if you want to test the real signup flow. |
| Migrations 0028–0038 | **Applied.** Live schema is at `0056`. |
| 43 duplicate university identities | **Resolved.** Live `duplicate_status` is populated and every read path now queries it. |

---

## Where the MVP actually stands (measured tonight, for the first time)

`AGENTS.md` Phase 53 lists sixteen things a student must be able to do before V1 is real. That
list has been treated as satisfied because the features were built and tested individually —
**nobody had ever walked it end to end, in order, as one student.** Tonight someone did, against
the live database, checking real writes rather than trusting the screen.

**14 of 16 work end to end. The two that don't are the same root cause: `ANTHROPIC_API_KEY`.**

Weekly-plan generation has no non-AI fallback, so without the key no `weekly_actions` row is ever
created — which takes out both *"receive 3 prioritized actions"* and *"complete actions"*. They
are one gap seen from both ends, not two. **Adding that key is what closes the MVP checklist.**

Two things worth knowing about how this was measured. The auditor **declined to insert a
`weekly_actions` row by hand** to make the test pass, because that would verify a state no real
student can reach. And it corrected its own assumption mid-audit: profile analysis was thought to
be AI-gated and isn't — `lib/scoring/` contains no AI at all and is fully deterministic.

**The one feature I'd have bet against came out best.** The admission outlook matches your own
specification almost word for word — honest range, explicit "not a guarantee," the exact
Strengths/Gaps/Unknowns structure — verified live rather than read off the source. That's the
feature where overclaiming would have done real harm to a 16-year-old.

Full detail: `docs/handoffs/feat2-mvp-checklist-audit-2026-08-22.md`.

---

## What needs you tonight, in order of severity

> **Correction to the earlier version of this page, 2026-08-22 evening.** It opened by telling you
> Habitat Derneği's 26 August deadline was four days out and stranded. **That was wrong, and it was
> my error.** The row is already live, `active`, with `deadline 2026-08-26` matching its source — a
> student can see it right now. The only gap is a null `last_verified_at`, a provenance stamp, not
> a student-facing defect. I propagated a research lane's premise into three documents without
> querying the row myself; the lane caught its own mistake and I confirmed the correction live.
> **Nothing on this list expires.** What follows is ordered by severity instead.

> ### One thing to understand before the migration items below
>
> Every security fix today has two halves: **application code** and a **database migration**.
>
> **The code half is already live.** It merged and deployed with everything else.
> **The database half is not** — `0061` through `0065` are written and waiting on you.
>
> That matters because these holes are in the *database's* permission rules, not in the app.
> Closing them in the app narrows what the app will do; it does **not** stop someone sending a
> request straight to the database's own API and getting the same result. **Until you apply the
> migrations, every gap listed below is still open**, regardless of how correctly the app behaves.
>
> This is why they're the top of the list rather than routine maintenance, and why "written, not
> applied" means *the hole is still there* rather than *an improvement is pending*.

### 1. Approve migration `0062` — any signed-in user can make themselves an admin

**What**: a trigger migration written by BUG-1 and **not applied**. Ranked above everything else
on this page.

**Why**: an ordinary QA student account granted itself `is_admin = true` with a single
unprivileged call. This was executed live, not inferred from reading the schema. The `profiles`
UPDATE policy says *you may update your own row*, which is correct — but **RLS is row-scoped, not
column-scoped**, so `is_admin` is as writable to a student as their own display name. Admin routes
then use a service-role client that bypasses RLS entirely, so this doesn't widen a view — it hands
over the key that switches RLS off.

**`0062` guards `is_admin` and nothing else** — that alone closes the escalation, and it is safe
to apply as it now stands. If you saw an earlier warning on this item: the first version also
guarded two computed score columns, which would have silently frozen score recompute. It was
caught and narrowed before anything ran against the database. Those two columns moved to `0063`,
which is merged, unapplied, and **not urgent** — it needs no decision from you tonight.

**How**: Supabase dashboard → SQL Editor → paste
`supabase/migrations/0062_*.sql` → Run. Then confirm a non-admin account can no longer change
its own `is_admin`.

Full reasoning: backlog item 36. The mechanism is not novel here — it mirrors
`posts_guard_system_columns` in migration `0058`, and legitimate admin grants keep working
because they run through the service-role path the trigger exempts.

### 2. Approve migration `0061` — the anonymous-read launch blocker

**What**: `supabase/migrations/0061_public_profiles_require_authenticated.sql`, written and
**not applied**.

**Why**: the `public_profiles` view currently returns data to **anonymous, unauthenticated
callers** for any profile marked public. Measured exposure: 7 profiles, 1 currently public,
safe-column fields only — private fields verified still protected. Small today. It is a
14–18-year-old's display name, curriculum, graduation year and free-text "about", readable by
anyone on the internet, for a profile the product tells them is visible to other Oryn students.

**How**: Supabase dashboard → SQL Editor → paste the migration file's contents → Run. Then
confirm with an anonymous query that the view returns nothing for a public profile.

Full reasoning: backlog item 30, and `docs/research/verification/rls-live-verification-2026-08-22.md`.

### 3. Approve migrations `0063` and `0064` — written this evening, no urgency

Both came out of the same security sweep that produced `0062`, both written and **not applied**.
- **`0063`** stops a student writing their own computed scores — the numbers Oryn calculates
  about them — and moves those writes to the privileged path where they belonged.
- **`0064`** stops a student filing a moderation report that names an innocent third party as
  the author of a message they didn't write.

Neither is urgent. Both are safe to apply whenever you approve `0062`.

### 4. Approve migrations `0060` and `0057` — same shape, no urgency

Both written, reviewed, unapplied, waiting only on your go-ahead.
- **`0060`** adds an honest "research confirmed this is open worldwide" marker, so that
  "unresearched" and "unrestricted" stop looking identical in the data.
- **`0057`** adds YÖK Atlas's own per-programme identifier for the 779 Turkish programme rows,
  which currently have no usable per-programme source reference at all.

Backlog items 29 and 26.

### 5. Open one ingester session (whenever suits you — no deadline)

Six of thirteen working sessions ended without warning this afternoon, including **both** lanes
permitted to write to the database. Verified, bounded, revertible work is stranded with nothing
able to apply it: five `cycle_status` corrections resolved against their own sources, Glasgow's
~10 cleared `degree_type` records, six non-opportunity retirements, and the Habitat provenance
stamp. None of it is urgent and none of it is harmful while it waits — an unapplied correction is
a missing improvement, not a defect.

**How**: open a new chat and paste the `RES-I2` brief from `docs/ORYN-ORG-BRIEFS.md`. One session
clears most of it in under an hour. Backlog item 34.

### 5b. If you un-hang MERGE-1, point it at its resume brief first

MERGE-1's session has been hung since **15:42**, holding a "running" slot, which
is why nobody could reach it. **Only you can un-hang it, at its terminal.**

Its context predates everything after 15:42 — the whole evening's merges, a merge-authority change, and a dozen new
standing rules. If it resumes and starts merging on old assumptions, that is a real hazard.
**Tell it to read `docs/handoffs/merge-1-resume-brief.md` before doing anything** — that file
exists for exactly this and explains what changed and why it should not start merging on resume.

Entirely optional. Nothing is waiting on MERGE-1; the queue is empty.

### 6. Two product decisions nobody can make for you

- **Item 27 — ~79 opportunity rows** whose descriptions are degraded *in your own Drive source
  spreadsheet* (the importer carried the defect faithfully; it did not create it). 31% of the
  live browse surface carries a defect signature. Rows that were categorically not opportunities
  at all are already retired. **Re-research, retire, or accept?**
- **Item 35 — should a field hold more than one simultaneous truth?** Four lanes hit this
  independently today in four different columns: an opportunity can be `closed` *and* awaiting
  an unannounced next cycle; a programme lists 2–4 awards and the field stores one; Girl Up has
  per-region deadlines and one deadline field. Every stored value is factually correct — what
  misleads is the field's implied claim to be complete. Deciding the principle once settles all
  four.

### 7. The UI conversation you deferred

`docs/ui-audit-2026-08-22.md` is the agenda: six defects verified safe to fix now, findings that
need your taste rather than a fix, and costed proposals in three tiers (colour/typography ·
density/hierarchy · information architecture) so you can choose with real prices attached.

**The light-vs-dark theme decision is still formally open** — nobody resolved it in your absence,
deliberately. Note that `docs/known-issues.md` records the theme half as resolved while
`founder-blocked-backlog.md` item 11 still lists it as open; that contradiction is itself
unresolved and flagged rather than guessed at.

---

## Optional, any time

- **`TAVILY_API_KEY`** — plan usage limit exceeded; blocks the discovery jobs only.
- **`COLLEGE_SCORECARD_API_KEY`** — free and instant; US university sync only.

---

## What you do NOT need to do

- **No code fixes tonight.** `main` was independently re-verified at the end of the evening:
  lint clean, typecheck clean, **144 files / 2,122 tests passing**, production build compiles —
  and independently reproduced by a second session in its own clean-room checkout. (Figures
  measured 19:40; `docs/current-state.md` carries the authoritative, dated version.)
  (The app was also run against the live database and walked by hand — but that was this
  morning, before the evening's merges. A full end-to-end walk is in progress and will be reported
  separately; treat the hand-walk as verified for this morning's code, not tonight's.)
- **The regression noted earlier this evening is fixed.** Tonight's security work had briefly
  made the dashboard depend on `SUPABASE_SECRET_KEY` at page-render time, so a deployment
  missing that key would have shown an error page instead of degrading. It now degrades
  honestly: the page renders, and where data couldn't be refreshed it says so rather than
  presenting stale results as current. Closed, gated, and merged — nothing for you to do.

- **No hunting.** Everything remaining is in `docs/founder-blocked-backlog.md`, and every item
  there names the exact action, why it blocks, and what it depends on.
