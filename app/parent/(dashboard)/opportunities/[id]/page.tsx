import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/security/dal";
import { getActiveParentLink } from "@/lib/auth/account-role";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { loadParentSafeOpportunityDetail } from "@/lib/parent/opportunity-detail";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import { categoryLabel } from "@/lib/opportunities/labels";

/**
 * A direct, minimal query rather than reusing loadParentSafeOpportunityDetail's own
 * select("*") -- unlike the university detail page's 8-query aggregate, this table read is
 * already a single, cheap, primary-key lookup, so a second one for just `title` costs less
 * than the machinery (a cache()-wrapped shared helper) that would be needed to dedupe it.
 * Not gated behind getActiveParentLink here: a title leaking an opportunity's own name to
 * whoever holds a guessable id is not the access boundary this page's body enforces (the
 * catalog itself is public read, per the catalog browser's own comment) -- this only reads
 * `title`, nothing about who requested it.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: opportunity }, t] = await Promise.all([
    supabase.from("opportunities").select("title").eq("id", id).maybeSingle(),
    getTranslations("parent.opportunityDetail"),
  ]);
  return { title: opportunity?.title ?? t("fallbackTitle") };
}

/**
 * B6 (2026-09-04) — the parent-safe opportunity detail page. Plain catalog fact only,
 * matching lib/parent/opportunity-detail.ts's own scope: no match score, no eligibility, no
 * server action, no save/apply button. See that module's header for why match data isn't
 * shown here even though a channel for it exists elsewhere in this codebase
 * (lib/parent/panel-data.ts) — a real inconsistency with B3c's own stricter rule, flagged to
 * CEO rather than resolved by this file picking a side.
 */
export default async function ParentOpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const locale = await resolveLocale();
  const tr = locale === "tr";

  const link = session.userId ? await getActiveParentLink(session.userId) : null;
  if (!link) redirect("/parent/pending");

  const supabase = await createClient();
  const opportunity = await loadParentSafeOpportunityDetail(supabase, id);
  if (!opportunity) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{opportunity.title}</h1>
        {opportunity.organization ? <p className="mt-1 text-sm text-muted-foreground">{opportunity.organization}</p> : null}
        <p className="mt-3 text-sm text-muted-foreground">{tr ? "Yalnızca gözlemleyebilirsiniz. Hiçbir şeyi değiştiremez veya kaydedemezsiniz." : "You can only observe here. Nothing can be changed or saved from this view."}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">{categoryLabel(opportunity.category, locale)}</span>
        {opportunity.deadline ? <DeadlineBadge date={opportunity.deadline} locale={locale} /> : null}
      </div>

      {opportunity.description ? <p className="text-sm leading-relaxed text-foreground">{opportunity.description}</p> : null}

      {opportunity.country ? (
        <p className="text-sm text-muted-foreground">
          {tr ? "Ülke" : "Country"}: <span className="text-foreground">{opportunity.country}</span>
        </p>
      ) : null}

      {opportunity.official_url ? (
        <a
          href={opportunity.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm hover:underline"
          style={{ color: "var(--role-accent)" }}
        >
          {tr ? "Resmi sayfa" : "Official page"} <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
