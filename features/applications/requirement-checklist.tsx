"use client";

import { useTransition } from "react";
import { Circle, CircleDot, CircleCheck, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateRequirementStatus } from "@/app/(app)/applications/actions";
import type { ApplicationRequirement, RequirementStatus } from "@/types/database";

const STATUS_CYCLE: RequirementStatus[] = ["not_started", "in_progress", "completed", "not_applicable"];

const STATUS_ICON: Record<RequirementStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: CircleDot,
  completed: CircleCheck,
  not_applicable: CircleSlash,
};

const STATUS_LABEL: Record<RequirementStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  not_applicable: "Not applicable",
};

function nextStatus(current: RequirementStatus): RequirementStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

export function RequirementChecklist({ requirements }: { requirements: ApplicationRequirement[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <ul className="divide-y rounded-lg border">
      {requirements.map((requirement) => {
        const Icon = STATUS_ICON[requirement.status];
        return (
          <li key={requirement.id} className="flex items-center justify-between px-4 py-3">
            <span className="capitalize">{requirement.requirement_type.replace(/_/g, " ")}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void updateRequirementStatus(requirement.id, nextStatus(requirement.status));
                })
              }
              className={cn(
                requirement.status === "completed" && "text-success",
                requirement.status === "in_progress" && "text-brand-primary",
                requirement.status === "not_applicable" && "text-muted-foreground line-through"
              )}
            >
              <Icon className="size-4" /> {STATUS_LABEL[requirement.status]}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
