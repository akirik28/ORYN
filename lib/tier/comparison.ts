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
interface DiffersRow {
  kind: "differs";
  id: "visualTheme" | "replyDepth";
}

interface SameByDesignRow {
  kind: "sameByDesign";
  id: "weeklyPlanFocus" | "researchIdeaFocus";
}

export type TierComparisonRow = DiffersRow | SameByDesignRow;

export const TIER_COMPARISON_ROWS: readonly TierComparisonRow[] = [
  { kind: "differs", id: "visualTheme" },
  { kind: "differs", id: "replyDepth" },
  { kind: "sameByDesign", id: "weeklyPlanFocus" },
  { kind: "sameByDesign", id: "researchIdeaFocus" },
];
