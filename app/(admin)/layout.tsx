import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/security/require-admin";
import { ControlRail } from "@/features/admin/control-rail";

/**
 * The control centre's own shell — a separate route group from app/(app)/, on purpose.
 *
 * app/(app)/admin/ still exists and still works; this does not replace it yet. It is
 * reachable at its own URL so the founder can compare the two before anything is
 * redirected, per docs/kumanda-merkezi-yapi-plani-2026-09-03.md's staging: "app/(app)/admin/
 * bir yönlendirmeye dönüşene kadar çalışmaya devam etsin."
 *
 * Two attributes, not one. `data-surface="admin"` is the existing token family every
 * features/admin/sections/* component already reads; `data-admin-tone="light"` redefines
 * those same token NAMES to a light-green ground (app/globals.css). That is why fourteen
 * section components can move here without a single component change -- the ground flipped
 * underneath them, not the components.
 *
 * requireAdmin() sits here rather than in each page so a new route cannot forget it. That is
 * the one thing in this tree that must not depend on remembering.
 */
export default async function ControlCentreLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div
      data-surface="admin"
      data-admin-tone="light"
      className="flex min-h-svh flex-col lg:flex-row"
      style={{ background: "var(--admin-bg)", color: "var(--admin-ink-1)" }}
    >
      <ControlRail />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
