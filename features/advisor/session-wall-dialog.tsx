"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * docs/ozellesme-spec-2026-09-03.md §2's "yükseltme kutusu" — the response to a Standard
 * student's own click on "New session", not something that appears unbidden over counsel
 * they came to read. The spec is explicit that this distinction is what makes a modal
 * legitimate here, where an earlier, different pattern was rejected for imposing itself
 * unprompted — reusing `Dialog` (a real modal, blocking, centered) rather than
 * `UpgradePromptOverlay`'s in-flow `<aside>` is deliberate for the same reason in reverse:
 * this one answers an action the student just took and expects a response to, so a modal
 * reads as the outcome of that click rather than an interruption.
 *
 * Still shares its two carried-over rules with UpgradePromptOverlay, not a second, drifting
 * copy of them: the top-right (×) is always reachable (DialogContent's own showCloseButton,
 * on by default — nothing here has to re-implement it), and the two named actions ("See
 * Ultra" / "Close") are equal visual weight — same `variant="outline"`, same size, neither
 * styled as more prominent than the other. CTA ordered first (DialogFooter's own
 * showCloseButton convention already puts a plain close last), matching the flex-col-reverse
 * layout's own effect of surfacing whichever button is last-in-DOM first on a stacked mobile
 * viewport.
 */
export function SessionWallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("advisor.sessionWall");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("detail")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <ButtonLink href="/settings/plan" variant="outline">
            {t("cta")}
          </ButtonLink>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
