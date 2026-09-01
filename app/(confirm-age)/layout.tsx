import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/security/dal";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { getTranslations } from "next-intl/server";
import { integrationStatus } from "@/lib/env";

// Auth-gated, per-user — never a static-prerendering candidate. See
// app/(app)/layout.tsx for the fuller explanation.
export const dynamic = "force-dynamic";

/**
 * A single-purpose interstitial for the one gap onboarding's own birth-year requirement
 * can't reach: accounts that completed onboarding before that requirement existed
 * (app/(app)/layout.tsx redirects here for exactly those). Deliberately its own route
 * group rather than living under (app) or (onboarding) — either of those layouts would
 * redirect a visitor straight back out before this page ever rendered:
 * (onboarding)/layout.tsx bounces anyone with onboarding_completed=true to /dashboard,
 * and (app)/layout.tsx is the thing sending them here in the first place. Three-way
 * split with no loop: incomplete onboarding goes to /onboarding, a known birth year goes
 * to /dashboard, and only the specific gap state renders this page.
 */
export default async function ConfirmAgeLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  const profile = await requireProfile();

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }
  if (profile.birth_year !== null) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-muted/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--brand-primary-subtle),transparent_55%)]"
      />
      <div className="relative flex items-center px-6 py-5">
        <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-7 w-auto" />
      </div>
      <div className="relative flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
