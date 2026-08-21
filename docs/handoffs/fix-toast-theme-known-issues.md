# Handoff — Fix Toast Theme + Close Known-Issues Visual-Identity Entry

**Branch**: `oryn/fix-toast-theme-known-issues`, forked from `main` at `073ca72`.

## Why this branch exists

Assigned by the "ORYN multi-agent coordination" session as a direct follow-up to
`oryn/requirements-audit` (see `docs/research/requirements-audit/01-founder-requirements-audit.md`
and `docs/handoffs/requirements-audit.md`), which found and documented but did not fix a live bug:
`components/ui/sonner.tsx` hardcoded the Toaster to dark theme on a comment that had gone stale
when the app's actual default switched to light on 2026-08-18. This branch widens scope from that
audit's read-only mandate to fixing what it found, under the same delegated authority chain — the
founder confirmed the coordination session's authority directly in chat, later explicitly widening
it to "do whatever it says" (see the requirements-audit handoff for the exact confirmation record).

Two explicit deliverables, both completed:
1. Fix `components/ui/sonner.tsx` properly — not by swapping one hardcoded literal for another,
   but by deriving the value from the app's actual theme state.
2. Update `docs/known-issues.md` §1 to mark the visual-identity half of that entry resolved and
   dated, without deleting it or touching the still-open messaging-scope half.

## What changed

**`components/ui/sonner.tsx`**: replaced the hardcoded `theme="dark"` with a value read from
`document.documentElement.classList.contains("dark")` at render time (SSR-safe via a
`typeof document !== "undefined"` guard, defaulting to `"light"` server-side, matching the app's
actual static default). This fixes the immediate bug — toasts now correctly render light — and,
more importantly, fixes the *class* of bug: the value now derives from the same source of truth
(`globals.css`'s `.dark` ancestor class, the thing `@custom-variant dark (&:is(.dark *))` keys off)
that the rest of the app uses, rather than a second, independent literal that can silently drift
out of sync with it again. No `next-themes` reintroduced — there is still no theme toggle anywhere
in the app, so a static derivation is correct and matches `app/layout.tsx`'s own stated reasoning
for why a client-side theme-provider script isn't needed yet. If a real toggle is added later
(setting `.dark` during SSR, e.g. via a cookie-read wrapper), this component keeps working
correctly with no further change required here — that was the actual point of "follow the actual
theme," not just correcting today's value.

**`docs/known-issues.md`**: item 2 (visual identity) under "Needs founder decision" now has a
"**Resolved 2026-08-21**" paragraph directly beneath its original text, citing commit `3192962`,
`app/layout.tsx:38-51`, the requirements-audit doc that independently verified it, and this branch's
sonner.tsx fix. The original paragraph describing why it was flagged is left completely intact —
the instruction was to mark resolved, not delete, so the history of why it was ever open survives.
The closing "why this wasn't treated as blocking" paragraph was adjusted to stop describing both
items as jointly open, since only item 1 (messaging) still is; that item's text is otherwise
untouched.

## Verification performed

Full gate run in this worktree after `npm ci`:
- `npm run lint` — clean, zero issues.
- `npm run typecheck` — clean, zero errors (confirms the `ToasterProps["theme"]` derivation
  type-checks correctly against sonner's own types).
- `npm run test` — **1167 passed (1167)**, 99 test files, matching the assignment's stated test
  floor exactly. No regressions, no tests removed or skipped to force a pass.
- `npm run build` — succeeded, all 38 routes compiled (14 static, 24 dynamic), no errors.

**Not obtained**: a live browser screenshot of a toast rendering correctly. `preview_start`
repeatedly failed on a fixed port-3000 pre-flight check ("in use by 'node' (PID 22179), not a
preview server") regardless of configured target port or `autoPort`/hardcoded-flag settings tried —
the same tool limitation hit and documented in the prior `requirements-audit` branch, now confirmed
reproducible across two different worktrees/branches in the same session. Killing that PID was
again declined as a disruptive, unauthorized action against what is very likely another session's
live dev server. The fix rests on: the full gate passing (including a real typecheck against
sonner's actual prop types), the change being a small, directly-traceable DOM read with an obvious
correct/incorrect outcome, and the same reasoning already used to establish the underlying
light-theme finding in the audit this branch fixes. This is real evidence, not a substitute for
actually watching a toast render — noted transparently, as it was in the prior branch.

## State

Gate fully green (lint/typecheck/test/build). Both files changed, handoff written. Committing and
pushing next, then reporting branch/SHA/gate results back to the coordination session.
