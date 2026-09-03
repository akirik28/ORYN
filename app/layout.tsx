import type { Metadata } from "next";
import { Manrope, Geist_Mono, Fraunces } from "next/font/google";
import { MotionConfig } from "motion/react";
import { NextIntlClientProvider } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { resolveLocale } from "@/lib/i18n/locale";
import "./globals.css";

// Body/UI face. Manrope over a neutral grotesk: it carries a little warmth and a wide
// aperture that sits with the warm paper ground below, and reads as a consumer product
// rather than a dashboard. Variable, so weights are real rather than synthesized.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display face. Used *selectively* — only where Proxola is making a statement to
// the student (page titles, the greeting, the score, a Next Move headline), never for UI
// chrome. Card/dialog/sheet titles are deliberately sans; a product where every heading is
// serif reads as a template, not as editorial.
//
// Fraunces rather than a high-contrast Didone: it has warmth and a soft-serif character
// that keeps the product from reading austere or consulting-report-like, which is the
// stated risk for this direction. Being variable, it also has real weights — display
// headlines are set at 400 with tight tracking on purpose, not because the family lacks
// anything heavier. See /docs/design-system.md § Typography.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Proxola — Your Personal Career Operating System",
    template: "%s — Proxola",
  },
  description:
    "Proxola helps students capture their achievements, understand their strengths and gaps, and know exactly what to do next to improve their future opportunities.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved here rather than in each route group so that <html lang> — which assistive
  // technology uses to pick pronunciation, and which is only settable on this one element —
  // actually matches the language the page is rendered in. See lib/i18n/locale.ts for the
  // cookie-then-profile resolution order and its cost guards.
  const locale = await resolveLocale();

  return (
    // Founder-locked visual direction (revised 2026-08-18, superseding the prior dark-
    // default decision below): light is the product's one deliberate default — bright,
    // white/near-white surfaces, strong typography, the ORYN logo's blue (--brand, hue
    // 272 — verified this pass to be an almost exact OKLCH match of the actual logo
    // pixel color, oklch(0.477 0.29 272) vs. the logo's own oklch(0.477 0.294 272.2))
    // carrying brand recognition through primary actions and accents rather than the
    // whole product being dark. `:root` (no class) already carries these tokens fully —
    // this file just stopped overriding them. The `.dark` block in globals.css stays
    // fully defined and unused, ready for an actual theme toggle later; not reintroduced
    // here since none exists yet (see the removed-`next-themes` reasoning this comment
    // used to carry, still true: no toggle means no need for the provider's client-side
    // script, which itself only ever existed to re-apply a preference that could never
    // differ from a static default — same "static class, no flash, no script" approach,
    // just defaulting the other direction now).
    <html
      lang={locale}
      className={`${manrope.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Global prefers-reduced-motion gate — every `motion.*` element in the app
            honors the OS setting automatically; no per-component opt-in needed. */}
        {/* Messages are passed whole because the catalog is currently ~19 keys of
            navigation chrome — smaller than the code that would narrow it. If it grows to
            cover real page copy, pass only the namespaces the client tree needs rather
            than shipping every translation to the browser. */}
        <NextIntlClientProvider locale={locale}>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
