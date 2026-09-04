import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ConfirmAgeForm } from "@/features/confirm-age/confirm-age-form";

// Reuses confirmAge.title directly (the same string the form's own <h1> renders), matching
// app/(legal)/privacy/page.tsx's precedent rather than inventing a separate title-only key.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("confirmAge");
  return { title: t("title") };
}

export default function ConfirmAgePage() {
  return <ConfirmAgeForm />;
}
