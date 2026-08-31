import { SiteFooter } from "@/features/legal/site-footer";

/**
 * Shell for the three policy documents. Public — deliberately outside `(app)`, which
 * requires a session: someone has to be able to read what they are agreeing to *before*
 * they have an account, and the signup form links straight here.
 *
 * Static by nature (no session, no database read), so nothing here forces dynamic
 * rendering the way `(app)` and `(auth)` do.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1">{children}</main>
      <SiteFooter tone="light" />
    </div>
  );
}
