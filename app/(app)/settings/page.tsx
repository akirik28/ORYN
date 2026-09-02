import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/features/settings/settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  // requireUser() (redirect-on-fail), not verifySession() — this page is nested under
  // (app)/layout.tsx's own requireProfile() gate, but per lib/security/dal.ts's own
  // documented discipline a layout isn't guaranteed to re-run on every client-side
  // navigation, so each page still needs its own real check rather than one that
  // silently renders a blank shell for a session that went stale mid-visit.
  const session = await requireUser();
  const profile = await getCurrentProfile();

  // Same query app/(app)/notifications/page.tsx already runs for its own unread count —
  // duplicated rather than shared because that page's version is entangled with its own
  // category filter param, and this one never needs to be. Feeds the new notification
  // preferences section's "Mark all read" control, so a student who just muted a category
  // can clear an existing backlog from the same screen instead of navigating away.
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId!)
    .is("read_at", null);

  return (
    <SettingsView email={session.email} userId={session.userId!} profile={profile} unreadNotificationCount={count ?? 0} />
  );
}
