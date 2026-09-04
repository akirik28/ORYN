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
 * FIXED 2026-09-04 (CEO dispatch, confirmed live via a throwaway composed-render preview):
 * this used to ALSO wrap every child in a `max-w-sm` login-card, which squeezed the real
 * dashboard panel (ParentPanelView, its own full-page component) into ~304px at any screen
 * width -- the primary success path for every linked parent, broken since the feature
 * merged, because nobody had rendered the composed tree until then. CEO's ruling: the card
 * belongs to the login-shaped screens, not every route under this layout, so only
 * `data-role="parent"` and the shared background stay here now.
 *
 * Extended past CEO's own wording once `ParentPendingScreen` (features/parent/parent-
 * pending-screen.tsx) got wired into /parent/pending in this same pass: that component is
 * ALSO a self-contained full-page shell (its own `min-h-svh`, its own background, its own
 * card) -- CEO's ruling named login and pending as the two screens keeping the card, written
 * before either of us had looked at what pending's real content actually was. Nesting a
 * second full-page component inside this layout's card would reproduce the exact bug this
 * fix exists to close, just on a different page. So pending renders full-page here too, the
 * same as the dashboard, and only /parent/login/page.tsx now carries its own card inline --
 * flagged explicitly rather than silently deviating from the letter of the instruction.
 *
 * `data-role="parent"` on the wrapper is a structural hook for P3's brown theme
 * (docs/veli-hesabi-spec-2026-09-04.md K5: "kahverengi tema mevcut tier mekanizmasını
 * kullanır... data-role='parent'") -- both `ParentPendingScreen` and `ParentPanelView`
 * consume the resulting `--role-*` custom properties (app/globals.css) directly, which is
 * why this wrapper only needs to set the attribute, not repeat the background formula
 * itself; kept here anyway as a `bg-background`-equivalent base so anything rendered before
 * a child component's own background paints (e.g. a loading state) doesn't flash unstyled.
 *
 * ADDED 2026-09-04 (CEO dispatch): a slim logo header, now that every route below is a
 * self-contained full-page component with no shared chrome of its own (login moved its logo
 * inline when it took back its card, see that page's own comment; pending and the dashboard
 * never had one). It is a sibling of `{children}`, not a wrapper around it -- this file
 * already carries one lesson about an ancestor squeezing a wide child, so the header owns
 * only its own height and internal padding, no `max-w-*`, no shared container that both it
 * and `{children}` sit inside beyond this plain full-width div. Login's own inline logo was
 * removed in the same pass to avoid showing two.
 *
 * `{children}` is wrapped in `<main>` (added in the same pass) -- this page never had a
 * `main` landmark before. Found live, in the composed-render check this whole header
 * addition was built to go through: adding the header also produced a second `banner`
 * landmark, because ParentPanelView had its own internal `<header>` for what is really
 * page-specific title content. Nesting it inside `<main>` did NOT suppress that on its own
 * -- checked against the browser's actual computed accessibility tree, not assumed from spec
 * text -- so that inner element was changed to a plain div instead (see its own comment).
 * The two fixes are independent: `<main>` closes the missing-landmark gap, the div change
 * closes the duplicate-banner one.
 */
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  if (!integrationStatus.supabase) {
    const tSystem = await getTranslations("system");
    return <NotConfiguredNotice title={tSystem("notConfiguredTitle")} description={tSystem("notConfiguredDescription")} />;
  }

  return (
    <div data-role="parent" className={inter.className} style={{ background: "var(--role-page-bg-1)" }}>
      <header className="flex items-center px-6 py-5">
        <Link href="/" aria-label="Proxola">
          <Image src="/brand/logo-full.png" alt="Proxola" width={109} height={36} priority className="h-9 w-auto" />
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
