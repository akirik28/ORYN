import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/proxola/empty-state";

// Route-level not-found boundary for everything under app/(app)/** — catches the notFound()
// calls already thrown from applications/[id], messages/[userId], opportunities/[id],
// u/[id], and universities/[id] (a deleted/renamed record, someone else's private profile,
// a bad id in a stale link, ...). Per Next's not-found.js convention this renders inside
// app/(app)/layout.tsx, so the sidebar/nav stays and the student has a way back — before
// this file existed, those notFound() calls fell through to Next's bare built-in 404 with
// no navigation. Reuses the existing EmptyState primitive rather than a one-off page.
export default async function AppNotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-10">
      <EmptyState
        icon={SearchX}
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
            {t("backToDashboard")}
          </Button>
        }
      />
    </div>
  );
}
