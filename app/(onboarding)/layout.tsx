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
    <div className="flex min-h-svh flex-col bg-muted/30">
      <div className="flex items-center px-6 py-5">
        <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-7 w-auto" />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
