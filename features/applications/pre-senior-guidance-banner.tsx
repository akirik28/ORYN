import { getTranslations, getLocale } from "next-intl/server";
import { completenessChecklistLabel } from "@/lib/scoring/completeness";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import type { ApplicationsPageGuidance } from "@/lib/applications/grade-relevance";

/**
 * E1 — renders computeApplicationsPageGuidance's real, per-student result. Static structure
 * goes through `t()`; every per-student value (a deadline's title/date, an opportunity's
 * title, a checklist gap's label) renders as plain text, the same "value in JSX, label through
 * t()" split ApplicationsView already uses for `application.universityName` — never
 * interpolated through `t()` itself, so a render test asserting on the real value can't be
 * fooled by an identity-mocked translator swallowing it.
 */
export async function PreSeniorGuidanceBanner({ guidance }: { guidance: ApplicationsPageGuidance }) {
  const t = await getTranslations("applications.gradeNote");
  const locale = await getLocale();

  return (
    <div
      className="mb-6 rounded-[20px] p-6 md:p-7"
      style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.62)" }}
    >
      <p className="text-xs font-semibold tracking-[0.1em] text-ink-4 uppercase">{t("eyebrow")}</p>
      <p className="mt-1.5 text-sm text-ink-3">
        {t("whenUsefulLead")} {t("yearsUntilSenior", { count: guidance.yearsUntilSenior })}
      </p>
      <p className="mt-4 text-xs font-semibold tracking-[0.06em] text-ink-4 uppercase">{t("rightNowLabel")}</p>
      <div className="mt-2">
        {guidance.action.kind === "deadline" ? (
          <p className="text-sm text-ink-2">
            {t("action.deadlineLead")} <span className="font-semibold text-ink-1">{guidance.action.title}</span>{" "}
            <DeadlineBadge date={guidance.action.date} locale={locale} />
          </p>
        ) : guidance.action.kind === "opportunity" ? (
          <p className="text-sm text-ink-2">
            {t("action.opportunityLead")} <span className="font-semibold text-ink-1">{guidance.action.title}</span>
            {guidance.action.organization ? ` (${guidance.action.organization})` : ""}
          </p>
        ) : guidance.action.kind === "profile_gap" ? (
          <p className="text-sm text-ink-2">{completenessChecklistLabel(guidance.action.checklistKey, locale)}</p>
        ) : (
          <p className="text-sm text-ink-3">{t("action.none")}</p>
        )}
      </div>
    </div>
  );
}
