import { Wrench } from "lucide-react";

/**
 * Shown instead of the student app whenever admin_product_settings.maintenance_mode is on
 * (app/(app)/layout.tsx) — same shape as NotConfiguredNotice right next to this file, which
 * exists for a different reason (a missing integration) but the same underlying job: a
 * clear message instead of the app rendering into a broken/inconsistent state.
 */
export function MaintenanceScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Wrench className="size-5" />
        </span>
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="text-sm break-words text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
