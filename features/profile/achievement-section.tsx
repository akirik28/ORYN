"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Pencil, Trash2, Loader2, Sparkles, Check, Inbox, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DynamicFormFields, type FormValues } from "./dynamic-form-fields";
import type { FieldConfig } from "./field-config";
import { refineAchievement } from "@/app/(app)/profile/actions";
import type { AchievementRefinement } from "@/lib/ai/refine-achievement";
import { SectionHeader } from "@/components/oryn/section-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { cn } from "@/lib/utils";

interface AchievementSectionProps<T extends { id: string }> {
  title: string;
  description?: string;
  items: T[];
  // Pre-computed on the server (app/(app)/profile/page.tsx), keyed by item id — not a
  // `renderSummary(item)` function prop. This is a Client Component ("use client" above),
  // and a Server Component can't hand a plain closure across that boundary (only a
  // "use server" Action survives it) — passing one throws "Functions cannot be passed
  // directly to Client Components" at request time. Neither `tsc --noEmit` nor `next
  // build` catches this (the type system has no "RSC-serializable" type, and this page is
  // force-dynamic, so build-time prerendering never actually executes the render path
  // either) — found by live-testing an authenticated page load, the first time this
  // codebase has had a real backend to do that against.
  summaries: Record<string, { title: string; subtitle?: string }>;
  fields: FieldConfig[];
  defaultValues: FormValues;
  onCreate: (values: FormValues) => Promise<{ error?: string }>;
  onUpdate: (id: string, values: FormValues) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  emptyStateText: string;
  /** One of globals.css's aurora variants, so a column of these doesn't glow in unison. */
  glowVariant?: string;
  /** Defaults to a generic "nothing here" glyph — this one component backs ~15 unrelated
   * section types (Goals, Activities, Research, Skills, ...), so no single icon fits all
   * of them; callers may pass a more specific one where it's worth the prop. */
  emptyStateIcon?: LucideIcon;
}

export function AchievementSection<T extends { id: string }>({
  title,
  description,
  items,
  summaries,
  fields,
  defaultValues,
  onCreate,
  onUpdate,
  onDelete,
  emptyStateText,
  emptyStateIcon = Inbox,
  glowVariant,
}: AchievementSectionProps<T>) {
  const t = useTranslations("common");
  const tSection = useTranslations("profile.achievementSection");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refinement, setRefinement] = useState<AchievementRefinement | null>(null);
  const [isRefining, startRefining] = useTransition();
  const [refineError, setRefineError] = useState<string | null>(null);

  const supportsRefinement = fields.some((f) => f.name === "description");

  function openCreate() {
    setEditingId(null);
    setValues(defaultValues);
    setError(null);
    setRefinement(null);
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditingId(item.id);
    // Every caller's old `toFormValues` was the same identity cast (the DB row already
    // matches FormValues' shape) — inlined here rather than kept as a prop, since a prop
    // would hit the same cross-boundary-function problem `summaries` above works around.
    setValues(item as unknown as FormValues);
    setError(null);
    setRefinement(null);
    setOpen(true);
  }

  function handleChange(name: string, value: string | number | boolean | null) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setRefinement(null);
  }

  function requestRefinement() {
    setRefineError(null);
    startRefining(async () => {
      const result = await refineAchievement({
        achievementType: title,
        title: String(values.title ?? ""),
        organization: (values.organization as string | null) ?? null,
        description: (values.description as string | null) ?? null,
      });
      if (result.error) {
        setRefineError(result.error);
        return;
      }
      setRefinement(result.data ?? null);
    });
  }

  function acceptImprovedDescription() {
    if (refinement?.improvedDescription) {
      handleChange("description", refinement.improvedDescription);
      setRefinement((prev) => (prev ? { ...prev, improvedDescription: null } : prev));
    }
  }

  function submit() {
    startTransition(async () => {
      const result = editingId ? await onUpdate(editingId, values) : await onCreate(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      // No optimistic removal here — the item stays in `items` (server-truthed) until
      // `onDelete`'s Server Action actually succeeds and revalidates, so a failure was
      // already honest, never a false success. It was silent, though: the result was
      // discarded entirely, so a student who clicked delete and hit an RLS denial or a
      // transient DB error saw nothing happen and no reason why. Backs all achievement
      // types sharing this component (Activities, Projects, Awards, Research, Goals, ...),
      // so this one fix covers every one of them at once — same pattern already used two
      // functions up in submit(), and the one requirement-checklist.tsx already uses for a
      // delete-shaped action with no optimistic state to roll back.
      const result = await onDelete(id);
      if (result.error) toast.error(result.error);
      setDeletingId(null);
    });
  }

  return (
    // Journey's record blocks carry the same aurora-glass frame every other surface in
    // the app uses (founder direction 2026-08-31: the uncoloured boxes on Journey should
    // be lit like the rest). Rotated variants are applied per block at the call site so a
    // long column of sections doesn't pulse in unison.
    <section className={cn("glass-card space-y-4 rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl md:p-6", glowVariant)}>
      <SectionHeader
        title={title}
        description={description}
        action={
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="size-4" /> {t("add")}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={emptyStateIcon} title={emptyStateText} className="py-6" />
      ) : (
        <ul className="divide-y divide-white/45 overflow-hidden rounded-xl border border-white/50 bg-white/35">
          {items.map((item) => {
            const summary = summaries[item.id] ?? { title: tSection("untitled") };
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{summary.title}</p>
                  {summary.subtitle ? <p className="truncate text-sm text-muted-foreground">{summary.subtitle}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} aria-label={t("edit")}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending && deletingId === item.id}
                    aria-label={t("delete")}
                  >
                    {isPending && deletingId === item.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? tSection("editDialogTitle", { title: locale === "tr" ? title : title.toLocaleLowerCase(locale) })
                : tSection("addDialogTitle", { title: locale === "tr" ? title : title.toLocaleLowerCase(locale) })}
            </DialogTitle>
          </DialogHeader>
          <DynamicFormFields fields={fields} values={values} onChange={handleChange} />

          {supportsRefinement ? (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Button variant="ghost" size="sm" onClick={requestRefinement} disabled={isRefining || !String(values.title ?? "").trim()}>
                {isRefining ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-brand-primary" />}
                {tSection("improveWithAi")}
              </Button>
              {refineError ? <p className="text-xs text-destructive">{refineError}</p> : null}
              {refinement?.improvedDescription ? (
                <div className="space-y-1.5 rounded-md bg-accent/50 p-2.5 text-sm">
                  <p>{refinement.improvedDescription}</p>
                  <Button variant="outline" size="xs" onClick={acceptImprovedDescription}>
                    <Check className="size-3" /> {tSection("useThisDescription")}
                  </Button>
                </div>
              ) : null}
              {refinement?.suggestedQuestions && refinement.suggestedQuestions.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {refinement.suggestedQuestions.map((question) => (
                    <li key={question}>• {question}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
