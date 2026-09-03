import Link from "next/link";
import Image from "next/image";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { getTranslations } from "next-intl/server";
import { integrationStatus } from "@/lib/env";
import { inter } from "@/lib/fonts";

// Every route under this layout is per-user (auth or role state) -- never a candidate for
// static prerendering, same reasoning as app/(app)/layout.tsx and app/(auth)/layout.tsx.
export const dynamic = "force-dynamic";

/**
 * Shared shell for the whole parent entrance (docs/veli-hesabi-spec-2026-09-04.md P2) --
 * /parent/login, /parent/pending, and the gated dashboard group all render inside this.
 * Deliberately holds NO auth or role logic itself, mirroring app/(auth)/layout.tsx's own
 * split: a pure visual wrapper, with each route beneath it responsible for its own gate.
 * A single top-level gate here would create the exact redirect-loop risk this file's
 * children (login, pending) are built to avoid -- see each page's own header comment.
 *
 * `data-role="parent"` on the wrapper is a structural hook for P3's brown theme
 * (docs/veli-hesabi-spec-2026-09-04.md K5: "kahverengi tema mevcut tier mekanizmasını
 * kullanır... data-role='parent'"), not the theme itself -- P3 owns the actual color
 * tokens. Server-rendered on this wrapper div rather than client-side on <html> the way
 * UltraAmbient sets data-tier: that mechanism exists because Ultra also reacts to a
 * client-side dev-tier-preview toggle mid-session, which account_role has no equivalent
 * of -- a plain server attribute is simpler here and P3 can move it if the real theme
 * build needs it on <html> instead.
 */
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  return (
    <div
      data-role="parent"
      className={`${inter.className} relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12`}
      style={{ background: "linear-gradient(145deg, #EFE6DA 0%, #E4D5C2 100%)" }}
    >
      <Link href="/" className="relative mb-8">
        <Image src="/brand/logo-full.png" alt="Proxola" width={139} height={44} priority className="h-11 w-auto" />
      </Link>
      <div
        className="relative w-full max-w-sm rounded-[24px] p-10"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px rgba(120,90,50,0.14)" }}
      >
        {children}
      </div>
    </div>
  );
}
