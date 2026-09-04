import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/security/dal";
import { getActiveParentLink } from "@/lib/auth/account-role";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { loadParentSafeUniversityDetail } from "@/lib/parent/university-detail";
import { getUniversity } from "@/lib/universities/detail-reads";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SourceBadge } from "@/components/proxola/source-badge";
import { formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";
import { formatNumber, formatCurrency } from "@/lib/i18n/format";

/**
 * `getUniversity` (lib/universities/detail-reads.ts), not `loadParentSafeUniversityDetail` --
 * the page body's own function is the full 8-query aggregate, and this only needs a name.
 * `getUniversity` is `cache()`-wrapped on the plain string id, so this call and the page's own
 * later `loadParentSafeUniversityDetail(...)` call (which uses the identical `getUniversity`
 * internally) dedupe to one actual query, not two -- same fix docs/performance.md §5 already
 * made for the student-side /universities/[id] page, whose own generateMetadata this mirrors.
 * No supersession/canonicalization step, deliberately matching the page body below, which has
 * none either -- adding one here alone would risk the title resolving a different university
 * than the body renders, a worse bug than the one this fixes.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [university, t] = await Promise.all([getUniversity(id), getTranslations("parent.universityDetail")]);
  return { title: university?.name ?? t("fallbackTitle") };
}

/**
 * B6 (2026-09-04) — the parent-safe university detail page. Read-only by construction:
 * no server action anywhere in this file, no save button, no admin form, and no call to
 * refreshAdmissionOutlook — see lib/parent/university-detail.ts's own header for why. This
 * is a genuinely separate page from /universities/[id], not a variant of it: that page
 * computes and persists a value keyed to the viewer, which a parent viewing it would either
 * corrupt (writing under their own account) or receive nonsense from (no profile of their
 * own to score against).
 *
 * Mounted under app/parent/(dashboard)/ like the main panel page — its layout already
 * checked session/account_role/link status before this renders. getActiveParentLink is
 * still called here for the same reason the main dashboard page calls it again: this file
 * has no way to prove that precondition holds other than checking it.
 */
export default async function ParentUniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const locale = await resolveLocale();
  const tr = locale === "tr";

  const link = session.userId ? await getActiveParentLink(session.userId) : null;
  if (!link) redirect("/parent/pending");

  const supabase = await createClient();
  const detail = await loadParentSafeUniversityDetail(supabase, id, link.student_user_id);
  if (!detail) notFound();

  const { university, stats, requirements, deadlines, rankings, tuition, sourceCount, childOutlook } = detail;

  const estimate =
    childOutlook?.estimateRangeLow != null && childOutlook?.estimateRangeHigh != null
      ? { low: Math.round(childOutlook.estimateRangeLow * 100), high: Math.round(childOutlook.estimateRangeHigh * 100) }
      : null;

  const intlQ = tuition.internationalUnit ? tuitionQualifier(tuition.internationalPrecisionState ?? "exact", locale) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{university.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{[university.city, university.country].filter(Boolean).join(", ")}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {tr ? "Yalnızca gözlemleyebilirsiniz. Hiçbir şeyi değiştiremez veya kaydedemezsiniz." : "You can only observe here. Nothing can be changed or saved from this view."}
        </p>
      </div>

      {childOutlook ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--role-surface-border)" }}>
          <h2 className="text-base font-medium text-foreground">{tr ? "Çocuğunuzun görünümü" : "Your child's outlook"}</h2>
          <div className="mt-3 flex items-center gap-3">
            <OutlookBadge outlook={childOutlook.outlook} locale={locale} />
          </div>
          {estimate ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {tr ? "Proxola tahmini:" : "Proxola estimate:"}{" "}
              <span className="font-medium text-foreground">
                {estimate.low}–{estimate.high}%
              </span>{" "}
              {tr
                ? `(${childOutlook.estimateConfidence ?? ""} güven). Bu bir garanti veya resmi bir üniversite olasılığı değildir.`
                : `(${childOutlook.estimateConfidence ?? ""} confidence). This is not a guarantee or an official university probability.`}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {tr ? "Çocuğunuz bu üniversiteyi henüz hedef olarak eklemedi." : "Your child hasn't added this university as a target yet."}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {stats?.admission_rate != null ? (
          <Stat label={tr ? "Kabul oranı" : "Admission rate"} value={`${Math.round(stats.admission_rate * 100)}%`} />
        ) : null}
        {stats?.cost_of_attendance ? <Stat label={tr ? "Yıllık maliyet" : "Cost of attendance"} value={formatCurrency(stats.cost_of_attendance)} /> : null}
        {tuition.internationalAmount != null && tuition.internationalUnit ? (
          <Stat
            label={tr ? "Uluslararası öğrenim ücreti" : "International tuition"}
            value={`${intlQ ? intlQ.valuePrefix : ""}${formatTuition(tuition.internationalAmount, tuition.internationalUnit, locale)}`}
          />
        ) : null}
        {university.student_size ? <Stat label={tr ? "Öğrenci sayısı" : "Student size"} value={formatNumber(university.student_size)} /> : null}
      </section>

      {tuition.statsAsOf ? (
        <p className="text-xs text-muted-foreground">
          {tr ? "Dönem:" : "As of:"} {tuition.statsAsOf}
        </p>
      ) : null}

      {stats?.source ? (
        <SourceBadge
          sourceName={stats.source}
          checkedAt={stats.updated_at}
          confidence={stats.data_confidence ?? undefined}
          locale={locale}
          sourceLabel={tr ? "Kaynak:" : "Source:"}
          checkedLabel={(time) => (tr ? `${time} kontrol edildi` : `Checked ${time}`)}
          viewSourceLabel={tr ? "Kaynağı görüntüle" : "View source"}
        />
      ) : null}

      {rankings.length > 0 ? (
        <section>
          <h2 className="text-base font-medium text-foreground">{tr ? "Sıralamalar" : "Rankings"}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {rankings.map((r, i) => (
              <li key={i}>
                {r.ranking_provider} {r.ranking_edition ?? ""}: {r.rank_display ?? (tr ? "Bilinmiyor" : "Unknown")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {requirements.length > 0 ? (
        <section>
          <h2 className="text-base font-medium text-foreground">{tr ? "Başvuru koşulları" : "Requirements"}</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {requirements.map((r) => (
              <li key={r.id} className="border-b border-[var(--role-surface-border)] pb-2 last:border-0">
                <p className="font-medium text-foreground">{r.title ?? r.requirement_type}</p>
                {r.requirement_detail ? <p>{r.requirement_detail}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {deadlines.length > 0 ? (
        <section>
          <h2 className="text-base font-medium text-foreground">{tr ? "Son başvuru tarihleri" : "Deadlines"}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {deadlines.map((d) => (
              <li key={d.id}>
                {d.deadline_type}: {d.deadline_date ?? d.cycle_label ?? (tr ? "Tarih belirtilmemiş" : "No date given")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {university.website_url ? (
        <a
          href={university.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm hover:underline"
          style={{ color: "var(--role-accent)" }}
        >
          {tr ? "Üniversitenin web sitesi" : "University website"} <ExternalLink className="size-3.5" />
        </a>
      ) : null}

      {sourceCount === 0 && !stats?.source ? (
        <p className="text-xs text-muted-foreground">{tr ? "Bu üniversite için henüz kaynak bilgisi eklenmedi." : "No source information has been added for this university yet."}</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--role-surface-border)" }}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium text-foreground">{value}</p>
    </div>
  );
}
