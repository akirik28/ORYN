import { ListChecks } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { getCurrentWeeklyPlan } from "@/lib/plan/persist";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export const metadata = { title: "Plan" };

export default async function PlanPage() {
  const session = await requireUser();
  const weeklyPlan = await getCurrentWeeklyPlan(session.userId!);

  return (
    <div className="space-y-6">
      <PageHeader
        title="This week's plan"
        description={weeklyPlan?.plan.summary || "Your prioritized actions for the week."}
        action={<GeneratePlanButton label={weeklyPlan ? "Regenerate" : "Generate my plan"} />}
      />

      {weeklyPlan && weeklyPlan.actions.length > 0 ? (
        <div className="glass-card rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl md:p-6">
          <WeeklyFocus actions={weeklyPlan.actions} />
        </div>
      ) : (
        <EmptyState icon={ListChecks} title="No plan yet this week" description="Generate one to get your prioritized actions." />
      )}
    </div>
  );
}
