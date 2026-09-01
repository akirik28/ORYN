import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequirementStatus } from "@/types/database";

/**
 * Read-only requirement overview for an application card in the list view — matches the
 * founder's Figma (`ApplicationsScreen`, `ORYN Design Handoff v1.zip`'s `src/App.tsx`): a
 * 3-column grid of checkbox chips, filled + struck-through when done. That mockup hardcodes
 * a different fake checklist per university (Cambridge shows "UCAS form" etc.) — this renders
 * the application's real `application_requirements` rows instead, through the same
 * `typeLabels` catalog `RequirementChecklist` already uses on the detail page, so the grid
 * never shows content nobody actually entered.
 *
 * Deliberately not interactive: editing happens on the detail page's `RequirementChecklist`.
 * Wiring per-chip toggles here would mean N optimistic-update handlers per card across
 * however many applications a student has; this is a scannable summary, not a second editor
 * for the same data.
 */
export async function RequirementChipGrid({ requirements }: { requirements: { id: string; requirement_type: string; status: RequirementStatus }[] }) {
  const t = await getTranslations("applications.requirementChecklist");
  const tHas = t as unknown as { has: (key: string) => boolean };

  if (requirements.length === 0) return null;

  return (
    <div className="grid grid-cols-3 divide-x divide-y divide-brand-primary/[0.07] border-t border-brand-primary/[0.07]">
      {requirements.map((requirement) => {
        const done = requirement.status === "completed";
        const typeLabel = tHas.has(`typeLabels.${requirement.requirement_type}`)
          ? t(`typeLabels.${requirement.requirement_type}` as Parameters<typeof t>[0])
          : requirement.requirement_type.replace(/_/g, " ");
        return (
          <div key={requirement.id} className="flex items-center gap-2 px-3 py-2.5 [&:nth-child(3n)]:border-r-0">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border-2",
                done ? "border-success bg-success text-white" : "border-ink-4/50 bg-transparent"
              )}
              aria-hidden="true"
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className={cn("text-[12.5px] font-medium", done ? "text-ink-2 line-through" : "text-ink-4")}>{typeLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
