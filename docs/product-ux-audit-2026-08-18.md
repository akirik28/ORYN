# Final product/UX audit — 2026-08-18 (Claude 2 session)

Five-perspective audit per this session's own operating brief, done at the end of a pass
that shipped 13 commits (see `docs/handoffs/claude2-product-ux.md` for the full list).
Honest findings — including where this session's own work has a real, unresolved gap —
not a self-congratulatory summary.

## Product: does Oryn clearly answer "What should I do next?"

**Yes, on the fixture/demo path** — `/design-preview` renders the dashboard almost verbatim
against AGENTS.md's own worked "Key User Experience" example (Career Profile 77, "Biggest
gap: Research", the exact 3-item weekly focus, the exact "don't start another
entrepreneurship club" callout, the exact Bocconi/LSE/Erasmus outlook trio) — visually
confirmed this session at both desktop and mobile widths.

**Real, unresolved risk: the live experience won't match that demo yet.** The opportunity
catalog is 11 rows (verified this session), 4 of 12 categories, almost entirely US-based.
A real pilot tester's "Opportunities" section and weekly plan will look much sparser than
the fixture. Not a bug — an honest data-maturity gap — but worth the founder calibrating
pilot-tester expectations before day one, not discovering it live. `docs/pilot-readiness.md`
covers this in detail.

## UX: can a first-time 16-year-old understand it without instruction?

Strong hierarchy and calm visual language throughout, confirmed at both desktop and mobile
(375px) on every surface this session could reach without auth. Canonical-suggestion
coverage is now real and broad (country, school, skill, sport, award level, research field,
cause area, university search) — meaningfully reduces the "what exactly am I supposed to
type here" friction a first-time user hits on an unfamiliar form.

**One deliberate friction point worth the founder knowing is real, not free**: Connections
has no open people-search by design (`docs/product-decisions.md`'s minor-safety reasoning,
reaffirmed this session rather than overridden) — a first-time user who expects to search
for a specific classmate by name won't find that option. The trade was made correctly for
minor-safety reasons; it's still a real discoverability cost worth watching in pilot task 8.

**Not verified this session**: live mobile rendering of the actual authenticated pages this
session built or touched (Opportunities Browse, Settings Location, the onboarding CV-import
EntityCombobox change, University detail's new stat cards) — blocked by the Confirm-Email
issue documented below and in `docs/pilot-readiness.md`. Verified instead via
typecheck/lint/full test suite/production build plus the fixture-rendered equivalents where
one existed. Say so plainly rather than implying more coverage than actually happened.

## AI: are recommendations actually personalized?

Yes, confirmed by a full code-level audit this session (not just reading a comment): the
advisor's context assembler pulls only first-party structured data, every AI call that
writes structured state is Zod-validated with a retry, prompt-injection framing exists on
every call that ingests raw scraped web text, the rate limiter is enforced before the
Anthropic call (not after), and the historical `ai_usage`-RLS silent-failure bug is
confirmed still fixed (re-verified live per `SECURITY.md`, not just present in a comment).
Opportunity matching is genuinely deterministic and per-student (relevance from real
interest overlap, profile-need from real weakest-dimension lookup, and — new this
session — a real, capped, country-based proximity boost, never a fabricated one).

**Hard blocker, not a quality issue**: `ANTHROPIC_API_KEY` is unset. Every one of the above
guarantees is real but literally undemonstrable to a pilot tester until the founder adds a
key — pilot task 10 will show "not configured" for 100% of testers otherwise.

## Data: can important claims be traced to sources?

Yes — `SourceBadge`/`university_sources`/`opportunity_sources` are wired into the actual UI
(confirmed on the university detail page: sources list with retrieval dates), and the
verification/freshness taxonomy (`cycle_status`, `selectivity_tier`, `verification_state`)
from migration 0041 is both real and now genuinely surfaced in two places instead of one —
the existing opportunity card, and this session's new Browse-mode filters and facets, which
are explicitly built only against columns that exist and are populated (no filter control
for a founder-spec dimension the schema doesn't have data for yet, e.g. "residential"/"team
size" — documented as a real, separate future item in this session's own commits rather than
faked).

**Fixed this session, real risk until now**: student `country` and opportunity
`eligibleCountries` were compared with exact string equality while `country` was a free-text
field — "USA" vs "United States" would silently and incorrectly fail eligibility matching.
Now a controlled vocabulary (still overridable, never a hard-rejecting dropdown). The
onboarding CV-import path also went from persisting raw, unlinked organization/school
strings to resolving them through the same canonical registry the manual profile forms
already required — closing what the audit that found it called "the single largest source
of duplicate organization rows."

## Trust: does the app avoid fake admissions precision and invented opportunities?

Yes, on every path checked this session. Admission outlook shows a range plus a confidence
label plus an explicit "not a guarantee" line (verified reading the actual JSX, not just the
type). `computeEligibility` never disqualifies on an unknown attribute — a missing student
country simply isn't evaluated, rather than defaulting either direction. This session's new
Browse-mode surfaces ineligible opportunities rather than hiding them, but with a plain
"Not eligible" flag and the real `eligibility_notes` — the AGENTS.md-correct move (a Discover
surface shouldn't silently narrow what's visible) without pretending eligibility isn't real.

## Consolidated founder action items (all detailed in `docs/pilot-readiness.md`)

1. Turn off Supabase Auth "Confirm email" for `oryn-qa-scratch` — genuinely still on,
   verified by querying `auth.users` directly, not assumed from `FOUNDER-START-HERE.md`.
2. Add `ANTHROPIC_API_KEY` — blocks pilot task 10 entirely otherwise.
3. Calibrate pilot-tester expectations for the Opportunities section given the current
   11-row catalog, or seed a handful more before pilot day.

## What this session did not get to

- Opportunities: no detail page (cards still link straight to `official_url`); no dedicated
  mobile filter sheet (the filter bar wraps responsively but isn't a drawer).
- Full accessibility pass (focus-trap/ARIA audit) beyond mirroring already-accessible
  existing patterns (`EntityCombobox`/`SuggestInput`'s combobox semantics) in every new
  component this session added.
- `ACTIVITY_FIELDS.organization_scope` — flagged by this session's own free-text audit as
  the weakest remaining canonicalization candidate, deliberately deprioritized.
- Live, click-through browser verification of any authenticated page — blocked all session
  by the Confirm-Email issue above; every change was still gate-verified (typecheck, lint,
  full test suite, production build) and, where a fixture existed, visually verified at
  both desktop and mobile widths.
