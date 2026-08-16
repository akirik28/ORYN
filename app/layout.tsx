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
    // Founder-locked visual direction (revised): a dark, black-blue system built around
    // the ORYN logo's blue (--brand, hue 272 — see globals.css's `.dark` block) is the
    // product's one deliberate default, not something contingent on OS preference — one
    // consistent experience for every visitor. The light theme's tokens stay fully
    // defined in globals.css for whoever opts in later; only the default is locked.
    //
    // `dark` is set statically here rather than through next-themes: with no theme
    // toggle anywhere in the product, that provider's only remaining job was injecting
    // a client-side <script> to re-apply a stored preference that can never differ from
    // this default — and React 19 warns on every client render that a <script> inside a
    // component never executes ("Encountered a script tag while rendering React
    // component", reported live from /connections). A static class has no flash, no
    // script, and no warning. Reintroduce a provider only alongside a real theme switcher.
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
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
