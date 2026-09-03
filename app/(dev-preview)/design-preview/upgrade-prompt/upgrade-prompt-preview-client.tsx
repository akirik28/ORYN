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

/** P7's variant of the same component (docs/veli-hesabi-spec-2026-09-04.md §6) — same
 *  shell, `namespace="parent.upgradePrompt"` is the only difference from the client above.
 *  No parent panel exists yet to nest this inside (P3), so the page below renders it plain
 *  rather than inside a caller that doesn't exist. */
export function ParentUpgradePromptPreviewClient() {
  return (
    <UpgradePromptOverlay
      namespace="parent.upgradePrompt"
      onNotNow={() => console.log("[preview] parent: Not now clicked")}
      onSoftDismiss={() => console.log("[preview] parent: soft dismiss (×) clicked")}
    />
  );
}
