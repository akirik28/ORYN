import { getTranslations } from "next-intl/server";
import { Compass, GraduationCap, ClipboardCheck, Sprout } from "lucide-react";
import { EmptyState } from "@/components/proxola/empty-state";
import { StatusBadge } from "@/components/proxola/status-badge";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { ParentPanelData } from "@/lib/parent/panel-data";

/**
 * Everything a parent sees, and nothing else (spec G2/K1) -- this component's own prop type
 * is the enforcement: `ParentPanelData` has no field for advisor conversations, reflection
 * notes, advisor_instructions, evidence contents, or feedback text, so there is no prop this
 * component could be passed that would render one. That is deliberate: the failure mode
 * oryn-45 named ("a component that renders a child's advisor conversation because someone
 * passed the wrong prop") needs a component whose type signature makes it impossible, not a
 * conditional that remembers to hide it.
 *
 * Read-only by construction as well as by RLS (spec K2) -- no button, link, or form anywhere
 * in this tree mutates anything. If that ever needs to change, it is a deliberate, separate
 * decision, not a prop this component happens to accept.
 */
export async function ParentPanelView({ data, locale = DEFAULT_LOCALE }: { data: ParentPanelData; locale?: Locale }) {
  // Explicit {locale, namespace}, not a bare namespace string: getTranslations() otherwise
  // resolves locale from next-intl's own request-scoped detection, independent of the
  // `locale` prop this component's every other string already respects -- confirmed live
  // (English page shell, Turkish "in progress"/"not started" status badges) before this fix,
  // same class of bug as this session's own i18n request-scope finding earlier tonight
  // (lib/opportunities/persist-matches.ts's notifyNewlyEligibleMatches).
  const t = await getTranslations({ locale, namespace: "applications" });
  const tr = locale === "tr";

  return (
    <div
      className="min-h-svh"
      style={{ background: "linear-gradient(145deg, var(--role-page-bg-1) 0%, var(--role-page-bg-2) 30%, var(--role-page-bg-3) 55%, var(--role-page-bg-4) 100%)" }}
    >
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        {/*
          A plain div, not <header> (CHANGED 2026-09-04): this is page-specific content (a
          per-page title and description), not site-oriented banner content, so it was never
          really a landmark-header semantically -- confirmed the hard way, live, once
          app/parent/layout.tsx grew its own real <header>: nesting this inside that page's
          new <main> did not suppress its banner role in the browser's actual computed
          accessibility tree (verified via the live composed render, not assumed from spec
          text), leaving two banner landmarks on one page. A div sidesteps the ambiguity
          entirely rather than depending on a landmark-suppression rule that didn't hold up
          under a real accessibility-tree check.
        */}
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: "var(--role-accent-strong)" }}>
            {tr ? "Veli görünümü" : "Parent view"}
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {data.studentDisplayName
              ? tr
                ? `${data.studentDisplayName} için Proxola paneli`
                : `${data.studentDisplayName}'s Proxola panel`
              : tr
                ? "Proxola paneli"
                : "Proxola panel"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr
              ? "Yalnızca gözlemleyebilirsiniz. Hiçbir şeyi değiştiremezsiniz."
              : "You can only observe here. Nothing can be changed from this view."}
          </p>
        </div>

        <GapSection gap={data.gap} tr={tr} />

        <Section
          icon={Compass}
          title={tr ? "En uygun fırsatlar" : "Best-fit opportunities"}
          emptyTitle={tr ? "Henüz eşleşen bir fırsat yok" : "No matched opportunities yet"}
          emptyDescription={
            tr
              ? "Proxola, profil bilgisi arttıkça uygun fırsatları burada gösterecek."
              : "Proxola will list well-matched opportunities here as more of the profile fills in."
          }
        >
          {data.opportunities.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 border-b border-[var(--role-surface-border)] py-3 last:border-0">
              <span className="min-w-0 truncate font-medium text-foreground">{o.title}</span>
              {o.deadline ? <DeadlineBadge date={o.deadline} locale={locale} /> : null}
            </li>
          ))}
        </Section>

        <Section
          icon={GraduationCap}
          title={tr ? "Hedef üniversiteler" : "Target universities"}
          emptyTitle={tr ? "Henüz hedef üniversite eklenmedi" : "No target universities yet"}
          emptyDescription={tr ? "Öğrenci bir üniversiteyi hedef olarak işaretlediğinde burada görünecek." : "These appear once the student marks a university as a target."}
        >
          {data.universities.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 border-b border-[var(--role-surface-border)] py-3 last:border-0">
              <span className="min-w-0 truncate font-medium text-foreground">{u.name}</span>
              <OutlookBadge outlook={u.outlook} locale={locale} />
            </li>
          ))}
        </Section>

        <Section
          icon={ClipboardCheck}
          title={tr ? "Son başvurular" : "Recent applications"}
          emptyTitle={tr ? "Henüz bir başvuru yok" : "No applications yet"}
          emptyDescription={tr ? "Bir başvuru oluşturulduğunda durumu burada görünecek." : "Once an application exists, its status will show here."}
        >
          {data.applications.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 border-b border-[var(--role-surface-border)] py-3 last:border-0">
              <span className="min-w-0 truncate font-medium text-foreground">{a.universityName}</span>
              <StatusBadge label={t(`statusLabels.${a.status}`)} tone="neutral" />
            </li>
          ))}
        </Section>
      </div>
    </div>
  );

  function Section({
    icon: Icon,
    title,
    emptyTitle,
    emptyDescription,
    children,
  }: {
    icon: typeof Compass;
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    children: React.ReactNode;
  }) {
    const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
    return (
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}
      >
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className="size-4" style={{ color: "var(--role-accent)" }} />
          {title}
        </h2>
        {hasContent ? <ul>{children}</ul> : <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />}
      </section>
    );
  }
}

/**
 * Copy decision, spec's own words ("show the gap; don't make it a verdict on the child"):
 * names the same one dimension the student's own dashboard names (lib/scoring/dashboard-
 * hero.ts's identical honesty model, reused via ParentPanelGap -- see that type's own
 * comment), with no score anywhere in this component or the data it receives. Framing adds
 * two things the student's own "Your clearest gap right now is X" phrasing doesn't need to
 * carry for this audience: that every profile has a weakest area by construction (so naming
 * one is not itself bad news), and that the student is already the one acting on it inside
 * the product. Tonight's own finding (a student telling the advisor their parents pressure
 * them about medicine) is why neither of those is optional framing.
 */
function GapSection({ gap, tr }: { gap: ParentPanelData["gap"]; tr: boolean }) {
  const body = (() => {
    if (gap.kind === "claimable" && gap.label) {
      return tr
        ? `Şu anki en belirgin gelişim alanı: ${gap.label.toLowerCase()}. Her profilin bir en zayıf yanı vardır — bu bir uyarı değil, öğrencinin zaten üzerinde çalıştığı bir alan.`
        : `The clearest area to focus on right now is ${gap.label.toLowerCase()}. Every profile has a weakest area — this isn't a red flag, it's simply where the student is already focusing next.`;
    }
    if (gap.kind === "rich_unclaimable") {
      return tr
        ? "Proxola, profilde tek bir alanı diğerlerinden belirgin şekilde geride görmüyor. Bu iyi bir durumdur, bir eksiklik değil."
        : "Proxola doesn't see any one area standing out as behind the others right now — that's a good sign, not a gap.";
    }
    return tr
      ? "Proxola, bir gelişim alanı adlandırabilmek için henüz yeterli bilgiye sahip değil."
      : "Proxola doesn't have enough recorded yet to name a specific area with confidence.";
  })();

  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--role-accent), var(--card) 92%)" }}
    >
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
        <Sprout className="size-4" style={{ color: "var(--role-accent)" }} />
        {tr ? "Neyin geliştirilmesi gerekiyor" : "What could use attention"}
      </h2>
      <p className="text-sm text-muted-foreground">{body}</p>
    </section>
  );
}
