"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileUp, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { EmptyState } from "@/components/oryn/empty-state";
import { cn } from "@/lib/utils";
// Two modules on purpose — see the note in profile/import/actions.ts about why the
// upload action is not re-exported through it.
import { uploadAndExtractCV } from "@/app/(onboarding)/onboarding/actions";
import { importReviewedCvItems } from "@/app/(app)/profile/import/actions";
import type { CvImportCategory, CvImportItem } from "@/lib/profile/cv-import";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";

const CATEGORY_LABEL_KEYS = {
  education: "page.sections.education.title",
  activities: "page.sections.activities.title",
  awards: "page.sections.awards.title",
  projects: "page.sections.projects.title",
  research: "page.sections.research.title",
  workExperience: "page.sections.workExperience.title",
} as const satisfies Record<CvImportCategory, string>;

interface ReviewItem extends CvImportItem {
  id: string;
  confidence: "high" | "medium" | "low";
  included: boolean;
}

function flatten(result: CVExtractionResult): ReviewItem[] {
  const items: ReviewItem[] = [];
  let n = 0;
  for (const category of Object.keys(CATEGORY_LABEL_KEYS) as CvImportCategory[]) {
    for (const raw of result[category]) {
      n += 1;
      items.push({
        id: `item-${n}`,
        category,
        title: raw.title,
        organization: raw.organization ?? null,
        organizationEntityId: null,
        description: raw.description ?? null,
        startDate: raw.startDate ?? null,
        endDate: raw.endDate ?? null,
        confidence: raw.confidence,
        // Low-confidence extractions start unchecked. The student opts them *in* rather
        // than having to notice and opt out — Oryn saying "I'm not sure about this one"
        // and then pre-selecting it anyway would be the wrong default for a screen whose
        // whole purpose is that nothing lands unreviewed.
        included: raw.confidence !== "low",
      });
    }
  }
  return items;
}

/**
 * Scan a CV after onboarding (§ Phase 60).
 *
 * The extraction pipeline already existed but was reachable only during onboarding, so a
 * student who joined with an empty profile — or who simply did more things since — had no
 * way to use it again. This is the same upload → extract → **review** → save flow; the
 * review step is not optional, because nothing AI-extracted may be written to a profile
 * without the student confirming it.
 */
export function CvImportFlow() {
  const t = useTranslations("profile");
  const tImport = useTranslations("profile.cvImport");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [isSaving, startSave] = useTransition();

  function onFile(file: File) {
    setError(null);
    setNotice(null);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    startUpload(async () => {
      const result = await uploadAndExtractCV(formData);
      if (!result.success) {
        setError(result.error);
        setItems(null);
        return;
      }
      const flat = flatten(result.extraction);
      if (flat.length === 0) {
        setError(tImport("noItemsFoundError"));
        return;
      }
      setItems(flat);
    });
  }

  function save() {
    if (!items) return;
    const selected = items.filter((i) => i.included);
    if (selected.length === 0) {
      setError(tImport("selectAtLeastOneError"));
      return;
    }
    setError(null);
    startSave(async () => {
      const result = await importReviewedCvItems(
        selected.map(({ category, title, organization, organizationEntityId, description, startDate, endDate }) => ({
          category,
          title,
          organization,
          organizationEntityId,
          description,
          startDate,
          endDate,
        })),
      );
      if (result.error) {
        setError(result.error);
        if (!result.inserted) return;
      }
      setItems(null);
      setFileName(null);
      setNotice(tImport("addedNotice", { count: result.inserted ?? 0 }));
      router.refresh();
    });
  }

  if (items) {
    const selectedCount = items.filter((i) => i.included).length;
    return (
      <div className="space-y-6">
        <div>
          <Eyebrow tone="brand">{tImport("reviewBeforeAdding")}</Eyebrow>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
            {tImport("foundItems", { count: items.length, fileName: fileName ?? "" })}
          </p>
        </div>

        <ul className="border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 border-b border-border/60 py-3.5">
              <Checkbox
                id={item.id}
                checked={item.included}
                onCheckedChange={(checked) =>
                  setItems((prev) =>
                    prev!.map((i) => (i.id === item.id ? { ...i, included: checked === true } : i)),
                  )
                }
                className="mt-0.5"
              />
              <label htmlFor={item.id} className="min-w-0 flex-1 cursor-pointer">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-medium text-ink-1">{item.title}</span>
                  <span className="text-xs text-ink-3">{t(CATEGORY_LABEL_KEYS[item.category])}</span>
                  {item.confidence === "low" ? (
                    <span className="text-xs text-warning">{tImport("unsureAboutThis")}</span>
                  ) : null}
                </span>
                {item.organization ? <span className="mt-0.5 block text-sm text-ink-3">{item.organization}</span> : null}
              </label>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="flex items-start gap-2 text-sm text-error">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={isSaving || selectedCount === 0}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {tImport("addItemsToProfile", { count: selectedCount })}
          </Button>
          <Button variant="outline" disabled={isSaving} onClick={() => { setItems(null); setFileName(null); setError(null); }}>
            {tCommon("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="size-4 shrink-0" aria-hidden="true" /> {notice}
        </p>
      ) : null}

      <div
        className={cn(
          "rounded-2xl bg-surface-tint p-8 text-center",
          isUploading && "opacity-60",
        )}
      >
        <EmptyState
          icon={FileUp}
          title={tImport("scanTitle")}
          description={tImport("scanDescription")}
          action={
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                  // Reset so re-picking the same file still fires a change event.
                  e.target.value = "";
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {isUploading ? tImport("readingFile", { fileName: fileName ?? "" }) : tImport("chooseFile")}
              </Button>
            </>
          }
        />
      </div>

      {error ? (
        <p className="flex items-start gap-2 text-sm text-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
