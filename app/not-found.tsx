import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/proxola/empty-state";

// Root not-found boundary — catches everything app/(app)/not-found.tsx can't: routes
// outside the (app) group (typos, stale external links, anything unauthenticated) that
// don't match any segment at all. Without this file those fell through to Next's bare
// built-in 404 (unbranded, no way back). Same copy/shape as app/(app)/not-found.tsx,
// but standalone — this renders under the root layout, so there's no sidebar/nav to sit
// inside, and the visitor may not be signed in, hence linking home rather than /dashboard.
export default async function RootNotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/">
        <Image src="/brand/logo-full.png" alt="Proxola" width={135} height={44} priority className="h-11 w-auto" />
      </Link>
      <EmptyState
        icon={SearchX}
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" render={<Link href="/" />} nativeButton={false}>
            {t("backToHome")}
          </Button>
        }
      />
    </div>
  );
}
