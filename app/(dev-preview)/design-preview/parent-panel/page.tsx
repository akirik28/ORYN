import { notFound } from "next/navigation";
import { ParentAmbient } from "@/features/app-shell/parent-ambient";
import { ParentPanelView } from "@/features/parent/parent-panel-view";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import type { ParentPanelData } from "@/lib/parent/panel-data";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Design-preview mirror for P3 (docs/veli-hesabi-spec-2026-09-04.md) -- no real parent
 * account or parent_links row exists yet (migration 0116 is staged, not applied), so this is
 * the only way to look at the panel before P1/P2/P4 land. Deliberately NOT wrapped in
 * PreviewShell: that renders the student app-shell's Sidebar/Topbar/MobileNav, which a
 * parent never sees (spec's own scope is one consolidated view, not a multi-page nav).
 *
 * `?state=pending` shows the other real screen a parent can land on. `?locale=tr` switches
 * language, same query-param convention as this directory's other preview pages.
 */
/** `gap.label` is locale-resolved text (see computeGap's own dimensionLabel(dimension,
 *  locale) call) -- a fixture that hardcodes the English word regardless of the preview's
 *  `?locale=` param would show "research" mid-Turkish-sentence, which real data never would. */
function fixtureReady(locale: Locale): ParentPanelData {
  return {
    studentDisplayName: "Ada",
    gap: { kind: "claimable", label: locale === "tr" ? "Araştırma" : "Research" },
    opportunities: [
      { id: "opp-1", title: "Regional Economics Case Competition", category: "competition", deadline: "2026-10-12" },
      { id: "opp-2", title: "Youth Policy Research Fellowship", category: "research", deadline: null },
      { id: "opp-3", title: "Summer Data Science Bootcamp", category: "academic_program", deadline: "2026-09-30" },
    ],
    universities: [
      { id: "uni-1", name: "London School of Economics", outlook: "reach" },
      { id: "uni-2", name: "Erasmus University Rotterdam", outlook: "strong" },
      { id: "uni-3", name: "Bocconi University", outlook: "competitive" },
    ],
    applications: [
      { id: "app-1", universityName: "Erasmus University Rotterdam", status: "in_progress", deadline: "2027-01-15" },
      { id: "app-2", universityName: "Bocconi University", status: "not_started", deadline: null },
    ],
  };
}

const FIXTURE_DATA_EMPTY: ParentPanelData = {
  studentDisplayName: "Ada",
  gap: { kind: "empty", label: null },
  opportunities: [],
  universities: [],
  applications: [],
};

export default async function ParentPanelPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string; locale?: string; empty?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { state, locale: localeParam, empty } = await searchParams;
  const locale: Locale = localeParam === "tr" ? "tr" : DEFAULT_LOCALE;

  return (
    <>
      <ParentAmbient role="parent" />
      {state === "pending" ? <ParentPendingScreen locale={locale} /> : <ParentPanelView data={empty === "1" ? FIXTURE_DATA_EMPTY : fixtureReady(locale)} locale={locale} />}
    </>
  );
}
