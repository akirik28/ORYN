import { formatDistanceToNow } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderHealth } from "@/lib/admin/queries";
import { StatusBadge } from "./status-badge";

export async function ProviderHealthSection() {
  const admin = createAdminClient();
  const providers = await getProviderHealth(admin);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Provider health</h2>
      </div>
      {providers.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {providers.map((provider) => (
            <li key={provider.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-medium">{provider.provider}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                {provider.last_error ? <span className="max-w-xs truncate text-xs">{provider.last_error}</span> : null}
                <span className="text-xs">
                  {provider.last_success_at ? `Last OK ${formatDistanceToNow(new Date(provider.last_success_at), { addSuffix: true })}` : "Never succeeded"}
                </span>
                {/* last_failure_at was always a real column here — it just wasn't shown. A
                    provider can be `healthy` today while having failed recently (one good
                    call after a run of bad ones resets `status`, not the failure timestamp),
                    so showing only "last OK" hides exactly the recovery-vs-never-had-a-
                    problem distinction someone checking this page wants. */}
                <span className="text-xs">
                  {provider.last_failure_at ? `Last failure ${formatDistanceToNow(new Date(provider.last_failure_at), { addSuffix: true })}` : "Never failed"}
                </span>
                <StatusBadge status={provider.status} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No provider calls recorded yet.</p>
      )}
    </section>
  );
}
