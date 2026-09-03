import Link from "next/link";
import { ClipboardCheck, Compass, Plus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { NewApplicationDialog } from "@/features/applications/new-application-dialog";
import { RequirementChipGrid } from "@/features/applications/requirement-chip-grid";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/proxola/empty-state";
import { StatusBadge, type StatusTone } from "@/components/proxola/status-badge";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import type { ApplicationReadiness } from "@/lib/applications/readiness";
import type { ApplicationStatus, ApplicationType, RequirementStatus, PlanTier } from "@/types/database";
import { heroGradientStyleCompact } from "@/components/proxola/hero-gradient";

const APPLICATION_STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  not_started: "neutral",
  in_progress: "brand",
  submitted: "info",
  under_review: "warning",
  accepted: "success",
  waitlisted: "warning",
  rejected: "error",
  withdrawn: "neutral",
};

export interface ApplicationsViewRow {
  id: string;
  universityName: string;
  applicationType: ApplicationType;
  deadline: string | null;
  status: ApplicationStatus;
  readiness: ApplicationReadiness;
  requirements: { id: string; requirement_type: string; status: RequirementStatus }[];
}

export async function ApplicationsView({
  applications,
  hasTargets,
  availableTargets,
  tier = "standard",
}: {
  applications: ApplicationsViewRow[];
  hasTargets: boolean;
  availableTargets: { id: string; name: string }[];
  /** Optional, defaulting to "standard" — see the same note on DashboardViewProps.tier
   *  (features/dashboard/dashboard-view.tsx) for why the dev-preview harness caller isn't
   *  required to pass it. */
  tier?: PlanTier;
}) {
  const t = await getTranslations("applications");
  const locale = await getLocale();
  const earliestDeadline = applications
    .map((a) => a.deadline)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <div>
      {/* Dark hero — literal source values (App.tsx `ApplicationsScreen`), same gradient
          and card language the dashboard uses. */}
      <div
        className="relative overflow-hidden rounded-[28px] px-6 py-11 md:px-10 md:py-14"
        style={heroGradientStyleCompact(tier)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 right-16 size-[280px] rounded-full"
          style={{ background: "rgba(61,53,232,0.12)" }}
        />
        <div className="dark relative text-foreground">
          <p lang={locale} className="text-xs font-semibold tracking-[0.1em] text-white/35 uppercase">{t("hero.cycleLabel")}</p>
          <h1 className="mt-3.5 font-display text-4xl leading-[1.1] tracking-[-0.03em] italic text-[#A09CF8] md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-1.5 text-[15px] text-white/50">
            {t("hero.universityCount", { count: applications.length })}
            {earliestDeadline
              ? t("hero.earliestDeadline", {
                  date: new Date(earliestDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                })
              : ""}
          </p>
          <div className="mt-7">
            <NewApplicationDialog availableTargets={availableTargets} />
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-5">
        {applications.length > 0 ? (
          <>
            {applications.map((application) => (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="block overflow-hidden rounded-[20px] transition-colors hover:bg-white/60"
                style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.62)" }}
              >
                <div className="p-6 pb-0 md:p-7 md:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-lg font-bold text-ink-1">{application.universityName}</span>
                        <StatusBadge
                          label={t(`statusLabels.${application.status}`)}
                          tone={APPLICATION_STATUS_TONE[application.status]}
                        />
                      </div>
                      <p className="mt-1 text-sm text-ink-3">
                        {t(`newDialog.typeOptions.${application.applicationType}`)}
                        {application.deadline ? (
                          <>
                            {" "}
                            · {t("due")} <DeadlineBadge date={application.deadline} locale={locale} />
                          </>
                        ) : null}
                      </p>
                    </div>
                    {application.readiness.kind === "measured" ? (
                      <div className="shrink-0 text-right">
                        <div className={application.readiness.percent === 100 ? "text-2xl font-bold text-success" : "text-2xl font-bold text-ink-1"}>
                          {application.readiness.percent}%
                        </div>
                        <div className="text-[11px] font-medium text-ink-3">{t("ready")}</div>
                      </div>
                    ) : null}
                  </div>
                  {/* Readiness is only shown while an application is still being assembled
                      (not_started/in_progress) — see lib/applications/readiness.ts. Once
                      submitted or decided, the status badge above already says what matters;
                      a stale completion percentage next to it would read as something being
                      wrong with an application that's already sent. */}
                  {application.readiness.kind === "measured" ? <Progress value={application.readiness.percent} className="mt-5 mb-5" /> : <div className="mb-6" />}
                </div>
                <RequirementChipGrid requirements={application.requirements} />
              </Link>
            ))}

            {/* Founder's Figma (ApplicationsScreen): a dashed, always-present card at the
                end of the list, distinct from the header's "+ Add university" dialog — that
                one starts an application from an already-saved target; this one is
                specifically the path to go save a new one, matching its own subtitle. */}
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/universities" />}
              className="h-auto w-full justify-start gap-3.5 rounded-2xl border border-dashed border-brand-primary/20 bg-white/30 px-6 py-5 hover:bg-white/45"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-primary/[0.08] text-brand-primary">
                <Plus className="size-4" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-brand-primary">{t("addAnother.title")}</span>
                <span className="block text-xs text-ink-4">{t("addAnother.description")}</span>
              </span>
            </Button>
          </>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title={hasTargets ? t("empty.hasTargetsTitle") : t("empty.noTargetsTitle")}
            description={hasTargets ? t("empty.hasTargetsDescription") : t("empty.noTargetsDescription")}
            action={
              <Button size="sm" render={<Link href="/universities" />} nativeButton={false}>
                <Compass className="size-4" /> {t("empty.cta")}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
