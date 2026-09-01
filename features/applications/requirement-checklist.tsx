"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Circle, CircleDot, CircleCheck, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateRequirementStatus } from "@/app/(app)/applications/actions";
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

export function RequirementChecklist({ requirements }: { requirements: ApplicationRequirement[] }) {
  const t = useTranslations("applications.requirementChecklist");
  const tType = t as Translator;
  const [isPending, startTransition] = useTransition();

  return (
    <ul className="divide-y rounded-lg border">
      {requirements.map((requirement) => {
        const Icon = STATUS_ICON[requirement.status];
        // requirement_type is plain `string` (no DB enum — see application_requirements'
        // column type): DEFAULT_REQUIREMENTS in app/(app)/applications/actions.ts is the
        // known seeded set and has a catalog entry each; t.has() falls back to a humanized
        // raw value for anything else so a future/custom type never renders a raw key path.
        const typeLabel = tType.has(`typeLabels.${requirement.requirement_type}`)
          ? tType(`typeLabels.${requirement.requirement_type}`)
          : requirement.requirement_type.replace(/_/g, " ");
        return (
          <li key={requirement.id} className="flex items-center justify-between px-4 py-3">
            <span className="capitalize">{typeLabel}</span>
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
          </li>
        );
      })}
    </ul>
  );
}
