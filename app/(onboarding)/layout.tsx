import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/security/dal";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";

// Auth-gated, per-user — never a static-prerendering candidate. See
// app/(app)/layout.tsx for the fuller explanation.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    return <NotConfiguredNotice />;
  }

  const profile = await requireProfile();

  if (profile.onboarding_completed) {
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
