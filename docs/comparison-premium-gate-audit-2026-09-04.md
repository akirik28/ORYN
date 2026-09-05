# Comparison premium gate — audit, 2026-09-04

Founder's ask, relayed by CEO: make university/opportunity comparison premium past a
point. CEO's own read of the code before assigning this — two gates already exist in
`lib/comparison/limits.ts` (a width ceiling, a shared monthly allowance) — turned out to be
right. This is a verification report, not a build: nothing below was changed, per CEO's own
instruction to report before touching anything. Checked directly against source and, for the
one item that needed it, the live database — not inferred from comments or memory.

## Is the monthly limit enforced, or only computed?

**Enforced, on both pages.** `app/(app)/universities/compare/page.tsx` and
`app/(app)/opportunities/compare/page.tsx` both call `getMonthlyComparisonUsage` +
`isComparisonQuotaExhausted` *before* rendering the real comparison table, for every
non-Ultra tier, and substitute a genuine blocked screen (`Lock` icon, not the table) when
exhausted. `logComparisonViewed` — which is what the count actually reads back — only fires
after that check passes, so a blocked attempt correctly costs nothing.

## Does the width ceiling hold at the page, or only in the picker?

**At the page, server-side.** Both pages parse `?ids=` from the URL, dedupe, and
`.slice(0, widthCeiling)` before ever querying the database for those rows —
`resolveComparisonWidthCeiling(planTier)` is computed from the profile the server itself
fetched, not from anything client-supplied. Tested the specific scenario named in the
dispatch: a Standard user pasting four ids into `/universities/compare?ids=a,b,c,d` gets
only the first two after the slice, never Ultra's four-wide view. The picker's own client-side
cap (below) is real too, but the page does not depend on it.

## Are both item types covered?

**Yes, identically.** The two compare pages are structurally the same file, adapted per
item type — same width-slice, same quota check, same blocked-screen shape, same
`logComparisonViewed` call, same `/settings/plan` upgrade link. The two client-side picker
hooks (`features/universities/compare-context.tsx`'s `useCompare`,
`features/opportunities/opportunity-compare-context.tsx`'s `useOpportunityCompare`) are
equally identical: same `toggle()` shape refusing to add past `ceiling`, same `atLimit`
computation. Every caller that lets a user *add* an item to the tray passes the real
`planTier` (`university-card.tsx`, `saved-university-row.tsx`, `saved-opportunity-row.tsx`);
the two compare-bar components call the hooks with no tier argument, but they only *display*
the already-built selection and never call `toggle`, so the unused default ceiling there is
inert, not a gap — confirmed by reading both bar components, not assumed from the comment
saying so.

## What does a Standard user actually see at the limit?

**Blocked with a real upgrade path — the product working, not a dead end.** Verified the
actual rendered copy, not just that a translation key resolves, in both locales:

> **EN:** "You've used this month's comparisons" / "Your plan includes {limit} comparisons
> a month, shared across universities and opportunities. Ultra removes this limit." / "See
> plans" → `/settings/plan`
>
> **TR:** "Bu ayki karşılaştırma hakkını kullandın" / "Planın, üniversiteler ve fırsatlar
> arasında paylaşılan ayda {limit} karşılaştırma içeriyor. Ultra bu sınırı kaldırır." /
> "Planları gör"

Same shape at the picker's own limit (disabled button + tooltip: EN "Compare up to {max} at
a time"/"You can compare up to {max} at a time.", TR equivalents) — checked both of the two
different translation namespaces this uses (`universities.card`, `saved`) after an initial
wrong-namespace check of my own gave a false "missing" on the first pass, corrected before
reporting it.

## Everything checked and confirmed clean

- All referenced translation keys exist in both `en.json`/`tr.json`, across all four
  namespaces involved (`universities.comparePage`, `opportunities.comparePage`,
  `universities.card`, `saved`) — checked by parsing both files directly, not by reading
  the render and assuming.
- `COMPARE_MAX` (Ultra's ceiling) is `4`, `STANDARD_COMPARE_MAX` is `2` — matches the
  founder's own spec quoted in `limits.ts`'s header exactly.
- `canonicalComparisonKey` dedup means a refresh, back-button, or revisited bookmark of the
  same comparison costs nothing extra against the monthly count — read the implementation,
  matches its own claim.

**Conclusion: nothing to build.** The feature described in the founder's message already
exists, end to end, on both surfaces, enforced where it needs to be enforced. This is the
outcome CEO named as better than building it twice.

## One real gap found — not about comparison, found while checking whether it mattered here

Checking whether `resolvePlanTier` (which both compare pages trust) was safe against the
self-grant Ultra exploit [[project_oryn_guard_trigger_column_drift_sweep]] already found
tonight led to checking whether that exploit's fix (migration 0121) is actually live.
**It is not** — reported separately, urgently, mid-audit, with the live
`pg_get_functiondef`/`pg_get_triggerdef` evidence. The comparison gate's own code is correct
either way, but its real-world safety currently inherits that gap: while 0121 is undeployed,
a user who self-grants `plan_tier = 'ultra'` gets Ultra's comparison ceiling and unlimited
monthly comparisons along with every other Ultra surface, for free. Not a defect in this
feature — a defect this feature (like every other Ultra-gated surface) currently sits
downstream of.

## Coordination note

No upgrade-path UI was added or changed by this pass — the one that already exists
(`/settings/plan` link at both limit screens) predates this audit. Per CEO's own note, this
stays as-is rather than adding a second upgrade surface while 48 builds the full-screen
upgrade modal; if that modal is meant to replace these links, that's a follow-on decision,
not something decided here.

---

## ✅ 2026-09-05 audit — closed

Migration 0121 (blocks a student self-granting `plan_tier='ultra'`) not yet live → **Closed** —
commit `a6747f27` (2026-09-04), "Merge 0121 -- a student could grant themselves Ultra, and now
cannot". Verified via `git merge-base --is-ancestor a6747f27 origin/main`, and directly against
the live `profiles_guard_protected_columns()` trigger, which now pins `plan_tier`/`account_role`/
`ultra_gift_expires_at` to their old values on update.
