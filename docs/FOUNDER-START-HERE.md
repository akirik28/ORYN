# Founder: start here

One ordered path from "just got back" to "ORYN running end-to-end in a browser." Follow
top to bottom. Every step says what to do, where, what you should see, and when to stop.

This is the **only** document you need to open first. It links out to detail where a step
needs it; you shouldn't have to read the others to get unblocked.

- Full list of everything still needing you: `docs/founder-blocked-backlog.md`
- Per-migration SQL and post-checks: `docs/founder-environment-unblock-runbook.md`
- Browser test script for step 9: `docs/browser-qa-checklist.md`

**Current state of the code:** every founder-independent task is done. Lint, typecheck,
the full test suite, and a production build all pass on `main`, and GitHub Actions is
green. Nothing below is a code fix — it is all credentials, dashboard settings, and
applying migrations that this environment could not apply itself.

---

## The 10 actions, in order

### 1. Turn off "Confirm email" (QA project only)

**Where:** Supabase dashboard → your `oryn-qa-scratch` project → Authentication → Sign In
/ Providers → Email → turn **Confirm email** off. While you're there, confirm Site URL /
Redirect URLs includes `http://localhost:3000`.

**Why first:** no browser QA is possible until this is off. There is no email provider in
this repo, so a confirmation email can never arrive and signup never yields a session.

**Expected result:** the Email provider row shows "Confirm email" disabled.

**Stop if:** you can't find the setting — nothing after this will work, so resolve it
before continuing.

---

### 2. Add `SUPABASE_SECRET_KEY` to `.env.local`

**Where:** Supabase dashboard → Project Settings → API → copy the **secret** key (not the
publishable one) → paste into `/Users/direncagankirik/Desktop/Founder/ORYN/.env.local` as
`SUPABASE_SECRET_KEY=...`

**Verify:**

```bash
npm run check:integrations
```

**Expected result:** `Supabase (secret key)   OK` (it currently reports
`Missing credential`). No secret value is ever printed.

**Stop if:** it still says missing — steps 3–8 all depend on this.

---

### 3. Apply the pending migrations, in numeric order

**Where:** Supabase dashboard → SQL Editor (or `npx supabase db push` if you've linked the
CLI, which applies all of them in one command).

**Order — this matters:**

| # | File | Note |
|---|---|---|
| 0028 | `supabase/migrations/0028_program_requirement_dedup_indexes.sql` | |
| 0029 | `0029_story_notes.sql` | **already applied to `oryn-qa-scratch`** — skip it there |
| 0030 | `0030_moderation.sql` | |
| 0031 | `0031_messages_realtime.sql` | |
| 0032 | `0032_ingestion_dedup_and_unknown_fields.sql` | |
| 0033 | `0033_professional_profile_core.sql` | |
| 0034 | `0034_skill_endorsements.sql` | |
| 0035 | `0035_recommendations.sql` | |
| 0036 | `0036_profile_views.sql` | |
| 0037 | `0037_public_profile_headline_about.sql` | |
| 0038 | `0038_canonical_institutions.sql` | |

Every one is additive — new tables, columns, indexes, RLS policies, and one
`CREATE OR REPLACE VIEW`. Nothing drops or rewrites existing data.

`docs/founder-environment-unblock-runbook.md` has a pre-check and post-check query for
each of 0028–0032; run them rather than assuming.

**Expected result:** each migration completes without error, and each post-check returns
the row count that file states.

**Stop if:** any migration errors. Don't skip ahead — later ones and the seeds below
depend on earlier ones.

---

### 4. Apply the seed data, in this order

```
supabase/seed.sql                      (if not already applied)
supabase/seed_drive_batch1.sql         needs 0028 + 0032
supabase/seed_entities_drive_batch1.sql   needs 0038
```

All three are idempotent (`ON CONFLICT DO NOTHING`) — safe to re-run.

`seed_entities_drive_batch1.sql` is the canonical entity data from your own Drive pack:
19 verified organizations, 54 verified Turkish schools with 126 verified aliases, 77 new
universities plus 3 alias enrichments, 5 opportunity aliases.

**Expected result:**

```sql
select count(*) from public.institutions;   -- 73  (19 organizations + 54 schools)
select count(*) from public.universities;   -- 128 (51 existing + 77 new)
```

**Stop if:** `institutions` doesn't exist — 0038 didn't apply, go back to step 3.

---

### 5. Add `ANTHROPIC_API_KEY`

**Where:** [console.anthropic.com](https://console.anthropic.com) → API Keys → add to
`.env.local`.

**Verify:** `npm run check:integrations` → `Anthropic  OK`

**Unblocks:** the AI Advisor (never yet run against a live model), weekly plan
generation, CV extraction during onboarding, achievement refinement, research-project
generation, and Essay Story Bank outlines.

**Optional, same pattern, any time later:** `TAVILY_API_KEY` (opportunity/requirement
discovery jobs), `COLLEGE_SCORECARD_API_KEY` (free, instant, at
[api.data.gov/signup](https://api.data.gov/signup/) — US university sync only),
`CRON_SECRET` (`openssl rand -hex 32`, only if you want the background jobs on a
schedule rather than triggered by hand from `/admin`).

---

### 6. Create two QA accounts

**Where:** the running app at `http://localhost:3000/signup` (start it with `npm run dev`).

Sign up **two** accounts — you need a second one to test connections, messaging,
endorsements, recommendations, and mutual connections. Real signup through the UI, not
inserted by hand, so the profile trigger and onboarding flow are exercised too.

**Expected result:** both land in onboarding and reach the dashboard.

**Stop if:** signup returns "check your email" — step 1 didn't take effect.

---

### 7. Grant yourself admin

**Where:** Supabase SQL Editor.

```sql
update public.profiles set is_admin = true where id = '<your account A user id>';
```

Find the id under Authentication → Users, or `select id, display_name from public.profiles;`

**Expected result:** `/admin` loads for account A and 404s for account B. Both are correct.

---

### 8. Run the data-quality audit on the now-live registry

```bash
npm run entities:audit
```

Read-only. Reports duplicates, alias collisions, malformed fields, and any stale
denormalized names, bucketed SAFE_EXACT_LINK / POSSIBLE_DUPLICATE / AMBIGUOUS /
UNRESOLVED / INVALID. It never merges anything.

**Expected result:** all buckets 0 on freshly seeded data. If a `stale_denormalized_name`
appears later (only possible after you rename a canonical entity), re-sync with
`npm run entities:audit -- --fix-drift`.

---

### 9. Browser QA

Follow `docs/browser-qa-checklist.md` with both accounts. The highest-value checks, in
order:

1. Onboarding: type `uskudar` in the school field → **Üsküdar American Academy** appears
   and selecting it links the canonical entity rather than storing free text.
2. Profile: add coursework (AP / IB HL / A-Level) and confirm the academics and
   intellectual-curiosity scores move.
3. Add an activity with an organization; try `YYGS` in the program field.
4. Universities: search `MIT` → Massachusetts Institute of Technology.
5. Account B: connect to account A, accept, then message, endorse a skill, and write a
   recommendation.
6. Account A: check Profile Strength, profile views, and mutual connections.
7. Report a recommendation from B, then review it at `/admin` as A.

---

### 10. Two product decisions only you can make

Neither blocks anything above; both are waiting on you, and both are written up in full
in `docs/founder-blocked-backlog.md`:

- **Item 16b — should Education (and therefore GPA) appear on public profiles?** Your own
  earlier decision was to keep school name and GPA off public profiles for minor safety;
  a later migration added a `show_gpa` opt-in that assumes the opposite. Until you decide,
  GPA stays private and the toggle is hidden. Say yes or no and the wiring is small either
  way.
- **Item 11 — the Drive-doc conflict** on messaging scope and visual theme, where your
  planning doc and your later chat instructions disagree. The chat instructions were
  followed; the conflict is logged rather than silently resolved.

---

## What you do *not* need to do

- No code fixes. `npm ci && npm run lint && npm run typecheck && npm test && npm run build`
  all pass on `main`.
- No hunting for what's left. Everything remaining is in
  `docs/founder-blocked-backlog.md`, and every item there names the exact action,
  why it blocks, and what it depends on.
