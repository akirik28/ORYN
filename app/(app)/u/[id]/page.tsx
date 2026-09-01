import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Lock, Sparkles, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfile, getPublicPortfolio, getPublicSkills, isCurrentlyPublic } from "@/lib/social/public-profile";
import { getFeaturedItems } from "@/lib/social/featured";
import { getConnectionWith } from "@/lib/social/connections";
import { canShowMessageButton } from "@/lib/social/public-profile-authorization";
import { getFilteredContactInfo } from "@/lib/social/contact-info";
import { getEndorsementsForSkills, type SkillEndorsementInfo } from "@/lib/social/endorsements";
import { getRecommendationsFor } from "@/lib/social/recommendations-query";
import { getMutualConnections } from "@/lib/social/mutual-connections";
import { recordProfileView } from "@/lib/social/profile-views";
import { openToLabel, type OpenToOption } from "@/lib/social/open-to";
import { EndorseSkillButton } from "@/features/connections/endorse-skill-button";
import { RecommendationsSection } from "@/features/profile/recommendations-section";
import { RecentActivityStrip } from "@/features/profile/recent-activity-strip";
import { getRecentPortfolioItems } from "@/lib/portfolio/recent";
import { isUuidLike } from "@/lib/validation/uuid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/oryn/status-badge";
import { ErrorState } from "@/components/oryn/error-state";
import { ConnectButton } from "@/features/connections/connect-button";
import { PortfolioView } from "@/features/profile/portfolio-view";
import type { PublicSkill } from "@/lib/social/public-profile";
import type { PortfolioItem } from "@/lib/portfolio/types";
import type { PublicProfileRow } from "@/types/database";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function SkillList({
  skills,
  endorsements,
  ownerId,
  canEndorse,
  heading,
}: {
  skills: PublicSkill[];
  endorsements: Record<string, SkillEndorsementInfo>;
  ownerId: string;
  canEndorse: boolean;
  heading: string;
}) {
  if (skills.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">{heading}</h2>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const info = endorsements[skill.id] ?? { count: 0, endorsedByMe: false };
          return (
            <div key={skill.id} className="flex items-center gap-1 rounded-full border border-input py-0.5 pl-3 pr-1">
              <span className="text-sm">{skill.name}</span>
              {canEndorse ? (
                <EndorseSkillButton skillId={skill.id} skillOwnerId={ownerId} initialCount={info.count} initialEndorsedByMe={info.endorsedByMe} />
              ) : info.count > 0 ? (
                <span className="pr-1.5 text-xs text-muted-foreground">{info.count}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mirrors the page body's own visibility gating exactly (public row, or self viewing their
// own private profile) rather than a lighter/wider query — this page is privacy-sensitive
// (Phase 12), so a non-owner requesting a private profile must see the same generic title
// the notFound() page below would give them, never the real name leaking through the tab
// or browser history.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isUuidLike(id)) return {};
  const session = await requireUser();
  const supabase = await createClient();
  const isSelf = session.userId === id;
  const publicRow = await getPublicProfile(supabase, id);
  let displayName = publicRow?.display_name ?? null;
  if (!displayName && isSelf) {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", id).single();
    displayName = data?.display_name ?? null;
  }
  return { title: displayName ?? "Profile" };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuidLike(id)) notFound();

  const session = await requireUser();
  const supabase = await createClient();
  const isSelf = session.userId === id;
  const locale = await getLocale();
  const t = await getTranslations("publicProfile");
  const fallbackName = t("fallbackName");

  const publicRow = await getPublicProfile(supabase, id);
  let display: PublicProfileRow | null = publicRow;
  const isSelfPrivate = isSelf && !publicRow;
  if (isSelfPrivate) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, headline, about, country, curriculum, graduation_year, looking_for, created_at")
      .eq("id", id)
      .single();
    display = data;
  }
  if (!display) notFound();

  if (!isSelf) {
    await recordProfileView(supabase, id, session.userId!);
  }

  let portfolio: PortfolioItem[] = [];
  let skills: PublicSkill[] = [];
  let featured: Awaited<ReturnType<typeof getFeaturedItems>> = [];
  let loadFailed = false;
  try {
    const isPublic = isSelf ? false : await isCurrentlyPublic(id);
    [portfolio, skills, featured] = await Promise.all([
      getPublicPortfolio(id, { bypassCheck: isSelf }),
      getPublicSkills(id, { bypassCheck: isSelf }),
      getFeaturedItems(id, { isSelf, isPublic }),
    ]);
  } catch {
    loadFailed = true;
  }

  const connection = isSelf ? null : await getConnectionWith(supabase, session.userId!, id);
  const hasAcceptedConnection = connection?.status === "accepted";
  const contact = await getFilteredContactInfo(id, { isSelf, hasAcceptedConnection });
  const endorsements = await getEndorsementsForSkills(skills.map((s) => s.id), session.userId ?? null);
  const recommendations = await getRecommendationsFor(id, { includeHidden: isSelf });
  const mutual = isSelf ? { count: 0, preview: [] } : await getMutualConnections(session.userId!, id);
  const hasAnyContact =
    contact.phone || contact.email || contact.linkedinUrl || contact.instagramHandle || contact.githubUrl || contact.websiteUrl || contact.twitterHandle || contact.discordHandle;

  return (
    <div className="max-w-2xl space-y-8">
      {isSelfPrivate ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          {t.rich("privateNotice", {
            settingsLink: (chunks) => (
              <Link href="/settings" className="text-brand-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">
              {initials(display.display_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl tracking-tight">{display.display_name ?? fallbackName}</h1>
            {display.headline ? <p className="text-sm font-medium text-foreground/90">{display.headline}</p> : null}
            <p className="text-sm text-muted-foreground">
              {[display.curriculum, display.country, display.graduation_year ? t("classOf", { year: display.graduation_year }) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {mutual.count > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("mutualConnections", { count: mutual.count })}
                {mutual.preview.length > 0
                  ? `: ${mutual.preview
                      .map((p) => p.displayName ?? fallbackName)
                      .join(", ")}${mutual.count > mutual.preview.length ? ` +${mutual.count - mutual.preview.length}` : ""}`
                  : null}
              </p>
            ) : null}
          </div>
        </div>
        {!isSelf ? (
          <div className="flex gap-2">
            {canShowMessageButton(connection?.status ?? null) ? (
              <Button size="sm" variant="outline" render={<Link href={`/messages/${id}`} />} nativeButton={false}>
                <MessageCircle className="size-3.5" /> {t("message")}
              </Button>
            ) : null}
            <ConnectButton
              targetId={id}
              initialStatus={connection?.status ?? null}
              initialConnectionId={connection?.id ?? null}
              isRecipient={connection?.recipient_id === session.userId}
            />
          </div>
        ) : null}
      </div>

      {display.looking_for ? (
        <StatusBadge tone="brand" icon={Sparkles} label={t("lookingFor", { value: display.looking_for })} />
      ) : null}

      {display.about ? (
        <div className="space-y-2">
          <h2 className="font-semibold">{t("aboutHeading")}</h2>
          <p className="whitespace-pre-wrap text-sm break-words text-muted-foreground">{display.about}</p>
        </div>
      ) : null}

      {!loadFailed ? <RecentActivityStrip items={getRecentPortfolioItems(portfolio)} /> : null}

      {featured.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold">{t("featuredHeading")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.map((item) =>
              item.url ? (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="space-y-1 rounded-xl border p-4 hover:border-brand-primary/50"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                </a>
              ) : (
                <div key={item.id} className="space-y-1 rounded-xl border p-4">
                  <p className="font-medium">{item.title}</p>
                  {item.organization ? <p className="text-sm text-muted-foreground">{item.organization}</p> : null}
                  {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                </div>
              )
            )}
          </div>
        </div>
      ) : null}

      {loadFailed ? (
        <ErrorState description={t("loadFailed")} />
      ) : (
        <>
          <SkillList
            skills={skills}
            endorsements={endorsements}
            ownerId={id}
            canEndorse={!isSelf && hasAcceptedConnection}
            heading={t("skillsHeading")}
          />
          <div className="space-y-3">
            <h2 className="font-semibold">{t("portfolioHeading")}</h2>
            <PortfolioView items={portfolio} />
          </div>
        </>
      )}

      <RecommendationsSection
        recipientId={id}
        items={recommendations}
        viewerId={session.userId!}
        isSelf={isSelf}
        canWrite={!isSelf && hasAcceptedConnection}
      />

      {contact.openTo.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-semibold">{t("openToHeading")}</h2>
          <div className="flex flex-wrap gap-1.5">
            {contact.openTo.map((option) => (
              <Badge key={option} variant="outline">
                {openToLabel(option as OpenToOption, locale)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {hasAnyContact ? (
        <div className="space-y-2">
          <h2 className="font-semibold">{t("contactHeading")}</h2>
          {/* break-words on every URL/email value below (2026-08-29 mobile sweep) — a real
              value like an email address or a non-vanity LinkedIn/GitHub URL is one
              unbroken token with no space for the browser to wrap on by default, so it
              pushed past this list's container width instead of wrapping. Deliberately
              `break-words`, not the `truncate` this same file uses for Featured-item URLs
              above: those are card labels where the link itself is the point and an
              ellipsis is fine; this list exists specifically so a viewer can read the full
              contact value, so wrapping it in full beats hiding the end of it. */}
          <ul className="space-y-1.5 text-sm">
            {contact.email ? (
              <li>
                <span className="text-muted-foreground">{t("contactEmail")}</span>
                <a href={`mailto:${contact.email}`} className="break-words text-brand-primary hover:underline">
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.phone ? (
              <li>
                <span className="text-muted-foreground">{t("contactPhone")}</span>
                {contact.phone}
              </li>
            ) : null}
            {contact.linkedinUrl ? (
              <li>
                <span className="text-muted-foreground">{t("contactLinkedin")}</span>
                <a href={contact.linkedinUrl} target="_blank" rel="noreferrer noopener" className="break-words text-brand-primary hover:underline">
                  {contact.linkedinUrl}
                </a>
              </li>
            ) : null}
            {contact.githubUrl ? (
              <li>
                <span className="text-muted-foreground">{t("contactGithub")}</span>
                <a href={contact.githubUrl} target="_blank" rel="noreferrer noopener" className="break-words text-brand-primary hover:underline">
                  {contact.githubUrl}
                </a>
              </li>
            ) : null}
            {contact.websiteUrl ? (
              <li>
                <span className="text-muted-foreground">{t("contactWebsite")}</span>
                <a href={contact.websiteUrl} target="_blank" rel="noreferrer noopener" className="break-words text-brand-primary hover:underline">
                  {contact.websiteUrl}
                </a>
              </li>
            ) : null}
            {contact.instagramHandle ? (
              <li>
                <span className="text-muted-foreground">{t("contactInstagram")}</span>
                {contact.instagramHandle}
              </li>
            ) : null}
            {contact.twitterHandle ? (
              <li>
                <span className="text-muted-foreground">{t("contactTwitter")}</span>
                {contact.twitterHandle}
              </li>
            ) : null}
            {contact.discordHandle ? (
              <li>
                <span className="text-muted-foreground">{t("contactDiscord")}</span>
                {contact.discordHandle}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
