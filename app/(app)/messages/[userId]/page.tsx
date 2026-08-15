import { notFound } from "next/navigation";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConversation } from "@/lib/messaging/messages";
import { getConnectionWith } from "@/lib/social/connections";
import { isUuidLike } from "@/lib/validation/uuid";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { ConversationThread } from "@/features/messaging/conversation-thread";
import { ShieldOff } from "lucide-react";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherUserId } = await params;
  if (!isUuidLike(otherUserId)) notFound();

  const session = await requireUser();
  const userId = session.userId!;
  if (otherUserId === userId) notFound();

  const supabase = await createClient();

  const [connection, otherProfileRes, blockedRes] = await Promise.all([
    getConnectionWith(supabase, userId, otherUserId),
    supabase.from("public_profiles").select("display_name").eq("id", otherUserId).maybeSingle(),
    supabase.rpc("is_blocked_between", { user_a: userId, user_b: otherUserId }),
  ]);

  const displayName = otherProfileRes.data?.display_name ?? "This student";

  // Same "re-check server-side, never trust that the UI only linked here from a valid
  // state" discipline as every other authorization-sensitive page in this app — a bare
  // URL to /messages/[id] is directly reachable regardless of connection status.
  if (!connection || connection.status !== "accepted") {
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

  const messages = await getConversation(supabase, userId, otherUserId);
  const isBlocked = Boolean(blockedRes.data);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <PageHeader title={displayName} />
      <ConversationThread
        currentUserId={userId}
        otherUserId={otherUserId}
        otherDisplayName={displayName}
        initialMessages={messages}
        isBlocked={isBlocked}
      />
    </div>
  );
}
