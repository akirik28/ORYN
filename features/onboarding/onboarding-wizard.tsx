"use client";

import { useState, useTransition } from "react";
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
import { GOAL_OPTIONS, CURRICULUM_OPTIONS, GEOGRAPHY_OPTIONS } from "@/lib/validation/onboarding";
import type { CurriculumType, TargetGeography } from "@/types/database";
import type { CompleteOnboardingInput } from "@/lib/validation/onboarding";
import { completeOnboarding } from "@/app/(onboarding)/onboarding/actions";
import { InterestsStep } from "./steps/interests-step";
import { ImportStep, type ReviewedExtractedItem } from "./steps/import-step";

const TOTAL_STEPS = 5;
const currentYear = new Date().getFullYear();

function TogglePill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </motion.div>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [graduationYear, setGraduationYear] = useState(String(currentYear + 1));
  const [curriculum, setCurriculum] = useState<CurriculumType | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [targetGeographies, setTargetGeographies] = useState<TargetGeography[]>([]);
  const [reviewedItems, setReviewedItems] = useState<ReviewedExtractedItem[]>([]);

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function goNext() {
    setError(null);
    if (step === 1 && (!country.trim() || !schoolName.trim() || !curriculum)) {
      setError("Fill in your country, school, and curriculum to continue.");
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    setError(null);
    const payload: CompleteOnboardingInput = {
      goals,
      country: country.trim(),
      schoolName: schoolName.trim(),
      graduationYear: Number(graduationYear),
      curriculum: curriculum as CompleteOnboardingInput["curriculum"],
      interests,
      targetGeographies,
      extractedItems: reviewedItems
        .filter((item) => item.included)
        .map(({ category, title, organization, description, startDate, endDate }) => ({
          category,
          title,
          organization,
          description,
          startDate,
          endDate,
        })),
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
          <StepShell key="0" title="What are you working toward?" subtitle="Pick as many as apply — you can change this later.">
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
          <StepShell key="1" title="Tell us about your school" subtitle="This helps Oryn understand your academic context.">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input id="school" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Lincoln High School" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gradYear">Graduation year</Label>
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
                  <Label htmlFor="curriculum">Curriculum</Label>
                  <Select value={curriculum} onValueChange={(v) => v && setCurriculum(v as CurriculumType)}>
                    <SelectTrigger id="curriculum" className="w-full">
                      <SelectValue placeholder="Select..." />
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
          <StepShell key="2" title="What are you interested in?" subtitle="Search or add your own — this shapes your recommendations.">
            <InterestsStep interests={interests} setInterests={setInterests} />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell key="3" title="Where might you want to study?" subtitle="Pick as many regions as you're considering.">
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
          <StepShell key="4" title="Import your profile" subtitle="Upload a CV to save time, or start fresh — either way takes a minute.">
            <ImportStep reviewedItems={reviewedItems} setReviewedItems={setReviewedItems} />
          </StepShell>
        )}
      </AnimatePresence>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="ghost" onClick={goBack} disabled={step === 0 || isPending}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={goNext}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "Setting up your profile…" : "Finish"}
          </Button>
        )}
      </div>
    </div>
  );
}
