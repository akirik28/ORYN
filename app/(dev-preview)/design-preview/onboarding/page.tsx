import Image from "next/image";
import { notFound } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { PreviewToolbar } from "../preview-toolbar";

// See app/(dev-preview)/design-preview/page.tsx — same dev-only rationale.
// OnboardingWizard is a pure client component with no server data dependency of its own,
// so unlike the dashboard it can be mounted directly, no fixtures needed.
export default function OnboardingPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-muted/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--brand-primary-subtle),transparent_55%)]"
      />
      <div className="relative flex items-center px-6 py-5">
        <Image src="/brand/logo-full.png" alt="Proxola" width={126} height={40} priority className="h-10 w-auto" />
      </div>
      <div className="relative flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
          <OnboardingWizard />
        </div>
      </div>
      <PreviewToolbar />
    </div>
  );
}
