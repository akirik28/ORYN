import { Users } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConnections } from "@/lib/social/connections";
import { getPeopleYouMayKnow } from "@/lib/social/people-you-may-know-query";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { ConnectionRow, PendingRequestRow } from "@/features/connections/connection-row";
import { PeopleYouMayKnowRow } from "@/features/connections/people-you-may-know-row";

export const metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const [{ accepted, incomingPending, outgoingPending }, suggestions] = await Promise.all([
    getConnections(supabase, session.userId!),
    getPeopleYouMayKnow(session.userId!),
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
      <PageHeader
        eyebrow="Connections"
        title="People on a similar path."
        description="Students whose record overlaps with yours. Oryn shows you why before you connect — and only ever surfaces someone who has chosen to make their profile public."
      />

      {isEmpty ? (
        <EmptyState
          icon={Users}
          title="No connections yet"
          description="Turn on your public profile in Settings to share it, or accept a request when one comes in."
        />
      ) : (
        <>
          {incomingPending.length > 0 ? (
            <section className={`glass-card-fast ${cardBase}`}>
              <SectionHeader title="Requests" description={`${incomingPending.length} waiting for your response`} />
              <div className="space-y-2">
                {incomingPending.map((connection) => (
                  <PendingRequestRow key={connection.id} connection={connection} />
                ))}
              </div>
            </section>
          ) : null}

          <section className={`glass-card ${cardBase}`}>
            <SectionHeader title="Your connections" description={`${accepted.length} connected`} />
            {accepted.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {accepted.map((connection) => (
                  <ConnectionRow key={connection.id} connection={connection} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="Accepted connections will appear here." className="py-6" />
            )}
          </section>

          {outgoingPending.length > 0 ? (
            <section className={`glass-card-offset2 ${cardBase}`}>
              <SectionHeader title="Sent" description="Waiting for a response" />
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
          <SectionHeader
            title="People on a similar path"
            description="Ranked by real overlap with your record — mutual connections, school, interests and skills. Every reason is shown."
          />
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
