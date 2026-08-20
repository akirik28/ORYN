import { Download, LogOut } from "lucide-react";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { DisplayNameForm } from "@/features/settings/display-name-form";
import { LocationForm } from "@/features/settings/location-form";
import { CitizenshipForm } from "@/features/settings/citizenship-form";
import { CapacityForm } from "@/features/settings/capacity-form";
import { VisibilityForm } from "@/features/settings/visibility-form";
import { DeleteAccountDialog } from "@/features/settings/delete-account-dialog";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // requireUser() (redirect-on-fail), not verifySession() — this page is nested under
  // (app)/layout.tsx's own requireProfile() gate, but per lib/security/dal.ts's own
  // documented discipline a layout isn't guaranteed to re-run on every client-side
  // navigation, so each page still needs its own real check rather than one that
  // silently renders a blank shell for a session that went stale mid-visit.
  const session = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title="Settings" description="Manage your account, privacy, and data." />

      <section className="space-y-4 rounded-xl border p-6">
        <SectionHeader title="Account" />
        <p className="text-sm text-muted-foreground">{session.email}</p>
        <DisplayNameForm initialName={profile?.display_name ?? ""} />
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <SectionHeader
          title="Location"
          description="Used to prioritize nearby opportunities. Country is part of your public profile if you turn that on below; city is never shown publicly."
        />
        <LocationForm initialCountry={profile?.country ?? ""} initialCity={profile?.city ?? null} />
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <SectionHeader
          title="Citizenship"
          description="Different from your location above — used to check citizenship-restricted opportunities. Optional; add as many as apply."
        />
        <CitizenshipForm initialCitizenships={profile?.citizenship_countries ?? []} />
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <SectionHeader title="Study capacity" description="Helps the weekly plan match what you can realistically do." />
        <CapacityForm
          initialTimeBudget={profile?.weekly_time_budget ?? null}
          initialBusyMode={profile?.busy_mode ?? false}
          initialBusyModeUntil={profile?.busy_mode_until ?? null}
        />
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <SectionHeader title="Visibility" description="Control what other Oryn students can see about you." />
        <VisibilityForm
          userId={session.userId!}
          initialIsPublic={profile?.is_public ?? false}
          initialLookingFor={profile?.looking_for ?? null}
        />
      </section>

      <section className="space-y-3 rounded-xl border p-6">
        <SectionHeader title="Your data" description="Download everything Oryn has stored about you, or permanently delete your account." />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/export-data" />} nativeButton={false}>
            <Download className="size-4" /> Export my data
          </Button>
          <DeleteAccountDialog />
        </div>
      </section>

      <p className="border-t pt-6 text-xs text-muted-foreground">
        Career profile scores are Oryn&apos;s own development assessment, not an official admissions
        probability. See individual pages for source information on university and opportunity data.
      </p>
    </div>
  );
}
