/**
 * The Standard/Ultra comparison shown on the plan page — a small, explicit list, nothing
 * hardcoded into the component that renders it. Don't invent what Ultra buys: every row
 * traces to something real and current, not to a proposal.
 *
 * Populating or changing a row means editing the array below plus its catalog strings
 * (`settings.plan.comparison.<id>.*` in both `messages/en.json` and `messages/tr.json`) —
 * no change in `PlanTierView` itself, which asserts nothing the data doesn't back.
 *
 * **A discriminated union, not a flat `{ id, sameByDesign? }`** — `PlanTierView`
 * interpolates `row.id` into a dynamic next-intl key (`t(\`comparison.${row.id}.label\`)`),
 * and next-intl's generated `t()` checks that template-literal key against the real catalog
 * shape at compile time, which only works if the id stays a narrow literal union. A
 * `differs` row's catalog entry has `.standard`/`.ultra`; a `sameByDesign` row's has `.same`
 * instead — see "why sameByDesign exists at all" below.
 *
 * **2026-09-02, second pass — one correction worth recording, because it's exactly the
 * mistake this file's own history warns against.** The assignment asked to split the AI
 * row into "AI allowance" and "response quality," per this file's own earlier research doc
 * (`docs/ultra-feature-recommendation-2026-09-02.md` §A/B: a bigger shared token pool, and
 * a later Sonnet-to-Haiku degrade). **Neither shipped — the founder closed that discussion
 * the same night, before either was built.** Grepped `lib/ai/` fresh for this pass: no
 * tier-aware quota, allowance, or degrade-timing mechanism exists anywhere. Splitting the
 * row along those lines would have described a difference that doesn't exist — the same
 * failure already caught once this session in a *different* stale doc
 * (`docs/oryn-premium-karar-seti-2026-09-02.md`'s CV-reimport/outlook-range rows), just
 * this time the stale source was this file's own prior recommendation.
 *
 * What's real instead, found checking `features/advisor/response-mode-slider.tsx` and
 * `lib/ai/advisor-chat.ts` directly: a genuinely shipped, server-enforced difference — Fast
 * and Balanced replies are open to every plan; Thorough (longer, more detailed answers,
 * `THOROUGH_INSTRUCTION` appended to the system prompt) is Ultra-only, and the ceiling is
 * enforced both in the slider's own interaction (`response-mode-slider.tsx`'s `commit`) and
 * server-side in `generateAdvisorReply` — not decorative. This is one real axis, not two;
 * `replyDepth` below states it as one row rather than manufacturing a second to match the
 * assignment's literal wording. Reported the correction rather than shipping the split as
 * asked — same judgment call as declining to pad 4 proposals to 6 earlier the same night.
 *
 * **`researchIdeaFocus` added as a second `sameByDesign` row.** `lib/ai/research-
 * generator.ts:23` — `projects: z.array(ResearchProjectSchema).min(1).max(3)` — is the
 * identical failure shape as `weeklyPlanFocus`, one level down: Phase 13's own spec caps
 * project ideas at three per generation, and more ideas per generation isn't more value the
 * same way more weekly actions isn't (Phase 13.1 warns directly against generating
 * impressive-sounding, unachievable projects). Two `sameByDesign` rows instead of one
 * changes what the page argues: not "here's the one thing we didn't touch," but "this is a
 * repeated stance" — a table that says *we deliberately did not make this worse for you* is
 * a different kind of argument than an all-difference table, and it only reads as a stance,
 * not a coincidence, once it happens twice.
 *
 * **Why `sameByDesign` needs to exist as its own kind at all, not just be skipped.** A
 * comparison table's shape is itself a claim: every row invites the reader to assume
 * Standard's value is a ceiling and Ultra's is the same thing, bigger. Two independently-
 * worded `standard`/`ultra` strings that happened to match would not express a decision —
 * it would look like an oversight. A `sameByDesign` row renders as one shared value
 * spanning both columns specifically so "kept equal on purpose" is visible as a decision,
 * not an empty cell.
 *
 * `visualTheme`'s catalog copy also changed this pass, not its row shape: from a generic
 * "Premium visual theme" to naming the concrete surfaces that now exist (sidebar's own
 * animated flame gradient, the usage meter's burning fill, the advisor slider's flowing
 * Ultra mode) — describing what's actually shipped rather than gesturing at "a visual
 * treatment." No code change here; see the catalog files.
 */
/**
 * **2026-09-03, two rows added — the plan-page redesign, verified against code by oryn-a4
 * in parallel (`docs/ultra-feature-inventory-2026-09-03.md`), not re-derived from scratch
 * here.** Both trace to the Ultra tier-economics build (`lib/ai/token-limits.ts`,
 * `lib/ai/advisor-chat.ts`) that shipped the same day this file's own header above already
 * describes as *not* having happened yet ("no tier-aware quota, allowance, or degrade-timing
 * mechanism exists anywhere") — that was true when written; it stopped being true later the
 * same day, and these two rows are what changed.
 *
 * `aiAllowance` and `replyCeiling` are two different axes, confirmed by oryn-a4
 * independently rather than assumed to be one fact restated: `aiAllowance` is the whole
 * month's shared token budget (`MONTHLY_AI_TOKEN_LIMIT`, what the usage meter already
 * tracks) — exhausting it degrades every feature to a cheaper model for the rest of the
 * month. `replyCeiling` is the per-message output-token cap (`advisor-chat.ts`'s
 * `maxTokens`) — it governs whether any single reply, in any response mode, can finish
 * without truncating, independent of how much of the month's allowance is left. A student
 * could exhaust one without ever personally noticing the other.
 *
 * Both rows' `standard`/`ultra` catalog strings take ICU variables (`{limit}` /
 * `{maxTokens}`) rather than a hardcoded number, exactly like every other real figure this
 * build touched — see PlanTierView's own comment on why the values are computed
 * server-side (`app/(app)/settings/plan/page.tsx`) from the same constants that actually
 * enforce them, not retyped here or in messages/*.json.
 *
 * Deliberately NOT added: the underlying dollar figures (`MONTHLY_BUDGET_TARGET_USD`/
 * `_CEILING_USD`) — oryn-a4's own explicit call: those are the backend mechanism
 * `aiAllowance`'s token number is the honest student-facing translation of; a second row
 * showing the dollar ceiling would read as a second feature when it's the same one fact
 * shown twice.
 */
/**
 * **2026-09-04, two more rows added — founder, after `docs/comparison-premium-gate-audit-
 * 2026-09-04.md` (CEO dispatch) confirmed the gating was already fully built and enforced:
 * "bunu premium özelliklere eklesene" (add this to the premium features [list]).**
 * `lib/comparison/limits.ts`'s width cap and monthly frequency cap were real and live —
 * this page just never said so. A student reading this table learned about four Ultra
 * advantages and never learned about two more they already had.
 *
 * `comparisonWidth` and `comparisonQuota` are two axes, not one, same shape as
 * `aiAllowance`/`replyCeiling` above — `lib/comparison/limits.ts`'s own header calls them
 * out explicitly as "two independent limits, a width cap and a frequency cap":
 * `comparisonWidth` is how many items go into one comparison at once
 * (`resolveComparisonWidthCeiling`, 2 vs 4); `comparisonQuota` is how many comparisons a
 * student can open in a month (`MONTHLY_COMPARISON_LIMIT`, 5 vs unlimited). A student could
 * be well under one limit and blocked by the other.
 *
 * **"Unlimited" for Ultra's monthly count — verified directly against the enforcement
 * code before writing it, not repeated from the dispatch that reported it, since it's the
 * strongest claim these two rows make.** `isComparisonQuotaExhausted` (`lib/comparison/
 * limits.ts`) returns `false` for `planTier === "ultra"` before it looks at usage at all,
 * and both compare pages (`app/(app)/universities/compare/page.tsx`,
 * `.../opportunities/compare/page.tsx`) only fetch usage inside `if (planTier !== "ultra")`
 * in the first place — an Ultra account never reads its own usage count for gating, not
 * "a ceiling high enough not to bite."
 *
 * **One shared pool across universities and opportunities, not five each** —
 * `lib/comparison/limits.ts`'s header quotes the founder directly on this ("2 tane
 * opportunity veya üniyi ayda 5 kere karşılaştırabil" reads as one number, not two pools),
 * and `getMonthlyComparisonUsage` counts `product_events` rows by user and event name only,
 * never filtered by item type. `comparisonQuota`'s catalog string says so explicitly rather
 * than leaving it to be discovered the first time someone hits the limit after two
 * university comparisons and assumes the feature is broken.
 *
 * **`comparisonQuota` is in the marquee (`ultra-feature-marquee.tsx`) above; `comparisonWidth`
 * deliberately is not — a judgment call, reported rather than defaulted.** The marquee runs
 * a fixed 32s loop (`plan-marquee-scroll`, app/globals.css) regardless of card count, so
 * more cards means faster apparent scroll speed, not a longer loop: going from today's 4
 * cards to 6 would speed the pass by roughly 50%. "Unlimited" is a single strong,
 * instantly-readable claim — the same shape as the marquee's two existing numeric stat
 * cards, which already get the large-stat visual treatment. "Compare up to 4 instead of 2"
 * is real and fully stated below, but it takes a beat to read two numbers and compare them,
 * which the static table (read at the reader's own pace) suits better than a 32s scroll.
 * Flagging this judgment call explicitly rather than silently including or excluding either
 * row, in case the founder or CEO would rather include both or neither.
 */
// Exported so plan-tier-view.tsx's CARD_ICONS (which needs an icon for every table row,
// unlike ultra-feature-marquee.tsx's UltraFeatureCardData["id"], which deliberately covers
// only the narrower marquee-eligible subset) can key off this type directly.
export interface DiffersRow {
  kind: "differs";
  id: "visualTheme" | "replyDepth" | "aiAllowance" | "replyCeiling" | "comparisonWidth" | "comparisonQuota";
}

interface SameByDesignRow {
  kind: "sameByDesign";
  id: "weeklyPlanFocus" | "researchIdeaFocus";
}

export type TierComparisonRow = DiffersRow | SameByDesignRow;

export const TIER_COMPARISON_ROWS: readonly TierComparisonRow[] = [
  { kind: "differs", id: "aiAllowance" },
  { kind: "differs", id: "replyCeiling" },
  { kind: "differs", id: "replyDepth" },
  { kind: "differs", id: "visualTheme" },
  { kind: "differs", id: "comparisonWidth" },
  { kind: "differs", id: "comparisonQuota" },
  { kind: "sameByDesign", id: "weeklyPlanFocus" },
  { kind: "sameByDesign", id: "researchIdeaFocus" },
];
