"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateFinanceSettings } from "@/app/(app)/admin/actions";

/**
 * The one write path for `admin_finance_settings` (app/(app)/admin/actions.ts's
 * updateFinanceSettings, unmoved, unmodified -- imported, not duplicated). Two fields,
 * saved together as one call so a partial save (rate only, price stuck at whatever it was)
 * can't happen from this form -- matches the action's own "both optional, whichever is
 * provided" contract, this form just always provides both.
 *
 * `router.refresh()` after a successful save: added when the action's own revalidation
 * still said `revalidatePath("/admin")` -- a route that only ever redirects now, so it
 * invalidated nothing this form's readers actually look at, and this refresh was what
 * really made /kumanda/ayarlar and /kumanda/kar-zarar show the number that was just saved.
 * The action now calls `revalidatePath("/kumanda", "layout")` instead (oryn/admin-surface-
 * repair-2026-09-04), which should cover both pages server-side on its own -- this refresh
 * is very likely redundant now, kept rather than removed in the same pass that fixed the
 * action, since a client-side belt-and-suspenders refresh costs one extra render, not a
 * correctness risk, and removing it wasn't what that fix was checking.
 */
export function FinanceSettingsForm({ currentRate, currentPriceTry, live = true }: { currentRate: number | null; currentPriceTry: number; live?: boolean }) {
  const t = useTranslations("admin.control.settings.finance");
  const router = useRouter();
  const [rate, setRate] = useState(currentRate === null ? "" : String(currentRate));
  const [price, setPrice] = useState(String(currentPriceTry));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSaved(false);

    const rateNum = rate.trim() === "" ? undefined : Number(rate);
    const priceNum = Number(price);

    if (rateNum !== undefined && (!Number.isFinite(rateNum) || rateNum <= 0)) {
      setError(t("invalidRate"));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError(t("invalidPrice"));
      return;
    }

    startTransition(async () => {
      const result = await updateFinanceSettings({ usdTryRate: rateNum, ultraPriceTry: priceNum });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-1)" }}>
            {t("rateLabel")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={t("rateNotConfigured")}
            disabled={!live}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
            style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
          />
          <span className="mt-1 block text-xs" style={{ color: "var(--admin-ink-3)" }}>
            {t("rateHint")}
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-1)" }}>
            {t("priceLabel")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={!live}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
            style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm" style={{ color: "var(--admin-accent)" }}>
          {t("saved")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !live}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ background: "var(--admin-accent)" }}
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
