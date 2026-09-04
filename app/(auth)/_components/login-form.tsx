"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "./auth-field-styles";

export function LoginForm({
  next,
  namespace = "auth.login",
}: {
  next?: string;
  /**
   * Turkish voice pass (2026-09-04) — this form is reused verbatim by app/parent/login/
   * page.tsx for the parent entrance, and auth.login's Turkish content is written "sen"
   * (informal), correct for a student but not for an adult parent (this codebase's own
   * established parent register — see features/parent/parent-panel-view.tsx,
   * app/parent/login/page.tsx's own heading/subheading, both "siz"). forgotPassword was the
   * one string that actually differed by register ("Şifreni mi unuttun?" vs. "Şifrenizi mi
   * unuttunuz?"); the rest of parent.login's copy is identical text to auth.login's, kept as
   * a full parallel namespace anyway so every key this component calls resolves under
   * whichever namespace it's given, matching features/advisor/upgrade-prompt-overlay.tsx's
   * own namespace-prop pattern for the identical shared-component-two-audiences problem.
   *
   * Does NOT cover signIn() (app/(auth)/actions.ts)'s own error messages
   * (incorrectCredentials/emailInvalid/passwordRequired) — those are resolved server-side
   * from auth.login unconditionally, regardless of which namespace rendered this form, so a
   * parent who mistypes a field still sees "Şifreni gir." (sen). Flagged, not fixed here:
   * that action is shared, security-sensitive code neither student nor parent login should
   * have its behavior touched by a copy-only pass without a second pair of eyes on it.
   */
  namespace?: "auth.login" | "parent.login";
}) {
  const t = useTranslations(namespace);
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="email" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          {t("emailLabel")}
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.email ? <p className="text-sm text-destructive">{state.errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" style={{ color: "#3A3A4A", fontWeight: 500 }}>
            {t("passwordLabel")}
          </Label>
          <Link href="/forgot-password" className="text-xs" style={{ color: "#3D35E8" }}>
            {t("forgotPassword")}
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={AUTH_INPUT_CLASS}
        />
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        ) : null}
      </div>
      {state?.message && state.variant === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
