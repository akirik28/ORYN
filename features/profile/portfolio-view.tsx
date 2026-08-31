"use client";

import { FolderOpen } from "lucide-react";
import { spanLabel } from "@/lib/profile/journey";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/oryn/empty-state";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioItem, type PortfolioCategory } from "@/lib/portfolio/types";

function ItemCard({ item }: { item: PortfolioItem }) {
  // Same formatter as the CV and the Journey timeline — see cv-builder's note.
  const dateRange = spanLabel({
    start: item.startDate,
    end: item.endDate,
    ongoing: item.ongoing,
    ongoingLabel: "Present",
  });
  return (
    <div className="lit-card space-y-1 rounded-xl border border-white/65 bg-white/45 p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold">{item.title}</h3>
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

export function PortfolioView({ items }: { items: PortfolioItem[] }) {
  const categories = Object.keys(PORTFOLIO_CATEGORY_LABELS) as PortfolioCategory[];
  const byCategory = categories
    .map((category) => ({ category, items: items.filter((i) => i.category === category) }))
    .filter((group) => group.items.length > 0);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Nothing here yet"
        description="Achievements you add to your profile will appear here automatically."
      />
    );
  }

  return (
    <Tabs defaultValue="timeline">
      <TabsList>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="category">By category</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="space-y-3 pt-4">
        {items.map((item) => (
          <ItemCard key={`${item.category}-${item.id}`} item={item} />
        ))}
      </TabsContent>
      <TabsContent value="category" className="space-y-8 pt-4">
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
  );
}
