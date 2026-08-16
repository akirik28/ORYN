# Pre-Publish Checklist

Status: **NOT READY TO PUBLISH.** The repository is engineering-complete for V1 as
scoped; every remaining item below needs either founder credentials, a founder decision,
or a human legal review — nothing left is a code task an agent session could finish
itself.

**Superseded (2026-08-16): steps 2–4 below are stale** — a fifth migration
(`0030_moderation.sql`, `0031_messages_realtime.sql`) shipped after this file was
written, and the exact step-by-step sequence now lives in
`docs/founder-environment-unblock-runbook.md` (pre-check/apply/post-check SQL per
migration, not just a file list). **Use that file for steps 2–4, not this one** — kept
here only as a pointer so this doesn't become a second, drifting copy of the same steps.

## 1. Resolve two real conflicts before anything else

Read `docs/known-issues.md`'s first section ("Needs founder decision") and
`docs/founder-blocked-backlog.md`. This session found the founder's own Drive planning
doc explicitly contradicts, on the same day, both (a) the decision to add messaging and
(b) the decision to keep the dark theme. Both were kept as chat-instructed rather than
reverted, but a full theme rework and/or ripping out messaging are big enough that a
five-minute confirmation now is cheaper than shipping the wrong one. Still unresolved as
of 2026-08-16 — no further session has had the founder input needed to close this.

## 2–4. Credentials, migrations, seed data, leftover test account

**See `docs/founder-environment-unblock-runbook.md`** — its 12 steps cover all of this
file's original steps 2–4 plus two that didn't exist when this file was written: creating
real QA accounts (step 10) and granting `is_admin` (step 11), both needed before
`docs/browser-qa-checklist.md` can be run.

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

- **Live two-account messaging click-through and Messages/Sports mobile-width check** —
  both blocked on step 2's `SUPABASE_SECRET_KEY` (no way to create/confirm disposable test
  accounts without it); RLS-layer correctness is independently verified and is the layer
  that actually matters for the safety invariant.
- Run `POST /api/jobs/discover-opportunities` / `discover-requirements` once Tavily +
  Anthropic keys exist, to grow past the staged Drive batch.
- Programs/requirements/opportunities missing `country`/`eligible_countries`/`age`/`cost`
  (see `docs/known-issues.md`) — a second, more targeted extraction pass, not urgent.
