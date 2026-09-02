"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CurriculumType, TargetGeography } from "@/types/database";
import type { CompleteOnboardingInput } from "@/lib/validation/onboarding";
import { completeOnboarding } from "@/app/(onboarding)/onboarding/actions";
import { EntityCombobox } from "@/features/entities/entity-combobox";
import { SuggestInput } from "@/features/entities/suggest-input";
import { COUNTRY_SUGGESTIONS } from "@/lib/vocabularies/countries";
import { meetsMinimumSignupAge } from "@/lib/legal/age-policy";
import { InterestsStep } from "./steps/interests-step";
import { ImportStep, type ReviewedExtractedItem } from "./steps/import-step";
import type { CvImportReviewSkill, CvImportReviewLanguage } from "@/lib/profile/cv-import";

const TOTAL_STEPS = 5;
const currentYear = new Date().getFullYear();

function TogglePill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-(--duration-fast)",
        selected
          ? "border-brand-primary bg-brand-primary text-primary-foreground"
          : "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle"
      )}
    >
      {children}
    </button>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    // No `exit` prop: confirmed via document.getAnimations() in a live browser that
    // Motion never actually starts an exit animation for this element (zero Animation
    // objects, computed style fully settled at opacity:1/transform:none seconds after
    // the triggering click) -- prefers-reduced-motion ruled out separately. AnimatePresence
    // then waits indefinitely for a completion signal from an animation that was never
    // created, freezing the step transition on the very first click a student makes.
    // This was never a working effect being removed -- it never ran. Unverified
    // hypothesis for a future Motion upgrade to check: a ref-timing interaction between
    // motion.div and React 19, both bleeding-edge in this repo.
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </motion.div>
  );
}

export function OnboardingWizard() {
  const t = useTranslations("onboarding.wizard");
  const tCommon = useTranslations("common");
  // GOAL_OPTIONS has no separate stored value — the displayed string is what's persisted
  // in profiles.goals (a free-text string[], never pattern-matched elsewhere in the app,
  // confirmed before translating this file) — so it's translated directly rather than
  // given a value/label split like curriculum/geography below, which back real enum
  // columns and must keep a stable value independent of display language.
  const GOAL_OPTIONS = [
    t("goalOptions.competitiveUniversities"),
    t("goalOptions.exploringCareers"),
    t("goalOptions.buildingMyProfile"),
    t("goalOptions.findingOpportunities"),
    t("goalOptions.notSureYet"),
  ];
  const CURRICULUM_OPTIONS: { value: CurriculumType; label: string }[] = [
    { value: "ap", label: t("curriculumOptions.ap") },
    { value: "ib", label: t("curriculumOptions.ib") },
    { value: "a_level", label: t("curriculumOptions.aLevel") },
    { value: "turkish_curriculum", label: t("curriculumOptions.turkishCurriculum") },
    { value: "national_curriculum", label: t("curriculumOptions.nationalCurriculum") },
    { value: "other", label: t("curriculumOptions.other") },
  ];
  const GEOGRAPHY_OPTIONS: { value: TargetGeography; label: string }[] = [
    { value: "usa", label: t("geographyOptions.usa") },
    { value: "uk", label: t("geographyOptions.uk") },
    { value: "europe", label: t("geographyOptions.europe") },
    { value: "canada", label: t("geographyOptions.canada") },
    { value: "turkey", label: t("geographyOptions.turkey") },
    { value: "not_sure", label: t("geographyOptions.notSure") },
  ];
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Guards goNext/goBack against a second activation before the first has actually
  // changed `step` — see the effect below. Continue/Back have no `disabled` state of
  // their own (unlike Finish), so a real double-click or two fast keypresses previously
  // called setStep's functional updater twice in a row and silently skipped a step.
  const isAdvancing = useRef(false);

  const [goals, setGoals] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [graduationYear, setGraduationYear] = useState(String(currentYear + 1));
  // No default: a pre-filled year would be silently wrong for almost everyone, and this
  // one has to be right — it gates every age-restricted opportunity.
  const [birthYear, setBirthYear] = useState("");
  const [curriculum, setCurriculum] = useState<CurriculumType | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [targetGeographies, setTargetGeographies] = useState<TargetGeography[]>([]);
  const [reviewedItems, setReviewedItems] = useState<ReviewedExtractedItem[]>([]);
  const [reviewedSkills, setReviewedSkills] = useState<CvImportReviewSkill[]>([]);
  const [reviewedLanguages, setReviewedLanguages] = useState<CvImportReviewLanguage[]>([]);

  useEffect(() => {
    isAdvancing.current = false;
  }, [step]);

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function goNext() {
    if (isAdvancing.current) return;
    setError(null);
    if (step === 1 && (!country.trim() || !schoolName.trim() || !curriculum)) {
      setError(t("schoolStepError"));
      return;
    }
    // Checked here rather than only on submit: the student is four steps from the end at
    // this point, and a Zod error surfacing on the final button would send them back
    // through the wizard for one number. The bounds match CompleteOnboardingSchema's.
    //
    // graduationYear had no client-side check at all until this one — the <Input
    // min/max> attributes are advisory only (this button has an onClick handler, not a
    // real form submit, so the browser's native constraint validation never runs), and
    // finish()'s error handling doesn't navigate back to whichever step actually failed.
    // An out-of-range value (an empty field left mid-edit, a typo) would sail through
    // every step, get rejected only at the final "Finish" click, and land the student on
    // step 4 staring at a graduation-year error with no graduation-year field in sight.
    if (step === 1) {
      const gradYear = Number(graduationYear);
      if (!graduationYear.trim() || !Number.isInteger(gradYear) || gradYear < currentYear || gradYear > currentYear + 8) {
        setError(t("graduationYearError"));
        return;
      }
    }
    if (step === 1) {
      const year = Number(birthYear);
      if (!birthYear.trim() || !Number.isInteger(year) || year < currentYear - 100 || year > currentYear - 10) {
        setError(t("birthYearError"));
        return;
      }
      // Separate message from the format check above on purpose — this is the
      // minimum-age policy (lib/legal/age-policy.ts), not a plausibility bound, and the
      // server re-checks it independently (completeOnboarding) rather than trusting this
      // client-side pass. This copy is what most students who fail it will actually see;
      // the server check exists so it can't be bypassed, not because this one is unreliable.
      if (!meetsMinimumSignupAge(year)) {
        setError(t("birthYearTooYoung"));
        return;
      }
    }
    isAdvancing.current = true;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    if (isAdvancing.current) return;
    setError(null);
    isAdvancing.current = true;
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    setError(null);
    const payload: CompleteOnboardingInput = {
      goals,
      country: country.trim(),
      schoolName: schoolName.trim(),
      schoolId,
      graduationYear: Number(graduationYear),
      birthYear: Number(birthYear),
      curriculum: curriculum as CompleteOnboardingInput["curriculum"],
      interests,
      targetGeographies,
      extractedItems: reviewedItems
        .filter((item) => item.included)
        .map(({ category, title, organization, organizationEntityId, description, startDate, endDate }) => ({
          category,
          title,
          organization,
          organizationEntityId,
          description,
          startDate,
          endDate,
        })),
      extractedSkills: reviewedSkills
        .filter((skill) => skill.included)
        // Skill proficiency isn't collected during review (lib/profile/cv-import.ts's own
        // comment on CvImportReviewSkill) — null here, editable later on the profile like
        // any manually-added skill's own optional proficiency field.
        .map(({ name, category }) => ({ name, category, proficiency: null })),
      extractedLanguages: reviewedLanguages
        .filter((language) => language.included)
        .map(({ name, proficiency }) => ({ name, proficiency })),
    };

    startTransition(async () => {
      const result = await completeOnboarding(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      <Progress value={((step + 1) / TOTAL_STEPS) * 100} />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <StepShell key="0" title={t("goalsTitle")} subtitle={t("goalsSubtitle")}>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((goal) => (
                <TogglePill key={goal} selected={goals.includes(goal)} onClick={() => toggle(goals, goal, setGoals)}>
                  {goal}
                </TogglePill>
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell key="1" title={t("schoolTitle")} subtitle={t("schoolSubtitle")}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">{t("countryLabel")}</Label>
                <SuggestInput id="country" value={country} onChange={setCountry} suggestions={COUNTRY_SUGGESTIONS} placeholder={t("countryPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">{t("schoolLabel")}</Label>
                <EntityCombobox
                  id="school"
                  scope="school"
                  value={schoolName}
                  entityId={schoolId}
                  context={{ country: country.trim() || null }}
                  placeholder={t("schoolPlaceholder")}
                  allowCustom
                  customLabel="school"
                  onChange={(next) => {
                    setSchoolName(next.displayName);
                    setSchoolId(next.id);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gradYear">{t("graduationYearLabel")}</Label>
                  <Input
                    id="gradYear"
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    min={currentYear}
                    max={currentYear + 8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthYear">{t("birthYearLabel")}</Label>
                  <Input
                    id="birthYear"
                    type="number"
                    inputMode="numeric"
                    placeholder={String(currentYear - 16)}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    min={currentYear - 100}
                    max={currentYear - 10}
                    aria-describedby="birthYear-why"
                  />
                  {/* Says what it is for, in the student's terms. Without this the question
                      reads as one more form field to resent; with it, it reads as the thing
                      that stops every opportunity card saying "Oryn can't check this". */}
                  <p id="birthYear-why" className="text-xs text-muted-foreground">{t("birthYearWhy")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curriculum">{t("curriculumLabel")}</Label>
                  <Select value={curriculum} onValueChange={(v) => v && setCurriculum(v as CurriculumType)}>
                    <SelectTrigger id="curriculum" className="w-full">
                      <SelectValue placeholder={tCommon("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRICULUM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell key="2" title={t("interestsTitle")} subtitle={t("interestsSubtitle")}>
            <InterestsStep interests={interests} setInterests={setInterests} />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell key="3" title={t("geographyTitle")} subtitle={t("geographySubtitle")}>
            <div className="flex flex-wrap gap-2">
              {GEOGRAPHY_OPTIONS.map((option) => (
                <TogglePill
                  key={option.value}
                  selected={targetGeographies.includes(option.value)}
                  onClick={() => toggle(targetGeographies, option.value, setTargetGeographies)}
                >
                  {option.label}
                </TogglePill>
              ))}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell key="4" title={t("importTitle")} subtitle={t("importSubtitle")}>
            <ImportStep
              reviewedItems={reviewedItems}
              setReviewedItems={setReviewedItems}
              reviewedSkills={reviewedSkills}
              setReviewedSkills={setReviewedSkills}
              reviewedLanguages={reviewedLanguages}
              setReviewedLanguages={setReviewedLanguages}
              country={country}
            />
          </StepShell>
        )}
      </AnimatePresence>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="ghost" onClick={goBack} disabled={step === 0 || isPending}>
          <ArrowLeft className="size-4" /> {t("back")}
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={goNext}>
            {t("continue")} <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? t("settingUp") : t("finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
