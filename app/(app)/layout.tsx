import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile, verifySession } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/features/app-shell/top-nav";
import { UserMenu } from "@/features/app-shell/user-menu";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { NotificationBell } from "@/features/app-shell/notification-bell";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { CommandPalette } from "@/features/search/command-palette";
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
    <div className="flex min-h-svh flex-col">
      {/* Keyboard users land here first; without it, reaching page content past the seven
          nav items costs eight tabs on every navigation. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <MobileNav
        score={profile.profile_strength_score}
        displayName={displayName}
        email={session.email}
        notifications={notifications ?? []}
      />

      <header className="sticky top-0 z-30 hidden border-b bg-background/85 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-6 px-8">
          <Link href="/dashboard" aria-label="Oryn — home" className="shrink-0">
            <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-7 w-auto" />
          </Link>
          <TopNav />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <CommandPalette variant="bar" />
            <NotificationBell notifications={notifications ?? []} />
            <UserMenu displayName={displayName} email={session.email} score={profile.profile_strength_score} />
          </div>
        </div>
      </header>

      <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden">
        {/* max-w-[1200px] is the reading/composition measure (UI-V3 § 6); the header above
            is deliberately 160px wider so nav and utilities sit at the viewport's edges
            rather than boxed in with the prose. Pages that want the full bleed — the
            university map, in particular — opt out with their own wrapper rather than
            fighting a container here. */}
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
      </main>
    </div>
  );
}
