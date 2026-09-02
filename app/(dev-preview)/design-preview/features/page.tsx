import { notFound } from "next/navigation";
import { FeaturesView } from "@/features/catalog/features-view";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";

export default async function FeaturesPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <FeaturesView userId="fixture-user" tier={tier} />
    </PreviewShell>
  );
}
