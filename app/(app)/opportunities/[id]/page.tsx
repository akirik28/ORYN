import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
// Wallet, not DollarSign: the icon sits beside a figure whose currency is not recorded, so a
// dollar glyph asserts the same thing the "$" prefix used to.
import { ExternalLink, MapPin, Wallet, Calendar, Users2 } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { matchTierKey } from "@/lib/opportunities/matching";
import {
  insufficientVerificationReason,
  isOpportunitySufficientlyVerified,
  resolveStoredEligibility,
  selectivityLabel,
  cycleStatusLabel,
} from "@/lib/opportunities/lifecycle";
import { categoryLabel } from "@/lib/opportunities/labels";
import { OpportunityStandingBadge } from "@/features/opportunities/standing-badge";
import { PageHeader } from "@/components/proxola/page-header";
import { ErrorState } from "@/components/proxola/error-state";
import { SectionHeader } from "@/components/proxola/section-header";
import { SourceBadge } from "@/components/proxola/source-badge";
import { StatusBadge } from "@/components/proxola/status-badge";
import { NextMove } from "@/components/proxola/next-move";
import { differenceInCalendarDays } from "date-fns";
import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { formatMoney } from "@/lib/i18n/format";
import { urgencyLabel } from "@/components/proxola/deadline-badge";
import type { Locale } from "@/lib/i18n/config";
import type { ConfidenceLevel } from "@/components/proxola/confidence-indicator";

// Was a static "Opportunity" title on every one of these pages — technically present, but
// no more useful than a missing one for telling tabs/history apart. Public/global data
// (opportunities aren't user-owned), so a plain lightweight query is fine here, same as
// the university detail page.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase.from("opportunities").select("title").eq("id", id).single();
  return { title: opportunity?.title ?? "Opportunity" };
}

/**
 * What to call a source when `opportunities.source` is null — which it can be: the column is
 * nullable with no default, so any row inserted with a `source_url` but no `source` reaches
 * this. It used to read "Official source", which asserts a source tier nobody recorded. The
 * host name is the one thing the URL actually proves, and it matches what the branch above
 * does with a real `opportunity_sources` row (`source_domain ?? source_url`).
 */
function sourceNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Same TS2589 workaround as app/(app)/universities/[id]/page.tsx's own `Translator` alias —
 * `Awaited<ReturnType<typeof getTranslations>>` blows up type instantiation once passed into
 * a plain function and called with a dynamic key, on this catalog's scale. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const LOCATION_MODE_LABEL_EN: Record<string, string> = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
};

const LOCATION_MODE_LABEL_TR: Record<string, string> = {
  online: "Çevrimiçi",
  in_person: "Yüz yüze",
  hybrid: "Hibrit",
};

function locationModeLabel(mode: string, locale: Locale): string {
  const table = locale === "tr" ? LOCATION_MODE_LABEL_TR : LOCATION_MODE_LABEL_EN;
  return table[mode] ?? humanize(mode);
}

/** "fit" register — this page's own first-person verdict framing ("Proxola's take"), not
 * Browse's ranked-list "match" wording (features/opportunities/opportunity-card.tsx's
 * tierFor). Same lib/opportunities/matching.ts matchTierKey thresholds and, deliberately,
 * the same English text for the middle two tiers — that's this codebase's actual copy, not a
 * shortcut taken while translating. */
function fitLabel(score: number, t: Translator): string {
  return t(matchTierKey(score));
}

/** Same reason vocabulary as the card, written long-form for the detail page. Kept local for
 * the same reason opportunity-card.tsx's reasonSentence is — generated prose from reason
 * codes, not static React-tree copy, so it stays out of the message catalog even though this
 * file is itself a Server Component (the split is generated-vs-static, not client-vs-server). */
function takeSentences(reasonCodes: string[], locale: Locale): string[] {
  if (locale === "tr") {
    const out: string[] = [];
    if (reasonCodes.includes("addresses_a_current_gap")) {
      out.push("Profilinde şu anda en az kanıt bulunan bir alanı hedefliyor; bu yüzden burada harcayacağın aynı emek, profilini başka bir yerden daha fazla ileri taşır.");
    }
    if (reasonCodes.includes("matches_your_interests")) {
      out.push("Proxola'ya takip ettiğini söylediğin bir alanda yer alıyor; bu da sürdürmesini kolaylaştırır ve profilinin geri kalanıyla daha tutarlı olmasını sağlar.");
    }
    if (reasonCodes.includes("shares_your_interest")) {
      out.push("Proxola'ya söylediğin ilgi alanlarından biriyle örtüşüyor, tek başına güçlü bir eşleşme olmasa da.");
    }
    if (reasonCodes.includes("near_you")) {
      out.push("Kendi ülkende gerçekleşiyor; bu genellikle yurt dışındaki benzer bir programa kıyasla daha az seyahat, maliyet ve vize engeli anlamına gelir.");
    }
    if (reasonCodes.includes("limited_opportunity_information")) {
      out.push("Proxola'nın bu fırsatın odak alanları hakkında henüz yeterli bilgisi yok, bu yüzden eşleşmeyi daha net açıklayamıyoruz — uygunluk bilgisi gerçek, ilgi alanı karşılaştırması henüz yapılamıyor.");
    }
    if (reasonCodes.includes("limited_profile_information")) {
      out.push("Profilinde kayıtlı ilgi alanı olmadığı için Proxola bunu henüz ilgi alanlarınla karşılaştıramıyor — birkaç tane eklersen daha net bir açıklama alabilirsin.");
    }
    if (reasonCodes.includes("similar_to_dismissed")) {
      out.push("Daha önce benzer bir fırsatı ilgilenmiyorum olarak işaretlediğin için bu eşleşme biraz daha düşük sıralandı — yine de listede, çünkü hâlâ senin kararın.");
    }
    return out;
  }
  const out: string[] = [];
  if (reasonCodes.includes("addresses_a_current_gap")) {
    out.push("It targets an area where your profile currently has the least supporting evidence, so the same effort here moves your profile further than it would elsewhere.");
  }
  if (reasonCodes.includes("matches_your_interests")) {
    out.push("It sits in a field you've told Proxola you're pursuing, which makes it easier to sustain and more coherent alongside the rest of your record.");
  }
  if (reasonCodes.includes("shares_your_interest")) {
    out.push("It overlaps with one of the interests you've told Proxola about, even though the match isn't as close as some others on your list.");
  }
  if (reasonCodes.includes("near_you")) {
    out.push("It's based in your country, which usually means fewer travel, cost and visa obstacles than an equivalent programme abroad.");
  }
  if (reasonCodes.includes("limited_opportunity_information")) {
    out.push("Proxola doesn't yet have enough detail on this opportunity's focus areas to explain the match more specifically — the eligibility read is real, the interest comparison just isn't possible yet.");
  }
  if (reasonCodes.includes("limited_profile_information")) {
    out.push("Proxola can't yet compare this against your interests because your profile doesn't have any recorded — add a few for a more specific read.");
  }
  if (reasonCodes.includes("similar_to_dismissed")) {
    out.push("This ranked a little lower because it resembles something you already marked not interested in — it's still on the list, since that's still your call to make.");
  }
  return out;
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();
  const locale = await resolveLocale();
  const t = (await getTranslations("opportunities.detailPage")) as Translator;
  const tTier = (await getTranslations("opportunities.fitTier")) as Translator;
  const tSourceBadge = (await getTranslations("sourceBadge")) as Translator;
  // "Eligibility unknown" is the same badge Browse's card shows for the identical condition
  // (opportunity-card.tsx) — reused from opportunities.card rather than duplicated into
  // opportunities.detailPage.
  const tCard = (await getTranslations("opportunities.card")) as Translator;

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", id).single();
  if (!opportunity) notFound();

  const { refreshed: matchRefreshed } = await refreshOpportunityMatches(userId, locale);
  const [matchRes, savedRes, sourcesRes] = await Promise.all([
    supabase.from("opportunity_matches").select("*").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("saved_opportunities").select("status").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("opportunity_sources").select("*").eq("opportunity_id", id).order("retrieved_at", { ascending: false }),
  ]);

  const match = matchRes.data;

  // Same read-time lifecycle gate Browse applies (lib/opportunities/browse.ts), for the same
  // reason: this row's `eligible` was computed at some earlier moment and is never deleted
  // when the opportunity's cycle closes or its deadline passes, so trusting it verbatim badges
  // a long-closed opportunity as a live match. Reusing resolveStoredEligibility rather than
  // re-deriving the rule here keeps this page from becoming a third copy that can drift.
  const eligibility = match ? resolveStoredEligibility(opportunity, { eligible: match.eligible, notes: match.eligibility_notes }) : null;

  // The third lifecycle gate. This page never hides an opportunity (it's reachable by id by
  // design), so the freshness rule only ever labels here — and only when the row is otherwise
  // fine, so a closed cycle keeps its own more specific explanation rather than being described
  // as merely unverified. Not a closure claim and not an eligibility claim: see
  // isOpportunitySufficientlyVerified.
  const needsVerification =
    !isOpportunitySufficientlyVerified(opportunity) && (!eligibility || (eligibility.eligible && !eligibility.notActionable));

  const daysUntilDeadline = opportunity.deadline
    ? differenceInCalendarDays(new Date(opportunity.deadline), new Date())
    : null;
  const takeReasons = match ? takeSentences((match.reason_codes as string[]) ?? [], locale) : [];
  // Oryn only offers a take on a row it can vouch for; otherwise the caveats below speak
  // for themselves and a confident-sounding verdict on top of them would be the exact
  // false certainty this product is not allowed to manufacture. Found live 2026-09-02: 165
  // eligible, verified matches share zero interest overlap, address no weak dimension, and
  // aren't nearby -- buildReasonCodes (lib/opportunities/persist-matches.ts) deliberately
  // leaves these with an empty reason_codes array rather than inventing a sentence to cover
  // a matcher gap. Before this fix, `takeReasons.length > 0` only controlled the `why` prop
  // below (undefined vs. a real paragraph) -- the headline (fitLabel) and the `fit` entry in
  // `facts` rendered regardless, which is the same tier-claim-with-nothing-behind-it problem
  // as opportunity-card.tsx's canClaimMatch had. `takeReasons` is computed once above so this
  // check reflects exactly what the `why` section would have shown, not a separate proxy for
  // it. The rest of the page (description, deadlines, source badges, actions, standing badge)
  // is unaffected -- only this hero block disappears, same treatment an unverified or
  // ineligible row already gets.
  const canGiveTake = Boolean(match) && (eligibility?.eligible ?? true) && !needsVerification && takeReasons.length > 0;

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        eyebrow={categoryLabel(opportunity.category, locale)}
        title={opportunity.title}
        description={opportunity.organization}
        action={
          <OpportunityActions
            opportunityId={opportunity.id}
            officialUrl={opportunity.official_url}
            applicationUrl={opportunity.application_url}
            initialStatus={savedRes.data?.status ?? null}
          />
        }
      />

      {/* UI-V3 § 20: personalization before the catalogue facts. The student's question is
          "is this for me", and the page used to answer it last. Rendered through the shared
          NextMove component rather than bespoke markup — it is the same anatomy Home uses
          (eyebrow, claim, reasoning, labelled facts), and a second copy here would drift. */}
      {canGiveTake && match ? (
        <NextMove
          surface
          locale={locale}
          eyebrow={t("proxolasTake")}
          headline={fitLabel(match.match_score, tTier)}
          why={
            takeReasons.length > 0 ? (
              <div className="space-y-2.5">
                {takeReasons.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : undefined
          }
          facts={[
            { term: t("fit"), value: fitLabel(match.match_score, tTier) },
            ...(selectivityLabel(opportunity.selectivity_tier, locale)
              ? [{ term: t("selectivity"), value: selectivityLabel(opportunity.selectivity_tier, locale)! }]
              : []),
            // urgencyLabel is the same shared function DeadlineBadge uses everywhere else
            // this product shows a deadline (Phase 12's "deadline urgency" dimension) --
            // this fact used to recompute an equivalent string inline, which was missing
            // the 1-day-left singular case ("1 days left") that function already handles.
            ...(daysUntilDeadline !== null && daysUntilDeadline >= 0
              ? [{ term: t("urgency"), value: urgencyLabel(daysUntilDeadline, locale) }]
              : []),
          ]}
          footnote={
            eligibility?.notes ? (
              <>
                <span className="font-medium text-ink-1">{t("cantConfirmPrefix")}</span>
                {eligibility.notes}
              </>
            ) : undefined
          }
        />
      ) : null}

      {!matchRefreshed ? <ErrorState description={t("refreshError")} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {selectivityLabel(opportunity.selectivity_tier, locale) ? (
          <StatusBadge label={selectivityLabel(opportunity.selectivity_tier, locale)!} tone="neutral" />
        ) : null}
        {/* Unlike Browse's card, this page always showed a badge for every one of the 7 real
            cycle_status values, including "open" — CYCLE_STATUS_LABEL (now cycleStatusLabel)
            had no gaps here, so no membership check is needed. */}
        <StatusBadge label={cycleStatusLabel(opportunity.cycle_status, locale)} tone="info" />
        <StatusBadge label={categoryLabel(opportunity.category, locale)} tone="brand" />
        {/* One shared component with Browse's card (features/opportunities/standing-badge.tsx):
            it keeps "not open" (about the opportunity), "not eligible" (about the student) and
            "needs verification" (about Oryn's data) from ever being described in each other's
            words, in one place rather than two that drift. */}
        <OpportunityStandingBadge
          eligible={eligibility?.eligible ?? true}
          notActionable={eligibility?.notActionable ?? false}
          needsVerification={needsVerification}
          locale={locale}
        />
        {eligibility && eligibility.eligible && eligibility.notes ? <StatusBadge label={tCard("eligibilityUnknown")} tone="warning" /> : null}
      </div>

      {/* Only when the take didn't already carry it (an ineligible or unverifiable row has
          no take block, and still needs the note). */}
      {eligibility?.notes && !canGiveTake ? (
        <p className="rounded-lg bg-surface-tint px-4 py-3 text-sm leading-relaxed text-ink-2">{eligibility.notes}</p>
      ) : null}
      {needsVerification ? (
        <p className="rounded-lg bg-surface-tint px-4 py-3 text-sm leading-relaxed text-ink-2">{insufficientVerificationReason(locale)}</p>
      ) : null}

      {opportunity.description ? <p className="text-muted-foreground">{opportunity.description}</p> : null}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {opportunity.deadline ? (
          <div className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-muted-foreground" />
            <span>
              {t("deadlineLabel")} <span className="font-medium">{opportunity.deadline}</span>
              {opportunity.current_cycle_label ? ` (${opportunity.current_cycle_label})` : ""}
            </span>
          </div>
        ) : opportunity.current_cycle_label ? (
          /* ADDED 2026-09-03. The branch above renders the cycle label only when a deadline
             exists; opportunity-card.tsx renders it only when one does NOT. The two gates
             are exact inverses, so for the 126 active no-deadline rows carrying a label
             (live count, 2026-09-03) this page said nothing about timing at all -- a
             student clicked a card reading "Rolling submissions, no fixed deadline" and
             landed on a detail page with strictly less information than the card that sent
             them here. Reuses the card's own key rather than a new string: it is the same
             fact on two surfaces, and wording that drifts between them reads as two
             different claims. items-start, not items-center, because these labels run long
             (283 chars at the longest) and a centred icon floats away from the first line.
             Full text, no clamp -- this page is where the card's clamp sends the reader. */
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{tCard("currentCycleLabelPrefix", { label: opportunity.current_cycle_label })}</span>
          </div>
        ) : null}
        {opportunity.country || opportunity.location_mode ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span>{[opportunity.country, opportunity.location_mode ? locationModeLabel(opportunity.location_mode, locale) : null].filter(Boolean).join(" · ")}</span>
          </div>
        ) : null}
        {opportunity.cost != null ? (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <span>
              {/* null currency, not a guess: `opportunities` has no currency column, and live
                  rows hold GBP/EUR/CHF/TRY in this field. See lib/i18n/format.ts. */}
              {formatMoney(opportunity.cost, null)}
              <span className="text-muted-foreground">{t("currencyNotRecorded")}</span>
              {opportunity.financial_aid_available ? t("financialAidAvailableSuffix") : ""}
            </span>
          </div>
        ) : opportunity.financial_aid_available ? (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <span>{t("financialAidAvailable")}</span>
          </div>
        ) : null}
        {opportunity.minimum_age != null || opportunity.maximum_age != null || opportunity.eligible_grades.length > 0 ? (
          <div className="flex items-center gap-2">
            <Users2 className="size-4 shrink-0 text-muted-foreground" />
            <span>
              {opportunity.minimum_age != null || opportunity.maximum_age != null
                ? t("agesRange", { min: opportunity.minimum_age ?? t("any"), max: opportunity.maximum_age ?? t("any") })
                : null}
              {opportunity.eligible_grades.length > 0 ? t("gradesSuffix", { grades: opportunity.eligible_grades.join(", ") }) : ""}
            </span>
          </div>
        ) : null}
      </div>

      {opportunity.application_requirements.length > 0 ? (
        <div className="space-y-2">
          <SectionHeader title={t("whatYoullNeed")} />
          <ul className="flex flex-wrap gap-1.5">
            {opportunity.application_requirements.map((req) => (
              <li key={req} className="rounded-full border px-3 py-1 text-xs">
                {humanize(req)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {opportunity.citizenship_restrictions || opportunity.residency_restrictions ? (
        <div className="space-y-1 text-sm">
          <SectionHeader title={t("eligibilityNotesHeading")} />
          {opportunity.citizenship_restrictions ? <p className="text-muted-foreground">{t("citizenshipLabel", { text: opportunity.citizenship_restrictions })}</p> : null}
          {opportunity.residency_restrictions ? <p className="text-muted-foreground">{t("residencyLabel", { text: opportunity.residency_restrictions })}</p> : null}
        </div>
      ) : null}

      {opportunity.fields.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.fields.map((field) => (
            <span key={field} className="rounded-full bg-brand-primary-subtle px-3 py-1 text-xs text-brand-primary-strong">
              {field}
            </span>
          ))}
        </div>
      ) : null}

      {sourcesRes.data && sourcesRes.data.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase" lang={locale}>{t("sourcesHeading")}</p>
          <div className="space-y-2">
            {sourcesRes.data.map((source) => (
              <SourceBadge
                key={source.id}
                sourceName={source.source_domain ?? source.source_url}
                checkedAt={source.retrieved_at}
                url={source.source_url}
                confidence={source.confidence as ConfidenceLevel}
                locale={locale}
                sourceLabel={tSourceBadge("source")}
                checkedLabel={(time) => tSourceBadge("checked", { time })}
                viewSourceLabel={tSourceBadge("viewSource")}
              />
            ))}
          </div>
        </div>
      ) : opportunity.source_url ? (
        <div className="border-t pt-4">
          <SourceBadge
            sourceName={opportunity.source ?? sourceNameFromUrl(opportunity.source_url)}
            checkedAt={opportunity.last_verified_at}
            url={opportunity.source_url}
            confidence={opportunity.source_confidence as ConfidenceLevel}
            locale={locale}
            sourceLabel={tSourceBadge("source")}
            checkedLabel={(time) => tSourceBadge("checked", { time })}
            viewSourceLabel={tSourceBadge("viewSource")}
          />
        </div>
      ) : null}

      {opportunity.official_url ? (
        <a
          href={opportunity.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
        >
          {t("visitOfficialPage")} <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
