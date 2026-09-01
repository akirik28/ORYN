"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileUp, Loader2, PencilLine, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { uploadAndExtractCV } from "@/app/(onboarding)/onboarding/actions";
import { EntityCombobox } from "@/features/entities/entity-combobox";
import type { EntityScope } from "@/lib/entities/field-policy";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";

export type ExtractedCategory = "education" | "activities" | "awards" | "projects" | "research" | "workExperience";

export interface ReviewedExtractedItem {
  id: string;
  category: ExtractedCategory;
  title: string;
  organization: string | null;
  /** Set only when the student links the extracted organization/school text to a real
   * canonical-entity result below — never inferred from the raw CV text itself (an AI
   * guess at which registry row a string means would be exactly the kind of silent
   * auto-merge lib/entities/resolve.ts's own duplicate-check exists to prevent). */
  organizationEntityId: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  confidence: "high" | "medium" | "low";
  included: boolean;
}

const CATEGORY_LABELS: Record<ExtractedCategory, string> = {
  education: "Education",
  activities: "Activities",
  awards: "Awards",
  projects: "Projects",
  research: "Research",
  workExperience: "Work experience",
};

/** Same six categories, same translation keys as features/profile/cv-import-flow.tsx's
 * CATEGORY_LABEL_KEYS — reused rather than re-translated a third time (profile/page.tsx's
 * AchievementSection titles were the first). CATEGORY_LABELS above stays untranslated and
 * is only ever used for its keys (flatten()'s Object.keys iteration), never displayed. */
const CATEGORY_LABEL_KEYS = {
  education: "page.sections.education.title",
  activities: "page.sections.activities.title",
  awards: "page.sections.awards.title",
  projects: "page.sections.projects.title",
  research: "page.sections.research.title",
  workExperience: "page.sections.workExperience.title",
} as const satisfies Record<ExtractedCategory, string>;

/** Mirrors features/profile/field-config.ts's per-table entity scopes exactly — CV-import
 * items land in the same tables the manual profile forms do, so a school extracted here
 * and a school typed by hand on /profile must resolve against the same registry slice. */
const CATEGORY_TO_ORGANIZATION_SCOPE: Record<ExtractedCategory, EntityScope> = {
  education: "school",
  activities: "activity_organization",
  awards: "award_organization",
  projects: "project_organization",
  research: "research_organization",
  workExperience: "work_organization",
};

// Exported (only) so the school-name fix below has a direct unit test — every other caller
// in this file still just uses it locally.
export function flatten(result: CVExtractionResult): ReviewedExtractedItem[] {
  let counter = 0;
  const items: ReviewedExtractedItem[] = [];
  (Object.keys(CATEGORY_LABELS) as ExtractedCategory[]).forEach((category) => {
    for (const raw of result[category]) {
      counter += 1;
      // Education items carry a dedicated `schoolName` (lib/ai/cv-extraction.ts's schema
      // extends the shared item shape with it, specifically for this category) — preferred
      // over `organization` here because it's the field the extraction schema names for
      // exactly this purpose; `organization` is kept as a fallback in case the model puts
      // the school there instead. Every other category has no `schoolName` at all, so `raw`
      // there is never anything but the base shape. Read once here, into the same
      // `organization` field the "School" EntityCombobox below already edits and
      // lib/profile/cv-import.ts's `cvItemToRow` already persists — no new field to thread
      // through the rest of this flow.
      const schoolName = "schoolName" in raw ? raw.schoolName : null;
      items.push({
        id: `${category}-${counter}`,
        category,
        title: raw.title,
        organization: schoolName ?? raw.organization,
        organizationEntityId: null,
        description: raw.description,
        startDate: raw.startDate,
        endDate: raw.endDate,
        confidence: raw.confidence,
        included: true,
      });
    }
  });
  return items;
}

export function ImportStep({
  reviewedItems,
  setReviewedItems,
  country,
}: {
  reviewedItems: ReviewedExtractedItem[];
  setReviewedItems: (items: ReviewedExtractedItem[]) => void;
  country?: string | null;
}) {
  const t = useTranslations("onboarding.import");
  const tProfile = useTranslations("profile");
  const [method, setMethod] = useState<"choose" | "cv" | "manual">("choose");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAndExtractCV(formData);
    if (!result.success) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setReviewedItems(flatten(result.extraction));
    setStatus("idle");
  }

  function updateItem(id: string, patch: Partial<ReviewedExtractedItem>) {
    setReviewedItems(reviewedItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setReviewedItems(reviewedItems.filter((item) => item.id !== id));
  }

  if (method === "choose") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setMethod("cv")}
          className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          <FileUp className="size-6 text-primary" />
          <span className="font-medium">{t("uploadCv")}</span>
          <span className="text-xs text-muted-foreground">{t("uploadCvHint")}</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          <PencilLine className="size-6 text-primary" />
          <span className="font-medium">{t("enterManually")}</span>
          <span className="text-xs text-muted-foreground">{t("enterManuallyHint")}</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          <SkipForward className="size-6 text-primary" />
          <span className="font-medium">{t("skipForNow")}</span>
          <span className="text-xs text-muted-foreground">{t("skipForNowHint")}</span>
        </button>
      </div>
    );
  }

  if (method === "manual") {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        {t("manualNotice")}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => setMethod("choose")}>
            {t("backToImportOptions")}
          </Button>
        </div>
      </Card>
    );
  }

  // method === "cv"
  if (reviewedItems.length === 0) {
    return (
      <div className="space-y-4">
        <Label
          htmlFor="cv-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          {status === "uploading" ? (
            <>
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="font-medium">{t("readingCv")}</span>
              <span className="text-xs text-muted-foreground">{t("readingCvHint")}</span>
            </>
          ) : (
            <>
              <FileUp className="size-6 text-primary" />
              <span className="font-medium">{t("clickToChoose")}</span>
              <span className="text-xs text-muted-foreground">{t("clickToChooseHint")}</span>
            </>
          )}
        </Label>
        <input
          ref={fileInputRef}
          id="cv-file"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          disabled={status === "uploading"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        <Button variant="ghost" size="sm" onClick={() => setMethod("choose")}>
          {t("backToImportOptions")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("foundItems", { count: reviewedItems.length })}</p>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {reviewedItems.map((item) => (
          <Card key={item.id} className="flex gap-3 p-3">
            <Checkbox
              checked={item.included}
              onCheckedChange={(checked) => updateItem(item.id, { included: checked === true })}
              className="mt-1"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">{tProfile(CATEGORY_LABEL_KEYS[item.category])}</span>
                {item.confidence === "low" ? <span className="text-amber-600">{t("lowConfidence")}</span> : null}
              </div>
              <Input
                value={item.title}
                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                className="h-8"
                disabled={!item.included}
              />
              {/* EntityCombobox has no native `disabled` — an unincluded item still won't be
                  persisted (gated on `included` at submit time), this just mutes the affordance
                  to match the title input's own disabled look above. */}
              <div className={item.included ? "" : "pointer-events-none opacity-50"}>
                <EntityCombobox
                  scope={CATEGORY_TO_ORGANIZATION_SCOPE[item.category]}
                  value={item.organization ?? ""}
                  entityId={item.organizationEntityId}
                  context={{ country: country?.trim() || null }}
                  placeholder={item.category === "education" ? t("schoolPlaceholder") : t("organizationPlaceholder")}
                  allowCustom
                  customLabel={item.category === "education" ? "school" : "organization"}
                  onChange={(next) => updateItem(item.id, { organization: next.displayName, organizationEntityId: next.id })}
                />
              </div>
            </div>
            {/* icon-sm (28px), not a bare icon-only <button> — the old version's hit area
                was just the size-4 (16px) icon itself, undersized for a touch target in
                this dense, repeated review-card list. Matches the same delete action's
                sizing in features/profile/achievement-section.tsx. */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(item.id)}
              className="self-start text-muted-foreground hover:text-destructive"
              aria-label={t("removeItemAriaLabel")}
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setMethod("choose")}>
        {t("startOver")}
      </Button>
    </div>
  );
}
