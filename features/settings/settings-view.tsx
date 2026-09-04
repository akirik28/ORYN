import { getTranslations, getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Download, FileUp, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/proxola/page-header";
import { Eyebrow } from "@/components/proxola/eyebrow";
import { DisplayNameForm } from "@/features/settings/display-name-form";
import { LocationForm } from "@/features/settings/location-form";
import { CitizenshipForm } from "@/features/settings/citizenship-form";
import { BirthYearForm } from "@/features/settings/birth-year-form";
import { LanguageSwitcher } from "@/features/app-shell/language-switcher";
import { CapacityForm } from "@/features/settings/capacity-form";
import { VisibilityForm } from "@/features/settings/visibility-form";
import { NotificationPreferencesForm } from "@/features/settings/notification-preferences-form";
import { DeleteAccountDialog } from "@/features/settings/delete-account-dialog";
import { PasswordForm } from "@/features/settings/password-form";
import { ParentInviteSection, type GeneratedInvitePreview } from "@/features/settings/parent-invite-section";
import { getParentLinksForStudent } from "@/lib/parent/links";
import { generateParentInvite } from "@/lib/parent/invite";
import { env } from "@/lib/env";
import type { NotificationCategory, Profile } from "@/types/database";

export interface SettingsViewProps {
  email: string | null;
  userId: string;
  profile: Profile | null;
  unreadNotificationCount: number;
}

// Falls back to enabled for every category when profile is null or migration 0090 hasn't
// applied yet (the columns are simply absent from the fetched row) — the same "enabled unless
// explicitly turned off" default lib/notifications/create.ts's write-side gate uses, so a
// student never sees a toggle read "off" for a category nothing ever actually disabled.
function initialNotificationPreferences(profile: Profile | null): Record<NotificationCategory, boolean> {
  return {
    deadline: profile?.notify_deadline ?? true,
    new_opportunity: profile?.notify_new_opportunity ?? true,
    weekly_plan: profile?.notify_weekly_plan ?? true,
    profile_update: profile?.notify_profile_update ?? true,
    university_data_changed: profile?.notify_university_data_changed ?? true,
    connection: profile?.notify_connection ?? true,
    message: profile?.notify_message ?? true,
  };
}

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md) — computes the one thing
 * features/settings/parent-invite-section.tsx can't compute itself: whether a fresh,
 * shareable invite link should be offered alongside whatever parent_links rows already
 * exist. Deliberately NOT offered whenever something already covers the current email —
 * an active link, or a pending one that hasn't expired — since a second live link for the
 * same relationship would just be a confusing, redundant thing for the student to have to
 * choose between. Generating one is cheap and side-effect-free (lib/parent/invite.ts's own
 * header), so this runs on every render rather than being cached or triggered by a button.
 */
async function loadGeneratedInvitePreview(
  profile: Profile | null,
  links: Awaited<ReturnType<typeof getParentLinksForStudent>>,
  locale: Awaited<ReturnType<typeof getLocale>>
): Promise<GeneratedInvitePreview | null> {
  const invitedEmail = profile?.parent_invite_email ?? null;
  if (!invitedEmail) return null;

  const somethingAlreadyCoversIt = links.some(
    (link) => link.status === "active" || (link.status === "pending" && !link.isExpired)
  );
  if (somethingAlreadyCoversIt) return null;

  const origin = (await headers()).get("origin") || env.app.url;
  const generated = await generateParentInvite({
    studentUserId: profile!.id,
    studentDisplayName: profile?.display_name ?? "",
    invitedEmail,
    locale,
    origin,
  });
  return { acceptUrl: generated.acceptUrl, subject: generated.email.subject, body: generated.email.body, expiresInDays: generated.expiresInDays };
}

// glass-card grouping — literal source values (Figma App.tsx `SettingsScreen`), same
// chrome already used on the dashboard: translucent white over the page's own ground,
// 22px blur. Groups real sections that don't exist in the source's simpler demo
// (Location, Citizenship, Study capacity, Visibility) the same way source groups Account
// and Preferences, rather than inventing a different grouping of our own.
//
// The animated aurora-border glow (`.glass-card*`) was missing from these two — every
// other boxed page this session carries it, so Settings read flat/plain by comparison
// (2026-08-30 founder review: "çerçeve renklendirmesi neredeyse hiçbir yerde yok" on this
// page specifically). Two sections, two different variants so they don't pulse in sync.
const cardClassName = "glass-card space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7";
const cardClassNameOffset = "glass-card-offset space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7";

export async function SettingsView({ email, userId, profile, unreadNotificationCount }: SettingsViewProps) {
  const t = await getTranslations("settings.view");
  const tNav = await getTranslations("nav");
  const tParentInvite = await getTranslations("parentInvite");
  const locale = await getLocale();
  const parentLinks = await getParentLinksForStudent(userId);
  const generatedInvite = await loadGeneratedInvitePreview(profile, parentLinks, locale);
  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title={tNav("settings")} description={t("description")} />

      <section className={cardClassName}>
        <h2 lang={locale} className="text-[13px] font-bold tracking-[0.08em] text-[#AAAABC] uppercase">
          {t("account")}
        </h2>

        {/* The email was previously an unlabelled grey line, which reads as decoration.
            A student needs to be able to answer "which account am I actually in?" —
            especially after switching between a school and a personal address. */}
        <div className="rounded-xl bg-surface-tint px-4 py-3">
          {/* Was a hand-fixed English-only workaround (Eyebrow's own lang handling,
              default locale="en") specifically because this page hadn't been translated
              yet — now that it is, pass the real locale through instead of relying on
              the default. */}
          <Eyebrow rule={false} locale={locale}>{t("signedInAs")}</Eyebrow>
          <p className="mt-1 text-sm break-all text-ink-1">{email}</p>
        </div>

        <DisplayNameForm initialName={profile?.display_name ?? ""} />

        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">{t("password")}</h3>
          <PasswordForm />
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" /> {t("signOut")}
          </Button>
        </form>
      </section>

      {/* id anchors the dashboard parent-email prompt's CTA (features/dashboard/parent-
          email-prompt.tsx's ctaHref="/settings#parent-account") straight to this section
          instead of a bare /settings that leaves the student scrolling to find it. */}
      <section id="parent-account" className={cardClassName}>
        <h2 lang={locale} className="text-[13px] font-bold tracking-[0.08em] text-[#AAAABC] uppercase">
          {tParentInvite("sectionTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{tParentInvite("sectionDescription")}</p>
        <ParentInviteSection
          initialParentEmail={profile?.parent_invite_email ?? null}
          links={parentLinks}
          generatedInvite={generatedInvite}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">{t("yourRecord")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("yourRecordDescription")}</p>
        </div>
        <ButtonLink href="/profile/import" variant="outline">
          <FileUp className="size-4" /> {t("scanCv")}
        </ButtonLink>
      </section>

      <section className={cardClassNameOffset}>
        <h2 lang={locale} className="text-[13px] font-bold tracking-[0.08em] text-[#AAAABC] uppercase">
          {t("preferences")}
        </h2>

        {/* Language first in Preferences, and present here at all, because the sidebar was
            the only place to change it (founder, 2026-09-01: "ayarlar kısmında dil seçeneği
            olmalı"). Settings is where someone goes looking for it. Same LanguageSwitcher
            the shell uses, so there is one control and one Server Action, not a second copy
            of the switching logic to drift. */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">{t("languageTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("languageDescription")}</p>
          <LanguageSwitcher variant="settings" />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("locationTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("locationDescription")}</p>
          <LocationForm initialCountry={profile?.country ?? ""} initialCity={profile?.city ?? null} />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("ageTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("ageDescription")}</p>
          <BirthYearForm initialBirthYear={profile?.birth_year ?? null} />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("citizenshipTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("citizenshipDescription")}</p>
          <CitizenshipForm initialCitizenships={profile?.citizenship_countries ?? []} />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("studyCapacityTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("studyCapacityDescription")}</p>
          <CapacityForm
            initialTimeBudget={profile?.weekly_time_budget ?? null}
            initialBusyMode={profile?.busy_mode ?? false}
            initialBusyModeUntil={profile?.busy_mode_until ?? null}
          />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("visibilityTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("visibilityDescription")}</p>
          <VisibilityForm
            userId={userId}
            initialIsPublic={profile?.is_public ?? false}
            initialLookingFor={profile?.looking_for ?? null}
          />
        </div>

        <div className="space-y-1.5 border-t border-brand-primary-border/40 pt-6">
          <h3 className="text-sm font-medium">{t("notificationsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("notificationsDescription")}</p>
          <NotificationPreferencesForm initialPreferences={initialNotificationPreferences(profile)} unreadCount={unreadNotificationCount} />
        </div>
      </section>

      {/* Danger-zone red tint — literal source values, same as the rest of this page's
          glass-card treatment. */}
      <section
        className="space-y-3 rounded-2xl p-6 md:p-7"
        style={{ background: "rgba(201,53,53,0.04)", border: "1px solid rgba(201,53,53,0.15)" }}
      >
        <h2 lang={locale} className="text-[13px] font-bold tracking-[0.08em] text-[#C93535] uppercase">
          {t("dangerZone")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("dangerZoneDescription")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/export-data" />} nativeButton={false}>
            <Download className="size-4" /> {t("exportData")}
          </Button>
          <DeleteAccountDialog />
        </div>
      </section>

      <section className="space-y-2 border-t pt-6 text-xs text-muted-foreground">
        <p>{t("footerDisclaimer")}</p>
      </section>
    </div>
  );
}
