import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { NewApplicationDialog } from "@/features/applications/new-application-dialog";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/oryn/empty-state";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import type { ApplicationStatus } from "@/types/database";

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
  applicationType: string;
  deadline: string | null;
  status: ApplicationStatus;
  readiness: number;
}

export function ApplicationsView({
  applications,
  hasTargets,
  availableTargets,
}: {
  applications: ApplicationsViewRow[];
  hasTargets: boolean;
  availableTargets: { id: string; name: string }[];
}) {
  const earliestDeadline = applications
    .map((a) => a.deadline)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <div>
      {/* Dark hero — literal source values (App.tsx `ApplicationsScreen`), same gradient
          and card language the dashboard uses. Real applications list only (no inline
          per-application checklist grid): the source shows the full requirement grid
          inline because its demo has two applications; the real app already pushes that
          to /applications/[id], which is the better architecture at any real scale and
          isn't something this visual pass should undo. */}
      <div
        className="relative overflow-hidden rounded-[28px] px-6 py-11 md:px-10 md:py-14"
        style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 right-16 size-[280px] rounded-full"
          style={{ background: "rgba(61,53,232,0.12)" }}
        />
        <div className="dark relative text-foreground">
          <p className="text-xs font-semibold tracking-[0.1em] text-white/35 uppercase">2026–27 cycle</p>
          <h1 className="mt-3.5 font-display text-4xl leading-[1.1] tracking-[-0.03em] italic text-[#A09CF8] md:text-5xl">
            Applications.
          </h1>
          <p className="mt-1.5 text-[15px] text-white/50">
            {applications.length} {applications.length === 1 ? "university" : "universities"}
            {earliestDeadline ? ` · Earliest deadline ${new Date(earliestDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
          </p>
          <div className="mt-7">
            <NewApplicationDialog availableTargets={availableTargets} />
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-5">
        {applications.length > 0 ? (
          applications.map((application) => (
            <Link
              key={application.id}
              href={`/applications/${application.id}`}
              className="block overflow-hidden rounded-[20px] p-6 transition-colors hover:bg-white/60 md:p-7"
              style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.62)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-lg font-bold text-ink-1">{application.universityName}</span>
                    <StatusBadge
                      label={application.status.replace(/_/g, " ")}
                      tone={APPLICATION_STATUS_TONE[application.status]}
                      className="capitalize"
                    />
                  </div>
                  <p className="mt-1 text-sm text-ink-3 capitalize">
                    {application.applicationType.replace(/_/g, " ")}
                    {application.deadline ? (
                      <>
                        {" "}
                        · Due <DeadlineBadge date={application.deadline} />
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className={application.readiness === 100 ? "text-2xl font-bold text-success" : "text-2xl font-bold text-ink-1"}>
                    {application.readiness}%
                  </div>
                  <div className="text-[11px] font-medium text-ink-4">ready</div>
                </div>
              </div>
              <Progress value={application.readiness} className="mt-5" />
            </Link>
          ))
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title={hasTargets ? "No applications started yet" : "No applications yet"}
            description={
              hasTargets
                ? "Start one from a target university to begin tracking requirements and deadlines."
                : "Save a university you're targeting to start an application."
            }
          />
        )}
      </div>
    </div>
  );
}
