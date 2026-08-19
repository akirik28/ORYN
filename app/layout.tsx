import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
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

// Display/heading face — deliberately not the same grotesk sans as the UI body copy.
// Used wherever Oryn is making a statement about the student (greetings, the score
// number, hero headlines) rather than just presenting a UI. See CardTitle and
// /docs/design-system.md for where --font-heading is (and isn't) applied.
const newsreader = Newsreader({
  variable: "--font-newsreader",
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
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
