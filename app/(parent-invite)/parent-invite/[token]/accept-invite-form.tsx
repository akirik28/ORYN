"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { acceptParentInvite } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "@/app/(auth)/_components/auth-field-styles";

export function AcceptInviteForm({
  token,
  invitedEmail,
  studentName,
}: {
  token: string;
  invitedEmail: string;
  studentName: string;
}) {
  const t = useTranslations("parentInvite");
  const [state, action, pending] = useActionState(acceptParentInvite, undefined);

  if (state?.variant === "success") {
    return (
      <div className="space-y-1.5 text-center">
        <p className="text-sm font-medium text-ink-1">{t("acceptSuccessTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("acceptSuccessDescription", { studentName })}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label style={{ color: "#3A3A4A", fontWeight: 500 }}>{t("acceptFormEmailLabel")}</Label>
        {/* Read-only, sourced from the verified token — not an editable field. A parent
            typing a different address here would defeat the whole point of the invite
            being bound to the one address the student actually typed (see
            lib/parent/invite-token.ts's own header on what this token is for). */}
        <p className="text-sm text-ink-1">{invitedEmail}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          {t("acceptFormNameLabel")}
        </Label>
        <Input id="displayName" name="displayName" autoComplete="name" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.displayName ? <p className="text-sm text-destructive">{state.errors.displayName[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          {t("acceptFormPasswordLabel")}
        </Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required className={AUTH_INPUT_CLASS} />
        <p className="text-xs" style={{ color: "#AAAABC" }}>{t("acceptFormPasswordHint")}</p>
        {state?.errors?.password ? <p className="text-sm text-destructive">{state.errors.password[0]}</p> : null}
      </div>
      {state?.message && state.variant === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? t("acceptFormSubmitting") : t("acceptFormSubmit")}
      </Button>
    </form>
  );
}
