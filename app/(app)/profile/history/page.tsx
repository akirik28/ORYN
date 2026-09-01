import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyReview } from "@/lib/scoring/monthly-review";
import { ProgressView } from "@/features/profile/progress-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.progress");
  return { title: t("title") };
}

export default async function ProgressPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const review = await getMonthlyReview(supabase, session.userId!);
  return <ProgressView review={review} />;
}
