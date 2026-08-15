import Link from "next/link";
import Image from "next/image";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";
import { integrationStatus } from "@/lib/env";

// reset-password/page.tsx calls verifySession() at render time — never a static-
// prerendering candidate. See app/(app)/layout.tsx for the fuller explanation.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    return <NotConfiguredNotice />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8">
        <Image src="/brand/logo-full.png" alt="Oryn" width={104} height={35} priority className="h-8 w-auto" />
      </Link>
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}
