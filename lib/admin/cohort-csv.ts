import type { AdminUserRow } from "@/lib/admin/queries";

/**
 * Pure CSV formatting, kept apart from the route handler that fetches the data — same
 * "logic testable without pulling in the Supabase/next-navigation dependency chain"
 * reasoning as lib/export/tables.ts's own header comment.
 *
 * `tier` is included: as of this rebase (the user-management lane's migration 0089 work,
 * landed on main the same night this was first written), AdminUserRow.tier is a real,
 * resolved PlanTier, not the hardcoded null it was when this file's first draft explicitly
 * omitted it as noise. Written the moment that stopped being true, matching this file's own
 * original intent ("add it back once the field carries real values").
 */
const HEADER = ["user_id", "display_name", "tier", "signed_up_at", "last_seen_at", "lifetime_spend_usd"];

/** RFC 4180 minimal escaping: quote a field, and double any quote inside it, whenever the
 *  field contains a comma, quote, or newline — the three characters that would otherwise
 *  break a naive comma-split read (a display name can legitimately contain any of them). */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildCohortCsv(users: readonly AdminUserRow[]): string {
  const lines = [HEADER.join(",")];
  for (const u of users) {
    lines.push(
      [
        csvField(u.userId),
        csvField(u.displayName ?? ""),
        csvField(u.tier),
        csvField(u.signedUpAt),
        csvField(u.lastSeenAt ?? ""),
        csvField(u.lifetimeSpendUsd.toFixed(4)),
      ].join(",")
    );
  }
  // Trailing newline: several spreadsheet tools treat a CSV's last line as truncated
  // without one.
  return lines.join("\n") + "\n";
}
