"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recheckProvider } from "@/app/(app)/admin/actions";

/** No confirm step, unlike JobDisableToggle's disable path — this makes one small, real
 *  call and reports what happened; it changes nothing an admin would need to undo. */
export function ProviderRecheckButton({ provider, label }: { provider: string; label: string }) {
  const t = useTranslations("admin.providers");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await recheckProvider(provider);
          if (result.notConfigured) {
            toast.info(t("recheckNotConfigured", { provider: label }));
          } else if (result.error) {
            toast.error(t("recheckFailed", { provider: label, message: result.error }));
          } else {
            toast.success(t("recheckSuccess", { provider: label }));
            router.refresh();
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      {t("recheckButton")}
    </Button>
  );
}
