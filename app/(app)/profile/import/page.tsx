import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { CvImportFlow } from "@/features/profile/cv-import-flow";
import { isAIConfigured } from "@/lib/ai";
import { EmptyState } from "@/components/oryn/empty-state";
import { FileUp } from "lucide-react";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("profile.page");
  return { title: tMeta("scanCv") };
}

export default async function CvImportPage() {
  const t = await getTranslations("profile.cvImport");

  // Same context ImportStep gives entity search during onboarding (see cv-import-flow.tsx's
  // own header comment) — read from the profile actually on file, since by this point in the
  // student's journey (unlike mid-onboarding) it's already saved rather than still-local
  // wizard state. requireUser() first, matching every sibling page under (app)/profile/ —
  // the DAL's own header comment: never rely on a parent layout having already checked.
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" /> {t("backToJourney")}
        </Link>
        <PageHeader className="mt-3" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      </div>

      {isAIConfigured() ? (
        <CvImportFlow country={profile?.country ?? null} />
      ) : (
        // Phase 72: say what's missing rather than showing a button that can't work.
        <EmptyState icon={FileUp} title={t("notConfiguredTitle")} description={t("notConfiguredDescription")} />
      )}
    </div>
  );
}
