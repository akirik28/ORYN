"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateProductSettings } from "@/app/(app)/admin/actions";

/**
 * Same shape as FinanceSettingsForm right above this on the page: one field, no confirm
 * step (a number is trivially reversible by typing a different one), router.refresh()
 * after save. Feeds grantUltraGift directly — see admin_product_settings.trial_period_days'
 * own migration comment for why a change here only affects gifts granted after it.
 */
export function TrialPeriodForm({ currentDays, live = true }: { currentDays: number; live?: boolean }) {
  const t = useTranslations("admin.control.settings.trial");
  const router = useRouter();
  const [days, setDays] = useState(String(currentDays));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSaved(false);

    const daysNum = Number(days);
    if (!Number.isInteger(daysNum) || daysNum <= 0) {
      setError(t("invalidDays"));
      return;
    }

    startTransition(async () => {
      const result = await updateProductSettings({ trialPeriodDays: daysNum });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-1)" }}>
          {t("label")}
        </span>
        <input
          type="number"
          inputMode="numeric"
          step="1"
          min="1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          disabled={!live}
          className="w-24 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
          style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !live}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ background: "var(--admin-accent)" }}
      >
        {isPending ? t("saving") : t("save")}
      </button>
      {error ? (
        <p className="w-full text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="w-full text-sm" style={{ color: "var(--admin-accent)" }}>
          {t("saved")}
        </p>
      ) : null}
    </form>
  );
}
