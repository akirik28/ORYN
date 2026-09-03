import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { instrumentSerif, inter } from "@/lib/fonts";
import { SiteFooter } from "@/features/legal/site-footer";
import { recordPageView } from "@/lib/analytics/page-views";

// Ported from the Figma Make source handoff (src/AuthFlow.tsx, `Landing` component,
// 2026-08-30 export) — inline styles, copy, spacing, colors, and blur/glow values kept
// verbatim rather than translated to Tailwind, so nothing drifts from the source values
// in conversion. Fonts are scoped via lib/fonts.ts (not app/layout.tsx) so no other
// route's fonts change, and every color is the source's literal hex/rgba rather than
// this app's own dark-mode tokens, per explicit instruction to keep the source's exact
// values rather than substitute our differently-valued equivalents.

const FEATURES = [
  {
    icon: "◉",
    title: "Nine profile dimensions",
    desc: "ORYN assesses your academic, leadership, research, and extracurricular depth with evidence-backed reasoning.",
  },
  {
    icon: "◎",
    title: "Personalized weekly plan",
    desc: "Three focused actions each week. No busywork — just what actually moves your profile forward.",
  },
  {
    icon: "○",
    title: "Opportunity matching",
    desc: "Programs, competitions, and internships ranked against your real profile. Eligibility-checked, deadline-aware.",
  },
];

export default async function LandingPage() {
  const t = await getTranslations("landing");
  recordPageView("/");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0920",
        display: "flex",
        flexDirection: "column",
        fontFamily: inter.style.fontFamily,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Our real logo, unmodified (no recolor, no reshape) — the Figma source's own
            OrynMark placeholder is intentionally not used; sized to sit in this nav row. */}
        <Image src="/brand/logo-full.png" alt="Proxola" width={110} height={36} priority style={{ height: 36, width: "auto" }} />
        <Link
          href="/login"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.8)",
            borderRadius: 10,
            padding: "8px 20px",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          {t("signIn")}
        </Link>
      </nav>

      {/* Hero */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px 60px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Blobs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(61,53,232,0.18)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            right: "10%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(123,79,232,0.15)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 720 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(61,53,232,0.15)",
              border: "1px solid rgba(107,100,240,0.30)",
              borderRadius: 100,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#A09CF8",
              marginBottom: 28,
              letterSpacing: "0.04em",
            }}
          >
            <span aria-hidden="true">✦</span> {t("badge")}
          </div>
          <h1
            style={{
              margin: "0 0 20px",
              fontFamily: instrumentSerif.style.fontFamily,
              fontSize: "clamp(48px, 7vw, 80px)",
              fontWeight: 400,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {t("headlineLine1")}
            <br />
            <span style={{ fontStyle: "italic", color: "#A09CF8" }}>{t("headlineLine2")}</span>
          </h1>
          <p
            style={{
              margin: "0 0 40px",
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.65,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {t("subhead")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              style={{
                background: "#3D35E8",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: "0 0 40px rgba(61,53,232,0.35)",
                textDecoration: "none",
              }}
            >
              {t("getStarted")}
            </Link>
            <Link
              href="/login"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                borderRadius: 12,
                padding: "14px 28px",
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "60px 40px 80px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "24px",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12, color: "#7B75F5" }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark tone: this page is pinned to the Figma source's literal hex values rather
          than the app's tokens (see the file header), so the footer has to be told which
          ground it is sitting on instead of resolving tokens that would render light.

          locale="en" is still hardcoded, not resolved. Updated 2026-09-01: the hero/nav
          chrome above (badge, headline, subhead, sign-in/CTA links) is now translated —
          only the FEATURES array's three title/description pairs remain the Figma-ported
          source text, out of this pass's scope (real marketing-copy translation, a
          separate and larger undertaking than the short chrome strings this pass covered).
          A resolved Turkish footer would still be trailing that one English section
          directly above it, so the original reasoning holds: don't resolve a locale the
          page's own copy can't fully act on yet. (This route is already dynamic
          regardless — app/layout.tsx's own resolveLocale() call forces every route
          dynamic app-wide, predating this file; hardcoding here doesn't recover static
          rendering, it just avoids resolving a locale this page's other copy can't act
          on.) Revisit once FEATURES is translated too — at that point the footer should
          resolve the real locale like every other page's does. */}
      <SiteFooter tone="dark" locale="en" />
    </div>
  );
}
