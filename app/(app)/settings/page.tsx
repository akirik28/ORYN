import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // requireUser() (redirect-on-fail), not verifySession() — this page is nested under
  // (app)/layout.tsx's own requireProfile() gate, but per lib/security/dal.ts's own
  // documented discipline a layout isn't guaranteed to re-run on every client-side
  // navigation, so each page still needs its own real check rather than one that
  // silently renders a blank shell for a session that went stale mid-visit.
  const session = await requireUser();
  const profile = await getCurrentProfile();

  return <SettingsView email={session.email} userId={session.userId!} profile={profile} />;
}
