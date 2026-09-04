"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { MonthlyUsageMeter } from "@/features/advisor/monthly-usage-meter";
import { SessionWallDialog } from "@/features/advisor/session-wall-dialog";
import { SessionList, type SessionListItem } from "@/features/advisor/session-list";
import { createConversation, getConversationMessages } from "@/app/(app)/advisor/actions";
import type { UpgradePromptDismissalState } from "@/lib/advisor/upgrade-prompt";
import type { AdvisorMessage as AdvisorMessageRow, PlanTier } from "@/types/database";
import type { getMonthlyQuota } from "@/lib/ai/monthly-quota";

/**
 * Owns "which conversation is active" client-side so the sidebar's "New session" button
 * (docs/ozellesme-spec-2026-09-03.md §2, "yan panelde") and the chat itself can share it —
 * AdvisorChat alone has no reason to know about a control that lives outside it, and the page
 * (a Server Component) can't hold interactive state at all. Everything server-computed
 * (quota, tier, dismissal state, aiConfigured) still comes from the page as props, unchanged;
 * this component adds exactly one new piece of client state on top.
 *
 * `key={activeConversationId ?? "new"}` on AdvisorChat is what makes "start a new session"
 * correct rather than approximate: a full remount discards its internal message list, draft
 * input, and upgrade-prompt-shown state cleanly, the same reset a real navigation would give,
 * without AdvisorChat needing an imperative "clear yourself" method it doesn't otherwise need.
 */
export function AdvisorWorkspace({
  initialConversationId,
  initialMessages,
  initialConversations,
  aiConfigured,
  quotaExhausted,
  quotaResetsAt,
  tier,
  upgradePromptDismissalState,
  quota,
  budgetDegraded,
}: {
  initialConversationId: string | null;
  initialMessages: AdvisorMessageRow[];
  initialConversations: SessionListItem[];
  aiConfigured: boolean;
  quotaExhausted: boolean;
  quotaResetsAt: string;
  tier: PlanTier;
  upgradePromptDismissalState: UpgradePromptDismissalState;
  quota: Awaited<ReturnType<typeof getMonthlyQuota>>;
  budgetDegraded: boolean;
}) {
  const t = useTranslations("advisor.sessionWall");
  const tList = useTranslations("advisor.sessionList");
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  // null means "use the server-loaded initialMessages" -- distinct from [] (a real, freshly
  // created, genuinely empty conversation). Once a new session is created client-side there is
  // nothing to fetch: a brand-new conversation has no messages by construction, so this never
  // needs a round-trip back to the server for its own sake. Selecting a PAST conversation from
  // the list also lands here, via handleSelectConversation below -- its own fetch result is
  // exactly as "fresh" as a new conversation's empty array, just non-empty.
  const [freshMessages, setFreshMessages] = useState<AdvisorMessageRow[] | null>(null);
  const [sessionWallOpen, setSessionWallOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();
  // Client-owned copy, not re-derived from props every render -- both handleNewSession (an
  // optimistic prepend, before any server round trip returns) and handleConversationTitled (a
  // patch once sendAdvisorMessage reports the real derived title) mutate this directly, and
  // neither has a server-side re-render to fall back on for what the list should say right now.
  const [conversations, setConversations] = useState(initialConversations);
  const [isLoadingConversation, startLoadingConversation] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  function handleNewSession() {
    // Client-side check for immediate, correct UX -- Standard sees the wall instantly, no
    // round-trip. createConversation() is the actual enforcement regardless (its own header
    // states why); this short-circuit only saves a request for the common, expected case.
    if (tier !== "ultra") {
      setSessionWallOpen(true);
      return;
    }
    setCreateError(null);
    startCreating(async () => {
      const result = await createConversation();
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      if (result.conversationId) {
        setActiveConversationId(result.conversationId);
        setFreshMessages([]);
        // The real, topic-derived title only exists once the first message is sent
        // (lib/advisor/conversation-title.ts) -- this placeholder is what the list shows until
        // then, exactly the same string the DB's own column default already carries for this
        // row server-side, not a value invented client-side.
        setConversations((prev) => [{ id: result.conversationId!, title: tList("newConversationPlaceholder"), updatedAt: new Date().toISOString() }, ...prev]);
      }
    });
  }

  function handleSelectConversation(id: string) {
    if (id === activeConversationId) return;
    setLoadError(null);
    startLoadingConversation(async () => {
      const result = await getConversationMessages(id);
      if (result.error) {
        setLoadError(result.error);
        return;
      }
      setActiveConversationId(id);
      setFreshMessages(result.messages);
    });
  }

  // Passed to AdvisorChat, called once sendAdvisorMessage reports a conversationTitle (the
  // first message of that conversation, however it came to exist) -- keeps this list's own
  // title and ordering correct without a full page reload. Moves the conversation to the top
  // the same way a real updated_at bump would sort it server-side.
  function handleConversationTitled(id: string, title: string) {
    setConversations((prev) => {
      const rest = prev.filter((c) => c.id !== id);
      return [{ id, title, updatedAt: new Date().toISOString() }, ...rest];
    });
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="glass-card flex min-h-[34rem] flex-col rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
          <AdvisorChat
            key={activeConversationId ?? "new"}
            conversationId={activeConversationId}
            initialMessages={freshMessages ?? initialMessages}
            aiConfigured={aiConfigured}
            quotaExhausted={quotaExhausted}
            quotaResetsAt={quotaResetsAt}
            tier={tier}
            upgradePromptDismissalState={upgradePromptDismissalState}
            onConversationTitled={handleConversationTitled}
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full justify-start" onClick={handleNewSession} disabled={isCreating}>
              <Plus className="size-4" />
              {isCreating ? t("creating") : t("newSession")}
            </Button>
            {createError ? <p className="text-sm text-error">{createError}</p> : null}
          </div>
          <SessionList conversations={conversations} activeConversationId={activeConversationId} onSelect={handleSelectConversation} isLoading={isLoadingConversation} />
          {loadError ? <p className="text-sm text-error">{loadError}</p> : null}
          <MonthlyUsageMeter quota={quota} budgetDegraded={budgetDegraded} />
        </aside>
      </div>
      <SessionWallDialog open={sessionWallOpen} onOpenChange={setSessionWallOpen} />
    </>
  );
}
