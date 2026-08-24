import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyReview } from "@/lib/scoring/monthly-review";
import { ProgressView } from "@/features/profile/progress-view";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const review = await getMonthlyReview(supabase, session.userId!);
  return <ProgressView review={review} />;
}
