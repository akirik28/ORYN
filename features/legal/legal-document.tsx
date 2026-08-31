import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getLegalCopy, LEGAL_REVIEW_STATUS, LEGAL_ROUTES, type LegalDocument } from "@/lib/legal/content";
import { DraftBanner } from "./draft-banner";
import { ProcessorTable } from "./processor-table";
import { CompanyDetails } from "./company-details";

/**
 * Renders one policy document from its data. All three pages are this component with a
 * different `LegalDocument` — so a change to how a section, the draft banner, or the
 * cross-links look happens once, and no page can drift into looking more finished than
 * the others.
 *
 * Every section gets a stable `id` from the content module (not a slugified heading), so
 * deep links like /privacy#processors keep working after the text is translated.
 *
 * `document` is already the locale-resolved `LegalDocument` (the caller picked it out of
 * `getLegalCopy(locale).documents.*`); `locale` is threaded through separately for the
 * `common` strings and the sub-components this view renders, the same split the page-level
 * callers use.
 */
export function LegalDocumentView({ document, locale }: { document: LegalDocument; locale: Locale }) {
  const copy = getLegalCopy(locale);
  const t = copy.common;
  const others = LEGAL_ROUTES.filter((r) => r.slug !== document.slug);

  return (
    // `lang={locale}` explicitly, even though it matches root layout's <html lang> today
    // (both resolve from the same request-scoped resolveLocale()) — this view has real
    // uppercase headings below, and CSS text-transform:uppercase under lang="tr" applies
    // Turkish case-folding even to correctly-Turkish text's neighbors if the two ever
    // desync (e.g. a future caller passing a `document` from one locale's copy with a
    // different `locale` prop). Stating it here removes the dependency on that invariant
    // holding elsewhere, rather than fixing a mismatch that exists today (contrast
    // SiteFooter, which has one).
    <article lang={locale} className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-brand-primary"
      >
        <span aria-hidden="true">←</span> {t.backToHome}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-[2rem] leading-tight tracking-tight text-ink-1 sm:text-[2.5rem]">
          {document.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-3">{document.intro}</p>
        <p className="mt-4 text-[13px] text-ink-4">
          {t.lastDrafted} {LEGAL_REVIEW_STATUS.draftedOn}
          {LEGAL_REVIEW_STATUS.approved ? null : <> · {t.notApproved}</>}
        </p>
      </header>

      <div className="mt-8">
        <DraftBanner locale={locale} />
      </div>

      {/* Contents. A policy document is read by jumping, not front to back. */}
      <nav aria-label={t.onThisPage} className="mt-10 border-t border-border pt-6">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink-2 uppercase">{t.onThisPage}</h2>
        <ol className="mt-3 space-y-1.5">
          {document.sections.map((section, i) => (
            <li key={section.id} className="text-sm">
              <a
                href={`#${section.id}`}
                className="text-ink-3 transition-colors hover:text-brand-primary hover:underline"
              >
                <span className="mr-2 tabular-nums text-ink-4">{i + 1}.</span>
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12">
        {document.sections.map((section, i) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="font-display text-xl leading-snug tracking-tight text-ink-1 sm:text-2xl">
              <span className="mr-2 tabular-nums text-ink-4">{i + 1}.</span>
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="text-[15px] leading-relaxed text-ink-2">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-4 space-y-2.5">
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 48)} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                    <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-4" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {section.companyDetails ? <CompanyDetails kind={section.companyDetails} locale={locale} /> : null}
            {section.includesProcessorTable ? <ProcessorTable locale={locale} /> : null}
          </section>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-6">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink-2 uppercase">{t.relatedDocuments}</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {others.map((route) => (
            <li key={route.slug}>
              <Link href={route.href} className="text-sm text-brand-primary hover:underline">
                {copy.documents[route.slug].title}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
