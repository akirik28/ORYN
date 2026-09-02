# Founder: start here

**Rewritten 2026-09-02, replacing the 2026-08-22 version in full.** That version told you to
approve migrations `0061`–`0063`; **all three are already live** — checked the actual view
definition and trigger, not a migration-file header, since two of that same batch's own headers
turned out to say "not applied" while fully live. Following the old instructions tonight would
have had you looking for a decision that isn't there anymore, while missing the ones that are.
Pinned against `main` @ `579093f4`, 3,617 tests green, four gates clean.

One ordered path from "just got back" to "what needs me tonight."

- **What is actually true right now**: `docs/current-state.md` — rewritten at each integration
  checkpoint, not appended to. Read its own "Measurement provenance" section first; it tells
  you exactly how stale it's allowed to be trusted for.
- **The complete, currently-ranked list of everything needing you**: `docs/founder-blocked-backlog.md`
  — re-ranked today against live objects, not against its own prior text.
- **The mechanics of the top item** (granting yourself admin, seeing the screens first,
  avoiding a silent trigger no-op): `docs/founder-morning-runbook-2026-09-02.md`.

---

## What needs you, in order — verified live just now, not carried forward from any doc

### 1. You are not an admin on your own product

Across eleven profiles, exactly one has `is_admin` — a QA throwaway (`oryn.qa.a@example.com`),
last used over a week ago. Your real account is turned away by every admin screen: spend
tracking, provider health, moderation, all built, none of them ever seen by you. The column is
trigger-guarded against a direct update (the same trigger that stops a *student* from granting
themselves admin also stops you) — it needs a service-role SQL statement, not a checkbox.
**Exact statement and a walkthrough of the screens first: `docs/founder-morning-runbook-2026-09-02.md`.**

### 2. Decide migration `0058` before the first deploy

It builds a complete, working posts/likes/reposts social layer — three tables, six trigger
functions, RLS, a storage bucket — and it is the one migration still genuinely unapplied that a
fresh deploy would silently switch on, because `AGENTS.md` section 12/Phase 54 name a social
feed as explicitly out of V1 scope and nobody has decided otherwise. Not urgent by the clock;
urgent by sequencing, since it has to be decided *before* item 3, not after. Full detail,
including exactly what's dormant versus already-shipped-and-unrelated:
`docs/migration-0058-social-layer-audit-2026-09-02.md`.

### 3. Deploy

The gate four subsystems sit behind. Readiness has been measured directly, not assumed:
production build compiles, and `check:integrations` reports Supabase/Anthropic/OpenAlex
healthy with Tavily and College Scorecard missing (their two jobs have simply never run —
nothing else depends on them). `CRON_SECRET` fails closed: unset, it rejects every cron
request including Vercel's own, which looks identical to "not deployed" from the outside. Full
checklist: `docs/nothing-scheduled-has-ever-run-2026-09-02.md`.

**A fourth item exists but isn't yours to close alone**: migration `0048` is a real, live gap
— any signed-in account can currently insert a `profile_views` row against an arbitrary
profile UUID. Written, unapplied, not yet on anyone's priority list by name. Worth a look before
item 3, not blocking it.

---

## What's no longer true, so you don't act on it

- **Migrations `0061`, `0062`, `0063` are all live** (verified against the actual view/trigger
  definitions, not a file header) — nothing to approve there. `0057` and `0060` are also live.
- **The theme/messaging-scope contradiction** the old version of this page flagged is not a
  staleness bug — it's a real, still-open decision, correctly tracked in
  `docs/founder-blocked-backlog.md` item 11 exactly where it belongs. Nothing to reconcile here;
  read that item when you're ready to rule on it.
- **The 2026-08-22 operational items — un-hang MERGE-1, open an ingester session, the six-of-
  thirteen dropped sessions** — described a research-organization structure from that night
  that no longer exists in that form. If any of that work is still genuinely outstanding, it
  will be in `docs/founder-blocked-backlog.md` under its own current heading, not here.
- **A real per-student AI dollar cap already exists** (`lib/ai/limits/budget.ts`, your own
  $0.50 soft / $1.00 ceiling figures, covering all ten AI features through one shared logging
  path) — if you hear otherwise, that claim is wrong; see `docs/ai-spend-cap-2026-09-02.md` for
  the call-site-by-call-site verification.
- **A real, paid AI-quality eval run has now been executed** (two, in fact — one Sonnet, one
  Haiku) — see `docs/eval-runs/` for the raw logs. Output quality is no longer purely
  theoretical; `docs/current-state.md` has what the first measurement found.

---

## Optional, any time

- **`TAVILY_API_KEY`** — plan usage exceeded; blocks opportunity/requirement discovery only.
- **`COLLEGE_SCORECARD_API_KEY`** — free and instant; US university sync only.

---

## What you do NOT need to do

- **No code fixes tonight.** `main` is independently gate-clean at the commit pinned above.
- **No hunting.** `docs/founder-blocked-backlog.md` names the exact action, why it blocks, and
  what it depends on, for everything real that's left.
