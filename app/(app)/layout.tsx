import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireProfile, verifySession, getProfileScores } from "@/lib/security/dal";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { selectModelForUser } from "@/lib/ai/limits/budget";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/features/app-shell/sidebar";
import { Topbar } from "@/features/app-shell/topbar";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { RouteAmbientBlobs } from "@/features/app-shell/route-ambient-blobs";
import { UltraAmbient } from "@/features/app-shell/ultra-ambient";
import { DevTierPreviewToggle } from "@/features/app-shell/dev-tier-preview-toggle";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";
import { toProfileSignal } from "@/lib/scoring/signal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { DEV_TIER_PREVIEW_COOKIE, isDevTierPreviewAllowed, resolveDevTierPreviewOverride } from "@/lib/tier/dev-preview";

// Every route under this layout is per-user and auth-gated — never a candidate for
// static prerendering. Also sidesteps a real build failure: without this, `next build`
// tries to prerender these pages, which call requireUser() -> createClient(), which
// throws its own "not configured" error *before* the cookies() call that would
// otherwise signal Next to bail to dynamic rendering automatically.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  const profile = await requireProfile();
  const session = await verifySession();

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Onboarding has required birth_year since __tests__/onboarding/birth-year-collection.test.ts
  // (lib/validation/onboarding.ts) — but that only binds accounts that complete onboarding
  // from here forward. Accounts that completed onboarding before that requirement existed
  // carry onboarding_completed=true with birth_year still null (confirmed live,
  // 2026-09-02: 4 of the product's 11 accounts). Nothing else in the codebase re-asks, so
  // without this check those accounts pass every future age-gated decision
  // (isLikelyAdult, opportunity eligibility) as silently-unknown forever. Redirects here,
  // not inside individual pages, for the same reason the onboarding_completed check above
  // does: one place, applies to every route this layout wraps.
  if (profile.birth_year === null) {
    redirect("/confirm-age");
  }

  const displayName = profile.display_name || profile.first_name || "Student";
  const t = await getTranslations("nav");

  const supabase = await createClient();
  // The account menu used to render `profiles.profile_strength_score` straight from the
  // row above. It now renders a qualitative read instead, which needs the per-dimension
  // rows — at most nine, indexed on user_id. Routed through the shared, cache()'d
  // getProfileScores(userId) (docs/performance.md §2) rather than a raw query here: this
  // layout wraps every authenticated page, so whichever page also needs profile_scores
  // (dashboard, advisor, universities/[id], and the counselor/opportunity-matching chain
  // underneath them) now shares this one read instead of each re-fetching it. Still
  // launched in the same Promise.all as the notification queries — cache() memoizes the
  // *result*, not the timing, so running it here in parallel still costs nothing extra
  // on the first call each request, and is what makes this the read that populates the
  // cache before any page-level code runs.
  const [notificationsRes, unreadRes, scores, quota, modelSelection] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.userId!)
      .order("created_at", { ascending: false })
      .limit(20),
    // A true total, not derived from the capped list above: a student who fell behind
    // (the weekly-plan duplicate bug alone once left one account with 103 unread rows,
    // see lib/plan/persist.ts) would otherwise see the bell cap out at whatever fits in
    // the last 20 rows fetched, silently under-reporting how much is actually unread.
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId!)
      .is("read_at", null),
    getProfileScores(session.userId!),
    // Founder, 2026-09-02, verbatim: the usage bar must be "hep görünen" (always visible),
    // not confined to the one page (advisor) that already showed it — see
    // features/app-shell/usage-indicator.tsx's own doc comment. Same "second, independent
    // read purely for display" pattern app/(app)/advisor/page.tsx already established:
    // selectModelForUser has no side effects here, it only answers whether this student is
    // currently past lib/ai/limits/budget.ts's target, same table getMonthlyQuota already
    // reads.
    getMonthlyQuota(session.userId!),
    selectModelForUser(session.userId!),
  ]);
  const notifications = notificationsRes.data;
  const unreadCount = unreadRes.count ?? 0;
  const profileSignal = toProfileSignal(scores);
  const budgetDegraded = modelSelection.degraded;
  const realTier = resolvePlanTier(profile);
  // lib/tier/dev-preview.ts's own header has the full reasoning: migration 0089 is
  // unapplied, so `realTier` is "standard" for every account tonight, including the
  // founder's, with no way to reach "ultra" otherwise. `devPreviewAllowed` gates BOTH the
  // override and whether the toggle control even renders — resolveDevTierPreviewOverride
  // also re-checks this itself, so there is no single flag whose removal alone would
  // re-enable this in production.
  const devPreviewAllowed = isDevTierPreviewAllowed();
  const devPreviewOverride = devPreviewAllowed ? resolveDevTierPreviewOverride((await cookies()).get(DEV_TIER_PREVIEW_COOKIE)?.value) : null;
  const planTier = devPreviewOverride ?? realTier;

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
    <div
      className="flex min-h-svh flex-col lg:flex-row"
      style={{ background: "linear-gradient(145deg, var(--tier-page-bg-1) 0%, var(--tier-page-bg-2) 30%, var(--tier-page-bg-3) 55%, var(--tier-page-bg-4) 100%)" }}
    >
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
        unreadCount={unreadCount}
        isAdmin={profile.is_admin}
        quota={quota}
        budgetDegraded={budgetDegraded}
        tier={planTier}
      />

      <Sidebar displayName={displayName} email={session.email} signal={profileSignal} isAdmin={profile.is_admin} tier={planTier} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Hoisted here rather than wired into each individual page: position:fixed means
            DOM placement doesn't matter for where it renders, and every authenticated page
            gets the ambient background this way with no per-page wiring. Source varies the
            blob config per screen (App.tsx `AmbientBlobs`) and so does this now — the
            wrapper picks the config from the pathname, so each section has its own
            background weighting instead of one identical wash everywhere. */}
        <RouteAmbientBlobs />
        {/* Same fixed/inset-0/pointer-events-none convention as RouteAmbientBlobs above —
            mounted once here, not per-page. Sets data-tier on <html> itself; see that
            component's own doc comment for why that happens client-side, scoped to this
            authenticated shell, rather than server-side on the public root layout. */}
        <UltraAmbient tier={planTier} />
        {/* lib/tier/dev-preview.ts — devPreviewAllowed is false in any production build, so
            this branch (and the Server Action it calls) is structurally absent there, not
            merely hidden. Rendered here rather than deeper in the tree so it's visible on
            every authenticated page, matching where a real subscription indicator would
            eventually live. */}
        {devPreviewAllowed ? <DevTierPreviewToggle realTier={realTier} effectiveTier={planTier} /> : null}
        <Topbar notifications={notifications ?? []} unreadCount={unreadCount} quota={quota} budgetDegraded={budgetDegraded} tier={planTier} />
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
