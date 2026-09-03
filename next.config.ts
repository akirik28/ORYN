import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The university card/detail imagery is the one remote-image source this app allow-lists:
// every acquired campus photo is re-hosted through our own Supabase Storage public bucket
// (`university-images` — see lib/acquisition/image-storage.ts), so there's exactly one
// hostname to trust rather than an open-ended set of official university domains (that
// open-endedness is why `logo_url` intentionally stays a plain <img>, not next/image — see
// features/universities/university-card.tsx). Falls back to no remote patterns at all when the
// env var is unset, matching this app's "must still boot without every credential" rule.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }] : [],
  },
  // 2026-09-03, founder decision ("admin ve kumanda aynı şey değil mi, öyle olmalı"): /admin
  // was the old, single-page control panel; /kumanda is its full replacement (same 23
  // sections as of this pass, verified by count). /admin's own route files
  // (app/(app)/admin/page.tsx, actions.ts) are untouched -- actions.ts is still real, shared
  // infrastructure several /kumanda sections import directly -- so removing this one entry
  // is the entire revert, with nothing else to restore. `permanent: false` (307) rather than
  // 308 deliberately: the founder hasn't opened either panel with a real admin account yet,
  // and a permanent redirect can outlive its own removal in a browser's/CDN's cache in a way
  // a temporary one won't.
  async redirects() {
    return [{ source: "/admin", destination: "/kumanda", permanent: false }];
  },
};

// Points next-intl at lib/i18n/request.ts instead of its default `./i18n/request.ts`, so
// the i18n runtime lives beside the rest of the domain modules in lib/ (AGENTS.md Phase
// 1.2) rather than in a top-level folder of its own.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
