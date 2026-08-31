import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireProfile, verifySession } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/features/app-shell/sidebar";
import { Topbar } from "@/features/app-shell/topbar";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { RouteAmbientBlobs } from "@/features/app-shell/route-ambient-blobs";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";
import { toProfileSignal } from "@/lib/scoring/signal";

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
  const t = await getTranslations("nav");

  const supabase = await createClient();
  // The account menu used to render `profiles.profile_strength_score` straight from the
  // row above. It now renders a qualitative read instead, which needs the per-dimension
  // rows — at most nine, indexed on user_id, fetched alongside the notifications that were
  // already being loaded here.
  const [notificationsRes, scoresRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.userId!)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profile_scores")
      .select("dimension, score, confidence, reason_codes")
      .eq("user_id", session.userId!),
  ]);
  const notifications = notificationsRes.data;
  const profileSignal = toProfileSignal(scoresRes.data ?? []);

  return (
    // Literal source ambient background (App.tsx `App()`'s root container) — the ground
    // every glass-card/frosted-topbar translucency in this shell is designed to sit on.
    // Missing before: every ported page sat on the app's own plain bg-background instead,
    // which is why cards read flat/washed-out rather than glowing against a colored wash.
    // min-h-svh (document scroll), not source's `height:100dvh; overflow:hidden` fixed-shell
    // SPA model — this app scrolls the real page, and Sidebar is `sticky` accordingly; only
    // the background color is a literal transplant, not the fixed-viewport architecture.
    //
    // flex-col below `lg`, row at `lg+`: MobileNav's sticky <header> is a plain flex-row
    // sibling of Sidebar/content here (it renders as a Fragment, not its own wrapper), and
    // only picks up `lg:hidden` on itself — so a row-direction container at every width
    // put that header beside the content column instead of above it below `lg`, squeezing
    // real page content into a sliver next to blank space. Sidebar is `hidden lg:flex`, so
    // it occupies nothing below `lg` regardless of direction; row is only needed once it's
    // actually on-screen.
    <div className="flex min-h-svh flex-col lg:flex-row" style={{ background: "linear-gradient(145deg, #DDDAF5 0%, #D8DFF5 30%, #DDD8F2 55%, #D4DBF0 100%)" }}>
      {/* Keyboard users land here first; without it, reaching page content past the nav
          items costs several tabs on every navigation. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>

      <MobileNav
        signal={profileSignal}
        displayName={displayName}
        email={session.email}
        notifications={notifications ?? []}
      />

      <Sidebar displayName={displayName} email={session.email} signal={profileSignal} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Hoisted here rather than wired into each individual page: position:fixed means
            DOM placement doesn't matter for where it renders, and every authenticated page
            gets the ambient background this way with no per-page wiring. Source varies the
            blob config per screen (App.tsx `AmbientBlobs`) and so does this now — the
            wrapper picks the config from the pathname, so each section has its own
            background weighting instead of one identical wash everywhere. */}
        <RouteAmbientBlobs />
        <Topbar notifications={notifications ?? []} />
        <main id="main-content" className="relative z-[1] min-w-0 flex-1 overflow-x-hidden">
          {/* max-w-[1200px] is the reading/composition measure (UI-V3 § 6). Pages that want
              the full bleed — the university map, in particular — opt out with their own
              wrapper rather than fighting a container here. */}
          <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
