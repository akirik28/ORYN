# Pre-Publish Checklist

Status: **NOT READY TO PUBLISH.** The repository is engineering-complete for V1 as
scoped; every remaining item below needs either founder credentials, a founder decision,
or a human legal review — nothing left is a code task this session could have finished
itself. Full detail behind each item is linked, not repeated here.

## 1. Resolve two real conflicts before anything else

Read `docs/known-issues.md`'s first section ("Needs founder decision"). This session
found the founder's own Drive planning doc explicitly contradicts, on the same day, both
(a) the decision to add messaging and (b) the decision to keep the dark theme. Both were
kept as chat-instructed rather than reverted, but a full theme rework and/or ripping out
messaging are big enough that a five-minute confirmation now is cheaper than shipping the
wrong one.

## 2. Add production credentials to `.env.local`

| Credential | Unlocks | Where to get it |
|---|---|---|
| `SUPABASE_SECRET_KEY` | Admin-client features, live data writes, account deletion, peer benchmarking | Supabase dashboard → Project Settings → API |
| `ANTHROPIC_API_KEY` | AI Advisor, weekly plans, CV/opportunity/requirement extraction | `API_SETUP.md` |
| `TAVILY_API_KEY` | Opportunity + requirement discovery jobs | `API_SETUP.md` |
| `COLLEGE_SCORECARD_API_KEY` | U.S. university sync | `API_SETUP.md` |
| `CRON_SECRET` | Protects the background-job routes | Generate any strong random string |

Verify with `npm run check:integrations` — should report `OK` for all five once set.

## 3. Apply the staged Drive-corpus data

Via the Supabase SQL editor (or `psql`/CLI) against the linked project, in order:

```bash
supabase/migrations/0028_program_requirement_dedup_indexes.sql
supabase/seed_drive_batch1.sql
```

Adds 31 real universities, 189 programs, 520 requirement rows, and 273 real opportunities
— see `docs/data-readiness.md`'s "Staged batch" section for exactly what's in it and what
was deliberately left out. Both files are idempotent. Confirm afterward with the count
query at the bottom of `docs/data-readiness.md`.

## 4. Clean up one harmless leftover

An earlier live-QA attempt this session created one unconfirmed, unreachable-email test
account (`oryn.qa.alpha.chat4@qamail.io`) — no real data attached. Delete it from the
Supabase dashboard (Authentication → Users), or it self-resolves once step 2's secret key
lets a future session do it directly.

## 5. Professional legal review

Minor-safe / privacy / COPPA-and-equivalent claims have never had a professional legal
review — unchanged since Chat 1. Required before any public launch involving real minors,
independent of everything else on this list.

## 6. Deploy

Not attempted by this session (explicitly out of scope per the founder's own instruction).
Once 1–5 above are done: connect the production Supabase project, confirm environment
variables on the hosting platform, deploy, configure the custom domain.

---

## Recommended, not blocking

- **Essay Story Bank** — the other founder-confirmed MVP feature not yet built (CV
  Generator is done this pass). Scoped in `docs/known-issues.md`; a real second feature,
  not a quick add.
- **Live two-account messaging click-through and Messages/Sports mobile-width check** —
  both blocked on step 2's `SUPABASE_SECRET_KEY` (no way to create/confirm disposable test
  accounts without it); RLS-layer correctness is independently verified and is the layer
  that actually matters for the safety invariant.
- Run `POST /api/jobs/discover-opportunities` / `discover-requirements` once Tavily +
  Anthropic keys exist, to grow past the staged Drive batch.
- Programs/requirements/opportunities missing `country`/`eligible_countries`/`age`/`cost`
  (see `docs/known-issues.md`) — a second, more targeted extraction pass, not urgent.
