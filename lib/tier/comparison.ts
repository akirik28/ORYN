/**
 * The Standard/Ultra comparison shown on the plan page — a small, explicit list, nothing
 * hardcoded into the component that renders it. CEO's instruction: don't invent what Ultra
 * buys. `docs/ultra-tier-value-2026-09-02.md` (oryn-60's grounded inventory) is the source
 * for every row below; nothing here goes past what that doc confirms is true today.
 *
 * Populating or changing a row means editing the array below plus its catalog strings
 * (`settings.plan.comparison.<id>.*` in both `messages/en.json` and `messages/tr.json`) —
 * no change in `PlanTierView` itself, which asserts nothing the data doesn't back.
 *
 * **A discriminated union, not a flat `{ id, sameByDesign? }` — the first draft of this
 * file used the flatter shape and it didn't typecheck.** `PlanTierView` interpolates
 * `row.id` into a dynamic next-intl key (`t(\`comparison.${row.id}.label\`)`), and
 * next-intl's generated `t()` checks that template-literal key against the real catalog
 * shape at compile time — the same discipline the codebase's other dynamic-key call sites
 * (features-view.tsx's `FeatureKey`, journey-timeline.tsx's entry `kind`) already rely on,
 * which only works if the id stays a narrow literal union, not `string`. A `differs` row's
 * catalog entry has `.standard`/`.ultra`; a `sameByDesign` row's has `.same` instead — a
 * plain boolean flag can't make TypeScript narrow *which* suffixes are valid for *which*
 * ids, so `weeklyPlanFocus` (no `.standard`/`.ultra` in the catalog) and `visualTheme`/
 * `advisorAllowance` (no `.same`) each failed to typecheck against the other's shape until
 * the kind itself became the discriminant.
 *
 * **Why `sameByDesign` needs to exist as its own kind at all, not just be skipped.** A
 * comparison table's shape is itself a claim: every row invites the reader to assume
 * Standard's value is a ceiling and Ultra's is the same thing, bigger. True for
 * `advisorAllowance`, false for `weeklyPlanFocus` — the research doc is explicit that the
 * weekly plan's 3-action cap is a *Zod-validated design ceiling*
 * (`lib/ai/weekly-plan.ts`'s `WeeklyActionSchema` array, `.max(3)`), not a cost artifact,
 * and refuses to treat it as a lever: "selling ten priorities instead of three sells the
 * opposite of what this product is for." Two independently-worded `standard`/`ultra`
 * strings that merely happened to match would not express that decision — it would look
 * like an oversight. A `sameByDesign` row renders as one shared value spanning both
 * columns specifically so "kept equal on purpose" is visible as a decision.
 *
 * Two `differs` rows are the honest ceiling as of this research pass
 * (`docs/ultra-tier-value-2026-09-02.md`'s own closing line: "a visual treatment and a
 * bigger advisor allowance today"). Deliberately no numbers in either row's catalog copy —
 * the doc flags the one concrete figure it found (~19 messages before the spend-based
 * model-quality degrade, since independently confirmed, since re-derived as ~79,000 tokens
 * under the 2026-09-02 token-display change, same underlying dollar figure throughout) as a
 * fact worth citing carefully, and the shared 236,150-token monthly allowance, while
 * directly read from `MONTHLY_AI_TOKEN_LIMIT` (lib/ai/monthly-quota.ts, no longer a
 * per-feature `MONTHLY_AI_QUOTAS` lookup or a message count at all — see that file), is a
 * product-copy call (whether to publish the literal number) this file doesn't make
 * unilaterally. A short list is an honest list, not a broken page — `PlanTierView` renders
 * however many rows exist, with no special-casing for "not enough content yet."
 */
interface DiffersRow {
  kind: "differs";
  id: "visualTheme" | "advisorAllowance";
}

interface SameByDesignRow {
  kind: "sameByDesign";
  id: "weeklyPlanFocus";
}

export type TierComparisonRow = DiffersRow | SameByDesignRow;

export const TIER_COMPARISON_ROWS: readonly TierComparisonRow[] = [
  { kind: "differs", id: "visualTheme" },
  { kind: "differs", id: "advisorAllowance" },
  { kind: "sameByDesign", id: "weeklyPlanFocus" },
];
