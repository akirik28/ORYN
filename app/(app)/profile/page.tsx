import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import {
  ArrowRight,
  Sparkles,
  Trophy,
  Medal,
  FlaskConical,
  Briefcase,
  HandHeart,
  BookOpen,
  ClipboardCheck,
  Hammer,
  BadgeCheck,
  Dumbbell,
  GraduationCap,
} from "lucide-react";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { ScoreRadar } from "@/features/profile/score-radar";
import { ProfileSignal } from "@/features/dashboard/profile-signal";
import { toProfileSignal, hasConfidentSignal, signalCoverage } from "@/lib/scoring/signal";
import { InsightCard } from "@/components/oryn/insight-card";
import { JourneyTimeline } from "@/features/profile/journey-timeline";
import { buildJourney } from "@/lib/profile/build-journey";
import { dimensionLabel } from "@/lib/scoring/labels";
import { PeerBenchmark } from "@/features/profile/peer-benchmark";
import { getPeerBenchmarks } from "@/lib/benchmarking";
import { AchievementSection } from "@/features/profile/achievement-section";
import { QuickAddEntry, type QuickAddType } from "@/features/profile/quick-add-entry";
import { ResearchIdeaGenerator } from "@/features/profile/research-idea-generator";
import { ProfessionalIdentityForm } from "@/features/profile/professional-identity-form";
import { OpenToForm } from "@/features/profile/open-to-form";
import { ContactInfoForm } from "@/features/profile/contact-info-form";
import { getOwnContactInfo, hasAnyContactValue } from "@/lib/social/contact-info";
import { isLikelyAdult } from "@/lib/social/age";
import { getProfileViewCounts } from "@/lib/social/profile-views";
import { attachOpportunityTitles } from "@/lib/profile/activity-opportunities";
import { getFeaturedItems } from "@/lib/social/featured";
import { FeaturedManager, type FeaturedManagerItem } from "@/features/profile/featured-manager";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { getCompletenessChecklist } from "@/lib/scoring/completeness";
import { Progress } from "@/components/ui/progress";
import {
  ACTIVITY_FIELDS,
  PROJECT_FIELDS,
  AWARD_FIELDS,
  RESEARCH_FIELDS,
  VOLUNTEERING_FIELDS,
  WORK_EXPERIENCE_FIELDS,
  EDUCATION_FIELDS,
  COURSE_FIELDS,
  COURSE_LEVEL_LABELS,
  TEST_SCORE_FIELDS,
  CERTIFICATION_FIELDS,
  GOAL_FIELDS,
  SPORTS_FIELDS,
  SKILL_FIELDS,
  LANGUAGE_FIELDS,
} from "@/features/profile/field-config";
import {
  createActivity,
  updateActivity,
  deleteActivity,
  createProject,
  updateProject,
  deleteProject,
  createAward,
  updateAward,
  deleteAward,
  createResearchExperience,
  updateResearchExperience,
  deleteResearchExperience,
  createVolunteering,
  updateVolunteering,
  deleteVolunteering,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  createEducationRecord,
  updateEducationRecord,
  deleteEducationRecord,
  createCourse,
  updateCourse,
  deleteCourse,
  createTestScore,
  updateTestScore,
  deleteTestScore,
  createCertification,
  updateCertification,
  deleteCertification,
  createGoal,
  updateGoal,
  deleteGoal,
  createSportsExperience,
  updateSportsExperience,
  deleteSportsExperience,
} from "./actions";
import { createSkill, updateSkill, deleteSkill } from "./skills-actions";
import { createLanguage, updateLanguage, deleteLanguage } from "./languages-actions";
import { languageProficiencyLabel } from "@/lib/vocabularies/languages";
import type { FormValues } from "@/features/profile/dynamic-form-fields";
import type { ProfileDimension } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("nav");
  return { title: tMeta("journey") };
}

export default async function ProfilePage() {
  const session = await requireUser();
  const userId = session.userId!;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const locale = await getLocale();
  const t = await getTranslations("profile");

  const [
    scoresRes,
    activitiesRes,
    sportsRes,
    projectsRes,
    awardsRes,
    researchRes,
    volunteeringRes,
    workRes,
    educationRes,
    coursesRes,
    testScoresRes,
    certificationsRes,
    goalsRes,
    benchmarkSummary,
    contactInfo,
    skillsRes,
    languagesRes,
    featuredItems,
    profileViewCounts,
    scoringFacts,
  ] = await Promise.all([
    supabase.from("profile_scores").select("*").eq("user_id", userId),
    supabase.from("activities").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("sports_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("awards").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("research_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("volunteering_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("work_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("education_records").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("courses").select("*").eq("user_id", userId).order("academic_year", { ascending: false, nullsFirst: false }).order("course_name"),
    supabase.from("test_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("certifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("career_goals").select("*").eq("user_id", userId).order("status", { ascending: true }).order("target_date", { ascending: true, nullsFirst: false }),
    getPeerBenchmarks(userId),
    getOwnContactInfo(supabase, userId),
    supabase.from("skills").select("*").eq("user_id", userId).order("category").order("name"),
    supabase.from("languages").select("*").eq("user_id", userId).order("name"),
    getFeaturedItems(userId, { isSelf: true, isPublic: false }),
    getProfileViewCounts(supabase, userId),
    assembleScoringFacts(supabase, userId),
  ]);

  // Canonical opportunity titles resolved for display only — `activities` has no
  // denormalized column for them, unlike every organization_entity_id field. One batched query.
  const activities = await attachOpportunityTitles(supabase, activitiesRes.data ?? []);

  const completenessChecklist = getCompletenessChecklist({
    ...scoringFacts,
    profile: {
      country: profile?.country ?? null,
      school_name: profile?.school_name ?? null,
      graduation_year: profile?.graduation_year ?? null,
      curriculum: profile?.curriculum ?? null,
      headline: profile?.headline ?? null,
      about: profile?.about ?? null,
    },
    skillCount: skillsRes.data?.length ?? 0,
    featuredCount: featuredItems.length,
    hasContactInfo: hasAnyContactValue(contactInfo),
  });
  const completenessPercent = profile?.completeness_percent ?? 0;
  const remainingSuggestions = completenessChecklist.filter((item) => !item.done);

  const featuredManagerItems: FeaturedManagerItem[] = featuredItems.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    organization: item.organization,
    url: item.url,
  }));
  const featuredCandidates = {
    project: (projectsRes.data ?? []).map((p) => ({ id: p.id, label: p.title })),
    research_experience: (researchRes.data ?? []).map((r) => ({ id: r.id, label: r.title })),
    award: (awardsRes.data ?? []).map((a) => ({ id: a.id, label: a.title })),
    activity: activities.map((a) => ({ id: a.id, label: a.title })),
    work_experience: (workRes.data ?? []).map((w) => ({ id: w.id, label: w.title })),
    volunteering_experience: (volunteeringRes.data ?? []).map((v) => ({ id: v.id, label: v.title })),
    sports_experience: (sportsRes.data ?? []).map((s) => ({ id: s.id, label: s.sport })),
  };

  const isAdult = isLikelyAdult(profile?.birth_year ?? null);

  const scoreMap = Object.fromEntries(
    (scoresRes.data ?? []).map((s) => [s.dimension, { score: s.score, confidence: s.confidence }])
  ) as Partial<Record<ProfileDimension, { score: number; confidence: "high" | "medium" | "low" }>>;
  const radarScores = Object.fromEntries(Object.entries(scoreMap).map(([k, v]) => [k, v!.score]));
  // One spine over the ten achievement tables (UI-V3 § 16). Reuses the rows already
  // fetched above — no extra queries.
  const journeyEntries = buildJourney({
    activities: activitiesRes.data ?? [],
    projects: projectsRes.data ?? [],
    research: researchRes.data ?? [],
    work: workRes.data ?? [],
    volunteering: volunteeringRes.data ?? [],
    sports: sportsRes.data ?? [],
    awards: awardsRes.data ?? [],
    certifications: certificationsRes.data ?? [],
    courses: coursesRes.data ?? [],
    testScores: testScoresRes.data ?? [],
    education: educationRes.data ?? [],
  });

  const profileSignal = toProfileSignal(scoresRes.data ?? []);

  // Oryn's own note on the record. Ordered so the honest case wins: with nothing confidently
  // scored it asks for evidence rather than diagnosing (Phase 68); then it names a real
  // missing area; then, when there's nothing to flag, it names the strongest area, which is
  // what makes a later "you don't need more of this" believable.
  const coverage = signalCoverage(profileSignal);
  const weakest = profileSignal.filter((row) => row.state === "emerging").at(-1) ?? null;
  const strongest = profileSignal.find((row) => row.state === "strong") ?? null;
  const journeyNote: { variant: "gap" | "strength"; eyebrow: string; title: string; body: string } | null =
    !hasConfidentSignal(profileSignal)
      ? {
          variant: "gap",
          eyebrow: t("page.journeyNote.emptyEyebrow"),
          title: t("page.journeyNote.emptyTitle"),
          body: t("page.journeyNote.emptyBody"),
        }
      : weakest
        ? {
            variant: "gap",
            eyebrow: t("page.journeyNote.gapEyebrow"),
            title: t("page.journeyNote.gapTitle", { dimension: dimensionLabel(weakest.dimension, locale) }),
            body:
              coverage.awaitingEvidence > 0
                ? t("page.journeyNote.gapBodyWithAwaiting", { assessed: coverage.assessed, awaitingEvidence: coverage.awaitingEvidence })
                : t("page.journeyNote.gapBodySimple"),
          }
        : strongest
          ? {
              variant: "strength",
              eyebrow: t("page.journeyNote.strengthEyebrow"),
              title: t("page.journeyNote.strengthTitle", { dimension: dimensionLabel(strongest.dimension, locale) }),
              body: t("page.journeyNote.strengthBody"),
            }
          : null;

  // AchievementSection is a Client Component; a plain function prop like the old
  // `renderSummary={(item) => ({...})}` can't cross the Server->Client boundary (only a
  // "use server" Action can) — computed here instead, server-side, into a plain
  // id-keyed data map. See achievement-section.tsx's own comment for the full story.
  const summaryMap = <T extends { id: string }>(items: T[], summarize: (item: T) => { title: string; subtitle?: string }) =>
    Object.fromEntries(items.map((item) => [item.id, summarize(item)]));

  // Shared with QuickAddEntry below, so the picker's "meaningful fields only" defaults and
  // the full Edit dialog's defaults can never quietly drift apart into two answers for
  // "what does a blank Activity look like."
  const activityDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, category: "other", description: null, is_leadership_role: false, people_led: null, organization_scope: null, opportunity_title: null, opportunity_id: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, story_notes: null };
  const projectDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, description: null, role: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null, location: null, story_notes: null };
  const awardDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, level: null, description: null, award_date: null, location: null, story_notes: null };
  const researchDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, mentor_name: null, field: null, description: null, methodology: null, independence_level: null, output_type: "none", output_url: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null, story_notes: null };
  const volunteeringDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, description: null, cause_area: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, story_notes: null };
  const workDefaults: FormValues = { title: "", organization: "", organization_entity_id: null, employment_type: "internship", description: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, paid: null, location: null, story_notes: null };
  const educationDefaults: FormValues = { school_name: "", school_entity_id: null, country: null, stage: "high_school", curriculum: null, start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null };
  const courseDefaults: FormValues = { course_name: "", level: "regular", subject: null, academic_year: null, grade_value: null, grade_scale: null, credit_hours: null };
  const testScoreDefaults: FormValues = { test_name: "", score: "", max_score: null, test_date: null };
  const certificationDefaults: FormValues = { title: "", organization: null, organization_entity_id: null, description: null, issue_date: null, expiry_date: null, credential_url: null };
  const sportsDefaults: FormValues = { sport: "", discipline: null, team_name: null, team_entity_id: null, position: null, level: null, us_specific_label: null, is_captain: false, achievements: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, description: null, story_notes: null };

  // Figma handoff (package 1) + AGENTS.md Phase 5: a single "What would you like to add?"
  // entry point, one short step per type, instead of scrolling to the right one of eleven
  // AchievementSection blocks below and opening its full every-field dialog. Deliberately
  // scoped to the "things I did/attended" achievement types (the Figma reference's own list,
  // plus Sports and Education, which share the same shape and cadence) — Goals, Skills, and
  // Languages are conceptually different (a plan, not a record of something done) and their
  // own AchievementSection dialogs are already two or three fields, so a second fast path
  // would add a step rather than remove one. Every field list below is
  // `X_FIELDS.filter(f => f.quickAdd)` — the exact same FieldConfig objects the full Edit
  // dialog renders, never a duplicated field list — and every `onCreate` is the same Server
  // Action AchievementSection's own "Add" button already calls, so validation, entity
  // resolution, scoring recompute, and the timeline's revalidation all just work unchanged.
  // `icon` is a pre-rendered element, not a component reference — QuickAddType's own doc
  // comment (features/profile/quick-add-entry.tsx) explains why: this array is built in a
  // Server Component and handed to a Client Component, and React's RSC boundary rejects a
  // raw component/forwardRef value passed as plain prop data. Caught live in the browser
  // (app/(dev-preview)/design-preview/quick-add), not by QuickAddEntry's own tests, which
  // render it directly with no RSC boundary to cross.
  const iconProps = { className: "size-4 text-ink-3", "aria-hidden": true as const };
  const quickAddTypes: QuickAddType[] = [
    { key: "activity", label: t("page.quickAdd.activity"), icon: <Sparkles {...iconProps} />, fields: ACTIVITY_FIELDS.filter((f) => f.quickAdd), defaultValues: activityDefaults, onCreate: createActivity as (v: FormValues) => Promise<{ error?: string }> },
    // Not its own table — a competition is an Activity with category preset to
    // "competition_team" (see ACTIVITY_CATEGORY_OPTIONS). Distinct picker tile because
    // "Activity" and "Competition" read as different things to a student even though Oryn
    // stores them identically; the category select still shows in the short form so the
    // preset is visible and changeable, not a silent guess.
    { key: "competition", label: t("page.quickAdd.competition"), icon: <Trophy {...iconProps} />, fields: ACTIVITY_FIELDS.filter((f) => f.quickAdd), defaultValues: { ...activityDefaults, category: "competition_team" }, onCreate: createActivity as (v: FormValues) => Promise<{ error?: string }> },
    { key: "award", label: t("page.quickAdd.award"), icon: <Medal {...iconProps} />, fields: AWARD_FIELDS.filter((f) => f.quickAdd), defaultValues: awardDefaults, onCreate: createAward as (v: FormValues) => Promise<{ error?: string }> },
    { key: "research", label: t("page.quickAdd.research"), icon: <FlaskConical {...iconProps} />, fields: RESEARCH_FIELDS.filter((f) => f.quickAdd), defaultValues: researchDefaults, onCreate: createResearchExperience as (v: FormValues) => Promise<{ error?: string }> },
    // Also not its own table — work_experiences with employment_type preset to
    // "internship"; same visible-not-silent treatment as Competition above.
    { key: "internship", label: t("page.quickAdd.internship"), icon: <Briefcase {...iconProps} />, fields: WORK_EXPERIENCE_FIELDS.filter((f) => f.quickAdd), defaultValues: workDefaults, onCreate: createWorkExperience as (v: FormValues) => Promise<{ error?: string }> },
    { key: "volunteering", label: t("page.quickAdd.volunteering"), icon: <HandHeart {...iconProps} />, fields: VOLUNTEERING_FIELDS.filter((f) => f.quickAdd), defaultValues: volunteeringDefaults, onCreate: createVolunteering as (v: FormValues) => Promise<{ error?: string }> },
    { key: "course", label: t("page.quickAdd.course"), icon: <BookOpen {...iconProps} />, fields: COURSE_FIELDS.filter((f) => f.quickAdd), defaultValues: courseDefaults, onCreate: createCourse as (v: FormValues) => Promise<{ error?: string }> },
    { key: "test_score", label: t("page.quickAdd.testScore"), icon: <ClipboardCheck {...iconProps} />, fields: TEST_SCORE_FIELDS.filter((f) => f.quickAdd), defaultValues: testScoreDefaults, onCreate: createTestScore as (v: FormValues) => Promise<{ error?: string }> },
    { key: "project", label: t("page.quickAdd.project"), icon: <Hammer {...iconProps} />, fields: PROJECT_FIELDS.filter((f) => f.quickAdd), defaultValues: projectDefaults, onCreate: createProject as (v: FormValues) => Promise<{ error?: string }> },
    { key: "certification", label: t("page.quickAdd.certification"), icon: <BadgeCheck {...iconProps} />, fields: CERTIFICATION_FIELDS.filter((f) => f.quickAdd), defaultValues: certificationDefaults, onCreate: createCertification as (v: FormValues) => Promise<{ error?: string }> },
    { key: "sport", label: t("page.quickAdd.sport"), icon: <Dumbbell {...iconProps} />, fields: SPORTS_FIELDS.filter((f) => f.quickAdd), defaultValues: sportsDefaults, onCreate: createSportsExperience as (v: FormValues) => Promise<{ error?: string }> },
    { key: "education", label: t("page.quickAdd.education"), icon: <GraduationCap {...iconProps} />, fields: EDUCATION_FIELDS.filter((f) => f.quickAdd), defaultValues: educationDefaults, onCreate: createEducationRecord as (v: FormValues) => Promise<{ error?: string }> },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
        action={
          <div className="flex flex-col items-end gap-1 text-sm">
            <Link href="/profile/import" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
              {t("page.scanCv")} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      />

      {/* Was 14 AchievementSection blocks plus five one-off sections stacked in a single
          scroll, every one visible (and every "Add" dialog reachable) only by scrolling
          past all the others first — the single biggest source of "this page is
          overwhelming" feedback. Tabs don't remove anything; every section below is
          unchanged. They just mean a student sees one coherent group at a time instead of
          the entire record's editing surface at once. Overview keeps every read-only/
          identity block (nothing here is a repeated pattern, so nothing here needed
          grouping); the other four tabs group the 14 AchievementSection blocks by what a
          student would actually think to look for, not by database table. */}
      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="overview">{t("page.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="academics">{t("page.tabs.academics")}</TabsTrigger>
          <TabsTrigger value="experience">{t("page.tabs.experience")}</TabsTrigger>
          <TabsTrigger value="recognition">{t("page.tabs.recognition")}</TabsTrigger>
          <TabsTrigger value="skills">{t("page.tabs.skills")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10 pt-2">
          <section className="glass-card space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-8">
            <SectionHeader title={t("page.professionalProfile.title")} description={t("page.professionalProfile.description")} />
            <ProfessionalIdentityForm
              initialHeadline={profile?.headline ?? null}
              initialAbout={profile?.about ?? null}
            />
            <div className="border-t pt-6">
              <h3 className="mb-3 text-sm font-semibold">{t("page.openTo")}</h3>
              <OpenToForm initialSelected={profile?.open_to ?? []} initialVisibility={contactInfo.open_to_visibility} />
            </div>
            <div className="border-t pt-6">
              <h3 className="mb-3 text-sm font-semibold">{t("page.contactInformation")}</h3>
              <ContactInfoForm initialContact={contactInfo} isAdult={isAdult} />
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("page.featured.title")} description={t("page.featured.description")} />
            <FeaturedManager initialItems={featuredManagerItems} candidates={featuredCandidates} />
          </section>

          <section className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-3">
              <SectionHeader title={t("page.strength.title")} description={t("page.strength.description")} />
              <Progress value={completenessPercent} />
              <p className="text-sm text-muted-foreground">{t("page.strength.percentComplete", { percent: completenessPercent })}</p>
              {remainingSuggestions.length > 0 ? (
                <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                  {remainingSuggestions.map((item) => (
                    <li key={item.label}>{item.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("page.strength.fullyFilled")}</p>
              )}
            </div>
            <div className="shrink-0 space-y-1 text-sm text-muted-foreground md:text-right">
              <p className="font-medium text-foreground">{t("page.views.label")}</p>
              <p>{t("page.views.last7Days", { count: profileViewCounts.last7Days })}</p>
              <p>{t("page.views.last30Days", { count: profileViewCounts.last30Days })}</p>
            </div>
          </section>

          {/* The one deliberately contained module on this page — it's the page's single
              "this is the point" surface, which is what rounded-3xl is reserved for.
              `DimensionBars` (a 0-100 fill per dimension) was replaced by the same qualitative
              ProfileSignal the dashboard uses: a bar implies a track you're meant to fill, and
              founder direction is explicit that evidence states beat percentages. The score is
              still shown here, as quiet metadata beside the word rather than as the reading —
              this is the detail view, so the figure earns a place it hasn't earned on Home. */}
          <section className="grid gap-8 rounded-3xl border border-brand-primary-border bg-brand-primary-subtle p-6 md:grid-cols-2 md:p-8">
            <ScoreRadar scores={radarScores} />
            <div className="flex flex-col justify-center">
              <ProfileSignal signal={profileSignal} showScores heading={t("page.whereYouStand")} locale={locale} />
            </div>
          </section>

          {/* UI-V3 § 17 — Oryn annotating the record rather than only storing it. Both branches
              are derived from the same signal the block above renders, so the annotation can
              never contradict what the student just read. Strengths are named as well as gaps:
              a page that only ever points at what's missing reads as a scold, and the master
              spec's Phase 39 is explicit that recognising an existing strength is itself
              advice — it's what makes "you don't need more of this" credible. */}
          {journeyNote ? (
            <InsightCard variant={journeyNote.variant} eyebrow={journeyNote.eyebrow} title={journeyNote.title} locale={locale}>
              {journeyNote.body}
            </InsightCard>
          ) : null}

          <section className="space-y-6">
            <SectionHeader
              title={t("page.journey.title")}
              description={t("page.journey.description")}
              action={<QuickAddEntry types={quickAddTypes} />}
            />
            <JourneyTimeline entries={journeyEntries} />
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("page.peerComparison")} />
            <PeerBenchmark summary={benchmarkSummary} />
          </section>
        </TabsContent>

        <TabsContent value="academics" className="space-y-8 pt-2">
          <AchievementSection
            glowVariant="glass-card"
            title={t("page.sections.education.title")}
            description={t("page.sections.education.description")}
            items={educationRes.data ?? []}
            summaries={summaryMap(educationRes.data ?? [], (item) => ({ title: item.school_name, subtitle: item.country ?? undefined }))}
            fields={EDUCATION_FIELDS}
            defaultValues={educationDefaults}
            onCreate={createEducationRecord as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateEducationRecord as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteEducationRecord}
            emptyStateText={t("page.sections.education.empty")}
          />

          <AchievementSection
            glowVariant="glass-card-offset"
            title={t("page.sections.coursework.title")}
            description={t("page.sections.coursework.description")}
            items={coursesRes.data ?? []}
            summaries={summaryMap(coursesRes.data ?? [], (item) => ({
              title: item.course_name,
              subtitle: [COURSE_LEVEL_LABELS[item.level] ?? item.level, item.academic_year, item.grade_value ? t("page.gradePrefix", { value: item.grade_value }) : null]
                .filter(Boolean)
                .join(" · ") || undefined,
            }))}
            fields={COURSE_FIELDS}
            defaultValues={courseDefaults}
            onCreate={createCourse as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateCourse as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteCourse}
            emptyStateText={t("page.sections.coursework.empty")}
          />

          <AchievementSection
            glowVariant="glass-card-fast"
            title={t("page.sections.testScores.title")}
            description={t("page.sections.testScores.description")}
            items={testScoresRes.data ?? []}
            summaries={summaryMap(testScoresRes.data ?? [], (item) => ({ title: item.test_name, subtitle: item.score }))}
            fields={TEST_SCORE_FIELDS}
            defaultValues={testScoreDefaults}
            onCreate={createTestScore as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateTestScore as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteTestScore}
            emptyStateText={t("page.sections.testScores.empty")}
          />
        </TabsContent>

        <TabsContent value="experience" className="space-y-8 pt-2">
          <AchievementSection
            glowVariant="glass-card-offset2"
            title={t("page.sections.activities.title")}
            description={t("page.sections.activities.description")}
            items={activities}
            summaries={summaryMap(activities, (item) => ({ title: item.title, subtitle: item.organization ?? undefined }))}
            fields={ACTIVITY_FIELDS}
            defaultValues={activityDefaults}
            onCreate={createActivity as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateActivity as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteActivity}
            emptyStateText={t("page.sections.activities.empty")}
          />

          <AchievementSection
            glowVariant="glass-card"
            title={t("page.sections.sports.title")}
            description={t("page.sections.sports.description")}
            items={sportsRes.data ?? []}
            summaries={summaryMap(sportsRes.data ?? [], (item) => ({
              title: item.sport,
              subtitle: [item.team_name, item.is_captain ? t("page.captain") : null].filter(Boolean).join(" · ") || undefined,
            }))}
            fields={SPORTS_FIELDS}
            defaultValues={sportsDefaults}
            onCreate={createSportsExperience as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateSportsExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteSportsExperience}
            emptyStateText={t("page.sections.sports.empty")}
          />

          <AchievementSection
            glowVariant="glass-card-offset"
            title={t("page.sections.projects.title")}
            description={t("page.sections.projects.description")}
            items={projectsRes.data ?? []}
            summaries={summaryMap(projectsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.outcome_summary ?? item.organization ?? undefined }))}
            fields={PROJECT_FIELDS}
            defaultValues={projectDefaults}
            onCreate={createProject as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateProject as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteProject}
            emptyStateText={t("page.sections.projects.empty")}
          />

          <div className="flex justify-end">
            <ResearchIdeaGenerator />
          </div>
          <AchievementSection
            glowVariant="glass-card-fast"
            title={t("page.sections.research.title")}
            description={t("page.sections.research.description")}
            items={researchRes.data ?? []}
            summaries={summaryMap(researchRes.data ?? [], (item) => ({ title: item.title, subtitle: item.field ?? undefined }))}
            fields={RESEARCH_FIELDS}
            defaultValues={researchDefaults}
            onCreate={createResearchExperience as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateResearchExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteResearchExperience}
            emptyStateText={t("page.sections.research.empty")}
          />

          <AchievementSection
            glowVariant="glass-card-offset2"
            title={t("page.sections.workExperience.title")}
            description={t("page.sections.workExperience.description")}
            items={workRes.data ?? []}
            summaries={summaryMap(workRes.data ?? [], (item) => ({ title: item.title, subtitle: item.organization }))}
            fields={WORK_EXPERIENCE_FIELDS}
            defaultValues={workDefaults}
            onCreate={createWorkExperience as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateWorkExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteWorkExperience}
            emptyStateText={t("page.sections.workExperience.empty")}
          />

          <AchievementSection
            glowVariant="glass-card"
            title={t("page.sections.volunteering.title")}
            description={t("page.sections.volunteering.description")}
            items={volunteeringRes.data ?? []}
            summaries={summaryMap(volunteeringRes.data ?? [], (item) => ({ title: item.title, subtitle: item.cause_area ?? undefined }))}
            fields={VOLUNTEERING_FIELDS}
            defaultValues={volunteeringDefaults}
            onCreate={createVolunteering as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateVolunteering as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteVolunteering}
            emptyStateText={t("page.sections.volunteering.empty")}
          />
        </TabsContent>

        <TabsContent value="recognition" className="space-y-8 pt-2">
          <AchievementSection
            glowVariant="glass-card-offset"
            title={t("page.sections.awards.title")}
            description={t("page.sections.awards.description")}
            items={awardsRes.data ?? []}
            summaries={summaryMap(awardsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.level ?? undefined }))}
            fields={AWARD_FIELDS}
            defaultValues={awardDefaults}
            onCreate={createAward as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateAward as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteAward}
            emptyStateText={t("page.sections.awards.empty")}
          />

          <AchievementSection
            glowVariant="glass-card-fast"
            title={t("page.sections.certifications.title")}
            description={t("page.sections.certifications.description")}
            items={certificationsRes.data ?? []}
            summaries={summaryMap(certificationsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.organization ?? undefined }))}
            fields={CERTIFICATION_FIELDS}
            defaultValues={certificationDefaults}
            onCreate={createCertification as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateCertification as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteCertification}
            emptyStateText={t("page.sections.certifications.empty")}
          />
        </TabsContent>

        <TabsContent value="skills" className="space-y-8 pt-2">
          <AchievementSection
            glowVariant="glass-card-offset2"
            title={t("page.sections.goals.title")}
            description={t("page.sections.goals.description")}
            items={goalsRes.data ?? []}
            summaries={summaryMap(goalsRes.data ?? [], (item) => ({ title: item.title, subtitle: [item.category, item.status !== "active" ? item.status : null].filter(Boolean).join(" · ") || undefined }))}
            fields={GOAL_FIELDS}
            defaultValues={{ title: "", category: null, target_date: null, status: "active" }}
            onCreate={createGoal as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateGoal as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteGoal}
            emptyStateText={t("page.sections.goals.empty")}
          />

          <AchievementSection
            glowVariant="glass-card"
            title={t("page.sections.skills.title")}
            description={t("page.sections.skills.description")}
            items={skillsRes.data ?? []}
            summaries={summaryMap(skillsRes.data ?? [], (item) => ({ title: item.name, subtitle: item.proficiency ?? undefined }))}
            fields={SKILL_FIELDS}
            defaultValues={{ name: "", category: "other", proficiency: null }}
            onCreate={createSkill as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateSkill as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteSkill}
            emptyStateText={t("page.sections.skills.empty")}
          />

          {/* The `languages` table has existed since the initial schema but was never surfaced,
              so a bilingual student had nowhere to record it — which matters for a product
              whose users apply internationally and where language level is a real admissions
              gate. Certificates (IELTS, TOEFL, DELF…) go in Certifications above, which already
              carries an issuer and a date; duplicating that here would be a worse model. */}
          <AchievementSection
            glowVariant="glass-card-offset"
            title={t("page.sections.languages.title")}
            description={t("page.sections.languages.description")}
            items={languagesRes.data ?? []}
            summaries={summaryMap(languagesRes.data ?? [], (item) => ({
              title: item.name,
              subtitle: languageProficiencyLabel(item.proficiency) ?? undefined,
            }))}
            fields={LANGUAGE_FIELDS}
            defaultValues={{ name: "", proficiency: null }}
            onCreate={createLanguage as (v: FormValues) => Promise<{ error?: string }>}
            onUpdate={updateLanguage as (id: string, v: FormValues) => Promise<{ error?: string }>}
            onDelete={deleteLanguage}
            emptyStateText={t("page.sections.languages.empty")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
