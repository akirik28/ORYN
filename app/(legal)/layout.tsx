import { resolveLocale } from "@/lib/i18n/locale";
import { SiteFooter } from "@/features/legal/site-footer";

/**
 * Shell for the three policy documents. Public — deliberately outside `(app)`, which
 * requires a session: someone has to be able to read what they are agreeing to *before*
 * they have an account, and the signup form links straight here.
 *
 * `resolveLocale()` reads the locale cookie, which is enough on its own to make Next bail
 * to dynamic rendering (no `requireUser()`/`createClient()` call here, so none of the
 * build-failure risk `(app)/layout.tsx` documents applies) — but `force-dynamic` is set
 * explicitly anyway, matching that file's own preference for stating the requirement
 * rather than relying on inference. A prerendered-at-build-time footer would show whatever
 * locale happened to be resolved during the build, not the visitor's.
 */
export const dynamic = "force-dynamic";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1">{children}</main>
      <SiteFooter tone="light" locale={locale} />
    </div>
  );
}
