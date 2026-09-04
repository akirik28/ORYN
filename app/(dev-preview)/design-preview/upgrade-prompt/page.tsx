import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdvisorMessage } from "@/components/proxola/advisor-message";
import { UpgradePromptPreviewClient, ParentUpgradePromptPreviewClient, UpgradeInterstitialPreviewClient } from "./upgrade-prompt-preview-client";

/**
 * Dedicated preview for the rebuilt upgrade prompt (2026-09-03, founder-directed restyle —
 * see upgrade-prompt-overlay.tsx's own header for the full reasoning). Renders it nested
 * inside a real `AdvisorMessage`, matching features/advisor/advisor-chat.tsx's own call
 * site exactly (degrade note + overlay as the message's trailing children), so the
 * "anchored to the reply, not floating over it" claim is checkable by eye here, not just
 * asserted in a comment. No Supabase/session needed -- both the message content and the
 * two callbacks (in the client child below) are fixtures.
 *
 * Not wrapped in PreviewShell/UltraAmbient: this component's one real audience is a
 * Standard-tier viewer (shouldShowUpgradePrompt's own tier gate), and its flame styling is
 * self-contained via its own local `data-tier="ultra"` wrapper -- rendering it against a
 * plain page background is closer to its actual context than an Ultra-ambient shell would
 * be, and confirms the local scope alone is enough to make it render correctly with no
 * page-level tier setup at all.
 *
 * A plain Server Component (matching every other design-preview page's own convention),
 * not "use client" -- the two console.log callbacks are the only client-only piece, split
 * into upgrade-prompt-preview-client.tsx for exactly that reason, same "page reads
 * translations server-side, hands fixtures to a client leaf" split every other preview
 * page here already uses.
 */
export default async function UpgradePromptPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const t = await getTranslations("advisor.chat");

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-8">
      <div>
        <h1 className="font-display text-2xl">Upgrade prompt — rebuilt</h1>
        <p className="mt-2 text-sm text-ink-3">
          Nested inside a real AdvisorMessage, exactly as it renders in the live advisor chat. Click either button — both log to the console instead of
          hitting a real Server Action.
        </p>
      </div>

      <AdvisorMessage meta={t("degradeNote.label")}>
        <p>
          Research is your clearest gap right now — 42 against a profile otherwise in the 70s. One focused project this month would move it more than a
          third leadership role would move anything else.
        </p>
        <p className="mt-4 border-t border-border pt-3 text-sm text-ink-3">{t("degradeNote.detail")}</p>
        <UpgradePromptPreviewClient />
      </AdvisorMessage>

      <div>
        <h1 className="font-display text-2xl">Upgrade prompt — parent variant (P7)</h1>
        <p className="mt-2 text-sm text-ink-3">
          Same component, `namespace=&quot;parent.upgradePrompt&quot;`. No real parent panel exists yet (P3), so this renders plain rather than nested
          inside a caller that doesn&apos;t exist — the point here is the copy and the card shape, not the surrounding chrome.
        </p>
      </div>
      <ParentUpgradePromptPreviewClient />

      <div>
        <h1 className="font-display text-2xl">Full-screen upgrade interstitial (2026-09-04)</h1>
        <p className="mt-2 text-sm text-ink-3">
          Founder-directed: full-screen, X top-right, first session then periodically. Opened by button here since the real trigger is
          session/dismissal-state-driven. Try all three checkout states.
        </p>
      </div>
      <UpgradeInterstitialPreviewClient />
    </div>
  );
}
