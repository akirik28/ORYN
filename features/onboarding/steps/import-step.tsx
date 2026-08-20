"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, PencilLine, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/oryn/status-badge";
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

function flatten(result: CVExtractionResult): ReviewedExtractedItem[] {
  let counter = 0;
  const items: ReviewedExtractedItem[] = [];
  (Object.keys(CATEGORY_LABELS) as ExtractedCategory[]).forEach((category) => {
    for (const raw of result[category]) {
      counter += 1;
      items.push({
        id: `${category}-${counter}`,
        category,
        title: raw.title,
        organization: raw.organization,
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
          <span className="font-medium">Upload CV</span>
          <span className="text-xs text-muted-foreground">PDF, DOCX, or text</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          <PencilLine className="size-6 text-primary" />
          <span className="font-medium">Enter manually</span>
          <span className="text-xs text-muted-foreground">Add things yourself</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent"
        >
          <SkipForward className="size-6 text-primary" />
          <span className="font-medium">Skip for now</span>
          <span className="text-xs text-muted-foreground">Do this later</span>
        </button>
      </div>
    );
  }

  if (method === "manual") {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No problem — you can add activities, awards, projects, and more from your Profile at any time.
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => setMethod("choose")}>
            Back to import options
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
              <span className="font-medium">Reading your CV…</span>
              <span className="text-xs text-muted-foreground">This usually takes a few seconds.</span>
            </>
          ) : (
            <>
              <FileUp className="size-6 text-primary" />
              <span className="font-medium">Click to choose a file</span>
              <span className="text-xs text-muted-foreground">PDF, DOCX, or plain text — up to 10MB</span>
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
          Back to import options
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We found {reviewedItems.length} item{reviewedItems.length === 1 ? "" : "s"}. Review before adding them to
        your Oryn profile — uncheck anything that isn&apos;t right, or edit the details.
      </p>
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
                <span className="rounded bg-muted px-1.5 py-0.5">{CATEGORY_LABELS[item.category]}</span>
                {item.confidence === "low" ? <StatusBadge label="Low confidence — please check" tone="warning" /> : null}
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
                  placeholder={item.category === "education" ? "School" : "Organization"}
                  allowCustom
                  customLabel={item.category === "education" ? "school" : "organization"}
                  onChange={(next) => updateItem(item.id, { organization: next.displayName, organizationEntityId: next.id })}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="self-start text-muted-foreground hover:text-destructive"
              aria-label="Remove item"
            >
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setMethod("choose")}>
        Start over
      </Button>
    </div>
  );
}
