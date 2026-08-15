import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile, verifySession } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/features/app-shell/sidebar-nav";
import { UserMenu } from "@/features/app-shell/user-menu";
import { CareerProfileBadge } from "@/features/app-shell/career-profile-badge";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { NotificationBell } from "@/features/app-shell/notification-bell";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";

// Every route under this layout is per-user and auth-gated — never a candidate for
// static prerendering. Also sidesteps a real build failure: without this, `next build`
// tries to prerender these pages, which call requireUser() -> createClient(), which
// throws its own "not configured" error *before* the cookies() call that would
// otherwise signal Next to bail to dynamic rendering automatically.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    return <NotConfiguredNotice />;
  }

  const profile = await requireProfile();
  const session = await verifySession();

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const displayName = profile.display_name || profile.first_name || "Student";

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.userId!)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <MobileNav score={profile.profile_strength_score} displayName={displayName} email={session.email} notifications={notifications ?? []} />

      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard">
            <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-7 w-auto" />
          </Link>
          <NotificationBell notifications={notifications ?? []} />
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          <CareerProfileBadge score={profile.profile_strength_score} />
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <UserMenu displayName={displayName} email={session.email} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
