"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Check, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { applyContaminationCleanup, type ContaminationCleanupOutcome } from "@/app/(app)/admin/actions";
import type { ContaminationCleanupPreviewRow } from "@/lib/admin/queries";

/**
 * The founder's own exact framing (2026-09-02, relayed by CEO): "pressing one button and
 * having the thing happen" — for a batch that rewrites 35 student-facing descriptions, not a
 * button that reports a count. Preview first (this component's initial render, from the
 * server-fetched `preview` prop), apply second (explicit confirm dialog, not a bare click),
 * per-row outcomes third — a guard miss or a not-found row is its own line with its own
 * reason, never folded into "34 succeeded."
 *
 * State machine, deliberately simple: before apply, every row shows `guardWouldPass` from the
 * live preview read. After apply, every row shows its own real `ContaminationCleanupOutcome`
 * instead — the two are never shown at once for the same row, so there's no moment where a
 * stale "would pass" prediction sits next to what actually happened.
 */
export function DescriptionCleanupControl({ preview, auditTableLive }: { preview: ContaminationCleanupPreviewRow[]; auditTableLive: boolean }) {
  const t = useTranslations("admin.cleanup");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [outcomes, setOutcomes] = useState<ContaminationCleanupOutcome[] | null>(null);

  const outcomeById = new Map((outcomes ?? []).map((o) => [o.id, o]));
  const passingCount = preview.filter((r) => r.guardWouldPass === true).length;

  function apply() {
    startTransition(async () => {
      const result = await applyContaminationCleanup();
      setOutcomes(result);
      setConfirmOpen(false);
      const applied = result.filter((o) => o.applied).length;
      const skipped = result.length - applied;
      if (skipped === 0) {
        toast.success(t("applySuccessAll", { count: applied }));
      } else {
        toast.error(t("applyPartial", { applied, skipped }));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {outcomes === null
            ? t("previewSummary", { total: preview.length, passing: passingCount })
            : t("appliedSummary", { applied: outcomes.filter((o) => o.applied).length, total: outcomes.length })}
        </p>
        {outcomes === null ? (
          <Button type="button" onClick={() => setConfirmOpen(true)} disabled={isPending || !auditTableLive}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("applyButton", { count: preview.length })}
          </Button>
        ) : null}
      </div>

      <ul className="divide-y rounded-lg border">
        {preview.map((row) => {
          const outcome = outcomeById.get(row.id);
          return (
            <li key={row.id} className="px-4 py-3">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                    <span className="truncate">{row.title}</span>
                  </span>
                  <RowStatus row={row} outcome={outcome} t={t} />
                </summary>
                <div className="mt-3 space-y-3 pl-5.5 text-xs">
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground">{t("currentLabel")}</p>
                    <p className="rounded bg-muted/50 p-2 leading-relaxed whitespace-pre-wrap">{row.currentDescription ?? t("rowNotFound")}</p>
                  </div>
                  <div>
                    <p className="mb-1 font-medium text-muted-foreground">{t("newLabel")}</p>
                    <p className="rounded bg-muted/50 p-2 leading-relaxed whitespace-pre-wrap">{row.newDescription}</p>
                  </div>
                  {outcome?.reason ? <p className="text-destructive">{outcome.reason}</p> : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { count: preview.length })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription", { passing: passingCount, count: preview.length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{t("confirmCancel")}</AlertDialogCancel>
            <Button type="button" disabled={isPending} onClick={apply}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("confirmApply")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** One badge per row, never a bare count standing in for it — before apply: guard status
 *  (pass/fail/not-found, three distinct states, never collapsed into two). After apply: the
 *  real outcome. The two never render for the same row at the same time. */
function RowStatus({
  row,
  outcome,
  t,
}: {
  row: ContaminationCleanupPreviewRow;
  outcome: ContaminationCleanupOutcome | undefined;
  t: ReturnType<typeof useTranslations>;
}) {
  if (outcome) {
    return outcome.applied ? (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" aria-hidden="true" /> {t("statusApplied")}
      </span>
    ) : (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
        <X className="size-3.5" aria-hidden="true" /> {t("statusSkipped")}
      </span>
    );
  }
  if (row.guardWouldPass === null) {
    return <span className="shrink-0 text-xs font-medium text-destructive">{t("statusNotFound")}</span>;
  }
  return row.guardWouldPass ? (
    <span className="shrink-0 text-xs text-muted-foreground">{t("statusWillApply")}</span>
  ) : (
    <span className="shrink-0 text-xs font-medium text-warning">{t("statusGuardFailed")}</span>
  );
}
