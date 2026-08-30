import { AlertTriangle } from "lucide-react";

/**
 * Shown instead of crashing whenever a required integration's credentials aren't set
 * (Phase 72 dev-mode requirement). Checked proactively at the top of layouts/actions —
 * never a caught exception — so the experience is a clear message, not a stack trace.
 */
export function NotConfiguredNotice({
  title = "Supabase isn't configured yet",
  description = "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to enable accounts and data. See API_SETUP.md for step-by-step instructions.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="text-lg font-medium">{title}</h1>
        {/* break-words: the default description names env vars like
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — a single 36-character token with no
            natural break point. As a flex child (the parent is `flex justify-center`),
            this card's default min-width is `auto`, i.e. content-based, so that one
            unbroken word held the whole card open past the viewport at every width up to
            ~380px — confirmed via scrollWidth/clientWidth, not just visually (the overflow
            is subtle enough at phone width to miss by eye). w-full above gives the card an
            explicit basis to shrink from; break-words lets this one long token wrap instead
            of forcing the floor. */}
        <p className="text-sm break-words text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
