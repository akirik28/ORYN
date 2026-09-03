import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConnections } from "@/lib/social/connections";
import { requireConnectionsEnabled } from "@/lib/social/connections-feature-flag";
import { getPeopleYouMayKnow } from "@/lib/social/people-you-may-know-query";
import { PageHeader } from "@/components/proxola/page-header";
import { SectionHeader } from "@/components/proxola/section-header";
import { EmptyState } from "@/components/proxola/empty-state";
import { ConnectionRow, PendingRequestRow } from "@/features/connections/connection-row";
import { PeopleYouMayKnowRow } from "@/features/connections/people-you-may-know-row";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("connections.page");
  return { title: t("eyebrow") };
}

export default async function ConnectionsPage() {
  requireConnectionsEnabled();
  const session = await requireUser();
  const supabase = await createClient();
  const [{ accepted, incomingPending, outgoingPending }, suggestions, t] = await Promise.all([
    getConnections(supabase, session.userId!),
    getPeopleYouMayKnow(session.userId!),
    getTranslations("connections.page"),
  ]);

  const isEmpty = accepted.length === 0 && incomingPending.length === 0 && outgoingPending.length === 0;

  // Figma-source glass-card chrome (App.tsx `ConnectionsScreen`'s tab bar/card
  // translucency) — applied to this page's existing stacked-sections layout rather than
  // source's tabbed one. Source's four-tab UI (Suggested/Requests/Connected/Search)
  // hides everything but one group at a time; this page already shows requests first and
  // everything else below, which surfaces a pending request without an extra click — a
  // reasonable real pattern, not something the visual pass should flatten to match source.
  const cardBase = "space-y-3 rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl md:p-6";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {isEmpty ? (
        <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          {incomingPending.length > 0 ? (
            <section className={`glass-card-fast ${cardBase}`}>
              <SectionHeader title={t("requestsTitle")} description={t("requestsWaiting", { count: incomingPending.length })} />
              <div className="space-y-2">
                {incomingPending.map((connection) => (
                  <PendingRequestRow key={connection.id} connection={connection} />
                ))}
              </div>
            </section>
          ) : null}

          <section className={`glass-card ${cardBase}`}>
            <SectionHeader title={t("connectionsTitle")} description={t("connectedCount", { count: accepted.length })} />
            {accepted.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {accepted.map((connection) => (
                  <ConnectionRow key={connection.id} connection={connection} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title={t("acceptedEmptyTitle")} className="py-6" />
            )}
          </section>

          {outgoingPending.length > 0 ? (
            <section className={`glass-card-offset2 ${cardBase}`}>
              <SectionHeader title={t("sentTitle")} description={t("sentDescription")} />
              <div className="grid gap-3 sm:grid-cols-2">
                {outgoingPending.map((connection) => (
                  <ConnectionRow key={connection.id} connection={connection} pending />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {suggestions.length > 0 ? (
        <section className={`glass-card-offset ${cardBase}`}>
          <SectionHeader title={t("suggestionsTitle")} description={t("suggestionsDescription")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((person) => (
              <PeopleYouMayKnowRow
                key={person.id}
                id={person.id}
                displayName={person.displayName}
                headline={person.headline}
                reasons={person.reasons}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
