"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendEmailVerificationCode, verifyEmailCode } from "@/app/(app)/profile/email-verification-actions";

/**
 * E2 (docs/PROXOLA-PLAN.md) — same self_reported/verified honesty the evidence system
 * already uses (CEO's own explicit framing), applied to contact_info.email. Rendered only
 * when the saved email is non-empty AND matches the form's current (possibly-unsaved)
 * value — sendEmailVerificationCode reads contact_info.email from the database, so
 * verifying against an unsaved edit would silently send a code to an address that isn't
 * actually on file yet. ContactInfoForm's own dirty check already computes this; this
 * component doesn't re-derive it, it just trusts the boolean it's handed.
 */
export function EmailVerificationStatus({ email, verified, canVerify }: { email: string; verified: boolean; canVerify: boolean }) {
  const t = useTranslations("emailVerification");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const [isConfirming, startConfirming] = useTransition();

  if (!email) return null;

  if (verified) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {t("verifiedLabel")}
      </p>
    );
  }

  if (!canVerify) {
    // An unsaved edit sits in the email field -- nothing to verify yet. No message here;
    // the form's own "Save" button already communicates "this isn't saved," and a second,
    // separate notice would just be noise for the common case of mid-typing.
    return <p className="text-xs text-muted-foreground">{t("notVerifiedLabel")}</p>;
  }

  function send() {
    setError(null);
    startSending(async () => {
      const result = await sendEmailVerificationCode();
      if (result.error) {
        setError(result.error);
        return;
      }
      setCodeSent(true);
    });
  }

  function confirm() {
    setError(null);
    startConfirming(async () => {
      const result = await verifyEmailCode(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode("");
      // No local "verified" state to flip here on purpose -- the real signal is
      // contact_info.email_verified_at, which the Server Action's own revalidatePath("/
      // profile") refreshes from the server, the same source of truth the `verified` prop
      // above already reads. A local success flag would be a second, possibly-stale copy
      // of the same fact.
    });
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{t("notVerifiedLabel")}</p>
      {!codeSent ? (
        <Button type="button" variant="outline" size="sm" disabled={isSending} onClick={send}>
          {isSending ? <Loader2 className="size-3.5 animate-spin" /> : t("sendButton")}
        </Button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">{t("codeSentNotice", { email })}</p>
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("codePlaceholder")}
              inputMode="numeric"
              className="w-32"
              aria-label={t("codeLabel")}
            />
            <Button type="button" variant="outline" size="sm" disabled={isConfirming || code.length !== 6} onClick={confirm}>
              {isConfirming ? <Loader2 className="size-3.5 animate-spin" /> : t("confirmButton")}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isSending} onClick={send}>
              {t("resendButton")}
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
