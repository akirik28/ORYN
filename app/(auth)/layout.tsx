import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";
import { inter } from "@/lib/fonts";

// reset-password/page.tsx calls verifySession() at render time — never a static-
// prerendering candidate. See app/(app)/layout.tsx for the fuller explanation.
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  return (
    // Figma source (AuthFlow.tsx `Signup`/`Login`/`ForgotPassword`) — all three render
    // this identical gradient + translucent card, so it's transplanted once here rather
    // than duplicated per page. Real logo (unmodified) in place of source's ProxolaMark.
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
