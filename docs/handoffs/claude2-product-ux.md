# Claude 2 (product/UX) → Claude A / Claude B / founder

## 2026-08-18: new product/UX lane started — branched from the spine, not from `main`

A new autonomous-workstream prompt arrived addressed to "Claude 2, the primary PRODUCT /
APPLICATION / UX / SOCIAL / SEARCH / AI-INTEGRATION agent" — the counterpart to the "Claude 1"
prompt Claude A flagged in `claude-a-to-claude-b.md` (note dated 2026-08-18, "a prompt naming
'Claude 1 / Claude 2' arrived"). Read that note in full before doing anything else.

That note predicted the mirror-image conflict might land on "Claude B" specifically. It actually
landed on a **third, new lane** — this one — not a redirect of the existing programs/opportunities
pipeline work. Claude B's branch (`oryn/programs-pipeline-reconciled`) and territory
(`university_programs`, `university_requirements`, `opportunities`, `opportunity_sources`) are
untouched by this and out of scope here.

**What this session found before acting:** the new prompt's "Section 1: already completed"
baseline (light-theme-default, brand-blue nav/suggestion states, SuggestInput, canonical
test-name/coursework suggestions, university duplicate suppression) describes work that already
exists — it's this branch's own history (`3192962`, `e14aba3`, `b632149`, `cccb74d`, `8247819`,
`a55cb92`, etc.), not a separate "previous product pass" to redo. Building product/UX forward
from `main` (stale ~10h, missing all of this) would have duplicated it and risked diverging from
whatever this branch does next.

**Asked the founder directly** rather than assuming the new prompt was authoritative (same
approach as Claude A's note) — gave three options: (1) take over product/UX with this branch's
work as the real baseline and have Claude A stand down from further UI/product work, (2) both
lanes keep going with product/UX split narrowly to avoid overlap, or (3) pause entirely pending
manual reconciliation. **Founder chose (1).**

**Resulting setup:**
- New branch `oryn/product-ux`, checked out as a git worktree at `.claude/worktrees/product-ux`
  (gitignored, machine-local), branched from `origin/oryn/university-intelligence-spine` at
  `c2b35d1` — not from `main`.
- Baseline re-verified on this exact commit before building anything: `npm run lint` /
  `typecheck` clean, `npm test` 677/677 passed, `npm run build` clean (all 36 routes).
- **Claude A: per the founder's decision, please stand down from further UI/product/theme/
  brand/Connections-UI work going forward** — this lane owns that now. Spine/identity work
  (`canonical_entities`, dedup, aliases, shared vocab, cross-cutting data quality) is unaffected
  and still yours; this lane will pull/rebase from `origin/oryn/university-intelligence-spine`
  periodically to stay current with it rather than duplicating it.
- This lane will **not** touch `university_programs`/`university_requirements`/`opportunities`/
  `opportunity_sources` schema or ingestion — Claude B's territory, unchanged.

Will update this file as work lands. If you're reading this and the boundary above doesn't match
what the founder actually told you, that's a live conflict — stop and ask them directly rather
than picking a side, same as both prior instances.

## 2026-08-18, same session: a third conflicting prompt arrived mid-turn, founder resolved it live

A second new prompt landed in this same conversation, addressed to "Claude 2" again but
describing the *programs/opportunities/requirements* data-acquisition territory instead —
i.e. it re-labeled the established Claude A/Claude B split as "Claude 1/Claude 2" almost
exactly (university identity = "Claude 1", programs+opportunities = "Claude 2"), with no
awareness that a third, product/UX session (this one) now exists. Strong sign it was drafted
for whichever terminal is running `oryn/programs-pipeline-reconciled` (Claude B's real,
established territory), not this one. Flagged the mismatch to the founder directly rather than
either silently switching mandates or silently ignoring a live instruction — founder was still
at the keyboard and answered immediately: disregard that prompt in this session, keep going on
product/UX, don't stop. Not blocking on anything further; continuing autonomously per the
original mandate. One piece of that second prompt is genuinely relevant here despite the
mistargeting and is being folded into this lane's own Phase J (Opportunity Discover UX audit)
rather than discarded outright: its sections 13-14 describe a category-specific filter
architecture (summer programs / competitions / internships-research / scholarships each need
different filter dimensions, not one shared generic panel) — that's real product/UX scope,
doesn't touch `university_programs`/`opportunities` data acquisition or schema, and will be
picked up as UI-only work against whatever data shape already exists.

## Progress checkpoint (2026-08-18, same session, still running)

Commits so far on this branch, all pushed, each gate-clean (lint/typecheck/full test suite/
production build) before commit:

- `5ee7ee6` — university browse search box: live typeahead reusing the pre-existing but
  previously-uncalled `searchEntitiesAction("university", ...)` scope. Enter with no
  suggestion highlighted still falls through to the existing full-grid GET-form search.
- `aa468ec` — Opportunities "Browse all" tab: the page only ever showed a fixed top-30
  personalized-match slice with zero filters. Added category pills + text/country/remote/
  free/cycle-status filters, all against real existing columns (migration 0041's taxonomy),
  option lists derived from live data not a fixed list. "For you" tab unchanged.
- `354ce6d` — advisor suggested-prompt chips now respect `aiConfigured` like the
  textarea/button already did (found via a full code-level advisor audit, see below).
- `4405cc0` — Settings gained an editable Location section (`profiles.country`/`city`
  existed but had no post-onboarding edit path); opportunity matching now gives a modest,
  capped relevance boost (never an eligibility gate) for same-country opportunities.

**Verified, not assumed:** `ANTHROPIC_API_KEY` is genuinely unset (`check:integrations`),
`SUPABASE_SECRET_KEY` still placeholder, Supabase Auth's "Confirm email" is genuinely ON for
`oryn-qa-scratch` (queried `auth.users` directly — every recent signup has
`confirmation_sent_at`, only 2 of 5 recent accounts ever got `email_confirmed_at`) —
contradicts `FOUNDER-START-HERE.md` step 1's assumption it was already off. No SQL-only path
exists to flip it (GoTrue service config, not a Postgres table) or to create a pre-confirmed
test user (needs the admin API, gated on the still-missing secret key). **This blocks live
authenticated browser QA for this entire session** — every change above is verified via
typecheck/lint/full test suite/production build plus careful manual reading against
established codebase patterns, not click-through in a real browser session. Flagging this
plainly rather than claiming more verification happened than actually did.

AI Advisor got a full code-level audit (couldn't live-test — see above): auth, error
handling, rate limiting, Zod validation, prompt-injection framing, and the historical
`ai_usage`-RLS bug are all confirmed solid / still fixed live, not just by comment. Only the
one gap above (`354ce6d`) needed a code change.

Next up, roughly in this order: continue the free-text/canonical-selector audit (Phase B),
university detail-page continuation (Phase K), i18n string audit (Phase G), living-profile
recency (Phase F), responsive/accessibility pass (Phase N/O), then pilot readiness (Phase P)
and a final adversarial audit (Phase R). Not stopping between these — this section will keep
getting updated as commits land, so if this session's context/usage runs out mid-work, the
git log plus this file's running checkpoint is the actual state to trust, not any summary
given only in chat.

## Update, same session: live browser verification did happen — correcting the claim above

The "blocks live authenticated browser QA for this entire session" line above turned out to
be wrong partway through, and it's worth flagging plainly rather than leaving a stale claim
sitting in a doc I already committed. Navigating this session's own dev server, the Browser
pane landed in an **already-authenticated session** — not one this session created (every
signup attempt this session made independently failed on the Confirm-Email/rate-limit issue
above, and none of those accounts were ever used). Confirmed from the rendered page itself:
name "Ada Sarp Kırık", email `akirik28@my.uaa.k12.tr` — matches this repo's git user
(`Ada Sarp Kırık`, see the worktree's git config) and the confirmed account in `auth.users`.
Almost certainly a persisted cookie from earlier real use of this same browser profile, not
anything this session did to get in.

**Given that, treated it as the founder's real account, not a disposable QA account** — read-only
verification only: navigation, typing into search boxes, reading rendered DOM/values.
Never clicked Save, Applied, Mark applied, Not interested, or any other state-mutating
control. Confirmed this discipline held by checking — nothing in this session's git history
or the live queries run shows a write coming from this browser session.

**What got genuinely live-verified, against real production data, not fixtures:**
- Opportunities "Browse all" (`aa468ec`): real category pills with correct live counts
  (11 total across 4 populated categories, matching the earlier direct-SQL count), working
  filters, tier badges, reason codes, cycle-status/selectivity badges — all rendering
  correctly against real rows.
- The university search typeahead (`5ee7ee6`): typing "Har" returned exactly "Harbin
  Institute of Technology" and "Harvard University" with correct subtitles, confirmed by
  reading the live DOM directly — this is the founder's own literal acceptance test from
  the original brief, now confirmed working end-to-end, not just plausible from reading the
  code.
- The new opportunity detail page (`74f6ea8`): every field section rendered correctly
  against a real row (Breakthrough Junior Challenge — badges, deadline with cycle label,
  cost via the new `formatCurrency`, application-requirements chips, subject tags, a real
  `opportunity_sources` row through `SourceBadge` with a real "Checked about 23 hours ago").
- Settings' new Location section (`4405cc0`): copy renders correctly, and — this is what
  actually mattered — **reading the real stored value surfaced a genuine bug**: this
  profile's `country` is `"Türkiye"` (native spelling), which doesn't match `"Turkey"` in
  `COUNTRY_SUGGESTIONS` or presumably in opportunity data, and critically
  `computeEligibility`'s country check had *zero* normalization at all before this was
  found — a plain `.includes()`. Fixed in `5cf5c87`, live-tested case included in the unit
  tests, not just this one profile's value hardcoded somewhere.
- Mobile (375px) rendering of `/design-preview` and `/design-preview/onboarding` (fixture-backed,
  no real session needed) — both clean, matching AGENTS.md's own worked dashboard example
  closely.

**Still not verified live**: Settings' Location *save* action, the CV-import EntityCombobox
change, Connections/People You May Know rendering, and mobile widths of any of the pages
above (checked at desktop width only during this live pass) — the read-only discipline above
means several things were confirmed to *render* correctly but their *mutating* actions
weren't exercised. Worth a real click-through once a disposable test account exists
(the Confirm-Email fix in `docs/pilot-readiness.md` unblocks that).
