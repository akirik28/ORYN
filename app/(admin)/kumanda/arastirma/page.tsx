import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { readResearchQueue } from "@/lib/admin/research-queue";

/**
 * The research queue. Founder's explicit instruction (docs/kumanda-merkezi-yapi-plani-
 * 2026-09-03.md): research never calls an AI API from inside the app -- a Claude Code
 * session runs the work, the result comes back as a doc/SQL, the founder approves. This
 * screen makes that existing, hand-run flow visible; it does not add a button that
 * automates it, because that button would be exactly the "app pays a provider for research"
 * mechanism the founder ruled out.
 *
 * Reads docs/arastirma-kuyrugu.md fresh on every render (lib/admin/research-queue.ts) --
 * that file, not a database table, is the real thing the integrator edits by hand tonight.
 */
export default async function ResearchQueuePage() {
  const t = await getTranslations("admin.control.research");
  const queue = readResearchQueue();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {queue === null ? (
        <div className="admin-panel rounded-xl p-6 text-sm" style={{ color: "var(--admin-ink-2)" }}>
          {t("unavailable")}
        </div>
      ) : (
        <>
          <div className="admin-panel overflow-x-auto rounded-xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  <th className="px-4 py-3 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                    {t("columnArea")}
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                    {t("columnKnownFact")}
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                    {t("columnStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.rows.map((row) => (
                  <tr key={row.number} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td className="px-4 py-3 align-top font-medium" style={{ color: "var(--admin-ink-1)" }}>
                      {row.area}
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: "var(--admin-ink-2)" }}>
                      {row.knownFact}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap" style={{ color: "var(--admin-ink-2)" }}>
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {queue.lanes.length > 0 ? (
            <div className="admin-panel rounded-xl p-6">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
                {t("lanesTitle")}
              </h2>
              <ul className="space-y-2 text-sm">
                {queue.lanes.map((lane) => (
                  <li key={lane.lane} className="flex flex-wrap items-baseline gap-x-2" style={{ color: "var(--admin-ink-2)" }}>
                    <span className="font-medium" style={{ color: "var(--admin-ink-1)" }}>
                      {lane.lane}
                    </span>
                    <span>—</span>
                    <span>{lane.currentWork}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
