import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Sparkles, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfile, getPublicPortfolio, getPublicSkills } from "@/lib/social/public-profile";
import { getConnectionWith } from "@/lib/social/connections";
import { canShowMessageButton } from "@/lib/social/public-profile-authorization";
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

function SkillList({ skills }: { skills: PublicSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">Skills</h2>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Badge key={skill.name} variant="outline">
            {skill.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuidLike(id)) notFound();

  const session = await requireUser();
  const supabase = await createClient();
  const isSelf = session.userId === id;

  const publicRow = await getPublicProfile(supabase, id);
  let display: PublicProfileRow | null = publicRow;
  const isSelfPrivate = isSelf && !publicRow;
  if (isSelfPrivate) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, country, curriculum, graduation_year, looking_for, created_at")
      .eq("id", id)
      .single();
    display = data;
  }
  if (!display) notFound();

  let portfolio: PortfolioItem[] = [];
  let skills: PublicSkill[] = [];
  let loadFailed = false;
  try {
    [portfolio, skills] = await Promise.all([getPublicPortfolio(id, { bypassCheck: isSelf }), getPublicSkills(id, { bypassCheck: isSelf })]);
  } catch {
    loadFailed = true;
  }

  const connection = isSelf ? null : await getConnectionWith(supabase, session.userId!, id);

  return (
    <div className="max-w-2xl space-y-8">
      {isSelfPrivate ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          Only you can see this. Turn on{" "}
          <Link href="/settings" className="text-brand-primary hover:underline">
            Public profile
          </Link>{" "}
          in Settings to share it.
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
            <h1 className="font-heading text-2xl font-medium tracking-tight">{display.display_name ?? "Oryn student"}</h1>
            <p className="text-sm text-muted-foreground">
              {[display.curriculum, display.country, display.graduation_year ? `Class of ${display.graduation_year}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        {!isSelf ? (
          <div className="flex gap-2">
            {canShowMessageButton(connection?.status ?? null) ? (
              <Button size="sm" variant="outline" render={<Link href={`/messages/${id}`} />} nativeButton={false}>
                <MessageCircle className="size-3.5" /> Message
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
        <StatusBadge tone="brand" icon={Sparkles} label={`Looking for: ${display.looking_for}`} />
      ) : null}

      {loadFailed ? (
        <ErrorState description="We couldn't load the full portfolio right now. The profile above is still accurate." />
      ) : (
        <>
          <SkillList skills={skills} />
          <div className="space-y-3">
            <h2 className="font-semibold">Portfolio</h2>
            <PortfolioView items={portfolio} />
          </div>
        </>
      )}
    </div>
  );
}
