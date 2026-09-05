"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendEmailVerificationCodeAction, submitEmailVerificationCodeAction } from "@/app/(app)/settings/actions";

export interface EmailVerificationSectionProps {
  verified: boolean;
  /** lib/email/isEmailProviderConfigured() — a real, working adapter, not merely a provider
   *  NAME being set (see lib/email/index.ts's own getEmailProvider comment for that
   *  distinction). False today for every environment: no vendor has been chosen yet
   *  (2026-09-05). AGENTS.md Phase 72's own convention — show a clear developer state, never
   *  a working-looking form that quietly does nothing. */
  providerConfigured: boolean;
}

/**
 * E2 (docs/PROXOLA-PLAN.md), CEO's decision 2026-09-05 — honest status, same
 * self_reported/verified distinction the evidence system already uses elsewhere in this
 * product, applied here to the student's own account email. Never blocks anything else on
 * this page or in the product: this section can sit at "Not verified yet" indefinitely with
 * zero effect outside itself, by design.
 */
export function EmailVerificationSection({ verified, providerConfigured }: EmailVerificationSectionProps) {
  const t = useTranslations("common");
  const tEmail = useTranslations("settings.emailVerification");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [justVerified, setJustVerified] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (verified || justVerified) {
    return <p className="text-sm text-success">{tEmail("verifiedBadge")}</p>;
  }

  if (!providerConfigured) {
    return <p className="text-sm text-ink-3">{tEmail("notConfiguredMessage")}</p>;
  }

  function sendCode() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await resendEmailVerificationCodeAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo(tEmail("sentMessage"));
      setOpen(true);
    });
  }

  function submitCode() {
    setError(null);
    startTransition(async () => {
      const result = await submitEmailVerificationCodeAction(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode("");
      setInfo(null);
      setJustVerified(true);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-3">{tEmail("unverifiedBadge")}</p>
        <Button variant="outline" size="sm" onClick={sendCode} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : tEmail("sendCodeButton")}
        </Button>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {info ? <p className="text-sm text-ink-3">{info}</p> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email-verification-code">{tEmail("codeLabel")}</Label>
        <Input
          id="email-verification-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button onClick={submitCode} disabled={isPending || code.length === 0}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : tEmail("submitButton")}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={sendCode}>
          {tEmail("resendCodeButton")}
        </Button>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => { setOpen(false); setCode(""); setError(null); setInfo(null); }}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
