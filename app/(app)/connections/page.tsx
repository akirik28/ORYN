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

  return (
    <div className="space-y-10">
      <PageHeader
        title="Connections"
        description="Other students you've connected with on Oryn — found through their shared public profile."
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
            <section className="space-y-3">
              <SectionHeader title="Requests" description={`${incomingPending.length} waiting for your response`} />
              <div className="space-y-2">
                {incomingPending.map((connection) => (
                  <PendingRequestRow key={connection.id} connection={connection} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
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
            <section className="space-y-3">
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
        <section className="space-y-3">
          <SectionHeader title="People you may know" description="Based on mutual connections, school, interests, and skills." />
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((person) => (
              <PeopleYouMayKnowRow key={person.id} id={person.id} displayName={person.displayName} reasons={person.reasons} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
