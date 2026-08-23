import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display face (UI-V3). Used *selectively* — only where Oryn is making a
// statement to the student (page titles, the greeting, a Next Move headline, the score
// number), never for UI chrome. Card/dialog/sheet titles are deliberately sans; a
// product where every heading is serif reads as a template, not as editorial.
//
// Instrument Serif ships a single weight (400) by design — it's a display face, not a
// text family. That's why `font-display` call sites carry no `font-medium`/`font-semibold`:
// asking for a weight the family doesn't have makes the browser synthesize a faux bold,
// which smears the high-contrast stems this face is chosen for. Set size and tracking
// instead. See /docs/design-system.md § Typography.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Oryn — Your Personal Career Operating System",
    template: "%s — Oryn",
  },
  description:
    "Oryn helps students capture their achievements, understand their strengths and gaps, and know exactly what to do next to improve their future opportunities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Global prefers-reduced-motion gate — every `motion.*` element in the app
            honors the OS setting automatically; no per-component opt-in needed. */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
