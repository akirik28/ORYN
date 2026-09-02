"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The live grant/reset lever for one student's shared monthly AI allowance
 * (grantQuota/resetQuotaThisMonth, app/(app)/admin/actions.ts) — same
 * useTransition/toast/router.refresh() shape as JobBudgetEditor. "Reset" needs no input at
 * all (the server computes exactly what to grant); "Grant" takes an admin-typed amount for a
 * partial top-up. Both write the same append-only ledger, never ai_usage itself.
 */
export function GrantQuotaEditor({
  userId,
  monthToDateGrantsUsd,
  grantAction,
  resetAction,
  grantLabel,
  resetLabel,
  amountPlaceholder,
  grantedNote,
}: {
  userId: string;
  monthToDateGrantsUsd: number;
  grantAction: (userId: string, amountUsd: number) => Promise<{ error?: string }>;
  resetAction: (userId: string) => Promise<{ error?: string }>;
  grantLabel: string;
  resetLabel: string;
  amountPlaceholder: string;
  grantedNote: string;
}) {
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAmount("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {monthToDateGrantsUsd > 0 ? <span className="text-xs text-muted-foreground">{grantedNote}</span> : null}
      <Input
        type="number"
        min={0}
        step={0.01}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={isPending}
        placeholder={amountPlaceholder}
        className="h-7 w-20 text-xs"
        aria-label={grantLabel}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={isPending || !amount}
        onClick={() => run(() => grantAction(userId, Number(amount)))}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
        {grantLabel}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={isPending} onClick={() => run(() => resetAction(userId))}>
        {resetLabel}
      </Button>
    </div>
  );
}
