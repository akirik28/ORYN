"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FolderOpen } from "lucide-react";
import { spanLabel } from "@/lib/profile/journey";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/proxola/empty-state";
import { StatusBadge } from "@/components/proxola/status-badge";
import { evidenceStatusPresentation } from "@/lib/profile/evidence-status-presentation";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioItem, type PortfolioCategory, type PortfolioSkill } from "@/lib/portfolio/types";

function ItemCard({ item }: { item: PortfolioItem }) {
  const tEvidence = useTranslations("evidenceStatus");
  // Same formatter as the CV and the Journey timeline — see cv-builder's note.
  const dateRange = spanLabel({
    start: item.startDate,
    end: item.endDate,
    ongoing: item.ongoing,
    ongoingLabel: "Present",
  });
  // Same mapping AchievementSection uses (lib/profile/evidence-status-presentation.ts):
  // null for self_reported/education, so the common case stays quiet rather than repeating
  // a badge on every card — see that file's own reasoning.
  const evidence = evidenceStatusPresentation(item.evidenceStatus);
  return (
    <div className="lit-card space-y-1 rounded-xl border border-white/65 bg-white/45 p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-semibold">{item.title}</h3>
          {evidence ? <StatusBadge label={tEvidence(evidence.labelKey)} tone={evidence.tone} icon={evidence.icon} /> : null}
        </div>
        {dateRange ? <span className="text-xs text-muted-foreground">{dateRange}</span> : null}
      </div>
      {item.organization ? <p className="text-sm text-muted-foreground">{item.organization}</p> : null}
      {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
      {item.meta ? (
        <Badge variant="outline" className="mt-1">
          {item.meta}
        </Badge>
      ) : null}
    </div>
  );
}

function SkillsSection({ skills }: { skills: PortfolioSkill[] }) {
  const t = useTranslations("profile.portfolioView");
  if (skills.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">{t("skills")}</h2>
      {/* Same pill visual language as the public profile's SkillList
          (app/(app)/u/[id]/page.tsx) — no endorsement affordance here, since that's a
          social feature between two accounts and this page shows a student their own,
          private portfolio. */}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span key={skill.id} className="rounded-full border border-input px-3 py-0.5 text-sm">
            {skill.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PortfolioView({ items, skills = [] }: { items: PortfolioItem[]; skills?: PortfolioSkill[] }) {
  const t = useTranslations("profile.portfolioView");
  const categories = Object.keys(PORTFOLIO_CATEGORY_LABELS) as PortfolioCategory[];
  const byCategory = categories
    .map((category) => ({ category, items: items.filter((i) => i.category === category) }))
    .filter((group) => group.items.length > 0);

  if (items.length === 0 && skills.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button size="sm" render={<Link href="/profile" />} nativeButton={false}>
            {t("emptyAction")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {items.length > 0 ? (
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">{t("timeline")}</TabsTrigger>
            <TabsTrigger value="category">{t("byCategory")}</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="space-y-3 pt-4">
            {items.map((item) => (
              <ItemCard key={`${item.category}-${item.id}`} item={item} />
            ))}
          </TabsContent>
          <TabsContent value="category" className="space-y-8 pt-4">
            {/* PORTFOLIO_CATEGORY_LABELS deliberately untranslated — shared with cv-builder.tsx,
                which can't localize it without either mismatching its own controls-vs-print
                labels or answering a real product question about printed-CV language this pass
                doesn't own. See that file's own comment. */}
            {byCategory.map((group) => (
              <div key={group.category} className="space-y-3">
                <h2 className="font-semibold">{PORTFOLIO_CATEGORY_LABELS[group.category]}</h2>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      ) : null}
      <SkillsSection skills={skills} />
    </div>
  );
}
