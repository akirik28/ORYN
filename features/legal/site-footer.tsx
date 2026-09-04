import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { COMPANY, getLegalCopy, isUnresolved } from "@/lib/legal/content";

/**
 * The public site footer — policy links, contact, and company identity.
 *
 * Two tones because it lands on two different grounds. The marketing page is a Figma port
 * pinned to literal hex values (`app/page.tsx`) and stays dark regardless of theme, so the
 * `dark` tone repeats those exact values rather than reaching for this app's tokens, which
 * resolve to a light palette there and would render invisible text. The `light` tone under
 * the policy pages uses the real tokens. Same content, same component, one prop.
 *
 * The company line's unresolved state renders as a plain phrase ("registration pending"),
 * not the loud `<Unconfirmed>` chip used inside the documents: in a footer the chip reads
 * as a broken component, whereas in a policy document the loudness is the point. That
 * prediction held -- the chip is still the wrong register for a footer, and the policy
 * pages are unchanged.
 *
 * FIXED 2026-09-04, founder's own screenshot: this used to render the value in literal
 * brackets (`[Registered name]`), which is the one part of the original reasoning that
 * didn't hold up. Quiet and unrendered-template-variable turned out to look the same to a
 * real visitor -- brackets are specifically the syntax of a value that failed to
 * interpolate, so "quiet" needed to mean a plain stated fact, not a stripped-down version
 * of the same signal. `companyPending`/`contactPending` are that: a phrase describing the
 * state directly, in the same muted styling and position as before, no punctuation implying
 * something should have been there and wasn't.
 */
export function SiteFooter({ tone = "light", locale }: { tone?: "dark" | "light"; locale: Locale }) {
  const copy = getLegalCopy(locale);
  const t = copy.footer;
  const dark = tone === "dark";
  const year = new Date().getFullYear();

  // `body` and `faint` share a value in both tones: every `faint` use in this component
  // (contact labels, the unresolved-company-detail placeholder, the copyright/draft/age
  // notices) is real text a visitor has to read, not decoration, so it needs the same
  // legibility as `body` rather than a step down from it. `rgba(255,255,255,0.4)` — the
  // dark tone's old `body` value, copied from app/page.tsx's Figma palette — measured
  // 3.76:1 against `#0A0920` on its own, also short of AA; bumped alongside `faint` rather
  // than left as a smaller version of the same problem.
  const c = dark
    ? {
        wrap: { background: "#0A0920", borderTop: "1px solid rgba(255,255,255,0.06)" },
        heading: { color: "rgba(255,255,255,0.9)" },
        body: { color: "rgba(255,255,255,0.5)" },
        link: { color: "rgba(255,255,255,0.55)" },
        rule: { borderTop: "1px solid rgba(255,255,255,0.06)" },
        faint: { color: "rgba(255,255,255,0.5)" },
      }
    : {
        wrap: { background: "var(--surface-tint)", borderTop: "1px solid var(--border)" },
        heading: { color: "var(--ink-1)" },
        body: { color: "var(--ink-3)" },
        link: { color: "var(--ink-2)" },
        rule: { borderTop: "1px solid var(--border)" },
        faint: { color: "var(--ink-3)" },
      };

  return (
    // `lang={locale}` — not inherited from the page's `<html lang>`, because they can
    // disagree: app/page.tsx hardcodes locale="en" here (the surrounding hero copy is
    // untranslated) while root layout's own <html lang> reflects the visitor's actual
    // resolved locale, which may be "tr". Under lang="tr", CSS text-transform:uppercase
    // applies Turkish dotted/dotless-I case-folding even to English text in the subtree —
    // a live, reproduced bug on this app's uppercase labels, not a hypothetical one — so
    // this subtree has to declare its own real language rather than trust the ancestor's.
    <footer lang={locale} style={c.wrap} className="w-full">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 sm:px-8 sm:py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="text-[15px] font-semibold" style={c.heading}>
            {COMPANY.productName}
          </p>
          <p className="mt-2 max-w-[26ch] text-[13px] leading-relaxed" style={c.body}>
            {t.tagline}
          </p>
        </div>

        <FooterColumn heading={t.productHeading} styles={c}>
          <FooterLink href="/signup" styles={c}>{t.createAccount}</FooterLink>
          <FooterLink href="/login" styles={c}>{t.signIn}</FooterLink>
        </FooterColumn>

        <FooterColumn heading={t.legalHeading} styles={c}>
          <FooterLink href="/privacy" styles={c}>{t.privacy}</FooterLink>
          <FooterLink href="/terms" styles={c}>{t.terms}</FooterLink>
          <FooterLink href="/kvkk" styles={c}>{t.kvkk}</FooterLink>
        </FooterColumn>

        <FooterColumn heading={t.contactHeading} styles={c}>
          <li className="text-[13px] leading-relaxed" style={c.body}>
            <span style={c.faint}>{t.contactLabel}: </span>
            {isUnresolved(COMPANY.contactEmail) ? (
              <span style={c.faint}>{t.contactPending}</span>
            ) : (
              <a href={`mailto:${COMPANY.contactEmail}`} style={c.link} className="hover:underline">
                {COMPANY.contactEmail}
              </a>
            )}
          </li>
          <li className="text-[13px] leading-relaxed" style={c.body}>
            <span style={c.faint}>{t.companyLabel}: </span>
            {isUnresolved(COMPANY.legalName) ? <span style={c.faint}>{t.companyPending}</span> : COMPANY.legalName}
          </li>
        </FooterColumn>
      </div>

      <div style={c.rule}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px]" style={c.faint}>
            {t.copyright(year)} · {t.draftNotice}
          </p>
          <p className="max-w-[52ch] text-[12px] leading-relaxed md:text-right" style={c.faint}>
            {t.ageNotice}
          </p>
        </div>
      </div>

      {/* The founder's own quiet entrance, below everything else -- a convenience link, not
          a control: requireAdmin/profiles.is_admin still gate /kumanda exactly as they
          already did, so this changes nothing about who can get in, only how he reaches the
          form without typing the URL. next=/kumanda reuses /login's existing searchParams
          handling (already wired for it) rather than adding a new mechanism; a non-admin who
          signs in from here lands on requireAdmin's own honest 404 -- the intentional case
          it was built for, not the expired-session one its own header records fixing.
          Deliberately no second rule/border here -- a new bordered section would read as
          another part of the footer's structure, the opposite of quiet. Smaller than the
          copyright/age text above it and the same faint color, placed in the same padded
          strip rather than a strip of its own, so it reads as one more line of fine print
          someone would only notice while looking for it. */}
      <div className="mx-auto w-full max-w-5xl px-6 pb-6 sm:px-8">
        <Link href="/login?next=/kumanda" className="text-[10px] hover:underline" style={c.faint}>
          {t.adminSignIn}
        </Link>
      </div>
    </footer>
  );
}

type ToneStyles = {
  heading: React.CSSProperties;
  body: React.CSSProperties;
  link: React.CSSProperties;
};

function FooterColumn({
  heading,
  styles,
  children,
}: {
  heading: string;
  styles: ToneStyles;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[12px] font-semibold tracking-wide uppercase" style={styles.heading}>
        {heading}
      </h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  styles,
  children,
}: {
  href: string;
  styles: ToneStyles;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="text-[13px] hover:underline" style={styles.link}>
        {children}
      </Link>
    </li>
  );
}
