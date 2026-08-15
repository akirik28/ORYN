import { Download, LogOut } from "lucide-react";
import { getCurrentProfile, verifySession } from "@/lib/security/dal";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { DisplayNameForm } from "@/features/settings/display-name-form";
import { CapacityForm } from "@/features/settings/capacity-form";
import { DeleteAccountDialog } from "@/features/settings/delete-account-dialog";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await verifySession();
  const profile = await getCurrentProfile();

  return (
    <div className="max-w-xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">{session.email}</p>
        <DisplayNameForm initialName={profile?.display_name ?? ""} />
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Study capacity</h2>
          <p className="text-sm text-muted-foreground">Helps the weekly plan match what you can realistically do.</p>
        </div>
        <CapacityForm
          initialTimeBudget={profile?.weekly_time_budget ?? null}
          initialBusyMode={profile?.busy_mode ?? false}
          initialBusyModeUntil={profile?.busy_mode_until ?? null}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Download everything Oryn has stored about you, or permanently delete your account.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/export-data" />} nativeButton={false}>
            <Download className="size-4" /> Export my data
          </Button>
          <DeleteAccountDialog />
        </div>
      </section>

      <section className="space-y-2 border-t pt-6 text-xs text-muted-foreground">
        <p>
          Career profile scores are Oryn&apos;s own development assessment, not an official admissions
          probability. See individual pages for source information on university and opportunity data.
        </p>
      </section>
    </div>
  );
}
