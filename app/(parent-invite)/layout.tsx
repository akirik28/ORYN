import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";
import { inter } from "@/lib/fonts";

/**
 * P4 — a deliberately separate, minimal route group from app/(auth), not a reuse of its
 * layout.tsx. The visitor here isn't signing into an existing Proxola account or creating a
 * student one; the chrome is intentionally identical (same gradient, same card, same logo —
 * AGENTS.md's "premium, calm, credible" bar applies here too, and a parent's first look at
 * the product shouldn't feel like a bare unstyled edge case) but the route itself must stay
 * outside app/(auth) so it never inherits that group's assumptions (its signup/login/reset
 * forms all assume a *student* is the one authenticating).
 */
export const dynamic = "force-dynamic";

export default async function ParentInviteLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "linear-gradient(145deg, #DDDAF5 0%, #D4DBF0 100%)" }}
    >
      <Link href="/" className="relative mb-8">
        <Image src="/brand/logo-full.png" alt="Proxola" width={139} height={44} priority className="h-11 w-auto" />
      </Link>
      <div
        className={`${inter.className} relative w-full max-w-sm rounded-[24px] p-10`}
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px rgba(61,53,232,0.12)" }}
      >
        {children}
      </div>
    </div>
  );
}
