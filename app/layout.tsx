import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Global prefers-reduced-motion gate — every `motion.*` element in the app
              honors the OS setting automatically; no per-component opt-in needed. */}
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
