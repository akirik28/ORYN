import { Instrument_Serif, Inter } from "next/font/google";

// Shared loaders for the Figma-source pages being ported (2026-08-30 handoff): every
// `var(--font-display)` / `var(--font-body)` usage in the source resolves to these two
// faces. Declared once here rather than per-file — next/font/google doesn't dedupe
// identical calls across separate files, and every ported page needs the same pair.
// Scoped to the pages that import this module only; app/layout.tsx's Manrope/Fraunces
// stack (the rest of the app) is untouched.
export const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
