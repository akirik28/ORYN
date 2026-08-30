import { notFound } from "next/navigation";
import { FeaturesView } from "@/features/catalog/features-view";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";

export default function FeaturesPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <FeaturesView userId="fixture-user" />
    </PreviewShell>
  );
}
