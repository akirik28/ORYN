"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { UpgradePromptOverlay } from "@/features/advisor/upgrade-prompt-overlay";
import { softDismissParentEmailPrompt, notNowParentEmailPrompt } from "@/app/(app)/dashboard/actions";
import { shouldShowParentEmailPrompt, type UpgradePromptDismissalState } from "@/lib/parent/email-prompt";

/** Matches features/advisor/advisor-chat.tsx's own UPGRADE_PROMPT_SESSION_KEY pattern and
 * reasoning verbatim — sessionStorage only ever answers "have I shown it in this browser
 * tab already," bounding how often an undismissed prompt can reappear within one sitting,
 * independent of the durable columns lib/parent/email-prompt.ts reads. */
const SESSION_KEY = "proxola:parent-email-prompt-shown";

function hasShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShownThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Nothing to recover -- worst case this reappears once more later in the same session.
  }
}

/**
 * The founder's own instruction (docs/veli-hesabi-spec-2026-09-04.md §1) — a student who
 * skipped giving a parent's email at signup gets asked again from the dashboard, not left
 * with signup as the only chance. Decided in a useEffect, not a render-time check: the
 * gating decision reads sessionStorage, which doesn't exist during SSR — computing it at
 * render time would either throw server-side or silently disagree between server and client
 * markup. Running it after mount instead means the prompt never appears in the very first
 * paint, which is the right trade for something this low-urgency (unlike a layout-affecting
 * value, one extra frame before a dismissible card fades in costs nothing).
 */
export function ParentEmailPrompt({
  hasParentInviteEmail,
  dismissalState,
}: {
  hasParentInviteEmail: boolean;
  dismissalState: UpgradePromptDismissalState;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasShownThisSession()) return;
    const shouldShow = shouldShowParentEmailPrompt({ hasParentInviteEmail, alreadyShownThisSession: false }, dismissalState);
    if (!shouldShow) return;
    markShownThisSession();
    // react-hooks/set-state-in-effect flags this by default -- correctly, for the pattern it
    // exists to catch (syncing a value INTO React state that could just be computed at render
    // time instead). This isn't that: sessionStorage doesn't exist during SSR, so computing
    // `shouldShow` at render time would either throw on the server or disagree with the
    // client's own first render before hydration completes, which is a real bug (a hydration
    // mismatch), not a lint nitpick. Starting at `false` and flipping it once, post-mount, is
    // the textbook fix for exactly this class of "value only knowable client-side" problem --
    // features/app-shell/ultra-ambient.tsx solves the adjacent case (window.matchMedia) with a
    // ref instead of state for the same reason, but that component never needs to trigger a
    // re-render off the result the way showing this overlay does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    // Deliberately only [] — this should decide once, on the dashboard's first mount, not
    // re-evaluate every time a parent server prop reference changes identity across an
    // unrelated re-render (the same "shown once, first qualifying check only" contract
    // advisor-chat.tsx's own maybeShowUpgradePrompt keeps by construction).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  function handleNotNow() {
    setVisible(false);
    void notNowParentEmailPrompt();
  }

  function handleSoftDismiss() {
    setVisible(false);
    void softDismissParentEmailPrompt();
  }

  return (
    <UpgradePromptOverlay
      namespace="dashboard.parentEmailPrompt"
      ctaHref="/settings#parent-account"
      icon={Mail}
      onNotNow={handleNotNow}
      onSoftDismiss={handleSoftDismiss}
    />
  );
}
