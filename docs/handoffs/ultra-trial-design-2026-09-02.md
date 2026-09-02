# Ultra trial — design, not built — 2026-09-02

Founder wants a trial: first week free for anyone who provides a card, cancelable, once per
person. CEO's explicit boundary: no payments integration exists and building one is out of
scope — design around the card, not through it. Report the design, don't build it. Read-only
on live. Full report: `docs/ultra-trial-design-2026-09-02.md`.

## Headline, by CEO's five points

1. **`plan_tier` stays two values.** A third `'trial'` value would touch ~20 files that read
   `PlanTier` today for no product benefit — a trial should look exactly like real Ultra, not
   a third skin. Instead: two new nullable `profiles` columns (`trial_started_at`,
   `trial_ends_at`, written once, never cleared) plus a new `resolveEffectiveTier()` that
   wraps today's `resolvePlanTier` and still returns plain `'standard'|'ultra'` — every
   existing call site needs one mechanical swap, nothing else changes.
2. **Once per person, argued precisely, boundary included.** The same-account check
   (`trial_started_at IS NOT NULL`) is airtight and cheap. Found a real gap while checking:
   `deleteMyAccount` hard-deletes `auth.users` (confirmed by reading the code), which frees
   the email for reuse — a naive `profiles`-only marker would let "delete and resignup" grant
   a second trial today, no new capability needed. Fix: a second, small table
   (`ultra_trial_redemptions`, keyed on normalized email) that survives account deletion by
   using `on delete set null`, not `cascade` — flagged as the one detail that would silently
   defeat the whole mechanism if backwards. Stated plainly where this still doesn't reach: a
   genuinely different email defeats both checks, and the only real fix (payment-instrument
   fingerprinting) needs the payment provider — also flagged that device/IP fingerprinting as
   an alternative sits uncomfortably against this being a product for 14-18-year-olds.
3. **Read-time evaluation confirmed, not just asserted.** Matched against
   `isOpportunityActionable` — a real, already-live access gate in this codebase computed
   fresh from stored facts against a `referenceDate` parameter on every call, no job anywhere.
   Same shape proposed for `resolveEffectiveTier`; the reasoning holds because it's the same
   mechanism, not a similar-sounding one.
4. **Day 6/8, grounded in what Ultra actually is.** `lib/tier/comparison.ts` is the real
   source: two things differ (visual skin, advisor token allowance), one deliberately doesn't
   (weekly plan's 3-action cap). Day 8 needs no revoke step anywhere — `resolveEffectiveTier`
   just answers differently on the next request. For the mid-conversation case CEO named
   specifically: nothing aborts an in-flight response; the next message runs under Standard's
   allowance, composing with the monthly-quota system's existing Sonnet→Haiku graceful
   degrade (confirmed by reading `lib/ai/monthly-quota.ts`) rather than needing a second,
   trial-specific hard stop.
5. **The boundary, written down as its own section** so this can't later be read as a
   finished spec: card capture, charge processing, the real conversion trigger, and true
   payment-instrument-level abuse prevention are all explicitly not designed here and need
   the payment provider first. Also stated as a deliberate, flagged assumption (not silently
   decided): cancellation doesn't need its own column or its own access-cutting logic today,
   since access is purely `trial_ends_at`-driven either way — a `trial_canceled_at` column
   would have no writer yet, the exact "exists, reads correct, never written" shape this
   session spent tonight finding elsewhere.

## Gates

Documentation only — no migration, Server Action, or UI code written, per the assignment.
`npm run typecheck` / `npm run lint` / `npm run test` — see commit. No `next build` per
current policy. No `npm ci`/`npm install` in this worktree. Zero live writes — the three
`plan_tier`/`notify_*`/`response_mode` columns were confirmed live via read-only `SELECT`
only, grounding the design in real current state without touching it.
