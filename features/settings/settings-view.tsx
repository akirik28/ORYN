import { getTranslations, getLocale } from "next-intl/server";
import { Download, FileUp, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/oryn/page-header";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { DisplayNameForm } from "@/features/settings/display-name-form";
import { LocationForm } from "@/features/settings/location-form";
import { CitizenshipForm } from "@/features/settings/citizenship-form";
import { BirthYearForm } from "@/features/settings/birth-year-form";
import { LanguageSwitcher } from "@/features/app-shell/language-switcher";
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
//
// The animated aurora-border glow (`.glass-card*`) was missing from these two — every
// other boxed page this session carries it, so Settings read flat/plain by comparison
// (2026-08-30 founder review: "çerçeve renklendirmesi neredeyse hiçbir yerde yok" on this
// page specifically). Two sections, two different variants so they don't pulse in sync.
const cardClassName = "glass-card space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7";
const cardClassNameOffset = "glass-card-offset space-y-6 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7";

export async function SettingsView({ email, userId, profile }: SettingsViewProps) {
  const t = await getTranslations("settings.view");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
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
