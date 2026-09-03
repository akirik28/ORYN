import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserList } from "@/lib/admin/queries";
import { regenerateStudentWeeklyPlan, resetStudentOnboarding } from "@/app/(app)/admin/actions";
import { GrowthConfirmActionButton } from "./growth-confirm-action-button";

/**
 * The two real, scoped student-level actions from docs/admin-growth-panel-2026-09-02.md,
 * plus the cohort export — three of the four action candidates that survived critical
 * review (impersonation deferred by oryn-a7, pending a founder decision; a literal
 * "re-run onboarding" and an admin-triggered nudge were both rejected outright, not just
 * omitted). Reuses getAdminUserList (People tab's own read) rather than a second student
 * query — same data, different actions attached to each row.
 */
export async function GrowthStudentActionsSection() {
  const t = await getTranslations("admin.growth.studentActions");
  const tUsers = await getTranslations("admin.users");
  const admin = createAdminClient();
  const students = await getAdminUserList(admin);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <a href="/api/admin/export-cohort" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          {t("exportCohort")}
        </a>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{t("studentColumn")}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => {
              const name = student.displayName ?? tUsers("unnamed");
              return (
                <tr key={student.userId}>
                  <td className="px-4 py-2.5">{name}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap justify-end gap-2">
                      <GrowthConfirmActionButton
                        label={t("regeneratePlan")}
                        confirmTitle={t("regeneratePlan")}
                        confirmDescription={t("regenerateConfirm", { name })}
                        action={() => regenerateStudentWeeklyPlan(student.userId)}
                        variant="destructive"
                        errorMessage={t("actionError")}
                      />
                      <GrowthConfirmActionButton
                        label={t("resetOnboarding")}
                        confirmTitle={t("resetOnboarding")}
                        confirmDescription={t("resetOnboardingConfirm", { name })}
                        action={() => resetStudentOnboarding(student.userId)}
                        errorMessage={t("actionError")}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
