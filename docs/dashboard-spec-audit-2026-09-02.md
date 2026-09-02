# Dashboard spec audit — 2026-09-02

A product read, not a code audit: does `app/(app)/dashboard/page.tsx` still match AGENTS.md's
Phase 7 (Profile Dashboard) shape, given how much has landed on this screen since that spec
was written — Counselor Core's three-state hero, the deterministic weekly-plan fallback, the
opportunity-recommendability gates. Checked item by item against Phase 7's block list, Phase
79's audit questions, and the Phase 16/AGENTS.md non-negotiable against implied admissions
probability. Read the real page and view component, then confirmed the live render through
`/design-preview/dashboard` (no credentials needed).

**Verdict: matches, and reads well.** One real bug found and fixed along the way — in the
preview harness itself, not the product. One deliberate, tested, and correct divergence from
the spec's literal Block 1 text, called out below because the audit asked for an item-by-item
check, not because it needs fixing.

## Item by item against Phase 7

| Spec block | Current dashboard | Match |
|---|---|---|
| Header: greeting + "here's what matters" | `{greeting}, {displayName}.` + a three-state hero (see below) | Yes, in spirit — see note |
| Block 1: Career Profile score + trend | Replaced by a qualitative per-dimension read | **Deliberate divergence — see below** |
| Block 2: exactly 3 highest-impact actions | `WeeklyFocus` (AI plan) / `CounselorWeekFallback` (deterministic fallback) | Yes, verified both paths |
| Block 3: Biggest Gap + why + CTA | Hero's `claimable` state: names the gap, explains why, two CTAs | Yes, minus the raw score number |
| Block 4: Opportunities preview | 2-item preview, gated on verification + eligibility + no pay-to-enroll | Yes |
| Block 5: University Outlook | Up to 3 target universities, qualitative outlook badges | Yes |
| Never >20 widgets | Two-column layout, ~6 sections total | Yes |
| Never imply admissions probability | Checked directly — see below | Yes |

### The header subtitle

The spec's literal "Here is what matters most right now" doesn't appear anywhere — it's been
superseded by `computeDashboardHeroState`'s three-state system
([lib/scoring/dashboard-hero.ts](../lib/scoring/dashboard-hero.ts)): `claimable` (names a
specific gap), `rich_unclaimable` (real signal, but no single dimension stands out enough to
name — added 2026-08-24 after a live bug where a rich profile with an unassessed weakest
dimension got the same "nothing recorded" copy as a genuinely empty one), and `empty` (new
account). This is a strict improvement on the spec's mockup: the spec's own example text was
never meant as literal copy, and the three-state version is more honest than any single fixed
sentence could be about a profile Oryn sometimes can't confidently rank.

### Block 1 — the missing score, on purpose

The spec's example shows `Career Profile / 77 / +3 this month`. That number does not appear
anywhere on the current dashboard, and this is **intentional, not missed**:
[`__tests__/ui/no-aggregate-score.test.ts`](../__tests__/ui/no-aggregate-score.test.ts) is a
source-level regression guard, present specifically to keep it from coming back, across three
surfaces at once (Home, the account menu, Progress). The aggregate (`profile_strength_score`,
a mean of nine dimensions) is still computed and stored — ranking, snapshots, and trend logic
all still read it — it's specifically the *rendering* of it to a student that was removed.

[lib/scoring/change.ts](../lib/scoring/change.ts)'s own header comment gives the reasoning:
*"A student cannot act on a mean of nine dimensions: it moves for reasons that are invisible
in it, and two very different months produce the same number."* In its place, Home shows which
specific dimensions moved (`describeProfileChange` — "Research is the area that moved most
since your last review") and the hero names the single weakest one with a plain-language
reason. This is a real divergence from the spec's literal block shape, made with more
information than the original spec had (a documented live incident, a regression test to hold
the line), and it fulfills the spec's *actual* non-negotiable #11 ("career profile score is
different from admissions probability") better than a bare number would. Reporting it because
the audit asked for an item-by-item check, not because it's a defect — reversing it would mean
arguing with a decision that already has a named incident and a test behind it.

## "Exactly 3 actions" — verified both paths, still holds

Two independent code paths feed "This week," and both cap at 3:

- **AI path** ([lib/ai/weekly-plan.ts:31](../lib/ai/weekly-plan.ts#L31)): the Zod schema is
  `actions: z.array(WeeklyActionSchema).min(1).max(3)` — enforced at the AI-output-validation
  boundary, per AGENTS.md Phase 26.
- **Deterministic fallback path** (used whenever the AI plan is empty/unavailable —
  `CounselorWeekFallback`, rendering Counselor Core's own ranked candidates): neither this
  component nor `dashboard-contract.ts`'s `thisWeekActions` filter caps the list itself: they
  trust an upstream invariant. Traced it to
  [lib/counselor/scoring.ts:208](../lib/counselor/scoring.ts#L208), which stops classifying
  candidates as `"do"` once `doSlotsUsed` reaches
  [`RANKING_THRESHOLDS.doSlots = 3`](../lib/counselor/config.ts#L66). Confirmed by reading the
  actual gating code, not just the comment claiming it.

`WeeklyFocus` (the AI-plan renderer) additionally shows a second, separate "Completed this
week" section for actions carried forward across a plan regeneration — a 2026-09-01 CEO call
(founder-blocked-backlog item 39) that what's already done this week is worth keeping visible.
This doesn't compete with the active three's slots or numbering, so it doesn't reopen the
"maximum three" question — it's additive, and read-only.

## The 10-second test (Phase 79)

Landing on `/design-preview/dashboard` cold: the hero is the only thing above the fold with
real weight. It states a plain-language headline ("Your clearest gap right now is research"),
one sentence of *why* Oryn is confident enough to say that ("this is the area with the least
supporting evidence — so it's where the same hours of work change your profile most"), a
two-number evidence disclosure (areas assessed / already strong), and two buttons: "Build a
plan for this" (primary) and "See the full picture" (secondary). A first-time reader gets one
clear directive, not a wall of metrics — this reads as a strong pass. Visually: one restrained
dark-gradient hero card against generous whitespace, glass-panel sections below it, a single
accent color plus semantic tone for warn/success badges — matches Phase 13's "calm, not
rainbow-dashboard" brief.

## Admissions-probability check

Checked every number-shaped or badge-shaped element for leakage:

- **University Outlook badges** ([features/universities/outlook-badge.tsx](../features/universities/outlook-badge.tsx)):
  render only qualitative labels (`Reach`, `Competitive`, `Strong`, `Likely`, `Extreme Reach`,
  `Not yet assessed`, plus three distinct `not_applicable` reasons) — never a percentage or a
  number. The component's own comment names the constraint explicitly ("`reach/competitive`
  isn't a guarantee").
- **Opportunity match percentages** (`91% match`): this is *opportunity*-match relevance, not
  admissions probability — the spec's own Phase 12 example shows exactly this ("Match: 94%").
  Not a violation.
- **Profile dimension scores** (Leadership 91, Research 42, etc.): explicitly Oryn's own
  development metric, never framed as a chance of admission anywhere on this page.

No admissions-probability leakage found.

## Bug found and fixed: preview harness locale inconsistency

While viewing the live preview, the page rendered in **two locales at once** — an English
hero next to Turkish section headers ("Bu haftaki odağın", "YAKLAŞAN", "%91 eşleşme"). Root
cause: `DashboardView` resolves locale two different ways that happen to always agree in
production but not in this preview.

- The hero and its qualitative copy follow the explicit `locale` prop (defaults to `"en"` if
  the caller passes none).
- Everything reading from the `dashboard` message catalog used
  `getTranslations("dashboard")` — the bare-namespace form, which re-resolves locale from
  request context (cookie / `Accept-Language`) independently of that prop.

On the real page these can never disagree: `app/(app)/dashboard/page.tsx` computes
`locale = await resolveLocale()` once (`cache()`d) and both the explicit prop *and*
`getTranslations`'s own internal call to the same `resolveLocale()` land on the identical
value within one request. The preview page has no such request to resolve from and was
passing no `locale` prop at all — so it silently inherited whatever this browser session's
persisted locale cookie happened to be (Turkish, in this environment), while the
hard-coded-English hero stayed English regardless. Two fixes, both contained to files this
audit was already touching:

1. [`design-preview/dashboard/page.tsx`](../app/(dev-preview)/design-preview/dashboard/page.tsx):
   now passes `locale="en"` explicitly, matching its already-hardcoded `greeting="Good evening"`.
2. [`dashboard-view.tsx`](../features/dashboard/dashboard-view.tsx): now calls
   `getTranslations({ locale, namespace: "dashboard" })` instead of the bare-namespace form —
   the same explicit-locale pattern already used in `lib/plan/persist.ts` and
   `lib/opportunities/persist-matches.ts` for exactly this reason (a caller that needs a
   locale pinned regardless of request context). Zero behavior change on the real page (proven
   above — both forms already resolved identically there); it only changes what a
   locale-pinning caller like the preview page gets.

**Known residual, not fixed**: one `DeadlineBadge` inside `WeeklyFocus`'s client-side
`ActionRow` still showed "6 gün kaldı" after both fixes, and the shared shell chrome
(`Sidebar`/`Topbar`, outside `DashboardView` entirely) renders Turkish nav labels in this same
session. Both read locale via `useLocale()` from the root `NextIntlClientProvider` — a third,
client-side-only resolution mechanism that traces back to the same persisted cookie, one level
above anything `DashboardView` or its preview page controls. Confirmed this is a pre-existing
environment artifact (a cookie left over from earlier Turkish-locale testing in this same
session/fleet — see `reference_oryn_dev_environment_quirks.md`), not a page-specific bug: it
affects every preview page's shell chrome identically, not just this one. Fixing it properly
means either threading `locale` explicitly down through `WeeklyFocus` → `ActionCard` →
`DeadlineBadge`, or pinning the root layout's `NextIntlClientProvider` locale for the preview
route group — both larger and less contained than what this task's "fix only what's
unambiguous" scope covers. Flagging for whoever next needs a fully locale-pinned preview
render, not fixing today.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3377/3377, 237 files) all pass
against both changed files.
