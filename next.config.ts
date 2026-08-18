import type { NextConfig } from "next";

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
};

export default nextConfig;
