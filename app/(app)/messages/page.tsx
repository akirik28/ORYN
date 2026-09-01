import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/messaging/messages";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.list");
  return { title: t("pageTitle") };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MessagesPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const conversations = await getConversations(supabase, session.userId!);
  const t = await getTranslations("messaging.list");

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("description")} />

      {conversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="glass-card divide-y divide-white/40 overflow-hidden rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl">
          {conversations.map((c) => {
            const name = c.otherDisplayName ?? t("defaultName");
            return (
              <li key={c.otherUserId}>
                <Link href={`/messages/${c.otherUserId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/50">
                  <Avatar>
                    <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{name}</p>
                      {c.unreadCount > 0 ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {!c.isConnected
                        ? t("readOnlyNotice")
                        : c.lastMessage
                          ? c.lastMessage.body
                          : t("sayHello")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
