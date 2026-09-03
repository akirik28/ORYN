"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * The live part of /kumanda/kar-zarar. lib/admin/finance.ts's computeUnitEconomics/
 * computeBreakEven/computeMarginMultiple are the real, tested source of truth for this math
 * -- but that file is `server-only` (it reads MONTHLY_BUDGET_CEILING_USD/JOB_BUDGET_USD,
 * which transitively pull in the admin Supabase client and env secrets), so it cannot be
 * imported into a client component that needs to recompute on every keystroke.
 *
 * The formulas below are a deliberate, narrow mirror of computeUnitEconomics/computeBreakEven
 * -- not a second, independently-evolving copy of the business logic. Every constant that
 * matters (the AI cost ceiling, fixed infra, fixed job costs, today's real subscriber count)
 * is a prop passed from the server page, which read it from the same live source finance.ts
 * itself reads. If either formula changes, this file's comment cross-references exactly
 * which function in finance.ts to check against.
 */
export interface KarZararCalculatorProps {
  /** MONTHLY_BUDGET_CEILING_USD, the enforced worst-case AI cost per active user -- see
   *  finance.ts's WORST_CASE_AI_COST_PER_ACTIVE_USER_USD for why this reads the enforcement
   *  constant rather than the cost doc's slightly lower $0.99 message-level derivation. */
  worstCaseAiCostPerActiveUserUsd: number;
  /** RECURRING_INFRA_USD: Supabase + Vercel + domain, fixed monthly, shrinks per user with scale. */
  recurringInfraUsd: number;
  /** SYSTEM_JOB_COSTS_USD: the two shared-catalog jobs, fixed monthly, does not shrink with scale
   *  the way per-user AI cost does. */
  systemJobCostsUsd: number;
  /** Real registered user count today (getAdminUserList().length), the calculator's starting
   *  point -- not a hypothetical, this is what's actually in the database right now. */
  realUserCount: number;
  /** From admin_finance_settings -- null means genuinely unconfigured, never guessed. */
  currentRateTryPerUsd: number | null;
  currentPriceTry: number;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function KarZararCalculator({
  worstCaseAiCostPerActiveUserUsd,
  recurringInfraUsd,
  systemJobCostsUsd,
  realUserCount,
  currentRateTryPerUsd,
  currentPriceTry,
}: KarZararCalculatorProps) {
  const t = useTranslations("admin.control.profitLoss.calculator");

  const [totalUsers, setTotalUsers] = useState(String(Math.max(realUserCount, 1)));
  const [activePercent, setActivePercent] = useState("40");
  const [rate, setRate] = useState(currentRateTryPerUsd === null ? "" : String(currentRateTryPerUsd));
  const [priceTry, setPriceTry] = useState(String(currentPriceTry));

  const result = useMemo(() => {
    const users = Math.max(1, Number(totalUsers) || 0);
    const activeRatio = Math.min(1, Math.max(0, (Number(activePercent) || 0) / 100));
    const rateNum = rate.trim() === "" ? null : Number(rate);
    const priceNum = Number(priceTry) || 0;

    // Mirrors computeUnitEconomics (lib/admin/finance.ts) exactly -- same three cost lines,
    // same "spread the fixed costs across every registered user, not just active ones" shape.
    const activeUsers = users * activeRatio;
    const totalAiCostUsd = activeUsers * worstCaseAiCostPerActiveUserUsd;
    const totalMonthlyCostUsd = totalAiCostUsd + recurringInfraUsd + systemJobCostsUsd;
    const totalCostPerUserUsd = totalMonthlyCostUsd / users;

    // Mirrors computeBreakEven/computeMarginMultiple -- both `RateDependent`, unavailable
    // without a real rate rather than computed against a guess.
    const rateAvailable = rateNum !== null && Number.isFinite(rateNum) && rateNum > 0;
    const priceUsd = rateAvailable ? priceNum / rateNum : null;
    const requiredPayingUsers = rateAvailable && priceUsd! > 0 ? Math.ceil(totalMonthlyCostUsd / priceUsd!) : null;
    const marginMultiple = rateAvailable && priceUsd !== null ? priceUsd / totalCostPerUserUsd : null;

    return { users, activeUsers, totalAiCostUsd, totalMonthlyCostUsd, totalCostPerUserUsd, rateAvailable, priceUsd, requiredPayingUsers, marginMultiple };
  }, [totalUsers, activePercent, rate, priceTry, worstCaseAiCostPerActiveUserUsd, recurringInfraUsd, systemJobCostsUsd]);

  return (
    <div className="space-y-6">
      <div className="admin-panel rounded-xl p-6">
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("inputsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-2)" }}>
              {t("subscriberCount")}
            </span>
            <input
              type="number"
              min="1"
              value={totalUsers}
              onChange={(e) => setTotalUsers(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums"
              style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-2)" }}>
              {t("activePercent")}
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={activePercent}
              onChange={(e) => setActivePercent(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums"
              style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-2)" }}>
              {t("rate")}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={t("rateNotConfigured")}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums"
              style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--admin-ink-2)" }}>
              {t("priceTry")}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceTry}
              onChange={(e) => setPriceTry(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums"
              style={{ border: "1px solid var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-1)" }}
            />
          </label>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {t.rich("hardCapNote", { cap: formatUsd(worstCaseAiCostPerActiveUserUsd), b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <p className="mt-3 text-xs">
          <Link href="/kumanda/ayarlar" style={{ color: "var(--admin-accent)" }}>
            {t("editSavedSettings")}
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="admin-panel rounded-xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
            {t("totalMonthlyCost")}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
            {formatUsd(result.totalMonthlyCostUsd)}
          </p>
        </div>
        <div className="admin-panel rounded-xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
            {t("costPerUser")}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
            {formatUsd(result.totalCostPerUserUsd)}
          </p>
        </div>
        <div className="admin-panel rounded-xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
            {t("breakEvenUsers")}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
            {result.requiredPayingUsers !== null ? result.requiredPayingUsers.toLocaleString() : "—"}
          </p>
          {result.requiredPayingUsers === null ? (
            <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
              {t("rateNotConfiguredHint")}
            </p>
          ) : null}
        </div>
        <div className="admin-panel rounded-xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
            {t("marginMultiple")}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
            {result.marginMultiple !== null ? `${result.marginMultiple.toFixed(1)}×` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
