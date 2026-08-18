# 10-person pilot readiness

A task-based script for the founder's first ~10-person test group, plus what to check
before handing it to anyone. Everything below was verified directly against the live
`oryn-qa-scratch` project and the current codebase this session — not assumed from older
docs, several of which (`FOUNDER-START-HERE.md` in particular) describe a state that has
since drifted.

## Update: a real, pilot-blocking crash was found live and is now fixed

After this doc was first written, live browser access became available mid-session (full
story in `docs/handoffs/claude2-product-ux.md`) and surfaced something code review alone
hadn't caught: **the Connections page 500'd completely** in any environment missing
`SUPABASE_SECRET_KEY` (this one included) — which would have made pilot tasks 8 and 9 below
fail for every single tester, not just degrade. Root cause and fix: `b4a38dd`. Confirmed
fixed by reloading the live page — it now renders its correct "No connections yet" empty
state instead of crashing. Worth knowing this class of bug exists (an admin-only Supabase
client throwing synchronously when unconfigured, uncaught, taking a whole page down with
it) — most call sites already guard against it, this was the one gap, now closed.

## Before inviting anyone: 3 real blockers, founder action only

None of these are code problems — verified by reading `.env.local` state via
`check:integrations` and querying `auth.users`/project config directly.

1. **Supabase Auth "Confirm email" is ON for `oryn-qa-scratch`.** Queried `auth.users`
   directly: every recent signup attempt has a `confirmation_sent_at`, and most never got
   `email_confirmed_at` — including three of this session's own signup attempts, which hit
   Supabase's shared-SMTP rate limit before even reaching that stage. `FOUNDER-START-HERE.md`
   step 1 assumes this is already off; it is not (or was turned back on). **Turn it off**
   (Supabase dashboard → `oryn-qa-scratch` → Authentication → Sign In / Providers → Email)
   before any pilot tester tries to sign up, or every one of them will hit "check your
   email" with no email ever arriving.
2. **`ANTHROPIC_API_KEY` is unset.** `npm run check:integrations` reports it missing. Pilot
   task 10 below (ask the AI Advisor something) will show "The AI Advisor isn't configured
   yet" instead of a real answer for every tester until this is added.
3. **The opportunity catalog is very thin — 11 active rows today** (verified via direct
   query): 8 US-based, 3 with no country set, none anywhere else — spanning only 4 of the 12
   possible
   categories (competition, summer_program, entrepreneurship, research). A tester asked to
   "search for an opportunity" in, say, robotics or a non-US country will very likely find
   nothing — not a bug, just genuinely sparse data this early. Either seed a few more
   opportunities the pilot testers are likely to search for before the session, or pick
   pilot task 6 below carefully (query suggestions matched to what's actually there) rather
   than leaving it fully open-ended.

Optional, same pattern, non-blocking: `TAVILY_API_KEY`/`COLLEGE_SCORECARD_API_KEY` unblock
live opportunity/university discovery jobs rather than relying on the existing seed data.

## The pilot script

Ten tasks, each with a concrete success signal, a concrete failure signal, and a friction
note — hand these to testers roughly in this order; it mirrors the product's own intended
first-session arc (profile → search → save → connect → ask).

| # | Task | Success | Failure | Watch for |
|---|---|---|---|---|
| 1 | Create an account and complete onboarding | Lands on `/dashboard` | Stuck on "check your email" | Blocker #1 above — test this yourself first |
| 2 | Add one education record (school + curriculum) | School typeahead resolves to a real registry entry, not just typed text | Can't find their school, has to use "Can't find your school?" fallback | Whether the fallback flow itself is smooth for a real unlisted school |
| 3 | Add one AP/IB/A-Level course | Course-name typeahead suggests it after a few keystrokes | Has to type the full name with no suggestion | Whether the suggested list actually covers their curriculum |
| 4 | Search "Harvard" (or another well-known school) on the Universities page | A suggestion appears after typing "Har", clicking it opens the real detail page | Nothing appears until they click Search | This session added the typeahead — first real-user check of it |
| 5 | Save a university as a target | Card/detail page shows it saved, appears under their target list | Save button does nothing / errors | — |
| 6 | Search for an opportunity in their actual interest area | Finds at least one relevant, real result | Empty results | Expected for most queries right now — see blocker #3. Try "Browse all" → a populated category (competition, summer program, entrepreneurship, or research) instead of a fully open search |
| 7 | Save or mark "applied" on an opportunity | Status updates and persists on reload | — | — |
| 8 | Send a connection request to another pilot tester (via their `/u/[id]` link, since there's no open people-search by design — see `docs/product-decisions.md`) | Recipient sees it under "Requests" and can accept | Requester can't find a way to connect without already having the link | Confirms the founder's own link-only-discovery decision is actually usable in practice, not just correct in principle |
| 9 | Open a suggested profile from "People you may know" on the Connections page | Suggestion has a real, sensible reason ("Same school", "N mutual connections") | No suggestions appear at all | Needs ≥1 other pilot tester already connected/same-school for this to have anything to show — sequence pilot sessions so this isn't everyone's very first action |
| 10 | Ask the AI Advisor a real question ("Should I start another club?") | Gets a specific, grounded answer referencing their actual profile | "AI Advisor isn't configured yet" | Blocker #2 above |

## Checking what actually happened, after

Every meaningful action already logs to `product_events` (10 event types:
`onboarding_completed`, `profile_item_added`, `cv_imported`, `target_university_added`,
`opportunity_saved`, `opportunity_applied`, `advisor_message_sent`,
`weekly_action_completed`, `research_project_started`, `application_updated` — confirmed by
reading every `logEvent()` call site, not assumed from the spec list). No RLS policy grants
student read access to this table (by design — it's an internal signal, not a student-facing
feature), so check it via the Supabase SQL editor:

```sql
select event_name, count(*), count(distinct user_id) as unique_testers
from public.product_events
where created_at > now() - interval '7 days'
group by event_name
order by count(*) desc;
```

Connection activity (no dedicated event, but directly queryable):

```sql
select status, count(*) from public.connections
where created_at > now() - interval '7 days'
group by status;
```

## Friction notes worth watching for, based on this session's own findings

- **Field feel**: several profile fields (country, skill name, sport, award level, research
  field, volunteering cause area) just gained typeahead suggestions this session — worth
  specifically watching whether testers notice/use them or keep typing past them, since
  that's a direct signal on whether the suggestion lists actually cover real answers.
- **Location**: Settings gained an editable location (country/city) this session, framed as
  "prioritizes nearby opportunities" — with only 11 opportunities live, a tester won't see a
  visible effect from this yet. Don't over-index on tester reaction to it this round.
- **Mobile**: not separately verified this session (see `docs/known-issues.md`'s existing
  "Messages and Sports were not verified at mobile width" note, which still applies more
  broadly) — if any pilot testers use a phone, that's genuinely first real-world mobile
  usage this product has had.
