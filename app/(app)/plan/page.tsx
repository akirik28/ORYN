import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { getCurrentWeeklyPlan } from "@/lib/plan/persist";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("nav");
  return { title: tMeta("plan") };
}

export default async function PlanPage() {
  const t = await getTranslations("plan");
  const session = await requireUser();
  const weeklyPlan = await getCurrentWeeklyPlan(session.userId!);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={weeklyPlan?.plan.summary || t("defaultDescription")}
        action={<GeneratePlanButton label={weeklyPlan ? t("regenerate") : t("generate")} />}
      />

      {weeklyPlan && weeklyPlan.actions.length > 0 ? (
        <div className="glass-card rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl md:p-6">
          <WeeklyFocus actions={weeklyPlan.actions} />
        </div>
      ) : (
        <EmptyState icon={ListChecks} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
    </div>
  );
}
