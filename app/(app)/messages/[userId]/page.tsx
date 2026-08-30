import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConversation, getBlockState } from "@/lib/messaging/messages";
import { resolveConversationAccess } from "@/lib/messaging/authorization";
import { getConnectionWith } from "@/lib/social/connections";
import { isUuidLike } from "@/lib/validation/uuid";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { ConversationThread } from "@/features/messaging/conversation-thread";
import { ShieldOff } from "lucide-react";

// Same public_profiles.display_name lookup the page body already does unconditionally
// (not gated by `access`, which only governs the message thread itself) — no new exposure.
export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId: otherUserId } = await params;
  if (!isUuidLike(otherUserId)) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("public_profiles").select("display_name").eq("id", otherUserId).maybeSingle();
  return { title: data?.display_name ?? "Conversation" };
}

export default async function ConversationPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherUserId } = await params;
  if (!isUuidLike(otherUserId)) notFound();

  const session = await requireUser();
  const userId = session.userId!;
  if (otherUserId === userId) notFound();

  const supabase = await createClient();

  const [connection, otherProfileRes, blockState, messages] = await Promise.all([
    getConnectionWith(supabase, userId, otherUserId),
    supabase.from("public_profiles").select("display_name").eq("id", otherUserId).maybeSingle(),
    getBlockState(supabase, userId, otherUserId),
    getConversation(supabase, userId, otherUserId),
  ]);

  const displayName = otherProfileRes.data?.display_name ?? "This student";

  // Same "re-check server-side, never trust that the UI only linked here from a valid
  // state" discipline as every other authorization-sensitive page in this app — a bare
  // URL to /messages/[id] is directly reachable regardless of connection status. Read and
  // send are deliberately different gates now — see lib/messaging/authorization.ts: a
  // removed connection with retained history stays readable, just not writable.
  const access = resolveConversationAccess({
    connectionStatus: connection?.status ?? null,
    hasMessageHistory: messages.length > 0,
    messagingBlocked: blockState.messagingBlocked,
  });

  if (!access.canRead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conversation" />
        <EmptyState
          icon={ShieldOff}
          title="You can only message accepted connections"
          description="This conversation isn't available — either there's no accepted connection with this student, or it hasn't been accepted yet."
        />
      </div>
    );
  }

  return (
    // Below `lg`, the fixed mobile bottom nav (features/app-shell/mobile-nav.tsx, 3.5rem +
    // env(safe-area-inset-bottom)) sits UNDER this box's old flat `100vh-8rem` budget,
    // which only ever accounted for the chrome above (mobile header + page padding) —
    // confirmed by the exact pixel math, not just visually. The result: ConversationThread
    // renders taller than the space actually available between the two fixed bars, and
    // since its own root is `overflow-hidden` with only the message list allowed to shrink
    // (features/messaging/conversation-thread.tsx), once that list hits its own floor the
    // composer and Send button get pushed under the nav instead of staying reachable —
    // this route's primary action. Same `3.5rem + env(safe-area-inset-bottom)` clearance
    // constant advisor-chat.tsx already uses for the identical problem, added on top of
    // the existing top-chrome budget rather than replacing it; `lg:` keeps the original
    // value exactly (no mobile nav exists there). `svh`, not `vh`, per this codebase's own
    // established convention (app/(app)/universities/page.tsx) for a mobile Safari-safe
    // viewport unit.
    <div className="flex h-[calc(100svh-8rem-3.5rem-env(safe-area-inset-bottom))] flex-col space-y-4 lg:h-[calc(100svh-8rem)]">
      <PageHeader title={displayName} />
      <ConversationThread
        currentUserId={userId}
        otherUserId={otherUserId}
        otherDisplayName={displayName}
        initialMessages={messages}
        connectionAccepted={connection?.status === "accepted"}
        blockedByMe={blockState.blockedByMe}
        messagingBlocked={blockState.messagingBlocked}
      />
    </div>
  );
}
