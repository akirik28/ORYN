"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "./auth-field-styles";

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          {t("newPasswordLabel")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={AUTH_INPUT_CLASS}
        />
        <p className="text-xs" style={{ color: "#AAAABC" }}>{t("requirements")}</p>
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        ) : null}
      </div>
      {state?.message && state.variant === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? t("updating") : t("updateButton")}
      </Button>
    </form>
  );
}
