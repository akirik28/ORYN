import { notFound } from "next/navigation";
import { Sparkles, Trophy, Medal, FlaskConical, Briefcase, HandHeart, BookOpen, ClipboardCheck, Hammer, BadgeCheck, Dumbbell, GraduationCap } from "lucide-react";
import { PreviewShell } from "../preview-shell";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { QuickAddEntry, type QuickAddType } from "@/features/profile/quick-add-entry";
import {
  ACTIVITY_FIELDS,
  PROJECT_FIELDS,
  AWARD_FIELDS,
  RESEARCH_FIELDS,
  VOLUNTEERING_FIELDS,
  WORK_EXPERIENCE_FIELDS,
  EDUCATION_FIELDS,
  COURSE_FIELDS,
  TEST_SCORE_FIELDS,
  CERTIFICATION_FIELDS,
  SPORTS_FIELDS,
} from "@/features/profile/field-config";

// Dev-only visual/interaction harness for QuickAddEntry (Figma handoff package 1, UI-V3
// shell) — same pattern and same hard production gate as ../page.tsx. Isolated from the real
// Journey page's data-fetching (app/(app)/profile/page.tsx has no *-view.tsx split yet to
// mount here directly) so this exists specifically to browser-verify the picker/short-form
// flow itself: field presence per type, Back/Cancel, validation-error surfacing, and layout
// at mobile widths — without needing Supabase, which this sandbox doesn't have.
//
// `onCreate` below is a stub, not the real Server Action — it can't be (requireUser() would
// throw with no real session). Toggle `SIMULATE_ERROR` to preview the failure path. Needs its
// own inline "use server" directive: a plain async function (unlike the real createX actions
// this stands in for, each already a genuine Server Action) can't cross the Server ->
// Client boundary as a prop at all — "Event handlers cannot be passed to Client Component
// props," caught live via this same preview page.
const SIMULATE_ERROR = false;

async function stubCreate(values: Record<string, unknown>): Promise<{ error?: string }> {
  "use server";
  await new Promise((resolve) => setTimeout(resolve, 400));
  console.log("[quick-add preview] would submit:", values);
  if (SIMULATE_ERROR) return { error: "Score is required." };
  return {};
}

// Pre-rendered elements, not component references — see QuickAddType's doc comment
// (features/profile/quick-add-entry.tsx) for why a Server Component can't pass the latter.
const iconProps = { className: "size-4 text-ink-3", "aria-hidden": true as const };
const PREVIEW_TYPES: QuickAddType[] = [
  { key: "activity", label: "Activity", icon: <Sparkles {...iconProps} />, fields: ACTIVITY_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null, category: "other" }, onCreate: stubCreate },
  { key: "competition", label: "Competition", icon: <Trophy {...iconProps} />, fields: ACTIVITY_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null, category: "competition_team" }, onCreate: stubCreate },
  { key: "award", label: "Award", icon: <Medal {...iconProps} />, fields: AWARD_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null }, onCreate: stubCreate },
  { key: "research", label: "Research", icon: <FlaskConical {...iconProps} />, fields: RESEARCH_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null, field: null }, onCreate: stubCreate },
  { key: "internship", label: "Internship", icon: <Briefcase {...iconProps} />, fields: WORK_EXPERIENCE_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: "", organization_entity_id: null, employment_type: "internship" }, onCreate: stubCreate },
  { key: "volunteering", label: "Volunteering", icon: <HandHeart {...iconProps} />, fields: VOLUNTEERING_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null }, onCreate: stubCreate },
  { key: "course", label: "Course", icon: <BookOpen {...iconProps} />, fields: COURSE_FIELDS.filter((f) => f.quickAdd), defaultValues: { course_name: "", level: "regular" }, onCreate: stubCreate },
  { key: "test_score", label: "Test score", icon: <ClipboardCheck {...iconProps} />, fields: TEST_SCORE_FIELDS.filter((f) => f.quickAdd), defaultValues: { test_name: "", score: "", max_score: null, test_date: null }, onCreate: stubCreate },
  { key: "project", label: "Project", icon: <Hammer {...iconProps} />, fields: PROJECT_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null }, onCreate: stubCreate },
  { key: "certification", label: "Certification", icon: <BadgeCheck {...iconProps} />, fields: CERTIFICATION_FIELDS.filter((f) => f.quickAdd), defaultValues: { title: "", organization: null, organization_entity_id: null }, onCreate: stubCreate },
  { key: "sport", label: "Sport", icon: <Dumbbell {...iconProps} />, fields: SPORTS_FIELDS.filter((f) => f.quickAdd), defaultValues: { sport: "", team_name: null, team_entity_id: null }, onCreate: stubCreate },
  { key: "education", label: "Education", icon: <GraduationCap {...iconProps} />, fields: EDUCATION_FIELDS.filter((f) => f.quickAdd), defaultValues: { school_name: "", school_entity_id: null, stage: "high_school" }, onCreate: stubCreate },
];

export default function QuickAddPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Journey — quick add (package 1)</p>
        <div className="flex items-center justify-between rounded-2xl border p-6">
          <div>
            <h2 className="font-display text-2xl">Your journey</h2>
            <p className="text-sm text-muted-foreground">Everything on one timeline, newest first.</p>
          </div>
          <QuickAddEntry types={PREVIEW_TYPES} />
        </div>
      </div>
    </PreviewShell>
  );
}
