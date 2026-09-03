import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { UltraAmbient } from "@/features/app-shell/ultra-ambient";
import { resolveLocale } from "@/lib/i18n/locale";
import { PreviewShell } from "../preview-shell";
import { greeting } from "@/lib/dashboard/greeting";
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
//
// UltraAmbient, 2026-09-02: this whole route is already prod-gated (notFound() below), so
// this is the one place the Ultra skin can be looked at without a real authenticated session
// — migration 0089 is unapplied, so no live account can reach data-tier="ultra" any other way
// right now. Reads ?tier= rather than lib/tier/dev-preview.ts's cookie deliberately: this
// page sits under app/(dev-preview)/layout.tsx, which mounts DevPreviewTierStamp for the
// whole route group — a cookie-driven tier here would fight that component's own
// effect over who sets `data-tier` (both run useEffect on mount; child-before-parent
// ordering means the layout's effect would win, silently reverting a cookie-driven "ultra"
// back to absent). Reading the same ?tier= param removes the race entirely: both compute the
// same value from the same source, so it no longer matters which effect runs last. UltraAmbient
// still earns its place here rather than being redundant with DevPreviewTierStamp — that
// component deliberately stamps the attribute only, no ambient glow/ember canvas, since a
// component harness (e.g. the map preview) doesn't want it; a full-page Dashboard preview does.
export default async function DashboardPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";
  // Reads the real oryn_locale cookie (lib/i18n/locale.ts) rather than hardcoding "en" —
  // this preview is the only way to check Turkish rendering without a live account
  // (migration 0089 unapplied, same reason UltraAmbient earns its place here). Was
  // hardcoded to "en" before 2026-09-03's Turkish pass, which silently made every
  // getTranslations({locale, ...}) call in DashboardView (This week/Due soon/One thing not
  // to do/etc. — see that file's own header comment) render English regardless of what a
  // real student's cookie said, even though <html lang> and every OTHER component on this
  // exact page were already correctly Turkish.
  const locale = await resolveLocale();

  return (
    <>
      <UltraAmbient tier={tier} />
      <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
        <DashboardView
          displayName={FIXTURE_STUDENT.displayName}
          tier={tier}
          greeting={greeting(locale, "Europe/Istanbul")}
          locale={locale}
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
          showUltraWelcome={tier === "ultra"}
        />
      </PreviewShell>
    </>
  );
}
