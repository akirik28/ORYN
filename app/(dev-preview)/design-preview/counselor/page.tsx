import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StrategyPanel } from "@/features/advisor/strategy-panel";
import { CounselorPriorities } from "@/features/advisor/counselor-priorities";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { PageHeader } from "@/components/oryn/page-header";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { resolveLocale } from "@/lib/i18n/locale";
import { PreviewShell } from "../preview-shell";
import type { Locale } from "@/lib/i18n/config";
import type { CounselorResult, CounselorRecommendation } from "@/lib/counselor/types";

// Dedicated Counselor preview — exercises every glass-card block added 2026-08-30 (the
// strategy panel, the "Your priorities"/"One thing not to do"/"Worth considering" groups,
// and the boxed chat) against real component code, no Supabase required. `CounselorResult`
// is fixtured directly here rather than in lib/dev/fixtures.ts: it's a large, deeply
// nested pipeline-output type with no other preview consumer, so a local fixture is more
// honest about being single-purpose than a shared one nobody else reads.
// Fixed rather than `Date.now() + Nd` — a literal date keeps this preview deterministic
// (no re-render-triggered "impure function" lint failure, no drifting "6 days" label as
// the actual date passes it).
const FIXTURE_DEADLINE_ISO = "2026-09-05T00:00:00.000Z";

function recommendation(overrides: Partial<CounselorRecommendation> & Pick<CounselorRecommendation, "id" | "title" | "recommendationClass" | "why">): CounselorRecommendation {
  return {
    matchedGapDimensions: [],
    impact: "high",
    effort: "medium",
    urgency: "medium",
    deadline: null,
    costOnFile: null,
    applicationRequirements: [],
    eligibility: { verdict: "known_eligible", notes: [] },
    confidence: "high",
    evidence: [],
    warnings: [],
    nextAction: { label: "View", type: "VIEW", href: "#" },
    ...overrides,
  };
}

// A function of locale rather than a module-level const — nextAction.label mirrors
// lib/counselor/evidence.ts's own nextActionFor(candidate, locale), which the real pipeline
// threads locale through. Found hardcoded English during 2026-09-03's Turkish pass: a
// smaller instance of the same fixture-not-faithful-to-real-locale-behavior bug already
// fixed in opportunity-detail's fit-tier keys.
function buildFixtureCounselorResult(locale: Locale): CounselorResult {
  const tr = locale === "tr";
  return {
    scoreVersion: "counselor_v1" as CounselorResult["scoreVersion"],
    gaps: [],
    profileReadiness: { completenessPercent: 82, sufficientForJudgment: true },
    studentIdentity: { displayName: "Ada", country: "United States", graduationYear: 2027, curriculum: "ap" },
    recommendations: [
      recommendation({
        id: "do-1",
        title: "Finish the youth-unemployment dataset and submit it to the Economics Challenge",
        recommendationClass: "do",
        why: ["Research is your weakest recorded dimension at 42/100.", "The Economics Challenge deadline is in 6 days — this project already covers its entry requirements."],
        deadline: { date: FIXTURE_DEADLINE_ISO, sourceLabel: "Economics Challenge 2027" },
        nextAction: { label: tr ? "Araştırmayı aç" : "Open Research", type: "VIEW", href: "/profile" },
      }),
      recommendation({
        id: "do-2",
        title: "Add your AP Macroeconomics grade",
        recommendationClass: "do",
        why: ["Coursework is missing a grade for a course you've already listed — a quick, high-confidence addition."],
        impact: "medium",
        effort: "low",
        nextAction: { label: tr ? "Not ekle" : "Add grade", type: "COMPLETE_PROFILE", href: "/profile" },
      }),
      recommendation({
        id: "avoid-1",
        title: "Starting another entrepreneurship club",
        recommendationClass: "avoid_for_now",
        why: ["Leadership and entrepreneurship are already among your strongest recorded areas — the same hours are worth more spent on research."],
      }),
      recommendation({
        id: "consider-1",
        title: "Youth Research Fellows Programme",
        recommendationClass: "consider",
        why: ["Matches your stated interest in Economics.", "Applications open but no deadline confirmed yet — worth watching."],
        confidence: "medium",
        nextAction: { label: tr ? "Fırsatı görüntüle" : "View opportunity", type: "SAVE", href: "/opportunities" },
      }),
    ],
  };
}

export default async function CounselorPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // Reads the real oryn_locale cookie rather than hardcoding English — see
  // design-preview/dashboard/page.tsx's own comment on this exact class of bug. This
  // PageHeader was plain JSX string literals with no translation mechanism at all (not even
  // the broken hardcoded-"en" kind), found during 2026-09-03's Turkish pass — exactly the
  // "class of thing you found in PageHeader" oryn-a7 named when assigning this pass.
  const t = await getTranslations("advisor.page");
  const locale = await resolveLocale();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="space-y-10">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <StrategyPanel
          focusLabel="Research"
          nextDecision={{ title: "Economics Challenge 2027", date: FIXTURE_DEADLINE_ISO }}
          timeBudget="5_10h"
          signal={FIXTURE_PROFILE_SIGNAL}
        />

        <CounselorPriorities result={buildFixtureCounselorResult(locale)} />

        <div className="glass-card flex min-h-[28rem] flex-col rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
          <AdvisorChat conversationId={null} initialMessages={[]} aiConfigured={false} />
        </div>
      </div>
    </PreviewShell>
  );
}
