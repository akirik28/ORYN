"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Circle, CircleDot, CircleCheck, CircleSlash, MessageSquare, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateRequirementStatus, updateRequirementNotes } from "@/app/(app)/applications/actions";
import { NotesField } from "@/features/applications/notes-field";
import type { ApplicationRequirement, RequirementStatus } from "@/types/database";

/** Same TS-generic workaround as features/opportunities/opportunity-card.tsx's own
 * `Translator` alias — requirement_type has no DB enum (see the fallback below), so its
 * value is plain `string`, which the strict per-namespace key union next-intl infers
 * doesn't accept. Extended with `.has` since the fallback path needs that too. */
type Translator = ((key: string) => string) & { has: (key: string) => boolean };

const STATUS_CYCLE: RequirementStatus[] = ["not_started", "in_progress", "completed", "not_applicable"];

const STATUS_ICON: Record<RequirementStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: CircleDot,
  completed: CircleCheck,
  not_applicable: CircleSlash,
};

function nextStatus(current: RequirementStatus): RequirementStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

function RequirementRow({ requirement, typeLabel, t }: { requirement: ApplicationRequirement; typeLabel: string; t: Translator }) {
  const Icon = STATUS_ICON[requirement.status];
  const [isPending, startTransition] = useTransition();
  // Starts open when a note already exists so a student doesn't have to remember which
  // rows have one — closed by default otherwise, matching the checklist's normal one-line
  // density (Phase 22: "do not make the UI overly complex").
  const [notesOpen, setNotesOpen] = useState(requirement.notes !== null);
  const NoteIcon = requirement.notes !== null ? MessageSquareText : MessageSquare;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="capitalize">{typeLabel}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label={t("noteToggle")} onClick={() => setNotesOpen((v) => !v)}>
            <NoteIcon className={cn("size-4", requirement.notes !== null && "text-brand-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateRequirementStatus(requirement.id, nextStatus(requirement.status));
                if (result.error) toast.error(result.error);
              })
            }
            className={cn(
              requirement.status === "completed" && "text-success",
              requirement.status === "in_progress" && "text-brand-primary",
              requirement.status === "not_applicable" && "text-muted-foreground line-through"
            )}
          >
            <Icon className="size-4" /> {t(`statusLabels.${requirement.status}`)}
          </Button>
        </div>
      </div>
      {notesOpen ? (
        <NotesField
          initialValue={requirement.notes}
          placeholder={t("notesPlaceholder")}
          saveLabel={t("saveNote")}
          savedLabel={t("noteSaved")}
          errorFallback={t("noteSaveError")}
          onSave={(notes) => updateRequirementNotes(requirement.id, notes)}
        />
      ) : null}
    </li>
  );
}

export function RequirementChecklist({ requirements }: { requirements: ApplicationRequirement[] }) {
  const t = useTranslations("applications.requirementChecklist");
  const tType = t as Translator;

  return (
    <ul className="divide-y rounded-lg border">
      {requirements.map((requirement) => {
        // requirement_type is plain `string` (no DB enum — see application_requirements'
        // column type): DEFAULT_REQUIREMENTS in app/(app)/applications/actions.ts is the
        // known seeded set and has a catalog entry each; t.has() falls back to a humanized
        // raw value for anything else so a future/custom type never renders a raw key path.
        const typeLabel = tType.has(`typeLabels.${requirement.requirement_type}`)
          ? tType(`typeLabels.${requirement.requirement_type}`)
          : requirement.requirement_type.replace(/_/g, " ");
        return <RequirementRow key={requirement.id} requirement={requirement} typeLabel={typeLabel} t={tType} />;
      })}
    </ul>
  );
}
