/**
 * Pure calendar-month boundary math, deliberately isolated from lib/ai/monthly-quota.ts
 * (2026-09-02): that file opens with `import "server-only"` and touches Supabase, so
 * anything importing from it -- even just these two functions -- pulls the whole
 * server-only chain into any bundle that imports it. lib/advisor/upgrade-prompt.ts needs
 * these from a Client Component (features/advisor/advisor-chat.tsx imports it directly),
 * which is what `next build`'s "Client Component SSR" check correctly refused when these
 * still lived there. No Supabase, no "server-only" here -- safe from both sides.
 *
 * monthly-quota.ts's own AI-allowance reset and upgrade-prompt.ts's "rest of the billing
 * month" suppression window both key off the exact same boundary on purpose, so it exists
 * exactly once rather than as two independently-written definitions that could drift.
 */

export function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function startOfNextMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
