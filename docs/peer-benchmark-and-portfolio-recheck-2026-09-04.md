# Re-checking two prior audits — 2026-09-04

Per CEO's dispatch: not a fresh audit, a re-verification of
[docs/handoffs/peer-benchmark-assessed-filter-2026-09-02.md](handoffs/peer-benchmark-assessed-filter-2026-09-02.md)
(read first, on branch `oryn/peer-benchmark-assessed-filter-2026-09-02` — its code fix
merged to `origin/main`, the doc itself didn't carry over) and
[docs/portfolio-audit-2026-09-02.md](portfolio-audit-2026-09-02.md) (on `origin/main`
already). Look-and-report only, no code changes. Method: read the current source directly
(not memory of the old docs), re-run the same logical checks against it, confirm live where
safe, and query real production data (11 users) rather than assume today's numbers match
2026-09-02's (8 users then).

## Peer benchmark — every finding from 2026-09-02 still holds, nothing regressed

Checked each claim in the old doc against the current `lib/benchmarking/{compute,cohort,
index}.ts` and `features/profile/peer-benchmark.tsx`, line by line:

| 2026-09-02 finding | Still true today? |
|---|---|
| Floor gates on `peerScores.length < MIN_COHORT_SIZE` (per-dimension, not cohort headcount) | **Yes** — `evaluateBenchmarkDimension`, unchanged |
| `MIN_COHORT_SIZE = 100` | **Yes** — `lib/benchmarking/types.ts:7`, unchanged |
| Cohort of 0 → `percentile: null`, no special-casing needed | **Yes** — same general rule still covers it |
| `calculation_version` filter on both the peer-score read and the own-score read | **Yes** — present on both queries |
| `isAssessed`/`evidenceStateFor` gate excludes not_assessed/limited_evidence rows on **both** sides (peer pool in `cohort.ts`, own dimensions in `index.ts`) | **Yes** — byte-for-byte matching the documented fix, both files |
| "overall" deliberately exempt from the evidence-state filter on both sides | **Yes** — `profile_strength_score` still flows through unconditionally |
| Empty-state copy is a complete, explanatory sentence (not the old fragment) | **Yes** — confirmed in both `messages/en.json` and `messages/tr.json` |
| 12 new tests across `cohort.test.ts`/`index.test.ts` | **Yes** — files exist, same named cases still present (assessed-included, not_assessed-excluded, limited_evidence-excluded, mixed-peers, overall-unaffected, empty-cohort) |

**New since 2026-09-02, not a regression — an improvement**: `getPeerBenchmarks`
(`lib/benchmarking/index.ts`) now wraps `getCohortDimensionScores` in a try/catch. A missing
`SUPABASE_SECRET_KEY` used to throw synchronously out of `createAdminClient()` and crash the
whole Career Profile page with a 500; now it degrades into the same honest "not enough
comparable students" empty state a genuinely small cohort already shows. Found while reading
the current file, not mentioned in the old doc — someone fixed it since, correctly.

**No new leak surface**: only `app/(app)/profile/page.tsx` and `peer-benchmark.tsx` touch
this module today — the same two files the original audit covered. Nothing else (advisor
context, notifications, exports) reads `getPeerBenchmarks`.

**CEO's specific question — does the product actually say "not enough data," or does a
percentile leak somewhere — checked empirically, not just by reading the gate:**

```sql
select count(*) as total_profiles, max(cohort_size) as largest_single_cohort
from profiles group by graduation_year, curriculum;
-- total_profiles: 11. largest_single_cohort: 3.
```

11 real users, largest single (graduation_year, curriculum) cohort is 3 people. `withData`
in `PeerBenchmark` (`summary.results.filter(r => r.percentile !== null)`) is structurally
guaranteed empty at every cohort size below 100 — with the real largest cohort at 3, the
component's only reachable branch today is the honest empty state. Confirmed by tracing the
exact condition against real numbers, not inferred from "few users exist."

**Not re-verified**: the original audit's live click-through as a real QA account
(`oryn.qa.b`). No safe, unauthenticated design-preview route exists for this component
(checked — none under `app/(dev-preview)/design-preview/`), and signing into any account is
outside this pass's constraints. The source-level and query-level proof above is conclusive
on its own; this is a smaller, honestly-flagged gap, not a weakened claim.

## Portfolio — every fix from 2026-09-02 still holds; new empty-portfolio check added

| 2026-09-02 finding | Still true today? |
|---|---|
| Chronological sort: `items.sort((a,b) => (b.startDate ?? "0").localeCompare(a.startDate ?? "0"))` | **Yes** — `lib/portfolio/build.ts`, unchanged |
| "By category" filters the same already-sorted array — stays date-ordered within category | **Yes** — unchanged |
| Timeline has no category icons (named, not built — a V1 scope call) | **Still true, still not built** — no category-icon mapping exists anywhere in the codebase now either |
| `evidenceStatus` threaded through 8 of 9 tables (`null` for education) | **Yes** — every mapper in current `build.ts` unchanged |
| `evidence_status` renders via the shared `evidenceStatusPresentation` mapping, not a new one | **Yes** — `self_reported`/`null` → no badge, `evidence_added` → neutral paperclip, `verified` → success checkmark (still currently unreachable — no live row has it) |
| Public profile (`app/(app)/u/[id]/page.tsx`) inherits the evidence badge for free | **Yes** — traced the actual call chain: `getPublicPortfolio` → `buildPortfolio` → same `PortfolioItem[]` shape, nothing strips the field |
| Skills added as their own section (`getPortfolioSkills`, `PortfolioSkill`), `buildPortfolio`'s own return shape untouched | **Yes** — both still present, other two callers (`profile/cv/page.tsx`, `lib/social/public-profile.ts`) still use the unmodified return shape |
| Empty-state condition widened to `items.length === 0 && skills.length === 0` | **Yes** — unchanged |

**New since 2026-09-02, not a regression — an improvement**: `buildPortfolio` now wraps
every one of its 9 table reads in `readOr(...)` (2026-09-03, `docs/okuma-hatasi-vs-bos-sonuc-
karari-2026-09-03.md`) — a failed read for one category used to render identically to "this
student genuinely has none," now logs which category failed, by name. Doesn't change what a
student sees; closes a real observability gap the original audit's own read of this file
predates.

### CEO's new question — what does a genuinely empty portfolio show?

Not the same question the original audit answered (it verified 0-achievements-but-3-skills;
CEO is asking about 0-and-0). Checked the actual condition in `portfolio-view.tsx`:

```tsx
if (items.length === 0 && skills.length === 0) {
  return <EmptyState icon={FolderOpen} title={t("emptyTitle")} description={t("emptyDescription")}
    action={<Button ...><Link href="/profile">{t("emptyAction")}</Link></Button>} />;
}
```

Real copy, both locales: *"Your portfolio is empty — Add activities, projects, awards, or
other achievements on your Journey page — they'll show up here automatically, organized by
timeline or category."* + a working **"Go to Journey"** button, `href="/profile"`. Live-
confirmed (temporary `items={[]} skills={[]}` on the existing `/design-preview/portfolio`
route, reverted immediately after — diff confirmed net-zero): the exact same text renders,
the CTA is a real link, not a dead button.

**Grounded in real accounts, not just the fixture**: 3 of the 11 real profiles
(`Claude UI QA`, `Oryn QA Sweep`, `Persona A Test` — all pre-onboarding) currently have this
exact zero-and-zero shape and would see this exact screen. A further 7 real accounts have
achievements but zero skills (including two fully-onboarded, non-trivial profiles — Elif
Demir at 5 items, Daniel Okafor at 22) — `SkillsSection` correctly returns `null` for all of
them, so their portfolio shows only the Timeline/By-category tabs with no empty "Skills"
heading sitting above nothing.

**Where this sits against today's other two honesty checks**: the dashboard's Due Soon block
was silent before today (now fixed with a labeled group); the university detail page says
"we haven't confirmed this yet" + a source link. Portfolio's empty state is a third, distinct
shape — neither silence nor a confidence caveat, but a direct explain-and-redirect: here's
why it's empty, here's exactly where to fix that. All three are honest in their own surface's
terms; none of the three copy each other's exact pattern, and none needed to.
