"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OpportunityDisableControl } from "@/features/admin/opportunity-disable-control";
import { searchAdminOpportunities } from "@/app/(app)/admin/actions";
import type { AdminOpportunityRow } from "@/lib/admin/queries";

const STATUS_KEY: Record<AdminOpportunityRow["status"], "statusActive" | "statusExpired" | "statusUnderReview" | "statusDisabled"> = {
  active: "statusActive",
  expired: "statusExpired",
  under_review: "statusUnderReview",
  disabled: "statusDisabled",
};

/**
 * Owns its own state and re-fetches via searchAdminOpportunities rather than the
 * router.refresh()-on-a-server-component pattern every other admin section uses — the one
 * genuinely interactive list on this page (search-as-you-submit), so it needs client state
 * for the query and the result set both. Seeded with the server component's own initial
 * fetch (OpportunitiesSection) so the first paint needs no client round-trip.
 */
export function OpportunityModerationList({ initialRows }: { initialRows: AdminOpportunityRow[] }) {
  const t = useTranslations("admin.opportunities");
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  function search() {
    startTransition(async () => {
      const result = await searchAdminOpportunities(query);
      setRows(result.rows);
    });
  }

  function applyLocalChange(id: string, nowDisabled: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nowDisabled ? "disabled" : "active" } : r)));
  }

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          {t("searchButton")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.organization ?? "—"} · {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={row.status === "disabled" ? "destructive" : "outline"} className="text-xs">
                  {t(STATUS_KEY[row.status])}
                </Badge>
                <OpportunityDisableControl
                  opportunityId={row.id}
                  title={row.title}
                  isDisabled={row.status === "disabled"}
                  onChanged={(nowDisabled) => applyLocalChange(row.id, nowDisabled)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
