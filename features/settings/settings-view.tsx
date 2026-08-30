import { Download, FileUp, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/oryn/page-header";
import { DisplayNameForm } from "@/features/settings/display-name-form";
import { LocationForm } from "@/features/settings/location-form";
import { CitizenshipForm } from "@/features/settings/citizenship-form";
import { CapacityForm } from "@/features/settings/capacity-form";
import { VisibilityForm } from "@/features/settings/visibility-form";
import { DeleteAccountDialog } from "@/features/settings/delete-account-dialog";
import { PasswordForm } from "@/features/settings/password-form";
import type { Profile } from "@/types/database";

export interface SettingsViewProps {
  email: string | null;
  userId: string;
  profile: Profile | null;
}

// glass-card grouping — literal source values (Figma App.tsx `SettingsScreen`), same
// chrome already used on the dashboard: translucent white over the page's own ground,
// 22px blur. Groups real sections that don't exist in the source's simpler demo
// (Location, Citizenship, Study capacity, Visibility) the same way source groups Account
// and Preferences, rather than inventing a different grouping of our own.
const cardClassName = "space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7";

export function SettingsView({ email, userId, profile }: SettingsViewProps) {
  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <section className={cardClassName}>
        <h2 className="text-[13px] font-bold tracking-[0.08em] text-[#AAAABC] uppercase">Account</h2>

        {/* The email was previously an unlabelled grey line, which reads as decoration.
            A student needs to be able to answer "which account am I actually in?" —
            especially after switching between a school and a personal address. */}
        <div className="rounded-xl bg-surface-tint px-4 py-3">
          <p className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">Signed in as</p>
          <p className="mt-1 text-sm break-all text-ink-1">{email}</p>
        </div>

        <DisplayNameForm initialName={profile?.display_name ?? ""} />

        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">Password</h3>
          <PasswordForm />
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Your record</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Import from a CV instead of typing everything in. Oryn shows you what it found and
            adds only what you confirm.
          </p>
        </div>
        <ButtonLink href="/profile/import" variant="outline">
          <FileUp className="size-4" /> Scan a CV
        </ButtonLink>
      </section>

      <section className={cardClassName}>
        <h2 className="text-[13px] font-bold tracking-[0.08em] text-[#AAAABC] uppercase">Preferences</h2>

        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">Location</h3>
          <p className="text-sm text-muted-foreground">
            Used to prioritize nearby opportunities. Country is part of your public profile if you turn that on below; city is never shown publicly.
          </p>
          <LocationForm initialCountry={profile?.country ?? ""} initialCity={profile?.city ?? null} />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">Citizenship</h3>
          <p className="text-sm text-muted-foreground">
            Different from your location above — used to check citizenship-restricted opportunities. Optional; add as many as apply.
          </p>
          <CitizenshipForm initialCitizenships={profile?.citizenship_countries ?? []} />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">Study capacity</h3>
          <p className="text-sm text-muted-foreground">Helps the weekly plan match what you can realistically do.</p>
          <CapacityForm
            initialTimeBudget={profile?.weekly_time_budget ?? null}
            initialBusyMode={profile?.busy_mode ?? false}
            initialBusyModeUntil={profile?.busy_mode_until ?? null}
          />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">Visibility</h3>
          <p className="text-sm text-muted-foreground">Control what other Oryn students can see about you.</p>
          <VisibilityForm
            userId={userId}
            initialIsPublic={profile?.is_public ?? false}
            initialLookingFor={profile?.looking_for ?? null}
          />
        </div>
      </section>

      {/* Danger-zone red tint — literal source values, same as the rest of this page's
          glass-card treatment. */}
      <section
        className="space-y-3 rounded-2xl p-6 md:p-7"
        style={{ background: "rgba(201,53,53,0.04)", border: "1px solid rgba(201,53,53,0.15)" }}
      >
        <h2 className="text-[13px] font-bold tracking-[0.08em] text-[#C93535] uppercase">Danger zone</h2>
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
