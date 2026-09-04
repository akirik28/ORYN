import { notFound } from "next/navigation";
import { AdvisorWorkspace } from "@/features/advisor/advisor-workspace";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { NOT_YET_DISMISSED } from "@/lib/advisor/upgrade-prompt";
import { resolveLocale } from "@/lib/i18n/locale";
import { PreviewShell } from "../preview-shell";

/**
 * Design-preview mirror for the founder's 2026-09-04 session-list request (see
 * app/(app)/advisor/actions.ts's assertConversationLimitNotExceeded/getConversationMessages
 * and lib/advisor/conversation-title.ts for the real implementation). AdvisorWorkspace is a
 * pure client component driven entirely by props — every server-computed value the real page
 * passes it (quota, tier, dismissal state) is fixtured here instead of queried, no Supabase
 * required, the same reason the counselor preview already renders AdvisorChat standalone.
 *
 * `?empty=1` shows the list's empty state. Default shows several sessions, including one
 * still carrying the DB's generic default title (an Ultra student who clicked "New session"
 * but hasn't sent a first message yet) alongside topic-titled ones, so both states in the list
 * are visible at once rather than only the happy path. `?tier=standard` (default `ultra`)
 * demos the session-wall dialog path for the "New session" button — reopening a past
 * conversation from the list is never gated by tier either way (getConversationMessages is a
 * pure read), so the list itself renders identically regardless of this param.
 */
export default async function AdvisorSessionsPreviewPage({ searchParams }: { searchParams: Promise<{ empty?: string; tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const tier = params.tier === "standard" ? "standard" : "ultra";
  const empty = params.empty === "1";
  // Real ids, not "conv-1" etc. — getConversationMessages' own isUuidLike check would reject
  // a non-UUID shape as a malformed request rather than the more representative "not found"
  // (no real session exists in this preview, so a click can never actually succeed either way,
  // but the failure mode should look like the real one: ownership, not format).
  const CONV_NEW = "a1000000-0000-0000-0000-000000000001";
  const CONV_CLUB = "a1000000-0000-0000-0000-000000000002";
  const CONV_LIST = "a1000000-0000-0000-0000-000000000003";
  const CONV_WEAKEST = "a1000000-0000-0000-0000-000000000004";

  // Locale-accurate, not a hardcoded English string — createConversation's own insert
  // (app/(app)/advisor/actions.ts) writes `tr ? "Yeni sohbet" : "New conversation"`, so a
  // fixture claiming to show that exact row must match what a real one would actually say,
  // the same fidelity design-preview/parent-panel's own fixture holds itself to for locale-
  // resolved text.
  const locale = await resolveLocale();
  const newConversationDefaultTitle = locale === "tr" ? "Yeni sohbet" : "New conversation";

  const conversations = empty
    ? []
    : [
        { id: CONV_NEW, title: newConversationDefaultTitle, updatedAt: new Date().toISOString() },
        { id: CONV_CLUB, title: "Should I start another entrepreneurship club or focus on…", updatedAt: "2026-09-03T14:20:00.000Z" },
        { id: CONV_LIST, title: "Is my university list realistic?", updatedAt: "2026-09-02T09:05:00.000Z" },
        { id: CONV_WEAKEST, title: "What's the weakest part of my profile?", updatedAt: "2026-08-28T18:40:00.000Z" },
      ];

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="max-w-3xl">
        <AdvisorWorkspace
          initialConversationId={empty ? null : CONV_NEW}
          initialMessages={[]}
          initialConversations={conversations}
          aiConfigured={false}
          quotaExhausted={false}
          quotaResetsAt="2026-10-01T00:00:00.000Z"
          tier={tier}
          upgradePromptDismissalState={NOT_YET_DISMISSED}
          quota={{ used: 12000, limit: 50000, remaining: 38000, fraction: 0.24, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true }}
          budgetDegraded={false}
        />
      </div>
    </PreviewShell>
  );
}
