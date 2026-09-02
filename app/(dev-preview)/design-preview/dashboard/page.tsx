import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { PreviewShell } from "../preview-shell";
import {
  FIXTURE_STUDENT,
  FIXTURE_BIGGEST_GAP,
  FIXTURE_PROFILE_CHANGE,
  FIXTURE_WEEKLY_PLAN,
  FIXTURE_AVOID_RECOMMENDATION,
  FIXTURE_DEADLINES,
  FIXTURE_TARGET_UNIVERSITIES,
  FIXTURE_OPPORTUNITIES,
  FIXTURE_PROFILE_SIGNAL,
} from "@/lib/dev/fixtures";

// Dedicated single-purpose Dashboard preview — the combined ../page.tsx stacks six
// different components on one long page, which made an honest 1440x900 "how does the
// real Dashboard look" check unreliable (needed scroll-hunting, and earlier led to
// screenshots taken at artificial viewport heights to compensate). This route exists
// specifically so Dashboard can be checked at a normal, unscaled viewport, no scrolling
// past unrelated sections required.
export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <DashboardView
        displayName={FIXTURE_STUDENT.displayName}
        greeting="Good evening"
        locale="en"
        biggestGap={FIXTURE_BIGGEST_GAP}
        profileChange={FIXTURE_PROFILE_CHANGE}
        profileSignal={FIXTURE_PROFILE_SIGNAL}
        weeklyPlan={FIXTURE_WEEKLY_PLAN}
        planError={null}
        counselorThisWeek={[]}
        avoidRecommendation={FIXTURE_AVOID_RECOMMENDATION}
        upcomingDeadlines={FIXTURE_DEADLINES}
        targetUniversities={FIXTURE_TARGET_UNIVERSITIES}
        opportunityPreview={FIXTURE_OPPORTUNITIES.map((o) => ({
          title: o.opportunity.title,
          matchScore: o.matchScore,
          deadline: o.opportunity.deadline ?? null,
          cycleStatus: o.opportunity.cycle_status ?? null,
        }))}
        opportunityMatchesRefreshed={true}
      />
    </PreviewShell>
  );
}
