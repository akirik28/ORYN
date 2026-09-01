import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { Pagination } from "@/components/oryn/pagination";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/features/notifications/notification-list";
import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import { FILTERABLE_CATEGORIES, isFilterableCategory } from "@/features/notifications/categories";
import type { NotificationCategory } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title") };
}

// The popover (app/(app)/layout.tsx) caps at 20 — this page's whole reason to exist is
// reaching past that, so its own page size should read as clearly larger, not just +5.
const PAGE_SIZE = 25;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const params = await searchParams;
  const session = await requireUser();
  const userId = session.userId!;
  const t = await getTranslations("notifications");

  const category = isFilterableCategory(params.category) ? params.category : undefined;
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let listQuery = supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  let countQuery = supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (category) {
    listQuery = listQuery.eq("category", category);
    countQuery = countQuery.eq("category", category);
  }

  // Total unread is deliberately never filtered by `category` — it feeds "Mark all read",
  // which (app/(app)/notifications/actions.ts) always clears every unread notification for
  // the user regardless of what filter happens to be selected on screen right now.
  const [listRes, countRes, unreadRes] = await Promise.all([
    listQuery.range(offset, offset + PAGE_SIZE - 1),
    countQuery,
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);

  const notifications = listRes.data ?? [];
  const totalCount = countRes.count ?? 0;
  const unreadCount = unreadRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function categoryHref(c: NotificationCategory | undefined) {
    return c ? `/notifications?category=${c}` : "/notifications";
  }

  function pageHref(page: number) {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/notifications?${qs}` : "/notifications";
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("page.description")} action={<MarkAllReadButton unreadCount={unreadCount} label={t("markAllRead")} />} />

      <div className="flex flex-wrap gap-2">
        <Button variant={!category ? "default" : "outline"} size="sm" render={<Link href={categoryHref(undefined)} />} nativeButton={false}>
          {t("categories.all")}
        </Button>
        {FILTERABLE_CATEGORIES.map((c) => (
          <Button key={c} variant={category === c ? "default" : "outline"} size="sm" render={<Link href={categoryHref(c)} />} nativeButton={false}>
            {t(`categories.${c}`)}
          </Button>
        ))}
      </div>

      {notifications.length === 0 ? (
        category ? (
          <EmptyState
            icon={Bell}
            title={t("page.emptyFilteredTitle")}
            description={t("page.emptyFilteredDescription")}
            action={
              <Button variant="outline" size="sm" render={<Link href="/notifications" />} nativeButton={false}>
                {t("categories.all")}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Bell} title={t("page.emptyAllTitle")} description={t("page.emptyAllDescription")} />
        )
      ) : (
        <>
          <NotificationList notifications={notifications} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={pageHref}
            ariaLabel={t("page.pagination")}
            previousLabel={t("page.previous")}
            nextLabel={t("page.next")}
            pageLabel={t("page.pageOf", { page: currentPage, total: totalPages })}
          />
        </>
      )}
    </div>
  );
}
