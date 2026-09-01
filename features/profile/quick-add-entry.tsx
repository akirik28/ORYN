"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DynamicFormFields, type FormValues } from "./dynamic-form-fields";
import type { FieldConfig } from "./field-config";

/**
 * One type in the "What would you like to add?" picker (Figma handoff reference, package 1).
 *
 * `fields` is always a `.filter(f => f.quickAdd)` slice of an existing FieldConfig array
 * (field-config.ts) — never a second, hand-duplicated field list. `defaultValues` must be a
 * complete FormValues object satisfying that type's Zod schema (lib/validation/achievements.ts)
 * on its own: every field this dialog doesn't show still needs a valid value, because the
 * quick form submits the exact same create Server Action the full Edit dialog does, with no
 * server-side notion of "quick" vs "full" — the schema doesn't know which UI produced its
 * input, and shouldn't need to. `onCreate` is one of the existing `createX` actions from
 * app/(app)/profile/actions.ts, passed through unmodified.
 *
 * `icon` is a pre-rendered element (`<Sparkles className="size-4" />`), not a component
 * reference (`Sparkles`) — this component is constructed by a Server Component
 * (app/(app)/profile/page.tsx), and React's RSC boundary can serialize a rendered element
 * fine but rejects a raw component/forwardRef type passed as plain prop data ("Only plain
 * objects can be passed to Client Components from Server Components"), caught live via the
 * app/(dev-preview)/design-preview/quick-add preview page, not by this component's own
 * jsdom-rendered tests — those render QuickAddEntry directly, with no RSC boundary to cross.
 */
export interface QuickAddType {
  key: string;
  label: string;
  icon: ReactNode;
  fields: FieldConfig[];
  defaultValues: FormValues;
  onCreate: (values: FormValues) => Promise<{ error?: string }>;
}

/**
 * Journey page's unified fast-entry point (UI-V3 shell stays untouched; this lives beside
 * the existing per-section AchievementSection "Add" buttons, which still show every field for
 * their type and remain the place advanced/enrichment fields get filled in later — see that
 * component and field-config.ts's `quickAdd` doc comment for the full basic/advanced split).
 *
 * Two steps, matching the Figma reference: pick a type, then a short form for just that
 * type's *meaningful* fields. Cancel and Back are always reachable; on success the dialog
 * closes and a toast confirms what was added — the timeline itself updates via the create
 * action's own `revalidatePath("/profile")` (app/(app)/profile/actions.ts), same as every
 * other save on this page.
 */
export function QuickAddEntry({ types }: { types: QuickAddType[] }) {
  const t = useTranslations("common");
  const tQuick = useTranslations("profile.quickAddEntry");
  const tAchievement = useTranslations("profile.achievementSection");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selected, setSelected] = useState<QuickAddType | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setStep("pick");
    setSelected(null);
    setValues({});
    setError(null);
    setOpen(true);
  }

  function pick(type: QuickAddType) {
    setSelected(type);
    setValues(type.defaultValues);
    setError(null);
    setStep("form");
  }

  function handleChange(name: string, value: string | number | boolean | null) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function submit() {
    if (!selected) return;
    const label = selected.label;
    startTransition(async () => {
      const result = await selected.onCreate(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(tQuick("addedToast", { label: locale === "tr" ? label : label.toLocaleLowerCase(locale) }));
    });
  }

  return (
    <>
      <Button size="sm" onClick={openModal}>
        <Plus className="size-4" /> {tQuick("addToJourney")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === "pick"
                ? tQuick("whatToAdd")
                : tAchievement("addDialogTitle", { title: selected ? (locale === "tr" ? selected.label : selected.label.toLocaleLowerCase(locale)) : "" })}
            </DialogTitle>
          </DialogHeader>

          {step === "pick" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {types.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => pick(type)}
                  className="flex min-h-16 flex-col items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <DynamicFormFields fields={selected.fields} values={values} onChange={handleChange} />
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            {step === "form" ? (
              <Button variant="ghost" onClick={() => setStep("pick")} disabled={isPending}>
                <ArrowLeft className="size-4" /> {tQuick("back")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            {step === "form" ? (
              <Button onClick={submit} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("save")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
