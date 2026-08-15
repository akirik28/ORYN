import { requireUser } from "@/lib/security/dal";
import { getCurrentWeeklyPlan } from "@/lib/plan/persist";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";

export const metadata = { title: "Plan" };

export default async function PlanPage() {
  const session = await requireUser();
  const weeklyPlan = await getCurrentWeeklyPlan(session.userId!);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">This week&apos;s plan</h1>
          {weeklyPlan?.plan.summary ? (
            <p className="mt-1 text-muted-foreground">{weeklyPlan.plan.summary}</p>
          ) : (
            <p className="mt-1 text-muted-foreground">Your prioritized actions for the week.</p>
          )}
        </div>
        <GeneratePlanButton label={weeklyPlan ? "Regenerate" : "Generate my plan"} />
      </div>

      {weeklyPlan && weeklyPlan.actions.length > 0 ? (
        <WeeklyFocus actions={weeklyPlan.actions} />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No plan yet this week. Generate one to get your prioritized actions.
        </div>
      )}
    </div>
  );
}
