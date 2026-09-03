"use client";

import { UpgradePromptOverlay } from "@/features/advisor/upgrade-prompt-overlay";

/** The one client-only piece of this preview — see the page's own header for why it's
 *  split out. Both callbacks log rather than call a real Server Action, since this route
 *  has no live session to write dismissal state against. */
export function UpgradePromptPreviewClient() {
  return (
    <UpgradePromptOverlay
      onNotNow={() => console.log("[preview] Not now clicked")}
      onSoftDismiss={() => console.log("[preview] soft dismiss (×) clicked")}
    />
  );
}
